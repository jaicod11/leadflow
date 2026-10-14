from psycopg.errors import UniqueViolation
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ConflictError
from app.core.security import create_access_token, hash_password, verify_password
from app.models import User
from app.schemas.auth import RegisterRequest, TokenResponse, UserRead

EMAIL_TAKEN = "An account with this email already exists"

# Verified against when the email is unknown, so a login takes the same time either way.
_DUMMY_PASSWORD_HASH = hash_password("dummy-password-used-only-for-timing")


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.strip().lower()))


def register_user(db: Session, data: RegisterRequest) -> User:
    """Create an account; 409 if the email is taken (also when a concurrent request wins the race)."""
    if get_user_by_email(db, data.email) is not None:
        raise ConflictError(EMAIL_TAKEN)
    user = User(email=data.email, name=data.name, password_hash=hash_password(data.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if isinstance(exc.orig, UniqueViolation):
            raise ConflictError(EMAIL_TAKEN) from None
        raise
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """The user if the credentials match, else None. Unknown email and wrong password look the same."""
    user = get_user_by_email(db, email)
    if user is None:
        verify_password(password, _DUMMY_PASSWORD_HASH)
        return None
    return user if verify_password(password, user.password_hash) else None


def build_token_response(user: User) -> TokenResponse:
    return TokenResponse(access_token=create_access_token(user.id), user=UserRead.model_validate(user))


def ensure_demo_user(db: Session) -> User:
    """Create the demo user if missing, or reset its password, so the public demo login always works."""
    user = get_user_by_email(db, settings.DEMO_USER_EMAIL)
    if user is None:
        user = User(
            email=settings.DEMO_USER_EMAIL.strip().lower(),
            name=settings.DEMO_USER_NAME,
            password_hash=hash_password(settings.DEMO_USER_PASSWORD),
        )
        db.add(user)
    elif not verify_password(settings.DEMO_USER_PASSWORD, user.password_hash):
        user.password_hash = hash_password(settings.DEMO_USER_PASSWORD)
    db.commit()
    return user
