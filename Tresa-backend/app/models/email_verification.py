import uuid as _uuid
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlmodel import Field, SQLModel


class EmailVerification(SQLModel, table=True):
    id: _uuid.UUID = Field(
        default_factory=_uuid.uuid4,
        sa_column=sa.Column(PgUUID(as_uuid=True), primary_key=True, default=_uuid.uuid4),
    )
    email: str = Field(index=True)
    code_hash: str
    expires_at: datetime
    used_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
