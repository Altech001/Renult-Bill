import uuid as _uuid
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlmodel import Field, SQLModel


class RouterAuditLog(SQLModel, table=True):
    __tablename__ = "router_audit_log"

    id: _uuid.UUID = Field(
        default_factory=_uuid.uuid4,
        sa_column=sa.Column(PgUUID(as_uuid=True), primary_key=True, default=_uuid.uuid4),
    )
    router_id: Optional[_uuid.UUID] = Field(
        default=None,
        sa_column=sa.Column(
            PgUUID(as_uuid=True),
            sa.ForeignKey("router.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )
    event: str = Field(index=True)
    details: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class RouterErrorLog(SQLModel, table=True):
    __tablename__ = "router_error_log"

    id: _uuid.UUID = Field(
        default_factory=_uuid.uuid4,
        sa_column=sa.Column(PgUUID(as_uuid=True), primary_key=True, default=_uuid.uuid4),
    )
    router_id: Optional[_uuid.UUID] = Field(
        default=None,
        sa_column=sa.Column(
            PgUUID(as_uuid=True),
            sa.ForeignKey("router.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )
    operation: str = Field(index=True)
    message: str
    traceback: str
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
