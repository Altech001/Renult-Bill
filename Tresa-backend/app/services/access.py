from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.branch import Branch
from app.models.staff import Staff
from app.models.user import User


def staff_profile(session: Session, user_id: UUID) -> Staff | None:
    return session.exec(
        select(Staff)
        .where(Staff.user_id == user_id)
        .where(Staff.is_active.is_(True))
    ).first()


def is_owner(user: User, branch: Branch) -> bool:
    return branch.user_id == user.id


def permissions_for(staff: Staff | None) -> set[str]:
    if not staff:
        return set()
    return {item.strip() for item in (staff.permissions or "").split(",") if item.strip()}


def require_branch_access(
    session: Session,
    branch_id: UUID,
    user: User,
    permission: str | None = None,
) -> tuple[Branch, Staff | None]:
    branch = session.get(Branch, branch_id)
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")
    if is_owner(user, branch):
        return branch, None

    staff = staff_profile(session, user.id)
    if not staff or staff.branch_id != branch_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found or access denied")
    if permission and permission not in permissions_for(staff):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission for this action")
    return branch, staff


def require_owner(session: Session, branch_id: UUID, user: User) -> Branch:
    branch = session.get(Branch, branch_id)
    if not branch or branch.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found or access denied")
    return branch

