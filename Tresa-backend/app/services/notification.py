import uuid as _uuid
from datetime import datetime

from sqlmodel import Session

from app.models.notification import Notification


def notify(
    session: Session,
    user_id: _uuid.UUID,
    category: str,
    title: str,
    body: str,
) -> Notification:
    """Create and persist a notification for a user."""
    notification = Notification(
        user_id=user_id,
        category=category,
        title=title,
        body=body,
    )
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification


# ── Account events ───────────────────────────────────────────────

def notify_registration(session: Session, user_id: _uuid.UUID, full_name: str) -> Notification:
    return notify(
        session, user_id, "account",
        "Welcome to Renult",
        f"Hi {full_name}, your account has been created. Please verify your email to get started.",
    )


def notify_email_verified(session: Session, user_id: _uuid.UUID) -> Notification:
    return notify(
        session, user_id, "account",
        "Email verified",
        "Your email address has been successfully verified. Your account is now fully active.",
    )


def notify_google_linked(session: Session, user_id: _uuid.UUID) -> Notification:
    return notify(
        session, user_id, "account",
        "Google account linked",
        "Your Google account has been linked. You can now sign in with Google.",
    )


def notify_welcome(session: Session, user_id: _uuid.UUID, full_name: str) -> Notification:
    return notify(
        session, user_id, "account",
        "Account ready",
        f"Welcome aboard, {full_name}! Your Renult account is fully set up and ready to use.",
    )


# ── Security events ─────────────────────────────────────────────

def notify_login(session: Session, user_id: _uuid.UUID) -> Notification:
    return notify(
        session, user_id, "security",
        "New sign-in",
        f"A new sign-in to your account was detected at {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC.",
    )


def notify_password_set(session: Session, user_id: _uuid.UUID) -> Notification:
    return notify(
        session, user_id, "security",
        "Password set",
        "A password has been set on your account. You can now sign in with email and password.",
    )


def notify_password_changed(session: Session, user_id: _uuid.UUID) -> Notification:
    return notify(
        session, user_id, "security",
        "Password changed",
        "Your password was changed successfully. If you didn't do this, reset your password immediately.",
    )


def notify_password_reset_requested(session: Session, user_id: _uuid.UUID) -> Notification:
    return notify(
        session, user_id, "security",
        "Password reset requested",
        "A password reset code was sent to your email. If you didn't request this, you can ignore it.",
    )


def notify_password_reset_complete(session: Session, user_id: _uuid.UUID) -> Notification:
    return notify(
        session, user_id, "security",
        "Password reset complete",
        "Your password has been reset successfully. You are now signed in with your new password.",
    )
