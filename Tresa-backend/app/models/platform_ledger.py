import uuid as _uuid
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlmodel import Field, SQLModel


class PlatformLedgerEntry(SQLModel, table=True):
    id: _uuid.UUID = Field(
        default_factory=_uuid.uuid4,
        sa_column=sa.Column(PgUUID(as_uuid=True), primary_key=True, default=_uuid.uuid4),
    )
    branch_wallet_id: _uuid.UUID = Field(
        sa_column=sa.Column(
            PgUUID(as_uuid=True),
            sa.ForeignKey("branchwallet.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
    branch_id: _uuid.UUID = Field(
        sa_column=sa.Column(PgUUID(as_uuid=True), nullable=False, index=True),
    )
    user_id: _uuid.UUID = Field(
        sa_column=sa.Column(PgUUID(as_uuid=True), nullable=False, index=True),
    )
    amount: int
    fee_type: str = Field(index=True)  # DEPOSIT_FEE | WITHDRAWAL_FEE
    source_amount: int
    fee_rate: float
    reference: Optional[str] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
