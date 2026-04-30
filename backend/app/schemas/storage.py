# backend/app/schemas/storage.py
# ══════════════════════════════════════════════════════════════
#  JARVIS OS — Google Drive Storage Schemas (Phase 5)
# ══════════════════════════════════════════════════════════════

from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ──────────────────────────────────────────────────────────────
# DRIVE FILE RESPONSE
# Represents one file/folder in Google Drive
# ──────────────────────────────────────────────────────────────
class DriveFileResponse(BaseModel):
    id:            str
    name:          str
    mime_type:     str
    size_bytes:    Optional[int]    = None
    size_human:    Optional[str]    = None    # "2.4 MB"
    web_view_link: Optional[str]   = None
    web_content_link: Optional[str] = None
    created_time:  Optional[datetime] = None
    modified_time: Optional[datetime] = None
    is_folder:     bool             = False
    parent_id:     Optional[str]    = None

    model_config = ConfigDict(from_attributes=True)


class DriveFileListResponse(BaseModel):
    files:          List[DriveFileResponse]
    count:          int
    folder_id:      Optional[str]
    folder_name:    Optional[str]
    next_page_token: Optional[str] = None


# ──────────────────────────────────────────────────────────────
# UPLOAD RESPONSE
# ──────────────────────────────────────────────────────────────
class DriveUploadResponse(BaseModel):
    file_id:       str
    file_name:     str
    mime_type:     str
    size_bytes:    int
    web_view_link: Optional[str]
    folder_id:     Optional[str]
    message:       str


# ──────────────────────────────────────────────────────────────
# CREATE FOLDER REQUEST / RESPONSE
# ──────────────────────────────────────────────────────────────
class CreateFolderRequest(BaseModel):
    folder_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Name of the folder to create"
    )
    parent_folder_id: Optional[str] = Field(
        None,
        description="Parent folder ID. Defaults to GDRIVE_ROOT_FOLDER_ID"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "folder_name":      "JARVIS TFT Display Project",
                "parent_folder_id": None,
            }
        }
    )


class CreateFolderResponse(BaseModel):
    folder_id:     str
    folder_name:   str
    web_view_link: Optional[str]
    parent_id:     Optional[str]
    message:       str


# ──────────────────────────────────────────────────────────────
# LINK DRIVE FOLDER TO PROJECT
# ──────────────────────────────────────────────────────────────
class LinkDriveFolderRequest(BaseModel):
    folder_id: str = Field(
        ...,
        description="Google Drive folder ID to link to this project"
    )

    model_config = ConfigDict(
        json_schema_extra={"example": {"folder_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"}}
    )


# ──────────────────────────────────────────────────────────────
# STORAGE STATS
# ──────────────────────────────────────────────────────────────
class StorageStatsResponse(BaseModel):
    total_files:        int
    total_folders:      int
    root_folder_id:     Optional[str]
    root_folder_name:   Optional[str]
    drive_connected:    bool
    message:            str