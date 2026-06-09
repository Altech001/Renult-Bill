from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: UUID
    category: str
    title: str
    body: str
    is_read: bool
    read_at: Optional[datetime]
    created_at: datetime


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
    unread_count: int
    total: int


class MarkReadRequest(BaseModel):
    notification_ids: list[UUID]
