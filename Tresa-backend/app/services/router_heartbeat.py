import threading
from datetime import datetime, timedelta
from html import escape

from sqlmodel import Session, select

from app.db.session import engine
from app.models.branch import Branch
from app.models.notification import Notification
from app.models.router import Router
from app.services.telegram import send_branch_event

HEARTBEAT_OFFLINE_AFTER = timedelta(minutes=3)
HOURLY_PING_INTERVAL = timedelta(hours=1)


def _status_text(router: Router, status: str, uptime: str | None = None) -> str:
    lines = [
        f"<b>Router {status}</b>",
        f"Router: {escape(router.name)}",
    ]
    if router.location:
        lines.append(f"Location: {escape(router.location)}")
    if uptime:
        lines.append(f"Uptime: {escape(uptime)}")
    lines.append(f"Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
    return "\n".join(lines)


def record_heartbeat(session: Session, router: Router, uptime: str | None = None) -> str:
    now = datetime.utcnow()
    previous = router.heartbeat_status
    router.heartbeat_status = "online"
    router.heartbeat_at = now
    router.last_seen = now
    router.updated_at = now
    session.add(router)

    if previous == "offline":
        branch = session.get(Branch, router.branch_id)
        if branch:
            session.add(
                Notification(
                    user_id=branch.user_id,
                    category="router",
                    title=f"{router.name} is back online",
                    body=f"Router heartbeat recovered at {now.strftime('%Y-%m-%d %H:%M:%S')} UTC.",
                )
            )
            send_branch_event(
                session,
                router.branch_id,
                "router",
                _status_text(router, "back online", uptime),
            )

    should_send_hourly = (
        router.heartbeat_hourly_notified_at is None
        or now - router.heartbeat_hourly_notified_at >= HOURLY_PING_INTERVAL
    )
    if should_send_hourly:
        if send_branch_event(
            session,
            router.branch_id,
            "router_hourly",
            _status_text(router, "hourly status: online", uptime),
        ):
            router.heartbeat_hourly_notified_at = now
            session.add(router)

    session.commit()
    return "recovered" if previous == "offline" else "online"


def mark_stale_heartbeats_offline(session: Session) -> int:
    cutoff = datetime.utcnow() - HEARTBEAT_OFFLINE_AFTER
    routers = session.exec(
        select(Router).where(
            Router.is_active.is_(True),
            Router.heartbeat_status == "online",
            Router.heartbeat_at.is_not(None),
            Router.heartbeat_at < cutoff,
        ).with_for_update(skip_locked=True)
    ).all()
    for router in routers:
        router.heartbeat_status = "offline"
        router.updated_at = datetime.utcnow()
        session.add(router)
        branch = session.get(Branch, router.branch_id)
        if branch:
            session.add(
                Notification(
                    user_id=branch.user_id,
                    category="router",
                    title=f"{router.name} is offline",
                    body="The router stopped sending its one-minute heartbeat.",
                )
            )
        send_branch_event(
            session,
            router.branch_id,
            "router",
            _status_text(router, "offline"),
        )
    if routers:
        session.commit()
    return len(routers)


class RouterHeartbeatWorker:
    def __init__(self) -> None:
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(
            target=self._run,
            name="router-heartbeat",
            daemon=True,
        )
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=5)
        self._thread = None

    def _run(self) -> None:
        while not self._stop.wait(30):
            try:
                with Session(engine) as session:
                    mark_stale_heartbeats_offline(session)
            except Exception:
                pass


router_heartbeat_worker = RouterHeartbeatWorker()
