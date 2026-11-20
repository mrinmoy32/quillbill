"""Test setup: in-memory SQLite database and a fake login. No AWS, Clerk or Postgres needed.

Fake login: send header  Authorization: user-a  and you ARE "user-a" (a separate business per name).
"""
import os

os.environ["APP_ENV"] = "local"
os.environ["DATABASE_URL"] = "sqlite://"

import pytest
from fastapi import Header
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.db import Base, get_db
from app.core.deps import get_claims
from app.main import app


@pytest.fixture()
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)

    def override_db():
        db = Session()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def fake_claims(authorization: str | None = Header(default=None)):
        from app.core.errors import Unauthorized

        if not authorization:
            raise Unauthorized("Please sign in to continue.")
        return {"sub": authorization, "email": f"{authorization}@example.com"}

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_claims] = fake_claims
    yield TestClient(app)
    app.dependency_overrides.clear()


def auth(user: str = "user-a") -> dict:
    return {"Authorization": user}


def make_client(client, user="user-a", name="Acme Pvt Ltd"):
    r = client.post("/api/v1/clients", json={"name": name, "email": "acme@example.com"}, headers=auth(user))
    assert r.status_code == 201, r.text
    return r.json()


def invoice_payload(client_id, **over):
    body = {
        "client_id": client_id,
        "issue_date": "2026-11-01",
        "due_date": "2026-11-16",
        "currency": "INR",
        "discount_minor": 0,
        "items": [{"description": "Website design", "quantity": "2", "unit_price_minor": 500000, "tax_percent": "18"}],
    }
    body.update(over)
    return body
