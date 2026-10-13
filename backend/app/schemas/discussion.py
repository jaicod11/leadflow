from typing import Annotated

from pydantic import AwareDatetime, BaseModel, ConfigDict, StringConstraints

from app.schemas.common import UtcDatetime

NoteText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]


class DiscussionCreate(BaseModel):
    note: NoteText
    follow_up_at: AwareDatetime | None = None


class DiscussionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    note: str
    follow_up_at: UtcDatetime | None
    created_at: UtcDatetime
