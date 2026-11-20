import uuid

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import Tenant, get_tenant
from app.modules.clients import service
from app.modules.clients.schemas import ClientIn, ClientOut

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=list[ClientOut])
def list_clients(q: str | None = None, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    return service.list_clients(db, tenant, q)


@router.post("", response_model=ClientOut, status_code=201)
def create_client(data: ClientIn, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    return service.create_client(db, tenant, data)


@router.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: uuid.UUID, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    return service.get_client(db, tenant, client_id)


@router.put("/{client_id}", response_model=ClientOut)
def update_client(client_id: uuid.UUID, data: ClientIn, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    return service.update_client(db, tenant, client_id, data)


@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: uuid.UUID, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    service.delete_client(db, tenant, client_id)
    return Response(status_code=204)
