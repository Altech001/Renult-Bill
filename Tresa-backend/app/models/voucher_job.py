import uuid as _uuid
from datetime import datetime
from typing import Any, Optional

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID as PgUUID
from sqlmodel import Field, SQLModel


class VoucherJob(SQLModel, table=True):
    id: _uuid.UUID = Field(
        default_factory=_uuid.uuid4,
        sa_column=sa.Column(PgUUID(as_uuid=True), primary_key=True, default=_uuid.uuid4),
    )
    router_id: _uuid.UUID = Field(
        sa_column=sa.Column(PgUUID(as_uuid=True), sa.ForeignKey("router.id", ondelete="CASCADE"), nullable=False, index=True),
    )
    user_id: _uuid.UUID = Field(
        sa_column=sa.Column(PgUUID(as_uuid=True), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True),
    )
    status: str = Field(default="QUEUED", index=True)
    stage: str = Field(default="Queued")
    progress: int = Field(default=0)
    message: str = Field(default="Waiting for a worker")
    payload: dict[str, Any] = Field(sa_column=sa.Column(JSONB, nullable=False))
    events: list[dict[str, Any]] = Field(default_factory=list, sa_column=sa.Column(JSONB, nullable=False))
    result: Optional[dict[str, Any]] = Field(default=None, sa_column=sa.Column(JSONB, nullable=True))
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
