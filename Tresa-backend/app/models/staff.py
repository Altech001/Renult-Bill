#type: ignore

import uuid as _uuid
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlmodel import Field, SQLModel


class Staff(SQLModel, table=True):
    id: _uuid.UUID = Field(
        default_factory=_uuid.uuid4,
        sa_column=sa.Column(PgUUID(as_uuid=True), primary_key=True, default=_uuid.uuid4),
    )
    branch_id: _uuid.UUID = Field(
        sa_column=sa.Column(PgUUID(as_uuid=True), sa.ForeignKey("branch.id", ondelete="CASCADE"), nullable=False, index=True),
    )
    user_id: Optional[_uuid.UUID] = Field(
        default=None,
        sa_column=sa.Column(PgUUID(as_uuid=True), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True, index=True),
    )
    full_name: str
    email: str = Field(index=True)
    phone_number: Optional[str] = Field(default=None)
    role: str = Field(default="staff")  # e.g., admin, manager, support, staff
    permissions: str = Field(default="dashboard,routers,sales,vouchers")
    share_percentage: float = Field(default=0)
    is_active: bool = Field(default=True, index=True)
    avatar_url: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
