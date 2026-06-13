from datetime import datetime
from uuid import UUID

from sqlmodel import Session, select

from app.models.portal_ad import PortalAd
from app.schemas.ads import PortalAdUpsert
from app.services.portal import find_router_by_name
from app.services.storage import refresh_logo_url


def default_portal_ad(router_id: UUID | None = None) -> dict:
    return {
        "id": None,
        "router_id": router_id,
        "enabled": False,
        "placement": "banner",
        "media_type": "image",
        "title": "Sponsored",
        "description": "",
        "media_url": None,
        "target_url": None,
        "duration_seconds": 5,
        "created_at": None,
        "updated_at": None,
    }


def serialize_portal_ad(ad: PortalAd) -> dict:
    return {
        "id": ad.id,
        "router_id": ad.router_id,
        "enabled": ad.enabled,
        "placement": ad.placement,
        "media_type": ad.media_type,
        "title": ad.title,
        "description": ad.description,
        "media_url": refresh_logo_url(ad.media_url),
        "target_url": ad.target_url,
        "duration_seconds": ad.duration_seconds,
        "created_at": ad.created_at,
        "updated_at": ad.updated_at,
    }


def get_router_ad(session: Session, router_id: UUID) -> PortalAd | None:
    return session.exec(
        select(PortalAd).where(PortalAd.router_id == router_id)
    ).first()


def get_public_router_ad(session: Session, router_name: str) -> dict:
    router = find_router_by_name(session, router_name)
    if not router:
        return default_portal_ad()
    ad = get_router_ad(session, router.id)
    return serialize_portal_ad(ad) if ad else default_portal_ad(router.id)


def upsert_router_ad(
    session: Session,
    router_id: UUID,
    payload: PortalAdUpsert,
) -> PortalAd:
    ad = get_router_ad(session, router_id)
    if not ad:
        ad = PortalAd(router_id=router_id)

    ad.enabled = payload.enabled
    ad.placement = payload.placement
    ad.media_type = payload.media_type
    ad.title = payload.title.strip() or "Sponsored"
    ad.description = payload.description.strip()
    ad.media_url = payload.media_url
    ad.target_url = payload.target_url
    ad.duration_seconds = payload.duration_seconds
    ad.updated_at = datetime.utcnow()
    session.add(ad)
    session.commit()
    session.refresh(ad)
    return ad
