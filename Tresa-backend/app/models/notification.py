import uuid as _uuid
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlmodel import Field, SQLModel


class Notification(SQLModel, table=True):
    id: _uuid.UUID = Field(
        default_factory=_uuid.uuid4,
        sa_column=sa.Column(PgUUID(as_uuid=True), primary_key=True, default=_uuid.uuid4),
    )
    user_id: _uuid.UUID = Field(
        sa_column=sa.Column(PgUUID(as_uuid=True), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True),
    )
    category: str = Field(index=True)          # e.g. "account", "security", "billing"
    title: str
    body: str
    is_read: bool = Field(default=False)
    read_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
