from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class BranchCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class BranchUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    avatar_url: Optional[str] = Field(default=None)


class BranchResponse(BaseModel):
    id: UUID
    name: str
    avatar_url: str
    user_id: UUID
    created_at: datetime
    updated_at: datetime
