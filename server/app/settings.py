"""Application settings: one place that answers "what is configured?".

Three sources, each with a single job:
  1. server/config/<env>.config.py  -> non-secret, environment-specific values
  2. environment variables          -> secrets (DB url, API keys)
  3. ../brand.config.json + ../VERSION -> product identity and version

Everything else in the codebase does `from app.settings import settings`.
"""
import importlib.util
import json
import os
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, ConfigDict
from pydantic_settings import BaseSettings, SettingsConfigDict

SERVER_DIR = Path(__file__).resolve().parents[1]  # .../server
# Locally the repo root is one level above server/. In the Docker image we copy
# VERSION and brand.config.json next to the code, so we check both places.
ROOT_CANDIDATES = [SERVER_DIR.parent, SERVER_DIR]
VALID_ENVS = ("local", "dev", "prod")


def _find_root_file(name: str) -> Path:
    for folder in ROOT_CANDIDATES:
        if (folder / name).exists():
            return folder / name
    raise FileNotFoundError(f"{name} not found in {ROOT_CANDIDATES}")


class NonSecretConfig(BaseModel):
    """Fields allowed in config/<env>.config.py. Unknown keys raise an error."""

    model_config = ConfigDict(extra="forbid")

    log_level: str = "INFO"
    docs_enabled: bool = False
    cors_origins: list[str] = []
    public_app_url: str
    clerk_issuer: str
    aws_region: str = "ap-south-1"
    email_from: str
    email_enabled: bool = False
    db_pool_size: int = 1
    razorpay_pro_plan_id: str = ""
    # Product rules that may differ per environment (e.g. smaller limit in dev tests)
    free_plan_monthly_invoice_limit: int = 3


class Secrets(BaseSettings):
    """Read from environment variables (or server/.env locally). Never logged."""

    model_config = SettingsConfigDict(env_file=SERVER_DIR / ".env", extra="ignore")

    database_url: str
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""


class Brand(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str
    legalName: str = ""
    tagline: str = ""
    supportEmail: str = ""
    pdfFooter: str = "Created with {name}"
    colors: dict[str, str] = {"primary": "#2540D9"}


class Settings:
    """Bundle of everything the app needs."""

    def __init__(self, env: str, config: NonSecretConfig, secrets: Secrets, brand: Brand, version: str, build_sha: str):
        self.env = env
        self.config = config
        self.secrets = secrets
        self.brand = brand
        self.version = version
        self.build_sha = build_sha


def _load_env_config(env: str) -> NonSecretConfig:
    # File names contain dots (local.config.py) so a normal `import` can't load
    # them; we load them by path instead.
    path = SERVER_DIR / "config" / f"{env}.config.py"
    spec = importlib.util.spec_from_file_location(f"{env}_config", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return NonSecretConfig(**module.CONFIG)


@lru_cache
def get_settings() -> Settings:
    env = os.getenv("APP_ENV", "local")
    if env not in VALID_ENVS:
        raise RuntimeError(f"APP_ENV must be one of {VALID_ENVS}, got '{env}'")
    brand = Brand(**json.loads(_find_root_file("brand.config.json").read_text()))
    version = _find_root_file("VERSION").read_text().strip()
    return Settings(
        env=env,
        config=_load_env_config(env),
        secrets=Secrets(),
        brand=brand,
        version=version,
        build_sha=os.getenv("BUILD_SHA", "dev"),
    )


class _LazySettings:
    """`settings.config.x` works without loading anything at import time."""

    def __getattr__(self, item):
        return getattr(get_settings(), item)


settings = _LazySettings()
