from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class MessageContactResponse(BaseModel):
    phone_number: str
    wifi_name: str
    voucher_code: str
    purchase_count: int
    last_purchase_at: datetime


class MessageContactListResponse(BaseModel):
    contacts: list[MessageContactResponse]
    total: int


class BulkMessageRequest(BaseModel):
    phone_numbers: list[str] = Field(min_length=1, max_length=100)
    message: str = Field(min_length=1, max_length=1000)
    use_voucher_template: bool = False


class MessageSendResult(BaseModel):
    phone_number: str
    success: bool
    message: str
    provider_response: Any = None


class BulkMessageResponse(BaseModel):
    success: bool
    sent: int
    failed: int
    results: list[MessageSendResult]
    cost_per_sms: int
    total_charged: int
    wallet_balance: int
