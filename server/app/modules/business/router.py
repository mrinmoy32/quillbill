from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import Tenant, get_tenant
from app.modules.business import service
from app.modules.business.schemas import BusinessOut, BusinessUpdate

router = APIRouter(prefix="/business", tags=["business"])


@router.get("", response_model=BusinessOut)
def get_business(tenant: Tenant = Depends(get_tenant)):
    return tenant.business


@router.put("", response_model=BusinessOut)
def update_business(data: BusinessUpdate, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    return service.update_business(db, tenant.business, data)
