import uuid as _uuid
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlmodel import Field, SQLModel


class WithdrawalChallenge(SQLModel, table=True):
    id: _uuid.UUID = Field(default_factory=_uuid.uuid4, sa_column=sa.Column(PgUUID(as_uuid=True), primary_key=True, default=_uuid.uuid4))
    user_id: _uuid.UUID = Field(sa_column=sa.Column(PgUUID(as_uuid=True), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True))
    branch_id: _uuid.UUID = Field(sa_column=sa.Column(PgUUID(as_uuid=True), sa.ForeignKey("branch.id", ondelete="CASCADE"), nullable=False, index=True))
    amount: int
    recipient_phone: str
    recipient_name: str
    provider: str
    code_hash: str
    expires_at: datetime
    attempts: int = Field(default=0)
    used_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
