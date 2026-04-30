# backend/app/services/gdrive_service.py
# ══════════════════════════════════════════════════════════════
#  JARVIS OS — Google Drive API Service (Phase 5)
#
#  Uses a Service Account for server-side authentication.
#  No OAuth popup needed — runs headlessly on the backend.
#
#  Setup (one-time):
#    1. Google Cloud Console → New Project
#    2. Enable Google Drive API
#    3. Create Service Account → Download JSON key
#    4. Save as: backend/gdrive_credentials.json
#    5. Share your Drive folder with the service account email
#
#  Methods:
#    list_files()      → List files in a folder
#    upload_file()     → Upload bytes to Drive
#    create_folder()   → Create a new folder
#    get_file_link()   → Get shareable link for a file
#    delete_file()     → Delete a file from Drive
#    get_storage_stats() → Count files + get root info
# ══════════════════════════════════════════════════════════════

import logging
import os
from typing import Optional, BinaryIO

from app.core.config import settings

logger = logging.getLogger("jarvis-os.gdrive_service")


# ──────────────────────────────────────────────────────────────
# MIME TYPE MAPPING
# Maps common file extensions to Google Drive MIME types
# ──────────────────────────────────────────────────────────────
GOOGLE_MIME_TYPES = {
    "application/vnd.google-apps.folder": "folder",
    "application/vnd.google-apps.document": "Google Doc",
    "application/vnd.google-apps.spreadsheet": "Google Sheet",
    "application/vnd.google-apps.presentation": "Google Slides",
}

# Files to exclude from listings (system files)
EXCLUDED_MIME_TYPES = [
    "application/vnd.google-apps.shortcut",
]


def _human_size(size_bytes: Optional[int]) -> Optional[str]:
    """Convert byte count to human-readable string."""
    if size_bytes is None:
        return None
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


# ══════════════════════════════════════════════════════════════
# GOOGLE DRIVE SERVICE CLASS
# ══════════════════════════════════════════════════════════════
class GoogleDriveService:
    """
    Service account-based Google Drive wrapper.
    Singleton — initialize once, reuse everywhere.

    Usage:
        from app.services.gdrive_service import get_gdrive_service
        gdrive = get_gdrive_service()
        files  = gdrive.list_files()
    """

    # Required OAuth scopes
    SCOPES = [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/drive.file",
    ]

    def __init__(self):
        self._service       = None
        self._credentials   = None
        self._initialized   = False
        self.root_folder_id = settings.GDRIVE_ROOT_FOLDER_ID

    # ──────────────────────────────────────────────────────────
    # INITIALIZATION — Lazy-loads Google API client
    # ──────────────────────────────────────────────────────────
    def _init(self):
        """
        Initializes the Google Drive API client using service account JSON.
        Raises clear errors if credentials file is missing.
        """
        if self._initialized:
            return

        creds_path = settings.GDRIVE_CREDENTIALS_PATH

        if not os.path.exists(creds_path):
            raise FileNotFoundError(
                f"Google Drive credentials not found at: '{creds_path}'. "
                f"Download your service account JSON from Google Cloud Console "
                f"and save it to this path."
            )

        try:
            from google.oauth2          import service_account
            from googleapiclient.discovery import build

            self._credentials = service_account.Credentials.from_service_account_file(
                creds_path,
                scopes=self.SCOPES,
            )

            self._service = build(
                "drive",
                "v3",
                credentials=self._credentials,
                cache_discovery=False,
            )

            self._initialized = True
            logger.info(
                f"✅ Google Drive API initialized — "
                f"root folder: {self.root_folder_id or 'root'}"
            )

        except ImportError:
            raise ImportError(
                "google-api-python-client not installed. "
                "Run: pip install google-api-python-client google-auth"
            )
        except Exception as e:
            raise RuntimeError(f"Google Drive init failed: {e}")

    def _svc(self):
        """Returns initialized Drive service, auto-initializing if needed."""
        self._init()
        return self._service

    # ──────────────────────────────────────────────────────────
    # LIST FILES — List files/folders in a Drive folder
    # ──────────────────────────────────────────────────────────
    def list_files(
        self,
        folder_id:  Optional[str] = None,
        page_size:  int           = 50,
        page_token: Optional[str] = None,
    ) -> dict:
        """
        Lists files and folders inside a Google Drive folder.

        Args:
            folder_id:  Drive folder ID. Defaults to root_folder_id from .env
            page_size:  Number of files per page (max 100)
            page_token: For pagination — pass from previous response

        Returns:
            {
                "files":           list of file dicts,
                "next_page_token": str or None,
                "folder_id":       str,
            }
        """
        self._init()

        target_folder = folder_id or self.root_folder_id or "root"

        # Build query
        query = f"'{target_folder}' in parents and trashed=false"

        # Fields to fetch — minimized for performance
        fields = (
            "nextPageToken, "
            "files(id, name, mimeType, size, "
            "webViewLink, webContentLink, "
            "createdTime, modifiedTime, parents)"
        )

        kwargs = {
            "q":         query,
            "pageSize":  min(page_size, 100),
            "fields":    fields,
            "orderBy":   "folder,name",
        }
        if page_token:
            kwargs["pageToken"] = page_token

        try:
            result      = self._svc().files().list(**kwargs).execute()
            raw_files   = result.get("files", [])
            next_token  = result.get("nextPageToken")

            # ── Format response ───────────────────────────────
            files = []
            for f in raw_files:
                mime = f.get("mimeType", "")
                if mime in EXCLUDED_MIME_TYPES:
                    continue

                size_bytes = int(f["size"]) if f.get("size") else None
                files.append({
                    "id":               f["id"],
                    "name":             f["name"],
                    "mime_type":        mime,
                    "size_bytes":       size_bytes,
                    "size_human":       _human_size(size_bytes),
                    "web_view_link":    f.get("webViewLink"),
                    "web_content_link": f.get("webContentLink"),
                    "created_time":     f.get("createdTime"),
                    "modified_time":    f.get("modifiedTime"),
                    "is_folder":        mime == "application/vnd.google-apps.folder",
                    "parent_id":        (f.get("parents") or [None])[0],
                })

            logger.info(
                f"📁 Listed {len(files)} files in folder '{target_folder}'"
            )

            return {
                "files":            files,
                "next_page_token":  next_token,
                "folder_id":        target_folder,
            }

        except Exception as e:
            logger.error(f"💥 Drive list_files failed: {e}")
            raise

    # ──────────────────────────────────────────────────────────
    # UPLOAD FILE — Upload a file to Google Drive
    # ──────────────────────────────────────────────────────────
    def upload_file(
        self,
        file_name:  str,
        file_data:  bytes,
        mime_type:  str           = "application/octet-stream",
        folder_id:  Optional[str] = None,
    ) -> dict:
        """
        Uploads a file to Google Drive.

        Args:
            file_name:  Name for the file in Drive
            file_data:  Raw bytes of the file content
            mime_type:  MIME type of the file
            folder_id:  Target folder. Defaults to root_folder_id

        Returns:
            Drive file metadata dict
        """
        self._init()

        from googleapiclient.http import MediaInMemoryUpload

        target_folder = folder_id or self.root_folder_id

        file_metadata: dict = {"name": file_name}
        if target_folder:
            file_metadata["parents"] = [target_folder]

        media = MediaInMemoryUpload(
            file_data,
            mimetype=mime_type,
            resumable=len(file_data) > 5 * 1024 * 1024,  # Resumable for >5MB
        )

        try:
            result = (
                self._svc()
                .files()
                .create(
                    body=file_metadata,
                    media_body=media,
                    fields="id, name, mimeType, size, webViewLink, webContentLink",
                )
                .execute()
            )

            size_bytes = int(result.get("size", 0) or 0)
            logger.info(
                f"✅ Uploaded '{file_name}' to Drive "
                f"({_human_size(size_bytes)}) → ID: {result['id']}"
            )

            return {
                "file_id":        result["id"],
                "file_name":      result["name"],
                "mime_type":      result.get("mimeType", mime_type),
                "size_bytes":     size_bytes,
                "web_view_link":  result.get("webViewLink"),
                "folder_id":      target_folder,
                "message":        f"'{file_name}' uploaded successfully.",
            }

        except Exception as e:
            logger.error(f"💥 Drive upload failed for '{file_name}': {e}")
            raise

    # ──────────────────────────────────────────────────────────
    # CREATE FOLDER
    # ──────────────────────────────────────────────────────────
    def create_folder(
        self,
        folder_name:      str,
        parent_folder_id: Optional[str] = None,
    ) -> dict:
        """
        Creates a new folder in Google Drive.

        Args:
            folder_name:      Name for the new folder
            parent_folder_id: Parent folder. Defaults to root_folder_id

        Returns:
            Folder metadata dict including the new folder ID
        """
        self._init()

        parent = parent_folder_id or self.root_folder_id

        file_metadata: dict = {
            "name":     folder_name,
            "mimeType": "application/vnd.google-apps.folder",
        }
        if parent:
            file_metadata["parents"] = [parent]

        try:
            result = (
                self._svc()
                .files()
                .create(
                    body=file_metadata,
                    fields="id, name, webViewLink, parents",
                )
                .execute()
            )

            logger.info(
                f"📁 Created Drive folder: '{folder_name}' → ID: {result['id']}"
            )

            return {
                "folder_id":     result["id"],
                "folder_name":   result["name"],
                "web_view_link": result.get("webViewLink"),
                "parent_id":     (result.get("parents") or [None])[0],
                "message":       f"Folder '{folder_name}' created in Google Drive.",
            }

        except Exception as e:
            logger.error(f"💥 Drive create_folder failed: {e}")
            raise

    # ──────────────────────────────────────────────────────────
    # GET FILE LINK — Get shareable web link for a file
    # ──────────────────────────────────────────────────────────
    def get_file_link(self, file_id: str) -> dict:
        """Returns the web view link and download link for a Drive file."""
        self._init()

        try:
            result = (
                self._svc()
                .files()
                .get(
                    fileId=file_id,
                    fields="id, name, mimeType, size, webViewLink, webContentLink",
                )
                .execute()
            )

            size_bytes = int(result.get("size", 0) or 0)
            return {
                "file_id":          result["id"],
                "file_name":        result["name"],
                "mime_type":        result.get("mimeType"),
                "size_bytes":       size_bytes,
                "size_human":       _human_size(size_bytes),
                "web_view_link":    result.get("webViewLink"),
                "web_content_link": result.get("webContentLink"),
            }

        except Exception as e:
            logger.error(f"💥 Drive get_file_link failed for {file_id}: {e}")
            raise

    # ──────────────────────────────────────────────────────────
    # DELETE FILE
    # ──────────────────────────────────────────────────────────
    def delete_file(self, file_id: str) -> bool:
        """
        Moves a file to Drive Trash.
        Returns True on success.
        """
        self._init()

        try:
            self._svc().files().trash(fileId=file_id).execute()
            logger.info(f"🗑️  Drive file trashed: {file_id}")
            return True
        except Exception as e:
            logger.error(f"💥 Drive delete failed for {file_id}: {e}")
            raise

    # ──────────────────────────────────────────────────────────
    # STORAGE STATS
    # ──────────────────────────────────────────────────────────
    def get_storage_stats(self) -> dict:
        """
        Returns a summary of the JARVIS root Drive folder.
        """
        self._init()

        try:
            target = self.root_folder_id or "root"

            # Get root folder info
            folder_info = (
                self._svc()
                .files()
                .get(fileId=target, fields="id, name, webViewLink")
                .execute()
            )

            # Count files and folders
            result = (
                self._svc()
                .files()
                .list(
                    q=f"'{target}' in parents and trashed=false",
                    fields="files(mimeType)",
                    pageSize=1000,
                )
                .execute()
            )

            all_items     = result.get("files", [])
            folder_count  = sum(
                1 for f in all_items
                if f.get("mimeType") == "application/vnd.google-apps.folder"
            )
            file_count    = len(all_items) - folder_count

            return {
                "total_files":      file_count,
                "total_folders":    folder_count,
                "root_folder_id":   folder_info["id"],
                "root_folder_name": folder_info["name"],
                "drive_connected":  True,
                "message":          "Google Drive connected and operational.",
            }

        except Exception as e:
            logger.warning(f"⚠️  Drive stats failed: {e}")
            return {
                "total_files":      0,
                "total_folders":    0,
                "root_folder_id":   self.root_folder_id,
                "root_folder_name": None,
                "drive_connected":  False,
                "message":          f"Drive connection failed: {str(e)[:100]}",
            }


# ──────────────────────────────────────────────────────────────
# SINGLETON FACTORY
# ──────────────────────────────────────────────────────────────
_gdrive_instance: Optional[GoogleDriveService] = None


def get_gdrive_service() -> GoogleDriveService:
    """
    Returns singleton GoogleDriveService instance.
    Use as FastAPI dependency:
        gdrive: GoogleDriveService = Depends(get_gdrive_service)
    """
    global _gdrive_instance
    if _gdrive_instance is None:
        _gdrive_instance = GoogleDriveService()
        logger.info("✅ GoogleDriveService singleton created")
    return _gdrive_instance
