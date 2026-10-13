from datetime import UTC, datetime
from typing import Annotated

from pydantic import PlainSerializer, WithJsonSchema


def _to_utc_iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat()


# A datetime that is always serialized as UTC ISO 8601 with an explicit offset, e.g. "2026-10-13T09:30:00+00:00".
UtcDatetime = Annotated[
    datetime,
    PlainSerializer(_to_utc_iso, return_type=str, when_used="json"),
    WithJsonSchema({"type": "string", "format": "date-time"}),
]
