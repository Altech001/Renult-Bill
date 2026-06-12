import uuid as _uuid
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlmodel import Field, SQLModel


class PortalPayment(SQLModel, table=True):
    """A mobile money collection initiated from a captive portal voucher purchase."""

    id: _uuid.UUID = Field(
        default_factory=_uuid.uuid4,
        sa_column=sa.Column(PgUUID(as_uuid=True), primary_key=True, default=_uuid.uuid4),
    )
    reference: _uuid.UUID = Field(
        default_factory=_uuid.uuid4,
        sa_column=sa.Column(PgUUID(as_uuid=True), nullable=False, unique=True, index=True, default=_uuid.uuid4),
    )
    collection_uuid: Optional[str] = Field(default=None, index=True)
    router_name: str = Field(index=True)
    phone_number: str = Field(index=True)
    package_id: int
    amount: int
    buy_for: str = Field(default="self")
    status: str = Field(default="PENDING", index=True)
    gateway_status: Optional[str] = Field(default=None)
    voucher_id: Optional[_uuid.UUID] = Field(
        default=None,
        sa_column=sa.Column(
            PgUUID(as_uuid=True), sa.ForeignKey("voucherpurchase.id", ondelete="SET NULL"), nullable=True
        ),
    )
    error: Optional[str] = Field(default=None)
    gateway_response: Optional[str] = Field(default=None, sa_column=sa.Column(sa.Text, nullable=True))
    last_checked_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
