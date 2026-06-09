from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, health, notification, branch, messaging, package, portal, router, staff, ticket, wallet
from app.db.init import init_db
from app.services.routers.concentrator import concentrator_worker


def create_app() -> FastAPI:
    app = FastAPI(
        title="Renult Billing System",
        version="1.0.0",
        description="Mikrotik Router Billing System",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    @app.on_event("startup")
    def on_startup() -> None:
        init_db()
        concentrator_worker.start()

    @app.on_event("shutdown")
    def on_shutdown() -> None:
        concentrator_worker.stop()

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(notification.router)
    app.include_router(branch.router)
    app.include_router(messaging.router)
    app.include_router(package.router)
    app.include_router(portal.router)
    app.include_router(router.router)
    app.include_router(staff.router)
    app.include_router(ticket.router)
    app.include_router(wallet.router)
    return app


app = create_app()
