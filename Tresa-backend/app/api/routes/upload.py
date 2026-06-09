from pathlib import PurePosixPath
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from app.api.deps import CurrentUser
from app.core.config import settings
from app.schemas.auth import MessageResponse
from app.schemas.upload import FileObject, UploadResponse
from app.services.storage import (
    STORAGE_ERRORS,
    clean_object_key,
    delete_object,
    list_objects,
    upload_bytes,
)

router = APIRouter(prefix="/uploads", tags=["Uploads"])


@router.post("", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    user: CurrentUser,
    file: UploadFile = File(...),
    folder: str = Form(default="general"),
    key: str | None = Form(default=None),
) -> UploadResponse:
    content = await file.read(settings.upload_max_bytes + 1)
    if len(content) > settings.upload_max_bytes:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"File exceeds the {settings.upload_max_bytes} byte upload limit",
        )
    filename = PurePosixPath(file.filename or "upload").name
    try:
        requested_key = clean_object_key(
            key or f"{folder.strip().strip('/')}/{uuid4().hex}-{filename}"
        )
        object_key = f"users/{user.id}/{requested_key}"
        url = upload_bytes(object_key, content, file.content_type)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    except STORAGE_ERRORS as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc
    return UploadResponse(
        key=object_key,
        filename=filename,
        content_type=file.content_type,
        size=len(content),
        url=url,
    )


@router.get("", response_model=list[FileObject])
def uploaded_files(
    user: CurrentUser,
    prefix: str = Query(default="", max_length=500),
) -> list[FileObject]:
    scoped_prefix = f"users/{user.id}/{prefix.strip().lstrip('/')}"
    try:
        return [
            FileObject(
                key=item["Key"],
                size=item.get("Size", 0),
                last_modified=item.get("LastModified"),
                etag=str(item.get("ETag", "")).strip('"') or None,
                url=item["url"],
            )
            for item in list_objects(scoped_prefix)
        ]
    except STORAGE_ERRORS as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc


@router.delete("/{key:path}", response_model=MessageResponse)
def remove_upload(key: str, user: CurrentUser) -> MessageResponse:
    try:
        object_key = clean_object_key(key)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    if not object_key.startswith(f"users/{user.id}/"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot delete this file")
    try:
        delete_object(object_key)
    except STORAGE_ERRORS as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc
    return MessageResponse(message="File deleted successfully.")
