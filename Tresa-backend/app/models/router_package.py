import uuid as _uuid
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlmodel import Field, SQLModel


class RouterPackage(SQLModel, table=True):
    __table_args__ = (
        sa.UniqueConstraint("router_id", "profile", name="uq_router_package_profile"),
        sa.UniqueConstraint("router_id", "package_id", name="uq_router_package_package_id"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    router_id: _uuid.UUID = Field(
        sa_column=sa.Column(PgUUID(as_uuid=True), sa.ForeignKey("router.id", ondelete="CASCADE"), nullable=False, index=True),
    )
    router_name: str = Field(index=True)
    package_id: int = Field(index=True)
    limit: str
    devices: str = Field(default="1")
    data: str
    profile: str = Field(index=True)
    total: str
    priority: int = Field(default=0, index=True)
    speed_type: str = Field(default="Standard", index=True)
    rate_limit: Optional[str] = Field(default=None)
    router_profile_id: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
