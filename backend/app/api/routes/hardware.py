# backend/app/api/routes/hardware.py
import logging
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.core.database import get_supabase
from app.core.security import get_current_user
from app.core.dependencies import (
    PaginationParams, log_activity,
    verify_ownership, handle_db_error
)
from app.schemas.hardware import (
    HardwareCreate, HardwareUpdate,
    HardwareResponse, HardwareListResponse
)

logger = logging.getLogger("jarvis-os.routes.hardware")
router = APIRouter()

# ──────────────────────────────────────────────────────────────
# LIST HARDWARE — GET /api/v1/hardware
# ──────────────────────────────────────────────────────────────
@router.get(
    "/",
    response_model=HardwareListResponse,
    summary="List all hardware inventory items",
)
async def list_hardware(
    hw_status:  Optional[str]  = Query(None, alias="status", description="available/in_use/ordered/broken/depleted"),
    project_id: Optional[UUID] = Query(None, description="Filter by linked project"),
    location:   Optional[str]  = Query(None, description="Filter by storage location"),
    search:     Optional[str]  = Query(None, description="Search in component name"),
    sort_by:    str            = Query(default="component_name"),
    sort_desc:  bool           = Query(default=False),
    pagination: PaginationParams = Depends(),
    current_user: dict         = Depends(get_current_user),
    db: Client                 = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]
        query = (
            db.table("hardware_inventory")
            .select("*", count="exact")
            .eq("user_id", user_id)
        )
        if hw_status:
            query = query.eq("status", hw_status)
        if project_id:
            query = query.eq("project_id", str(project_id))
        if location:
            query = query.ilike("location", f"%{location}%")
        if search and len(search) >= 2:
            query = query.ilike("component_name", f"%{search}%")
            
        valid_sorts = {
            "component_name", "quantity", "status",
            "created_at", "updated_at", "price_inr"
        }
        sort_field = sort_by if sort_by in valid_sorts else "component_name"
        query = query.order(sort_field, desc=sort_desc)
        query = query.range(
            pagination.offset,
            pagination.offset + pagination.per_page - 1
        )
        result = query.execute()
        total_count = result.count or 0
        
        # Calculate total inventory value
        all_items = result.data or []
        total_value = sum(
            float(item.get("price_inr", 0) or 0) * int(item.get("quantity", 0) or 0)
            for item in all_items
            if item.get("price_inr") is not None
        )
        return HardwareListResponse(
            data=[HardwareResponse(**h) for h in all_items],
            count=total_count,
            total_value_inr=round(total_value, 2),
        )
    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "listing hardware inventory")

# ──────────────────────────────────────────────────────────────
# INVENTORY STATS — GET /api/v1/hardware/stats
# ──────────────────────────────────────────────────────────────
@router.get(
    "/stats",
    summary="Get hardware inventory statistics",
)
async def get_hardware_stats(
    current_user: dict = Depends(get_current_user),
    db: Client         = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]
        result = (
            db.table("hardware_inventory")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        items = result.data or []
        if not items:
            return {
                "total_components": 0,
                "total_quantity":   0,
                "total_value_inr":  0.0,
                "by_status":        {},
                "low_stock":        [],
                "broken_items":     [],
                "message":          "Inventory is empty. Start adding components!",
            }
            
        from collections import Counter
        by_status = dict(Counter(i["status"] for i in items))
        total_qty = sum(i.get("quantity", 0) or 0 for i in items)
        total_value = sum(
            float(i.get("price_inr", 0) or 0) * int(i.get("quantity", 0) or 0)
            for i in items
            if i.get("price_inr") is not None
        )
        
        # Low stock alert: quantity <= 1 and not depleted/ordered
        low_stock = [
            {"id": i["id"], "name": i["component_name"], "qty": i["quantity"]}
            for i in items
            if (i.get("quantity", 0) or 0) <= 1
            and i.get("status") not in ("depleted", "ordered")
        ]
        
        # Broken items that need attention
        broken_items = [
            {"id": i["id"], "name": i["component_name"]}
            for i in items
            if i.get("status") == "broken"
        ]
        
        return {
            "total_components":  len(items),
            "total_quantity":    total_qty,
            "total_value_inr":   round(total_value, 2),
            "by_status":         by_status,
            "low_stock":         low_stock,
            "low_stock_count":   len(low_stock),
            "broken_items":      broken_items,
            "broken_count":      len(broken_items),
        }
    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "fetching hardware stats")

# ──────────────────────────────────────────────────────────────
# ADD COMPONENT — POST /api/v1/hardware
# ──────────────────────────────────────────────────────────────
@router.post(
    "/",
    response_model=HardwareResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new hardware component to inventory",
)
async def create_hardware_item(
    payload:      HardwareCreate,
    current_user: dict = Depends(get_current_user),
    db: Client         = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]
        insert_data = {
            **payload.model_dump(exclude_none=True),
            "user_id":    user_id,
            "project_id": str(payload.project_id) if payload.project_id else None,
            "price_inr":  float(payload.price_inr) if payload.price_inr else None,
        }
        
        # Verify project ownership if provided
        if payload.project_id:
            proj_check = (
                db.table("projects")
                .select("id")
                .eq("id", str(payload.project_id))
                .eq("user_id", user_id)
                .execute()
            )
            if not proj_check.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Linked project not found or you don't have access to it."
                )
                
        result = db.table("hardware_inventory").insert(insert_data).execute()
        item = verify_ownership(result.data, "Hardware item")
        
        await log_activity(
            db=db,
            user_id=user_id,
            action_type="hardware_added",
            entity_type="hardware",
            entity_id=item["id"],
            entity_title=item["component_name"],
            metadata={
                "quantity":   item["quantity"],
                "status":     item["status"],
                "price_inr":  item.get("price_inr"),
            },
        )
        logger.info(f"🔧 Hardware added: '{item['component_name']}' (qty: {item['quantity']})")
        return HardwareResponse(**item)
    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "adding hardware component")

# ──────────────────────────────────────────────────────────────
# GET ONE — GET /api/v1/hardware/{hardware_id}
# ──────────────────────────────────────────────────────────────
@router.get(
    "/{hardware_id}",
    response_model=HardwareResponse,
    summary="Get a single hardware component by ID",
)
async def get_hardware_item(
    hardware_id:  UUID,
    current_user: dict = Depends(get_current_user),
    db: Client         = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]
        result = (
            db.table("hardware_inventory")
            .select("*")
            .eq("id", str(hardware_id))
            .eq("user_id", user_id)
            .execute()
        )
        item = verify_ownership(result.data, "Hardware item")
        return HardwareResponse(**item)
    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "fetching hardware item")

# ──────────────────────────────────────────────────────────────
# UPDATE — PATCH /api/v1/hardware/{hardware_id}
# ──────────────────────────────────────────────────────────────
@router.patch(
    "/{hardware_id}",
    response_model=HardwareResponse,
    summary="Update a hardware component",
)
async def update_hardware_item(
    hardware_id:  UUID,
    payload:      HardwareUpdate,
    current_user: dict = Depends(get_current_user),
    db: Client         = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]
        existing = (
            db.table("hardware_inventory")
            .select("id, component_name")
            .eq("id", str(hardware_id))
            .eq("user_id", user_id)
            .execute()
        )
        verify_ownership(existing.data, "Hardware item")
        
        update_data = payload.to_db_dict()
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No fields provided for update."
            )
            
        if "project_id" in update_data and update_data["project_id"]:
            update_data["project_id"] = str(update_data["project_id"])
        if "price_inr" in update_data and update_data["price_inr"] is not None:
            update_data["price_inr"] = float(update_data["price_inr"])
            
        result = (
            db.table("hardware_inventory")
            .update(update_data)
            .eq("id", str(hardware_id))
            .eq("user_id", user_id)
            .execute()
        )
        updated = verify_ownership(result.data, "Hardware item")
        return HardwareResponse(**updated)
    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "updating hardware item")

# ──────────────────────────────────────────────────────────────
# ADJUST QUANTITY — PATCH /api/v1/hardware/{hardware_id}/qty
# ──────────────────────────────────────────────────────────────
@router.patch(
    "/{hardware_id}/qty",
    response_model=HardwareResponse,
    summary="Adjust quantity (add or subtract units)",
)
async def adjust_hardware_quantity(
    hardware_id:  UUID,
    delta:        int  = Query(..., description="Quantity change. Positive=add, Negative=remove"),
    current_user: dict = Depends(get_current_user),
    db: Client         = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]
        existing = (
            db.table("hardware_inventory")
            .select("id, component_name, quantity, status")
            .eq("id", str(hardware_id))
            .eq("user_id", user_id)
            .execute()
        )
        item = verify_ownership(existing.data, "Hardware item")
        
        current_qty = item.get("quantity", 0) or 0
        new_qty     = max(0, current_qty + delta)
        update_data = {"quantity": new_qty}
        
        if new_qty == 0:
            update_data["status"] = "depleted"
        elif item["status"] == "depleted" and new_qty > 0:
            update_data["status"] = "available"
            
        result = (
            db.table("hardware_inventory")
            .update(update_data)
            .eq("id", str(hardware_id))
            .eq("user_id", user_id)
            .execute()
        )
        updated = verify_ownership(result.data, "Hardware item")
        return HardwareResponse(**updated)
    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "adjusting hardware quantity")

# ──────────────────────────────────────────────────────────────
# DELETE — DELETE /api/v1/hardware/{hardware_id}
# ──────────────────────────────────────────────────────────────
@router.delete(
    "/{hardware_id}",
    status_code=status.HTTP_200_OK,
    summary="Remove a hardware component from inventory",
)
async def delete_hardware_item(
    hardware_id:  UUID,
    current_user: dict = Depends(get_current_user),
    db: Client         = Depends(get_supabase),
):
    try:
        user_id = current_user["id"]
        existing = (
            db.table("hardware_inventory")
            .select("id, component_name")
            .eq("id", str(hardware_id))
            .eq("user_id", user_id)
            .execute()
        )
        item = verify_ownership(existing.data, "Hardware item")
        
        db.table("hardware_inventory").delete().eq("id", str(hardware_id)).eq("user_id", user_id).execute()
        
        await log_activity(
            db=db,
            user_id=user_id,
            action_type="hardware_removed",
            entity_type="hardware",
            entity_id=str(hardware_id),
            entity_title=item["component_name"],
        )
        return {
            "status":  "deleted",
            "id":      str(hardware_id),
            "name":    item["component_name"],
            "message": f"Component '{item['component_name']}' removed from inventory.",
        }
    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "deleting hardware item")