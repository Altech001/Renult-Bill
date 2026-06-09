from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select

from app.api.deps import CurrentUser
from app.db.session import SessionDep
from app.models.branch import Branch
from app.models.staff import Staff
from app.models.ticket import Ticket
from app.models.ticket_category import TicketCategory
from app.schemas.auth import MessageResponse
from app.schemas.ticket import (
    TicketCategoryResponse,
    TicketCreate,
    TicketResponse,
    TicketUpdate,
)

router = APIRouter(tags=["Tickets"])


def check_branch_ownership(session: SessionDep, branch_id: UUID, user_id: UUID) -> Branch:
    """Helper to verify that a branch exists and belongs to the current user."""
    branch = session.get(Branch, branch_id)
    if branch and branch.user_id != user_id:
        staff = session.exec(
            select(Staff)
            .where(Staff.user_id == user_id)
            .where(Staff.branch_id == branch_id)
            .where(Staff.is_active.is_(True))
        ).first()
        if not staff or "support" not in set(staff.permissions.split(",")):
            branch = None
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found or access denied",
        )
    return branch


def get_ticket_with_ownership(session: SessionDep, ticket_id: UUID, user_id: UUID) -> Ticket:
    """Helper to retrieve a ticket after verifying ownership of its branch."""
    ticket = session.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    check_branch_ownership(session, ticket.branch_id, user_id)
    return ticket


@router.get("/tickets/categories", response_model=list[TicketCategoryResponse])
def list_categories(
    user: CurrentUser,
    session: SessionDep,
) -> list[TicketCategoryResponse]:
    """Get all pre-seeded ticket categories from the database."""
    categories = session.exec(select(TicketCategory).order_by(TicketCategory.name)).all()
    return [
        TicketCategoryResponse(
            id=cat.id,
            name=cat.name,
            description=cat.description,
        )
        for cat in categories
    ]


@router.get("/branches/{branch_id}/tickets", response_model=list[TicketResponse])
def list_branch_tickets(
    branch_id: UUID,
    user: CurrentUser,
    session: SessionDep,
    status_filter: str | None = Query(default=None),
    priority_filter: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1),
    offset: int = Query(default=0, ge=0),
) -> list[TicketResponse]:
    """Retrieve all support tickets for a specific branch."""
    check_branch_ownership(session, branch_id, user.id)

    query = select(Ticket).where(Ticket.branch_id == branch_id)
    if status_filter:
        query = query.where(Ticket.status == status_filter.upper())
    if priority_filter:
        query = query.where(Ticket.priority == priority_filter.upper())

    tickets = session.exec(
        query.order_by(Ticket.created_at.desc()).offset(offset).limit(limit)
    ).all()

    return [
        TicketResponse(
            id=t.id,
            branch_id=t.branch_id,
            category_id=t.category_id,
            title=t.title,
            description=t.description,
            priority=t.priority,
            status=t.status,
            assigned_staff_id=t.assigned_staff_id,
            created_at=t.created_at,
            updated_at=t.updated_at,
        )
        for t in tickets
    ]


@router.post("/branches/{branch_id}/tickets", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_branch_ticket(
    branch_id: UUID,
    payload: TicketCreate,
    user: CurrentUser,
    session: SessionDep,
) -> TicketResponse:
    """Create a new support/campaign ticket for a branch."""
    check_branch_ownership(session, branch_id, user.id)

    # Verify the category exists
    category = session.get(TicketCategory, payload.category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID provided",
        )

    # Validate Priority
    priority = (payload.priority or "MEDIUM").upper()
    if priority not in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Priority must be one of LOW, MEDIUM, HIGH, CRITICAL",
        )

    ticket = Ticket(
        branch_id=branch_id,
        category_id=payload.category_id,
        title=payload.title.strip(),
        description=payload.description.strip(),
        priority=priority,
        status="OPEN",
    )
    session.add(ticket)
    session.commit()
    session.refresh(ticket)

    return TicketResponse(
        id=ticket.id,
        branch_id=ticket.branch_id,
        category_id=ticket.category_id,
        title=ticket.title,
        description=ticket.description,
        priority=ticket.priority,
        status=ticket.status,
        assigned_staff_id=ticket.assigned_staff_id,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
    )


@router.put("/tickets/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: UUID,
    payload: TicketUpdate,
    user: CurrentUser,
    session: SessionDep,
) -> TicketResponse:
    """Update a ticket's status, priority, description, or assigned staff member."""
    ticket = get_ticket_with_ownership(session, ticket_id, user.id)

    if payload.category_id is not None:
        category = session.get(TicketCategory, payload.category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid category ID provided",
            )
        ticket.category_id = payload.category_id

    if payload.title is not None:
        ticket.title = payload.title.strip()

    if payload.description is not None:
        ticket.description = payload.description.strip()

    if payload.priority is not None:
        priority = payload.priority.upper()
        if priority not in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Priority must be one of LOW, MEDIUM, HIGH, CRITICAL",
            )
        ticket.priority = priority

    if payload.status is not None:
        status_val = payload.status.upper()
        if status_val not in {"OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Status must be one of OPEN, IN_PROGRESS, RESOLVED, CLOSED",
            )
        ticket.status = status_val

    if payload.assigned_staff_id is not None:
        # Check if staff belongs to the same branch
        staff = session.get(Staff, payload.assigned_staff_id)
        if not staff or staff.branch_id != ticket.branch_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned staff member must belong to the same branch as the ticket",
            )
        ticket.assigned_staff_id = payload.assigned_staff_id

    ticket.updated_at = datetime.utcnow()
    session.add(ticket)
    session.commit()
    session.refresh(ticket)

    return TicketResponse(
        id=ticket.id,
        branch_id=ticket.branch_id,
        category_id=ticket.category_id,
        title=ticket.title,
        description=ticket.description,
        priority=ticket.priority,
        status=ticket.status,
        assigned_staff_id=ticket.assigned_staff_id,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
    )


@router.delete("/tickets/{ticket_id}", response_model=MessageResponse)
def delete_ticket(
    ticket_id: UUID,
    user: CurrentUser,
    session: SessionDep,
) -> MessageResponse:
    """Delete a support ticket."""
    ticket = get_ticket_with_ownership(session, ticket_id, user.id)
    session.delete(ticket)
    session.commit()
    return MessageResponse(message="Ticket deleted successfully.")
