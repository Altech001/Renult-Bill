import re
from datetime import datetime, timedelta

from app.models.voucher_purchase import VoucherPurchase


_UNIT_SECONDS = {
    "s": 1,
    "second": 1,
    "seconds": 1,
    "m": 60,
    "minute": 60,
    "minutes": 60,
    "h": 3600,
    "hour": 3600,
    "hours": 3600,
    "d": 86400,
    "day": 86400,
    "days": 86400,
    "w": 604800,
    "week": 604800,
    "weeks": 604800,
    "month": 2592000,
    "months": 2592000,
}


def duration_to_timedelta(value: str | None) -> timedelta | None:
    normalized = (value or "").strip().lower().replace(" ", "")
    if not normalized:
        return None

    parts = re.findall(r"(\d+)(months?|weeks?|days?|hours?|minutes?|seconds?|[smhdw])", normalized)
    if not parts or "".join(f"{amount}{unit}" for amount, unit in parts) != normalized:
        return None

    seconds = sum(int(amount) * _UNIT_SECONDS[unit] for amount, unit in parts)
    return timedelta(seconds=seconds) if seconds > 0 else None


def router_uptime_duration(value: object) -> timedelta | None:
    normalized = str(value or "").strip().lower()
    if not normalized:
        return None
    duration = duration_to_timedelta(normalized)
    if duration is not None:
        return duration if duration.total_seconds() > 0 else None
    return timedelta(microseconds=1) if normalized not in {"0", "00:00:00", "0s"} else None


def router_uptime_has_usage(value: object) -> bool:
    return router_uptime_duration(value) is not None


def update_voucher_lifecycle(
    voucher: VoucherPurchase,
    *,
    package_limit: str | None,
    is_online: bool,
    has_router_usage: bool,
    router_uptime: timedelta | None = None,
    now: datetime | None = None,
) -> str:
    current_time = now or datetime.utcnow()
    if voucher.activated_at is None and (is_online or has_router_usage):
        voucher.activated_at = current_time - router_uptime if router_uptime else current_time

    if voucher.activated_at is not None and voucher.expires_at is None:
        duration = duration_to_timedelta(package_limit)
        if duration is not None:
            voucher.expires_at = voucher.activated_at + duration

    if voucher.activated_at is None:
        voucher.status = "PROVISIONED"
    elif voucher.expires_at is not None and current_time >= voucher.expires_at:
        voucher.status = "EXPIRED"
    else:
        voucher.status = "ONLINE" if is_online else "OFFLINE"

    return voucher.status
