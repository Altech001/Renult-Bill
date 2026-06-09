from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class NotificationPreferenceUpdate(BaseModel):
    email_router_alerts: bool
    sms_router_alerts: bool
    sms_phone_number: str | None = Field(default=None, max_length=30)


class NotificationPreferenceResponse(NotificationPreferenceUpdate):
    sms_cost_ugx: int


class RouterMonitorItem(BaseModel):
    router_id: UUID
    router_name: str
    status: str
    configured: bool
    checked_at: datetime | None
    uptime_seconds: int | None
    error: str | None


class RouterMonitorSummary(BaseModel):
    status: str
    online: int
    offline: int
    unknown: int
    total: int
    last_checked_at: datetime | None
    routers: list[RouterMonitorItem]


class SnmpEnableResponse(BaseModel):
    success: bool
    router_id: UUID
    router_name: str
    physical_router_enabled: bool
    chr_forwarding_enabled: bool
    verified: bool
    uptime_seconds: int | None = None
    message: str
