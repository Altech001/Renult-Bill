"""Client for the Renult Pay mobile money gateway (https://renult-pay.vercel.app).

Wraps the `/v1/pay/initialize` and `/v1/pay/verify/{collection_uuid}` collection
endpoints used to charge a customer's mobile money wallet from the captive
portal, and normalizes the gateway's status strings.
"""

from typing import Any
from uuid import UUID

import requests

from app.core.config import settings


class RenultPayError(Exception):
    """The gateway request failed outright (network error or non-2xx response)."""


# The gateway's response schemas are declared as free-form objects
# (`additionalProperties: true`), so status/identifier values are read
# defensively from whichever of these common keys is present.
_STATUS_KEYS = ("status", "payment_status", "transaction_status", "collection_status", "state")
_COLLECTION_UUID_KEYS = ("collection_uuid", "uuid", "id", "collection_id", "transaction_uuid")

# Real responses wrap the actual collection in `data.transaction`, e.g.
#   {"status": "success", "data": {"transaction": {"uuid": "...", "status": "processing", ...}}}
# The top-level `status`/`message` only describe whether the *API call*
# itself succeeded - NOT whether the mobile money payment succeeded. The
# payment's real status/uuid must always be read from `data.transaction`.
def _transaction(payload: dict[str, Any]) -> dict[str, Any]:
    data = payload.get("data")
    if isinstance(data, dict):
        transaction = data.get("transaction")
        if isinstance(transaction, dict):
            return transaction
    return {}

_SUCCESS_STATUSES = {
    "SUCCESS",
    "SUCCESSFUL",
    "SUCCEEDED",
    "COMPLETED",
    "COMPLETE",
    "PAID",
    "APPROVED",
    "CONFIRMED",
    "DONE",
}
_FAILED_STATUSES = {
    "FAILED",
    "FAILURE",
    "ERROR",
    "ERRORED",
    "CANCELLED",
    "CANCELED",
    "REJECTED",
    "DECLINED",
    "EXPIRED",
    "TIMEOUT",
    "TIMED_OUT",
    "REVERSED",
    "NOT_FOUND",
}


def _headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if settings.renult_pay_api_key:
        headers["Authorization"] = f"Bearer {settings.renult_pay_api_key}"
    return headers


def _request(method: str, path: str, json_body: dict[str, Any] | None = None) -> dict[str, Any]:
    try:
        response = requests.request(
            method,
            f"{settings.renult_pay_base_url}{path}",
            json=json_body,
            headers=_headers(),
            timeout=settings.renult_pay_timeout_seconds,
        )
    except requests.RequestException as exc:
        raise RenultPayError(f"Could not reach the payment gateway: {exc}") from exc

    try:
        data = response.json()
    except ValueError:
        data = {}
    if not isinstance(data, dict):
        data = {}

    if response.status_code >= 400:
        detail = data.get("detail")
        if isinstance(detail, dict):
            detail = detail.get("message") or detail
        message = detail or data.get("message") or response.text
        raise RenultPayError(str(message or "Payment gateway rejected the request"))

    return data


def initialize_collection(
    amount: int,
    phone_number: str,
    reference: UUID,
    description: str | None = None,
) -> dict[str, Any]:
    """Start a mobile money collection. `phone_number` must be E.164 (+256...)."""
    payload: dict[str, Any] = {
        "amount": amount,
        "phone_number": phone_number,
        "country": "UG",
        "reference": str(reference),
    }
    if description:
        payload["description"] = description[:255]
    return _request("POST", "/v1/pay/initialize", payload)


def verify_collection(collection_uuid: str) -> dict[str, Any]:
    """Check the current status of a previously initialized collection."""
    return _request("GET", f"/v1/pay/verify/{collection_uuid}")


def send_money(
    amount: int,
    phone_number: str,
    reference: UUID,
    description: str | None = None,
) -> dict[str, Any]:
    """Disburse money to a recipient's mobile money wallet. `phone_number` must be E.164 (+256...)."""
    payload: dict[str, Any] = {
        "amount": amount,
        "phone_number": phone_number,
        "country": "UG",
        "reference": str(reference),
    }
    if description:
        payload["description"] = description[:255]
    return _request("POST", "/send-money", payload)


def get_send_money_status(reference: str) -> dict[str, Any]:
    """Check the current status of a previously requested disbursement."""
    return _request("GET", f"/send-money/{reference}")


def extract_status(payload: dict[str, Any]) -> str | None:
    transaction = _transaction(payload)
    for key in _STATUS_KEYS:
        value = transaction.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def extract_collection_uuid(payload: dict[str, Any]) -> str | None:
    transaction = _transaction(payload)
    for key in _COLLECTION_UUID_KEYS:
        value = transaction.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def normalize_status(raw: str | None) -> str:
    """Collapse the gateway's many possible status spellings to PENDING/SUCCESS/FAILED."""
    value = (raw or "").strip().upper().replace("-", "_").replace(" ", "_")
    if value in _SUCCESS_STATUSES:
        return "SUCCESS"
    if value in _FAILED_STATUSES:
        return "FAILED"
    return "PENDING"
