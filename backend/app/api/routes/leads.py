from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import DbSession, get_current_user
from app.api.responses import BUSINESS_RULE_ERROR, NOT_FOUND_ERROR, UNAUTHORIZED_ERROR, VALIDATION_ERROR
from app.models import LeadStatus
from app.schemas.lead import LeadCreate, LeadRead, LeadUpdate
from app.services import lead_service

# Every route here requires a logged-in user (router-level, so no endpoint can forget it).
router = APIRouter(
    prefix="/leads",
    tags=["leads"],
    dependencies=[Depends(get_current_user)],
    responses={**UNAUTHORIZED_ERROR, **VALIDATION_ERROR},
)


@router.get(
    "",
    response_model=list[LeadRead],
    status_code=status.HTTP_200_OK,
    summary="List leads, most recent activity first",
)
def list_leads(
    db: DbSession,
    status_filter: Annotated[LeadStatus | None, Query(alias="status", description="Only leads with this status")] = None,
    search: Annotated[str | None, Query(description="Case-insensitive substring of the lead name")] = None,
) -> list[LeadRead]:
    return lead_service.list_leads(db, status=status_filter, search=search)


@router.post(
    "",
    response_model=LeadRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a lead",
)
def create_lead(data: LeadCreate, db: DbSession) -> LeadRead:
    return lead_service.create_lead(db, data)


@router.get(
    "/{lead_id}",
    response_model=LeadRead,
    status_code=status.HTTP_200_OK,
    summary="Get a lead",
    responses=NOT_FOUND_ERROR,
)
def get_lead(lead_id: int, db: DbSession) -> LeadRead:
    return lead_service.get_lead(db, lead_id)


@router.patch(
    "/{lead_id}",
    response_model=LeadRead,
    status_code=status.HTTP_200_OK,
    summary="Update a lead (only the fields sent are changed)",
    responses={**BUSINESS_RULE_ERROR, **NOT_FOUND_ERROR},
)
def update_lead(lead_id: int, data: LeadUpdate, db: DbSession) -> LeadRead:
    return lead_service.update_lead(db, lead_id, data)
