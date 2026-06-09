from fastapi import APIRouter

from app.schemas.auth import MessageResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=MessageResponse)
def health() -> MessageResponse:
    return MessageResponse(message="Renult Billing System is running")


