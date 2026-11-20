"""Lambda function that runs database migrations (alembic upgrade head).

Why a Lambda? The database password stays inside AWS (GitHub never sees it), and this keeps
working unchanged if you later move the database into a private network.
The deploy pipeline invokes it after updating the code.
Same Docker image as the API, different handler: app.migrate_handler.handler
"""
from pathlib import Path

from alembic import command
from alembic.config import Config

SERVER_DIR = Path(__file__).resolve().parents[1]


def handler(event, context):
    cfg = Config(str(SERVER_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(SERVER_DIR / "migrations"))
    command.upgrade(cfg, "head")
    return {"status": "migrated"}
