"""App entry point.

Local:   uvicorn app.main:app --reload
Lambda:  the `handler` below (Mangum translates API Gateway events into normal HTTP for FastAPI)

ADDING A FEATURE: create app/modules/<feature>/ and add ONE line to ROUTERS below.
"""
import logging

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from app import models  # noqa: F401  (registers all tables)
from app.core.errors import register_error_handlers
from app.modules.billing.router import router as billing_router
from app.modules.business.router import router as business_router
from app.modules.clients.router import router as clients_router
from app.modules.invoices.router import router as invoices_router
from app.modules.public.router import router as public_router
from app.modules.users.router import router as users_router
from app.settings import settings

API_PREFIX = "/api/v1"  # bump to /api/v2 only for breaking changes; keep v1 running meanwhile

ROUTERS = [
    users_router,
    business_router,
    clients_router,
    invoices_router,
    billing_router,
    public_router,
]


def create_app() -> FastAPI:
    logging.basicConfig(level=settings.config.log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    app = FastAPI(
        title=f"{settings.brand.name} API",
        version=settings.version,
        docs_url="/docs" if settings.config.docs_enabled else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.config.docs_enabled else None,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.config.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_error_handlers(app)

    api = APIRouter(prefix=API_PREFIX)

    @api.get("/health", tags=["system"])
    def health():
        """Used by deploy smoke tests and uptime monitors. No login, no database."""
        return {"status": "ok", "app": settings.brand.name, "version": settings.version, "build": settings.build_sha, "env": settings.env}

    for router in ROUTERS:
        api.include_router(router)
    app.include_router(api)
    return app


app = create_app()
handler = Mangum(app, lifespan="off")  # AWS Lambda entry point
