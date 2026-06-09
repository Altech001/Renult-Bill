from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select

from app.api.deps import CurrentUser
from app.db.session import SessionDep
from app.models.branch import Branch
from app.models.staff import Staff
from app.schemas.auth import MessageResponse
from app.schemas.branch import BranchCreate, BranchResponse, BranchUpdate
from app.services.avatar import get_branch_avatar
from app.services.wallet import ensure_wallet

router = APIRouter(prefix="/branches", tags=["Branches"])


@router.get("", response_model=list[BranchResponse])
def list_branches(
    user: CurrentUser,
    session: SessionDep,
    limit: int = Query(default=100, ge=1),
    offset: int = Query(default=0, ge=0),
) -> list[BranchResponse]:
    """Retrieve all branches belonging to the current user."""
    staff = session.exec(select(Staff).where(Staff.user_id == user.id).where(Staff.is_active.is_(True))).first()
    query = select(Branch)
    if staff:
        query = query.where(Branch.id == staff.branch_id)
    else:
        query = query.where(Branch.user_id == user.id)
    branches = session.exec(query.offset(offset).limit(limit)).all()
    return [
        BranchResponse(
            id=b.id,
            name=b.name,
            avatar_url=b.avatar_url,
            user_id=b.user_id,
            created_at=b.created_at,
            updated_at=b.updated_at,
        )
        for b in branches
    ]


@router.post("", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
def create_branch(
    payload: BranchCreate,
    user: CurrentUser,
    session: SessionDep,
) -> BranchResponse:
    """Create a new branch for the current user, auto-generating a Dicebear avatar."""
    branch = Branch(
        name=payload.name.strip(),
        avatar_url=get_branch_avatar(payload.name),
        user_id=user.id,
    )
    session.add(branch)
    session.commit()
    session.refresh(branch)
    # Auto-create wallet for this branch
    ensure_wallet(session, branch.id)
    session.commit()
    return BranchResponse(
        id=branch.id,
        name=branch.name,
        avatar_url=branch.avatar_url,
        user_id=branch.user_id,
        created_at=branch.created_at,
        updated_at=branch.updated_at,
    )


@router.get("/{branch_id}", response_model=BranchResponse)
def get_branch(
    branch_id: UUID,
    user: CurrentUser,
    session: SessionDep,
) -> BranchResponse:
    """Get details of a specific branch."""
    branch = session.get(Branch, branch_id)
    staff = session.exec(select(Staff).where(Staff.user_id == user.id).where(Staff.is_active.is_(True))).first()
    if branch and branch.user_id != user.id and (not staff or staff.branch_id != branch_id):
        branch = None
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")

    return BranchResponse(
        id=branch.id,
        name=branch.name,
        avatar_url=branch.avatar_url,
        user_id=branch.user_id,
        created_at=branch.created_at,
        updated_at=branch.updated_at,
    )


@router.put("/{branch_id}", response_model=BranchResponse)
def update_branch(
    branch_id: UUID,
    payload: BranchUpdate,
    user: CurrentUser,
    session: SessionDep,
) -> BranchResponse:
    """Update a branch's name or avatar URL."""
    branch = session.exec(
        select(Branch)
        .where(Branch.id == branch_id)
        .where(Branch.user_id == user.id)
    ).first()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")

    if payload.name is not None:
        branch.name = payload.name.strip()
        # If user didn't explicitly override avatar, update it with new name seed
        if payload.avatar_url is None:
            branch.avatar_url = get_branch_avatar(branch.name)

    if payload.avatar_url is not None:
        branch.avatar_url = payload.avatar_url.strip()

    branch.updated_at = datetime.utcnow()
    session.add(branch)
    session.commit()
    session.refresh(branch)

    return BranchResponse(
        id=branch.id,
        name=branch.name,
        avatar_url=branch.avatar_url,
        user_id=branch.user_id,
        created_at=branch.created_at,
        updated_at=branch.updated_at,
    )


@router.delete("/{branch_id}", response_model=MessageResponse)
def delete_branch(
    branch_id: UUID,
    user: CurrentUser,
    session: SessionDep,
) -> MessageResponse:
    """Delete a branch. Cascades deletion to staff and tickets."""
    branch = session.exec(
        select(Branch)
        .where(Branch.id == branch_id)
        .where(Branch.user_id == user.id)
    ).first()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")

    session.delete(branch)
    session.commit()
    return MessageResponse(message="Branch deleted successfully.")
