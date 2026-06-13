from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.api.routes.portal import check_router_ownership
from app.db.session import SessionDep
from app.schemas.ads import PortalAdResponse, PortalAdUpsert
from app.services.ads import (
    default_portal_ad,
    get_public_router_ad,
    get_router_ad,
    serialize_portal_ad,
    upsert_router_ad,
)

router = APIRouter(tags=["Ads"])


@router.get("/portal/{router_name}/ads", response_model=PortalAdResponse)
def public_portal_ad(router_name: str, session: SessionDep) -> PortalAdResponse:
    return PortalAdResponse(**get_public_router_ad(session, router_name))


@router.get("/routers/{router_id}/ads", response_model=PortalAdResponse)
def router_ad(
    router_id: UUID,
    user: CurrentUser,
    session: SessionDep,
) -> PortalAdResponse:
    db_router = check_router_ownership(session, router_id, user.id)
    ad = get_router_ad(session, db_router.id)
    data = serialize_portal_ad(ad) if ad else default_portal_ad(db_router.id)
    return PortalAdResponse(**data)


@router.put("/routers/{router_id}/ads", response_model=PortalAdResponse)
def save_router_ad(
    router_id: UUID,
    payload: PortalAdUpsert,
    user: CurrentUser,
    session: SessionDep,
) -> PortalAdResponse:
    db_router = check_router_ownership(session, router_id, user.id)
    ad = upsert_router_ad(session, db_router.id, payload)
    return PortalAdResponse(**serialize_portal_ad(ad))
