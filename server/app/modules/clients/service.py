import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import Tenant
from app.core.errors import Conflict, NotFound
from app.modules.clients.models import Client
from app.modules.clients.schemas import ClientIn
from app.modules.invoices.models import Invoice


def list_clients(db: Session, tenant: Tenant, q: str | None = None) -> list[Client]:
    stmt = select(Client).where(Client.business_id == tenant.business_id).order_by(Client.name)
    if q:
        stmt = stmt.where(Client.name.ilike(f"%{q}%"))
    return list(db.scalars(stmt))


def get_client(db: Session, tenant: Tenant, client_id: uuid.UUID) -> Client:
    client = db.scalar(select(Client).where(Client.id == client_id, Client.business_id == tenant.business_id))
    if not client:
        raise NotFound("Client not found.")
    return client


def create_client(db: Session, tenant: Tenant, data: ClientIn) -> Client:
    client = Client(business_id=tenant.business_id, **data.model_dump())
    db.add(client)
    db.flush()
    return client


def update_client(db: Session, tenant: Tenant, client_id: uuid.UUID, data: ClientIn) -> Client:
    client = get_client(db, tenant, client_id)
    for field, value in data.model_dump().items():
        setattr(client, field, value)
    db.flush()
    return client


def delete_client(db: Session, tenant: Tenant, client_id: uuid.UUID) -> None:
    client = get_client(db, tenant, client_id)
    used = db.scalar(select(func.count()).select_from(Invoice).where(Invoice.client_id == client.id))
    if used:
        raise Conflict("This client has invoices, so it can't be deleted.", code="client_has_invoices")
    db.delete(client)
