from sqlalchemy.orm import Session

from app.modules.business.models import Business
from app.modules.business.schemas import BusinessUpdate


def update_business(db: Session, business: Business, data: BusinessUpdate) -> Business:
    for field, value in data.model_dump().items():
        setattr(business, field, value)
    # An empty string from the form means "not set".
    for field in ("email", "phone", "address", "city", "state", "postal_code", "tax_id", "logo_url", "payment_details", "default_notes"):
        if getattr(business, field) == "":
            setattr(business, field, None)
    business.country = business.country.upper()
    business.currency = business.currency.upper()
    db.add(business)
    db.flush()
    return business
