"""Shared FastAPI dependencies. `get_tenant` is the most important one.

MULTI-TENANCY RULE: every query on business data must filter by `tenant.business_id`.
Services receive the `Tenant` and use it; they never trust ids from the request alone.
"""
from dataclasses import dataclass

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.errors import Unauthorized
from app.core.security import verify_token
from app.modules.business.models import Business
from app.modules.users import service as users_service
from app.modules.users.models import User


@dataclass
class Tenant:
    user: User
    business: Business

    @property
    def business_id(self):
        return self.business.id


def get_claims(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise Unauthorized("Please sign in to continue.")
    return verify_token(authorization.split(" ", 1)[1])


def get_tenant(claims: dict = Depends(get_claims), db: Session = Depends(get_db)) -> Tenant:
    user, business = users_service.get_or_create_user(db, claims)
    return Tenant(user=user, business=business)
