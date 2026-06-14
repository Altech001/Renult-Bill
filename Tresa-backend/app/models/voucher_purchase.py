import uuid as _uuid
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlmodel import Field, SQLModel


class VoucherPurchase(SQLModel, table=True):
    id: _uuid.UUID = Field(
        default_factory=_uuid.uuid4,
        sa_column=sa.Column(PgUUID(as_uuid=True), primary_key=True, default=_uuid.uuid4),
    )
    wallet_id: _uuid.UUID = Field(
        sa_column=sa.Column(PgUUID(as_uuid=True), sa.ForeignKey("wallet.id", ondelete="CASCADE"), nullable=False, index=True),
    )
    router_name: str = Field(index=True)
    phone_number: str = Field(index=True)
    voucher_code: str = Field(index=True, unique=True)
    package_id: int = Field(index=True)
    profile: str
    speed_type: str
    amount: int
    devices: str
    data: str
    status: str = Field(default="PAID", index=True)
    payment_reference: Optional[str] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    activated_at: Optional[datetime] = Field(default=None, index=True)
    expires_at: Optional[datetime] = Field(default=None, index=True)
