import os
import uuid
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException

logger = logging.getLogger("uploads_router")
router = APIRouter(prefix="/api/uploads", tags=["File Uploads"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "videos")
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_TYPES = {"video/mp4", "video/quicktime", "video/webm", "video/mov"}


@router.post("/video")
async def upload_video(file: UploadFile = File(...)):
    """
    Upload a building entrance video.
    Accepts MP4, MOV, WebM. Max 50MB.
    Returns the URL path to the uploaded file.
    """
    # Validate content type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Allowed: MP4, MOV, WebM"
        )

    # Read file and check size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is 50MB."
        )

    # Generate unique filename
    ext = os.path.splitext(file.filename or "video.mp4")[1] or ".mp4"
    unique_name = f"{uuid.uuid4().hex}{ext}"

    # Ensure upload directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Save file
    file_path = os.path.join(UPLOAD_DIR, unique_name)
    with open(file_path, "wb") as f:
        f.write(contents)

    url = f"/uploads/videos/{unique_name}"
    logger.info(f"Video uploaded: {unique_name} ({len(contents)} bytes)")

    return {
        "url": url,
        "filename": unique_name,
        "size": len(contents),
        "content_type": file.content_type
    }
