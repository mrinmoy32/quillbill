"""Import every model here so Alembic (migrations) and SQLAlchemy can see all tables.
When you add a feature with new tables, add one import line below."""
from app.modules.billing.models import Subscription  # noqa: F401
from app.modules.business.models import Business  # noqa: F401
from app.modules.clients.models import Client  # noqa: F401
from app.modules.invoices.models import Invoice, InvoiceItem  # noqa: F401
from app.modules.users.models import User  # noqa: F401
