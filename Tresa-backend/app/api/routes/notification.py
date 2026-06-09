from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import col, func, select

from app.api.deps import CurrentUser
from app.db.session import SessionDep
from app.models.notification import Notification
from app.schemas.auth import MessageResponse
from app.schemas.notification import MarkReadRequest, NotificationListResponse, NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    user: CurrentUser,
    session: SessionDep,
    category: str | None = None,
    unread_only: bool = False,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> NotificationListResponse:
    base = select(Notification).where(Notification.user_id == user.id)
    if category:
        base = base.where(Notification.category == category)
    if unread_only:
        base = base.where(Notification.is_read == False)  # noqa: E712

    total = session.exec(select(func.count()).select_from(base.subquery())).one()

    items = session.exec(
        base.order_by(col(Notification.created_at).desc()).offset(offset).limit(limit)
    ).all()

    unread_count = session.exec(
        select(func.count())
        .where(Notification.user_id == user.id)
        .where(Notification.is_read == False)  # noqa: E712
    ).one()

    return NotificationListResponse(
        notifications=[
            NotificationResponse(
                id=n.id,
                category=n.category,
                title=n.title,
                body=n.body,
                is_read=n.is_read,
                read_at=n.read_at,
                created_at=n.created_at,
            )
            for n in items
        ],
        unread_count=unread_count,
        total=total,
    )


@router.post("/mark-read", response_model=MessageResponse)
def mark_read(payload: MarkReadRequest, user: CurrentUser, session: SessionDep) -> MessageResponse:
    notifications = session.exec(
        select(Notification)
        .where(Notification.user_id == user.id)
        .where(col(Notification.id).in_(payload.notification_ids))
        .where(Notification.is_read == False)  # noqa: E712
    ).all()

    now = datetime.utcnow()
    for n in notifications:
        n.is_read = True
        n.read_at = now
        session.add(n)
    session.commit()
    return MessageResponse(message=f"{len(notifications)} notification(s) marked as read.")


@router.post("/mark-all-read", response_model=MessageResponse)
def mark_all_read(user: CurrentUser, session: SessionDep) -> MessageResponse:
    notifications = session.exec(
        select(Notification)
        .where(Notification.user_id == user.id)
        .where(Notification.is_read == False)  # noqa: E712
    ).all()

    now = datetime.utcnow()
    for n in notifications:
        n.is_read = True
        n.read_at = now
        session.add(n)
    session.commit()
    return MessageResponse(message=f"{len(notifications)} notification(s) marked as read.")


@router.get("/unread-count")
def unread_count(user: CurrentUser, session: SessionDep) -> dict:
    count = session.exec(
        select(func.count())
        .where(Notification.user_id == user.id)
        .where(Notification.is_read == False)  # noqa: E712
    ).one()
    return {"unread_count": count}


@router.delete("/{notification_id}", response_model=MessageResponse)
def delete_notification(notification_id: str, user: CurrentUser, session: SessionDep) -> MessageResponse:
    notification = session.exec(
        select(Notification)
        .where(Notification.id == notification_id)
        .where(Notification.user_id == user.id)
    ).first()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    session.delete(notification)
    session.commit()
    return MessageResponse(message="Notification deleted.")
