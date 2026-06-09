from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class TicketCategoryResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]


class TicketCreate(BaseModel):
    category_id: UUID
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=5)
    priority: Optional[str] = Field(default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL


class TicketUpdate(BaseModel):
    category_id: Optional[UUID] = Field(default=None)
    title: Optional[str] = Field(default=None, min_length=3, max_length=200)
    description: Optional[str] = Field(default=None, min_length=5)
    priority: Optional[str] = Field(default=None)  # LOW, MEDIUM, HIGH, CRITICAL
    status: Optional[str] = Field(default=None)    # OPEN, IN_PROGRESS, RESOLVED, CLOSED
    assigned_staff_id: Optional[UUID] = Field(default=None)


class TicketResponse(BaseModel):
    id: UUID
    branch_id: UUID
    category_id: UUID
    title: str
    description: str
    priority: str
    status: str
    assigned_staff_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime
