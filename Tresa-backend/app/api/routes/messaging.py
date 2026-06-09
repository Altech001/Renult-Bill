from collections import Counter
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import col, select

from app.api.deps import CurrentUser
from app.db.session import SessionDep
from app.models.router import Router
from app.models.voucher_purchase import VoucherPurchase
from app.schemas.messaging import (
    BulkMessageRequest,
    BulkMessageResponse,
    MessageContactListResponse,
    MessageContactResponse,
    MessageSendResult,
)
from app.services.access import require_branch_access
from app.services.messaging import (
    normalize_sms_phone,
    render_voucher_message,
    send_sms,
    sms_was_accepted,
)

router = APIRouter(tags=["Messaging"])


def branch_vouchers(session: SessionDep, branch_id: UUID) -> list[VoucherPurchase]:
    router_names = session.exec(
        select(Router.name).where(Router.branch_id == branch_id)
    ).all()
    normalized_names = [name.strip().upper() for name in router_names]
    if not normalized_names:
        return []
    return list(
        session.exec(
            select(VoucherPurchase)
            .where(col(VoucherPurchase.router_name).in_(normalized_names))
            .where(VoucherPurchase.phone_number != "BULK")
            .order_by(VoucherPurchase.created_at.desc())
        ).all()
    )


def contact_map(session: SessionDep, branch_id: UUID) -> dict[str, MessageContactResponse]:
    vouchers = branch_vouchers(session, branch_id)
    counts: Counter[str] = Counter()
    contacts: dict[str, MessageContactResponse] = {}

    for voucher in vouchers:
        try:
            phone_number = normalize_sms_phone(voucher.phone_number)
        except ValueError:
            continue
        counts[phone_number] += 1
        if phone_number not in contacts:
            contacts[phone_number] = MessageContactResponse(
                phone_number=phone_number,
                wifi_name=voucher.router_name,
                voucher_code=voucher.voucher_code,
                purchase_count=0,
                last_purchase_at=voucher.created_at,
            )

    for phone_number, contact in contacts.items():
        contact.purchase_count = counts[phone_number]
    return contacts


@router.get(
    "/branches/{branch_id}/message-contacts",
    response_model=MessageContactListResponse,
)
def list_message_contacts(
    branch_id: UUID,
    user: CurrentUser,
    session: SessionDep,
    search: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=200, ge=1, le=500),
) -> MessageContactListResponse:
    require_branch_access(session, branch_id, user, "support")
    contacts = list(contact_map(session, branch_id).values())
    query = (search or "").strip().lower()
    if query:
        contacts = [
            contact
            for contact in contacts
            if query in contact.phone_number.lower()
            or query in contact.wifi_name.lower()
            or query in contact.voucher_code.lower()
        ]
    return MessageContactListResponse(contacts=contacts[:limit], total=len(contacts))


@router.post(
    "/branches/{branch_id}/messages/send",
    response_model=BulkMessageResponse,
)
def send_bulk_message(
    branch_id: UUID,
    payload: BulkMessageRequest,
    user: CurrentUser,
    session: SessionDep,
) -> BulkMessageResponse:
    require_branch_access(session, branch_id, user, "support")
    contacts = contact_map(session, branch_id)

    requested_numbers: list[str] = []
    for value in payload.phone_numbers:
        try:
            phone_number = normalize_sms_phone(value)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
        if payload.use_voucher_template and phone_number not in contacts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{phone_number} has no voucher token for this branch",
            )
        if phone_number not in requested_numbers:
            requested_numbers.append(phone_number)

    message = payload.message.strip()
    if payload.use_voucher_template and "{code}" not in message and "{}" not in message:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Voucher messages must include {code} or {}",
        )

    results: list[MessageSendResult] = []
    try:
        if payload.use_voucher_template:
            for phone_number in requested_numbers:
                contact = contacts[phone_number]
                rendered = render_voucher_message(message, contact.wifi_name, contact.voucher_code)
                try:
                    response = send_sms(rendered, [phone_number])
                    accepted = sms_was_accepted(response, phone_number)
                    results.append(
                        MessageSendResult(
                            phone_number=phone_number,
                            success=accepted,
                            message=rendered,
                            provider_response=response,
                        )
                    )
                except RuntimeError:
                    raise
                except Exception as exc:
                    results.append(
                        MessageSendResult(
                            phone_number=phone_number,
                            success=False,
                            message=str(exc),
                        )
                    )
        else:
            response = send_sms(message, requested_numbers)
            results = [
                MessageSendResult(
                    phone_number=phone_number,
                    success=sms_was_accepted(response, phone_number),
                    message=message,
                    provider_response=response,
                )
                for phone_number in requested_numbers
            ]
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Africa's Talking SMS request failed: {exc}",
        ) from exc

    sent = sum(result.success for result in results)
    failed = len(results) - sent
    return BulkMessageResponse(
        success=failed == 0,
        sent=sent,
        failed=failed,
        results=results,
    )
