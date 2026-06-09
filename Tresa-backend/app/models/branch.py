import uuid as _uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlmodel import Field, SQLModel


class Branch(SQLModel, table=True):
    id: _uuid.UUID = Field(
        default_factory=_uuid.uuid4,
        sa_column=sa.Column(PgUUID(as_uuid=True), primary_key=True, default=_uuid.uuid4),
    )
    name: str
    avatar_url: str
    user_id: _uuid.UUID = Field(
        sa_column=sa.Column(PgUUID(as_uuid=True), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True),
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
