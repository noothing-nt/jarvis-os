# backend/app/api/routes/storage.py
# ══════════════════════════════════════════════════════════════
#  JARVIS OS — Google Drive Storage Routes (Phase 5)
#
#  Endpoints:
#    GET    /api/v1/storage/stats           → Drive stats
#    GET    /api/v1/storage/files           → List files
#    POST   /api/v1/storage/upload          → Upload file
#    POST   /api/v1/storage/folder          → Create folder
#    GET    /api/v1/storage/files/{file_id} → Get file link
#    DELETE /api/v1/storage/files/{file_id} → Delete file
#    PATCH  /api/v1/projects/{id}/drive     → Link folder to project
# ══════════════════════════════════════════════════════════════

import logging
from typing import Optional
from uuid import UUID

from fastapi import (
    APIRouter, Depends, HTTPException,
    Query, UploadFile, File, status
)
from supabase import Client

from app.core.database    import get_supabase
from app.core.security    import get_current_user
from app.core.dependencies import verify_ownership, handle_db_error
from app.services.gdrive_service import GoogleDriveService, get_gdrive_service
from app.schemas.storage import (
    DriveFileListResponse,
    DriveFileResponse,
    DriveUploadResponse,
    CreateFolderRequest,
    CreateFolderResponse,
    LinkDriveFolderRequest,
    StorageStatsResponse,
)

logger = logging.getLogger("jarvis-os.routes.storage")

router = APIRouter()

# Max upload size: 50 MB
MAX_UPLOAD_BYTES = 50 * 1024 * 1024


# ══════════════════════════════════════════════════════════════
# STORAGE STATS — GET /api/v1/storage/stats
# ══════════════════════════════════════════════════════════════
@router.get(
    "/stats",
    response_model=StorageStatsResponse,
    summary="Get Google Drive storage statistics",
)
async def get_storage_stats(
    current_user: dict                = Depends(get_current_user),
    gdrive:       GoogleDriveService  = Depends(get_gdrive_service),
):
    try:
        stats = gdrive.get_storage_stats()
        return StorageStatsResponse(**stats)
    except Exception as e:
        logger.error(f"💥 Storage stats failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Google Drive unavailable: {str(e)}"
        )


# ══════════════════════════════════════════════════════════════
# LIST FILES — GET /api/v1/storage/files
# ══════════════════════════════════════════════════════════════
@router.get(
    "/files",
    response_model=DriveFileListResponse,
    summary="List files in a Google Drive folder",
)
async def list_files(
    folder_id:  Optional[str] = Query(
        None,
        description="Drive folder ID. Defaults to GDRIVE_ROOT_FOLDER_ID from .env"
    ),
    page_size:  int           = Query(default=50, ge=1, le=100),
    page_token: Optional[str] = Query(None, description="Pagination token"),

    current_user: dict               = Depends(get_current_user),
    gdrive:       GoogleDriveService = Depends(get_gdrive_service),
):
    try:
        result = gdrive.list_files(
            folder_id=folder_id,
            page_size=page_size,
            page_token=page_token,
        )

        files = [DriveFileResponse(**f) for f in result["files"]]

        # Get folder name if folder_id was specified
        folder_name = None
        if folder_id:
            try:
                link_info   = gdrive.get_file_link(folder_id)
                folder_name = link_info.get("file_name")
            except Exception:
                pass

        return DriveFileListResponse(
            files=files,
            count=len(files),
            folder_id=result["folder_id"],
            folder_name=folder_name,
            next_page_token=result.get("next_page_token"),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 List files failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Google Drive error: {str(e)}"
        )


# ══════════════════════════════════════════════════════════════
# UPLOAD FILE — POST /api/v1/storage/upload
# ══════════════════════════════════════════════════════════════
@router.post(
    "/upload",
    response_model=DriveUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a file to Google Drive",
    description=(
        "Accepts multipart form upload. Max file size: 50MB. "
        "Optionally specify a target folder_id to organize files."
    ),
)
async def upload_file(
    file:      UploadFile      = File(..., description="File to upload"),
    folder_id: Optional[str]  = Query(
        None,
        description="Target Drive folder ID"
    ),

    current_user: dict               = Depends(get_current_user),
    gdrive:       GoogleDriveService = Depends(get_gdrive_service),
):
    # ── Validate file size ────────────────────────────────────
    file_data = await file.read()

    if len(file_data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is 50MB. "
                   f"Your file: {len(file_data) / 1024 / 1024:.1f}MB"
        )

    if len(file_data) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty."
        )

    # ── Determine MIME type ───────────────────────────────────
    content_type = file.content_type or "application/octet-stream"
    file_name    = file.filename    or "untitled"

    logger.info(
        f"📤 Upload: '{file_name}' "
        f"({len(file_data) / 1024:.1f}KB, {content_type}) "
        f"by user {current_user['id']}"
    )

    try:
        result = gdrive.upload_file(
            file_name=file_name,
            file_data=file_data,
            mime_type=content_type,
            folder_id=folder_id,
        )
        return DriveUploadResponse(**result)

    except Exception as e:
        logger.error(f"💥 Upload failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Upload failed: {str(e)}"
        )


# ══════════════════════════════════════════════════════════════
# CREATE FOLDER — POST /api/v1/storage/folder
# ══════════════════════════════════════════════════════════════
@router.post(
    "/folder",
    response_model=CreateFolderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new folder in Google Drive",
)
async def create_folder(
    payload:      CreateFolderRequest,
    current_user: dict                = Depends(get_current_user),
    gdrive:       GoogleDriveService  = Depends(get_gdrive_service),
):
    try:
        result = gdrive.create_folder(
            folder_name=payload.folder_name,
            parent_folder_id=payload.parent_folder_id,
        )
        logger.info(
            f"📁 Folder created: '{payload.folder_name}' "
            f"by user {current_user['id']}"
        )
        return CreateFolderResponse(**result)

    except Exception as e:
        logger.error(f"💥 Create folder failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Folder creation failed: {str(e)}"
        )


# ══════════════════════════════════════════════════════════════
# GET FILE LINK — GET /api/v1/storage/files/{file_id}
# ══════════════════════════════════════════════════════════════
@router.get(
    "/files/{file_id}",
    response_model=DriveFileResponse,
    summary="Get file details and shareable link",
)
async def get_file(
    file_id:      str,
    current_user: dict               = Depends(get_current_user),
    gdrive:       GoogleDriveService = Depends(get_gdrive_service),
):
    try:
        result = gdrive.get_file_link(file_id)
        return DriveFileResponse(
            id=result["file_id"],
            name=result["file_name"],
            mime_type=result.get("mime_type", ""),
            size_bytes=result.get("size_bytes"),
            size_human=result.get("size_human"),
            web_view_link=result.get("web_view_link"),
            web_content_link=result.get("web_content_link"),
            is_folder=False,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found or inaccessible: {str(e)}"
        )


# ══════════════════════════════════════════════════════════════
# DELETE FILE — DELETE /api/v1/storage/files/{file_id}
# ══════════════════════════════════════════════════════════════
@router.delete(
    "/files/{file_id}",
    status_code=status.HTTP_200_OK,
    summary="Move a Drive file to Trash",
)
async def delete_file(
    file_id:      str,
    current_user: dict               = Depends(get_current_user),
    gdrive:       GoogleDriveService = Depends(get_gdrive_service),
):
    try:
        gdrive.delete_file(file_id)
        return {
            "status":  "trashed",
            "file_id": file_id,
            "message": "File moved to Google Drive Trash.",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Delete failed: {str(e)}"
        )


# ══════════════════════════════════════════════════════════════
# LINK DRIVE FOLDER TO PROJECT
# PATCH /api/v1/storage/projects/{project_id}/drive
# ══════════════════════════════════════════════════════════════
@router.patch(
    "/projects/{project_id}/drive",
    summary="Link a Google Drive folder to a project",
    description=(
        "Associates a Google Drive folder ID with a project record. "
        "The frontend can then show Drive files directly in the project panel."
    ),
)
async def link_project_drive_folder(
    project_id:   UUID,
    payload:      LinkDriveFolderRequest,
    current_user: dict                   = Depends(get_current_user),
    db:           Client                 = Depends(get_supabase),
    gdrive:       GoogleDriveService     = Depends(get_gdrive_service),
):
    try:
        user_id = current_user["id"]

        # ── Verify project ownership ──────────────────────────
        proj_result = (
            db.table("projects")
            .select("id, title")
            .eq("id", str(project_id))
            .eq("user_id", user_id)
            .execute()
        )
        project = verify_ownership(proj_result.data, "Project")

        # ── Verify folder exists in Drive ─────────────────────
        try:
            folder_info = gdrive.get_file_link(payload.folder_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Drive folder '{payload.folder_id}' not found. "
                       f"Ensure the service account has access."
            )

        # ── Update project record ─────────────────────────────
        db.table("projects").update({
            "gdrive_folder_id": payload.folder_id
        }).eq("id", str(project_id)).eq("user_id", user_id).execute()

        logger.info(
            f"🔗 Project '{project['title']}' linked to "
            f"Drive folder '{folder_info.get('file_name')}'"
        )

        return {
            "status":          "linked",
            "project_id":      str(project_id),
            "project_title":   project["title"],
            "folder_id":       payload.folder_id,
            "folder_name":     folder_info.get("file_name"),
            "web_view_link":   folder_info.get("web_view_link"),
            "message": (
                f"Project '{project['title']}' is now linked to "
                f"Drive folder '{folder_info.get('file_name')}'."
            ),
        }

    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e, "linking Drive folder to project")
