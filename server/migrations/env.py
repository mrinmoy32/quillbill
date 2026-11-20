"""Alembic environment. The database URL comes from our settings (DATABASE_URL secret)."""
from alembic import context
from sqlalchemy import create_engine

from app import models  # noqa: F401  (registers all tables on Base.metadata)
from app.core.db import Base
from app.settings import settings

target_metadata = Base.metadata


def run_migrations_online() -> None:
    engine = create_engine(settings.secrets.database_url)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()
