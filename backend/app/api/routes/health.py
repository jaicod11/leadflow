import logging

from fastapi import APIRouter, Response, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.deps import DbSession
from app.schemas.health import HealthRead

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    response_model=HealthRead,
    status_code=status.HTTP_200_OK,
    summary="Check API and database health",
    responses={503: {"model": HealthRead, "description": "Database unreachable"}},
)
def health(response: Response, db: DbSession) -> HealthRead:
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        logger.exception("Database health check failed")
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return HealthRead(status="error", database="unreachable")
    return HealthRead(status="ok", database="ok")
