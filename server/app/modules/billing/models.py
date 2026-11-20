import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, IdMixin, TimestampMixin


class Subscription(Base, IdMixin, TimestampMixin):
    """One row per business. Plan changes arrive from Razorpay webhooks."""

    __tablename__ = "subscriptions"

    business_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("businesses.id"), unique=True, index=True)
    plan: Mapped[str] = mapped_column(String(20), default="free")  # free | pro
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | cancelled | halted | ...
    razorpay_subscription_id: Mapped[str | None] = mapped_column(String(100), index=True)
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
