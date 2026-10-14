from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import AuthenticationError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User

DbSession = Annotated[Session, Depends(get_db)]

NOT_AUTHENTICATED = "Not authenticated"
INVALID_TOKEN = "Invalid or expired token"

# auto_error=False so we produce our own 401s; the scheme also adds the "Authorize" button to /docs.
bearer_scheme = HTTPBearer(
    auto_error=False,
    description="Paste the access_token from POST /api/auth/login (or /register).",
)


def get_current_user(
    request: Request,
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    """The user behind the Bearer token. 401 (with WWW-Authenticate: Bearer) when missing or invalid."""
    if credentials is None:
        # HTTPBearer also returns None for a header that isn't "Bearer <token>": that's malformed, not missing.
        if request.headers.get("Authorization", "").strip():
            raise AuthenticationError(INVALID_TOKEN)
        raise AuthenticationError(NOT_AUTHENTICATED)

    user_id = decode_access_token(credentials.credentials)
    user = db.get(User, user_id) if user_id is not None else None
    if user is None:  # expired, tampered, malformed, or the user no longer exists
        raise AuthenticationError(INVALID_TOKEN)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
