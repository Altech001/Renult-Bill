from datetime import datetime

from pydantic import BaseModel


class UploadResponse(BaseModel):
    key: str
    filename: str
    content_type: str | None = None
    size: int
    url: str


class FileObject(BaseModel):
    key: str
    size: int
    last_modified: datetime | None = None
    etag: str | None = None
    url: str
