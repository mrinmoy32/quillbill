from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.billing.models import Subscription
from app.modules.business.models import Business
from app.modules.users.models import User


def get_or_create_user(db: Session, claims: dict) -> tuple[User, Business]:
    """First request after sign-up creates the user, their business and a free plan.

    The email claim is optional: add `{"email": "{{user.primary_email_address}}"}` to
    Clerk's session token (see docs/GETTING_STARTED.md) to have it saved.
    """
    clerk_id = claims["sub"]
    user = db.scalar(select(User).where(User.clerk_user_id == clerk_id))
    if user:
        return user, db.get(Business, user.business_id)

    email = claims.get("email")
    business = Business(name="My business", email=email)
    db.add(business)
    db.flush()
    db.add(Subscription(business_id=business.id, plan="free", status="active"))
    user = User(clerk_user_id=clerk_id, email=email, business_id=business.id)
    db.add(user)
    db.flush()
    return user, business
