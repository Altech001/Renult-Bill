import uuid as _uuid
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlmodel import Field, SQLModel


class Wallet(SQLModel, table=True):
    __table_args__ = (
        sa.UniqueConstraint("router_name", "phone_number", name="uq_wallet_router_phone"),
    )

    id: _uuid.UUID = Field(
        default_factory=_uuid.uuid4,
        sa_column=sa.Column(PgUUID(as_uuid=True), primary_key=True, default=_uuid.uuid4),
    )
    router_name: str = Field(index=True)
    phone_number: str = Field(index=True)
    balance: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class WalletTransaction(SQLModel, table=True):
    id: _uuid.UUID = Field(
        default_factory=_uuid.uuid4,
        sa_column=sa.Column(PgUUID(as_uuid=True), primary_key=True, default=_uuid.uuid4),
    )
    wallet_id: _uuid.UUID = Field(
        sa_column=sa.Column(PgUUID(as_uuid=True), sa.ForeignKey("wallet.id", ondelete="CASCADE"), nullable=False, index=True),
    )
    router_name: str = Field(index=True)
    phone_number: str = Field(index=True)
    amount: int
    transaction_type: str = Field(default="CREDIT")
    source: str = Field(default="PORTAL_PAYMENT")
    reference: Optional[str] = Field(default=None, index=True)
    status: str = Field(default="COMPLETED", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
