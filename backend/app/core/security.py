from datetime import UTC, datetime, timedelta

import jwt
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError

from app.core.config import settings

JWT_ALGORITHM = "HS256"

# Argon2id with pwdlib's recommended parameters (what the FastAPI security tutorial uses).
_password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """False for a wrong password, and also for a stored hash in an unknown/corrupted format."""
    try:
        return _password_hash.verify(password, password_hash)
    except UnknownHashError:
        return False


def create_access_token(user_id: int) -> str:
    """A signed HS256 JWT with sub (the user id, as a string), iat and exp."""
    issued_at = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "iat": issued_at,
        "exp": issued_at + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> int | None:
    """The user id from a valid token; None if it is malformed, tampered with or expired."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[JWT_ALGORITHM], options={"require": ["sub", "iat", "exp"]}
        )
    except InvalidTokenError:
        return None
    subject = payload["sub"]
    return int(subject) if isinstance(subject, str) and subject.isdigit() else None
