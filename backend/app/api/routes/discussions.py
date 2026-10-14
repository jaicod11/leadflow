from fastapi import APIRouter, Depends, status

from app.api.deps import DbSession, get_current_user
from app.api.responses import BUSINESS_RULE_ERROR, NOT_FOUND_ERROR, UNAUTHORIZED_ERROR, VALIDATION_ERROR
from app.models import Discussion
from app.schemas.discussion import DiscussionCreate, DiscussionRead
from app.services import discussion_service

# Every route here requires a logged-in user (router-level, so no endpoint can forget it).
router = APIRouter(
    prefix="/leads/{lead_id}/discussions",
    tags=["discussions"],
    dependencies=[Depends(get_current_user)],
    responses={**UNAUTHORIZED_ERROR, **NOT_FOUND_ERROR, **VALIDATION_ERROR},
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
