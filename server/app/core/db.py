"""Database engine and session handling.

Why the pool is tiny: on AWS Lambda every running copy of the function holds its
own connections. Many copies x big pool = Postgres runs out of connections.
Keep `db_pool_size` at 1 on Lambda and put RDS Proxy in front when traffic grows.
"""
import uuid
from datetime import datetime, timezone
from functools import lru_cache

from sqlalchemy import DateTime, MetaData, Uuid, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from app.settings import settings

# Predictable constraint names make Alembic migrations clean.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class IdMixin:
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


@lru_cache
def get_engine():
    return create_engine(
        settings.secrets.database_url,
        pool_size=settings.config.db_pool_size,
        max_overflow=0,
        pool_pre_ping=True,  # drop dead connections (RDS restarts, idle Lambda)
    )


@lru_cache
def get_session_factory():
    return sessionmaker(bind=get_engine(), expire_on_commit=False)


def get_db():
    """FastAPI dependency: one DB session per request, committed on success."""
    db: Session = get_session_factory()()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
