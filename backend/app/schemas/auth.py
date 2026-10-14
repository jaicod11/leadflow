from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, EmailStr, StringConstraints

from app.schemas.common import UtcDatetime


def _trim_and_lowercase(value: object) -> object:
    return value.strip().lower() if isinstance(value, str) else value


# Emails are compared and stored lowercase, so "Ana@X.com" and "ana@x.com" are the same account.
Email = Annotated[EmailStr, BeforeValidator(_trim_and_lowercase)]
UserName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
# Passwords are never trimmed; the upper bound also caps the hashing work per request.
NewPassword = Annotated[str, StringConstraints(min_length=8, max_length=128)]
Password = Annotated[str, StringConstraints(min_length=1, max_length=128)]


class RegisterRequest(BaseModel):
    email: Email
    name: UserName
    password: NewPassword


class LoginRequest(BaseModel):
    email: Email
    password: Password


class UserRead(BaseModel):
    """Public user fields. Never add password_hash here."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    created_at: UtcDatetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserRead
