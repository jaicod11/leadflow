from typing import Annotated

from pydantic import AfterValidator, AwareDatetime, BaseModel, ConfigDict, StringConstraints, field_validator

from app.models.lead import LeadStatus
from app.schemas.common import UtcDatetime

PHONE_ALLOWED_CHARACTERS = frozenset("0123456789 +-().")


def _empty_to_none(value: str | None) -> str | None:
    return value or None


def _check_phone_characters(value: str | None) -> str | None:
    if value is not None and not set(value) <= PHONE_ALLOWED_CHARACTERS:
        raise ValueError("Phone may only contain digits, spaces, and + - ( ) . characters")
    return value


LeadName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Company = Annotated[
    Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)] | None,
    AfterValidator(_empty_to_none),
]
Phone = Annotated[
    Annotated[str, StringConstraints(strip_whitespace=True, max_length=32)] | None,
    AfterValidator(_empty_to_none),
    AfterValidator(_check_phone_characters),
]


class LeadCreate(BaseModel):
    name: LeadName
    company: Company = None
    phone: Phone = None


class LeadUpdate(BaseModel):
    """Partial update: only fields present in the request body are applied."""

    name: LeadName | None = None
    company: Company = None
    phone: Phone = None
    status: LeadStatus | None = None
    follow_up_at: AwareDatetime | None = None

    @field_validator("name", "status")
    @classmethod
    def reject_null(cls, value: object) -> object:
        # These columns are NOT NULL: they may be omitted, but not explicitly set to null.
        if value is None:
            raise ValueError("This field cannot be null")
        return value


class LeadRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    company: str | None
    phone: str | None
    status: LeadStatus
    follow_up_at: UtcDatetime | None
    created_at: UtcDatetime
    updated_at: UtcDatetime
    last_note: str | None
    last_discussion_at: UtcDatetime | None
