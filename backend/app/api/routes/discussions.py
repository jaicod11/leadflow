from fastapi import APIRouter, status

from app.api.deps import DbSession
from app.api.responses import BUSINESS_RULE_ERROR, NOT_FOUND_ERROR, VALIDATION_ERROR
from app.models import Discussion
from app.schemas.discussion import DiscussionCreate, DiscussionRead
from app.services import discussion_service

router = APIRouter(
    prefix="/leads/{lead_id}/discussions",
    tags=["discussions"],
    responses={**NOT_FOUND_ERROR, **VALIDATION_ERROR},
)


@router.get(
    "",
    response_model=list[DiscussionRead],
    status_code=status.HTTP_200_OK,
    summary="List a lead's discussions, newest first",
)
def list_discussions(lead_id: int, db: DbSession) -> list[Discussion]:
    return discussion_service.list_discussions(db, lead_id)


@router.post(
    "",
    response_model=DiscussionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Log a discussion, optionally setting the lead's next follow-up",
    responses=BUSINESS_RULE_ERROR,
)
def create_discussion(lead_id: int, data: DiscussionCreate, db: DbSession) -> Discussion:
    return discussion_service.create_discussion(db, lead_id, data)
