from datetime import datetime
from typing import Literal, Optional
from urllib.parse import urlparse
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class PortalAdUpsert(BaseModel):
    enabled: bool = True
    placement: Literal["banner", "flash"] = "banner"
    media_type: Literal["image", "video"] = "image"
    title: str = Field(default="Sponsored", max_length=160)
    description: str = Field(default="", max_length=500)
    media_url: Optional[str] = Field(default=None, max_length=2000)
    target_url: Optional[str] = Field(default=None, max_length=2000)
    duration_seconds: int = Field(default=5, ge=1, le=60)

    @field_validator("media_url", "target_url")
    @classmethod
    def clean_optional_url(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            return None
        if urlparse(cleaned).scheme not in {"http", "https"}:
            raise ValueError("URL must start with http:// or https://")
        return cleaned


class PortalAdResponse(PortalAdUpsert):
    id: Optional[UUID] = None
    router_id: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
