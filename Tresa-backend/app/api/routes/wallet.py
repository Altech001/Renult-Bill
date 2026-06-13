"""Wallet API routes — branch wallets & platform admin views."""

import hmac
import secrets
from datetime import datetime, timedelta
from html import escape
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func
from sqlmodel import select

from app.api.deps import CurrentUser
from app.db.session import SessionDep
from app.models.branch import Branch
from app.models.branch_wallet import BranchWallet
from app.models.withdrawal_challenge import WithdrawalChallenge
from app.schemas.auth import MessageResponse
from app.schemas.wallet import (
    BranchWalletResponse,
    ClientWalletSummary,
    DepositRequest,
    DepositWithdrawResponse,
    PlatformSummaryResponse,
    WalletTransactionResponse,
    WithdrawalChallengeRequest,
    WithdrawalChallengeResponse,
    WithdrawalConfirmRequest,
    WithdrawalConfirmResponse,
)
from app.services import wallet as wallet_svc
from app.services.email import send_withdrawal_code_email, send_withdrawal_receipt_email
from app.services.security import hash_code
from app.services.telegram import (
    send_user_event,
    user_has_event_connection,
    verified_phone_name,
)

router = APIRouter(prefix="/wallets", tags=["Wallets"])

# ── Helpers ───────────────────────────────────────────────────────────


def _assert_branch_owner(session: SessionDep, branch_id: UUID, user_id: UUID) -> Branch:
    branch = session.exec(
        select(Branch).where(Branch.id == branch_id, Branch.user_id == user_id)
    ).first()
    if not branch:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Branch not found or access denied")
    return branch


def _wallet_response(wallet: BranchWallet, branch_name: str) -> BranchWalletResponse:
    return BranchWalletResponse(
        id=wallet.id,
        branch_id=wallet.branch_id,
        branch_name=branch_name,
        balance=wallet.balance,
        total_deposited=wallet.total_deposited,
        total_withdrawn=wallet.total_withdrawn,
        total_fees_paid=wallet.total_fees_paid,
        is_frozen=wallet.is_frozen,
        created_at=wallet.created_at,
        updated_at=wallet.updated_at,
    )


def _txn_response(t) -> WalletTransactionResponse:
    return WalletTransactionResponse(
        id=t.id,
        wallet_id=t.wallet_id,
        branch_id=t.branch_id,
        amount=t.amount,
        fee_amount=t.fee_amount,
        net_amount=t.net_amount,
        transaction_type=t.transaction_type.lower(),
        reference=t.reference,
        status=t.status,
        created_at=t.created_at,
    )


# ── Branch wallet endpoints ─────────────────────────────────────────


@router.get("/my-wallets", response_model=list[BranchWalletResponse])
def my_wallets(user: CurrentUser, session: SessionDep):
    """All wallets for the current user's branches."""
    rows = wallet_svc.get_user_wallets(session, user.id)
    return [_wallet_response(w, name) for w, name in rows]


@router.get("/branch/{branch_id}", response_model=BranchWalletResponse)
def get_branch_wallet(branch_id: UUID, user: CurrentUser, session: SessionDep):
    branch = _assert_branch_owner(session, branch_id, user.id)
    wallet = wallet_svc.get_wallet_for_branch(session, branch_id)
    return _wallet_response(wallet, branch.name)


@router.get("/branch/{branch_id}/transactions", response_model=list[WalletTransactionResponse])
def branch_transactions(
    branch_id: UUID,
    user: CurrentUser,
    session: SessionDep,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    _assert_branch_owner(session, branch_id, user.id)
    wallet = wallet_svc.get_wallet_for_branch(session, branch_id)
    txns = wallet_svc.list_transactions(session, wallet.id, limit, offset)
    return [_txn_response(t) for t in txns]


@router.post("/branch/{branch_id}/deposit", response_model=DepositWithdrawResponse, status_code=status.HTTP_201_CREATED)
def deposit_to_branch(branch_id: UUID, payload: DepositRequest, user: CurrentUser, session: SessionDep):
    branch = _assert_branch_owner(session, branch_id, user.id)
    wallet = wallet_svc.get_wallet_for_branch(session, branch_id)
    txn, updated_wallet = wallet_svc.deposit(
        session, wallet.id, payload.amount, user.id, payload.reference,
    )
    return DepositWithdrawResponse(
        transaction=_txn_response(txn),
        wallet=_wallet_response(updated_wallet, branch.name),
    )


def _challenge_hash_key(user_email: str, challenge_id: UUID) -> str:
    return f"{user_email}:{challenge_id}"


def _email_hint(email: str) -> str:
    local, domain = email.split("@", 1)
    visible = local[:2]
    return f"{visible}{'*' * max(2, len(local) - len(visible))}@{domain}"


@router.post("/branch/{branch_id}/withdrawal-challenges", response_model=WithdrawalChallengeResponse, status_code=status.HTTP_201_CREATED)
def request_withdrawal_challenge(
    branch_id: UUID,
    payload: WithdrawalChallengeRequest,
    user: CurrentUser,
    session: SessionDep,
) -> WithdrawalChallengeResponse:
    _assert_branch_owner(session, branch_id, user.id)
    wallet = wallet_svc.get_wallet_for_branch(session, branch_id)
    if wallet.is_frozen:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Wallet is frozen")
    if wallet.balance < payload.amount:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Insufficient wallet balance")

    recent_count = session.exec(
        select(func.count(WithdrawalChallenge.id))
        .where(WithdrawalChallenge.user_id == user.id)
        .where(WithdrawalChallenge.created_at >= datetime.utcnow() - timedelta(minutes=15))
    ).one()
    if int(recent_count) >= 5:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many verification requests. Try again later.")

    code = f"{secrets.randbelow(1_000_000):06d}"
    challenge = WithdrawalChallenge(
        user_id=user.id,
        branch_id=branch_id,
        amount=payload.amount,
        recipient_phone=payload.recipient_phone,
        recipient_name=payload.recipient_name,
        provider=payload.provider,
        code_hash="pending",
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    session.add(challenge)
    session.flush()
    challenge.code_hash = hash_code(_challenge_hash_key(user.email, challenge.id), code)
    send_withdrawal_code_email(user.email, user.full_name, code, payload.amount, payload.recipient_phone)
    session.add(challenge)
    session.commit()
    return WithdrawalChallengeResponse(
        challenge_id=challenge.id,
        expires_at=challenge.expires_at,
        email_hint=_email_hint(user.email),
    )


@router.post("/branch/{branch_id}/withdrawal-confirmations", response_model=WithdrawalConfirmResponse, status_code=status.HTTP_201_CREATED)
def confirm_withdrawal(
    branch_id: UUID,
    payload: WithdrawalConfirmRequest,
    user: CurrentUser,
    session: SessionDep,
) -> WithdrawalConfirmResponse:
    branch = _assert_branch_owner(session, branch_id, user.id)
    challenge = session.exec(
        select(WithdrawalChallenge)
        .where(WithdrawalChallenge.id == payload.challenge_id)
        .where(WithdrawalChallenge.user_id == user.id)
        .where(WithdrawalChallenge.branch_id == branch_id)
        .with_for_update()
    ).first()
    if not challenge or challenge.used_at is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Withdrawal challenge is invalid or already used")
    if challenge.expires_at < datetime.utcnow():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Withdrawal verification code has expired")
    if challenge.attempts >= 5:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many incorrect verification attempts")

    expected = hash_code(_challenge_hash_key(user.email, challenge.id), payload.code)
    if not hmac.compare_digest(challenge.code_hash, expected):
        challenge.attempts += 1
        session.add(challenge)
        session.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid verification code")

    challenge.used_at = datetime.utcnow()
    session.add(challenge)
    wallet = wallet_svc.get_wallet_for_branch(session, branch_id)
    txn, updated_wallet = wallet_svc.withdraw(
        session,
        wallet.id,
        challenge.amount,
        user.id,
        challenge.recipient_phone,
    )

    receipt_email_sent = True
    try:
        send_withdrawal_receipt_email(
            user.email,
            str(txn.id),
            challenge.recipient_name,
            challenge.recipient_phone,
            challenge.provider,
            txn.amount,
            txn.fee_amount,
            txn.net_amount,
            txn.created_at.isoformat(),
            branch.name,
        )
    except Exception:
        receipt_email_sent = False

    verified_recipient = (
        verified_phone_name(challenge.recipient_phone)
        if user_has_event_connection(session, user.id, "withdrawal")
        else None
    )
    send_user_event(
        session,
        user.id,
        "withdrawal",
        (
            "<b>Withdrawal receipt</b>\n"
            f"Branch: {escape(branch.name)}\n"
            f"Recipient: {escape(verified_recipient or challenge.recipient_name)}\n"
            f"Identity: {'✅ Verified subscriber name' if verified_recipient else '⚠️ Name could not be verified'}\n"
            f"Phone: {escape(challenge.recipient_phone)}\n"
            f"Provider: {escape(challenge.provider)}\n"
            f"Amount: UGX {txn.amount:,}\n"
            f"Fee: UGX {txn.fee_amount:,}\n"
            f"Net: UGX {txn.net_amount:,}\n"
            f"Transaction: <code>{txn.id}</code>"
        ),
    )

    return WithdrawalConfirmResponse(
        transaction=_txn_response(txn),
        wallet=_wallet_response(updated_wallet, branch.name),
        receipt_email_sent=receipt_email_sent,
    )


# ── Platform admin endpoints ────────────────────────────────────────
# TODO: Replace with proper superadmin role check when available.
# For now, any authenticated user can access (protect behind env flag later).


@router.get("/platform/summary", response_model=PlatformSummaryResponse)
def platform_summary(user: CurrentUser, session: SessionDep):
    data = wallet_svc.platform_summary(session, user.id)
    return PlatformSummaryResponse(**data)


@router.get("/platform/clients", response_model=list[ClientWalletSummary])
def platform_clients(user: CurrentUser, session: SessionDep):
    return wallet_svc.all_client_wallets(session, user.id)


@router.get("/platform/clients/{user_id}", response_model=ClientWalletSummary)
def platform_client_detail(user_id: UUID, user: CurrentUser, session: SessionDep):
    if user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only view your own wallets")
    result = wallet_svc.client_wallets_for_user(session, user_id)
    if not result:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client not found")
    return result


@router.post("/platform/freeze/{wallet_id}", response_model=MessageResponse)
def freeze_wallet(wallet_id: UUID, user: CurrentUser, session: SessionDep):
    wallet_svc.assert_wallet_owner(session, wallet_id, user.id)
    wallet_svc.freeze_wallet(session, wallet_id, frozen=True)
    return MessageResponse(message="Wallet frozen successfully.")


@router.post("/platform/unfreeze/{wallet_id}", response_model=MessageResponse)
def unfreeze_wallet(wallet_id: UUID, user: CurrentUser, session: SessionDep):
    wallet_svc.assert_wallet_owner(session, wallet_id, user.id)
    wallet_svc.freeze_wallet(session, wallet_id, frozen=False)
    return MessageResponse(message="Wallet unfrozen successfully.")
