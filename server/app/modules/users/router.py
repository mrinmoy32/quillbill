from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import Tenant, get_tenant
from app.modules.billing import service as billing_service
from app.modules.billing.schemas import BillingStatus
from app.modules.business.schemas import BusinessOut

router = APIRouter(tags=["me"])


class MeOut(BaseModel):
    email: str | None
    business: BusinessOut
    billing: BillingStatus


@router.get("/me", response_model=MeOut)
def me(tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    """Everything the app needs right after login, in one call."""
    return MeOut(
        email=tenant.user.email,
        business=BusinessOut.model_validate(tenant.business),
        billing=billing_service.get_status(db, tenant.business),
    )
