"""Verify the login token that Clerk gives the browser.

Flow: browser logs in with Clerk -> Clerk issues a signed JWT -> browser sends it as
`Authorization: Bearer <jwt>` -> we check the signature using Clerk's public keys (JWKS).
We never see passwords and need no Clerk *secret* key for this.
"""
from functools import lru_cache

import jwt
from jwt import PyJWKClient

from app.core.errors import Unauthorized
from app.settings import settings


@lru_cache
def _jwks_client() -> PyJWKClient:
    issuer = settings.config.clerk_issuer.rstrip("/")
    return PyJWKClient(f"{issuer}/.well-known/jwks.json", cache_keys=True)


def verify_token(token: str) -> dict:
    """Return the token's claims, or raise Unauthorized."""
    try:
        key = _jwks_client().get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=settings.config.clerk_issuer.rstrip("/"),
            options={"verify_aud": False},  # Clerk session tokens have no `aud`
            leeway=10,
        )
    except jwt.PyJWTError as exc:
        raise Unauthorized("Your session is invalid or expired. Please sign in again.") from exc

    # `azp` = the website that requested the token. Reject tokens from unknown sites.
    azp = claims.get("azp")
    if azp and settings.config.cors_origins and azp not in settings.config.cors_origins:
        raise Unauthorized("Token was issued for a different site.")
    return claims
