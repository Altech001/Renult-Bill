from datetime import datetime
from typing import Any

import sqlalchemy as sa
from sqlmodel import Session, select

from app.models.router import Router
from app.models.router_package import RouterPackage
from app.services.routers.routeros import router_connection


def normalize_router_name(router_name: str) -> str:
    return router_name.strip().upper()


def _next_package_id(session: Session) -> int:
    current = session.exec(select(sa.func.max(RouterPackage.package_id))).one()
    return int(current or 273) + 1


def serialize_package(package: RouterPackage) -> dict[str, Any]:
    return {
        "id": package.id or package.package_id,
        "package_id": package.package_id,
        "limit": package.limit,
        "devices": package.devices,
        "data": package.data,
        "profile": package.profile,
        "total": package.total,
        "router_id": package.router_name,
        "priority": package.priority,
        "speed_type": package.speed_type,
        "rate_limit": package.rate_limit,
        "created_at": package.created_at,
        "updated_at": package.updated_at,
    }


def get_router_packages(router_id: str, session: Session | None = None) -> dict[str, Any]:
    if session is None:
        return {"voucher": []}

    normalized_router_id = normalize_router_name(router_id)
    packages = session.exec(
        select(RouterPackage)
        .where(sa.func.upper(RouterPackage.router_name) == normalized_router_id)
        .order_by(RouterPackage.priority, RouterPackage.package_id)
    ).all()
    return {"voucher": [serialize_package(package) for package in packages]}


def _first_resource_id(items: list[dict[str, Any]]) -> str | None:
    if not items:
        return None
    return items[0].get("id") or items[0].get(".id")


def upsert_mikrotik_profile(router: Router, package: RouterPackage) -> str | None:
    with router_connection(router) as api:
        profile_resource = api.get_resource("/ip/hotspot/user/profile")
        existing = profile_resource.get(name=package.profile)
        params: dict[str, Any] = {"shared-users": package.devices}
        if package.rate_limit:
            params["rate-limit"] = package.rate_limit

        profile_id = _first_resource_id(existing)
        if profile_id:
            profile_resource.set(id=profile_id, **params)
            return profile_id

        created = profile_resource.add(name=package.profile, **params)
        if isinstance(created, dict):
            return created.get("id") or created.get(".id")
        return None


def create_router_package(
    session: Session,
    router: Router,
    payload: Any,
) -> tuple[RouterPackage, str | None]:
    package = RouterPackage(
        router_id=router.id,
        router_name=normalize_router_name(router.name),
        package_id=_next_package_id(session),
        limit=payload.limit.strip(),
        devices=payload.devices.strip(),
        data=payload.data.strip(),
        profile=payload.profile.strip(),
        total=payload.total.strip(),
        priority=payload.priority,
        speed_type=payload.speed_type.strip(),
        rate_limit=payload.rate_limit.strip() if payload.rate_limit else None,
    )
    session.add(package)
    session.commit()
    session.refresh(package)

    router_sync_error = None
    try:
        package.router_profile_id = upsert_mikrotik_profile(router, package)
        package.updated_at = datetime.utcnow()
        session.add(package)
        session.commit()
        session.refresh(package)
    except Exception as exc:
        router_sync_error = str(exc)

    return package, router_sync_error


def update_router_package(
    session: Session,
    router: Router,
    package: RouterPackage,
    payload: Any,
) -> tuple[RouterPackage, str | None]:
    for field in ("limit", "devices", "data", "profile", "total", "speed_type", "rate_limit"):
        value = getattr(payload, field)
        if value is not None:
            setattr(package, field, value.strip() if isinstance(value, str) else value)
    if payload.priority is not None:
        package.priority = payload.priority

    package.router_name = normalize_router_name(router.name)
    package.updated_at = datetime.utcnow()
    session.add(package)
    session.commit()
    session.refresh(package)

    router_sync_error = None
    try:
        package.router_profile_id = upsert_mikrotik_profile(router, package)
        package.updated_at = datetime.utcnow()
        session.add(package)
        session.commit()
        session.refresh(package)
    except Exception as exc:
        router_sync_error = str(exc)

    return package, router_sync_error


def sync_packages_from_mikrotik(session: Session, router: Router) -> tuple[list[RouterPackage], str | None]:
    try:
        with router_connection(router) as api:
            profiles = [dict(item) for item in api.get_resource("/ip/hotspot/user/profile").get()]
    except Exception as exc:
        return [], str(exc)

    imported: list[RouterPackage] = []
    for index, profile in enumerate(profiles, start=1):
        name = profile.get("name")
        if not name or name == "default":
            continue

        package = session.exec(
            select(RouterPackage)
            .where(RouterPackage.router_id == router.id)
            .where(RouterPackage.profile == name)
        ).first()
        if not package:
            package = RouterPackage(
                router_id=router.id,
                router_name=normalize_router_name(router.name),
                package_id=_next_package_id(session),
                limit=name,
                devices=str(profile.get("shared-users") or "1"),
                data=(profile.get("rate-limit") or "Router profile").strip(),
                profile=name,
                total="0",
                priority=index,
                speed_type="Router",
                rate_limit=profile.get("rate-limit"),
                router_profile_id=profile.get("id") or profile.get(".id"),
            )
        else:
            package.router_name = normalize_router_name(router.name)
            package.devices = str(profile.get("shared-users") or package.devices or "1")
            package.rate_limit = profile.get("rate-limit") or package.rate_limit
            package.router_profile_id = profile.get("id") or profile.get(".id") or package.router_profile_id
            package.updated_at = datetime.utcnow()

        session.add(package)
        session.commit()
        session.refresh(package)
        imported.append(package)

    return imported, None
