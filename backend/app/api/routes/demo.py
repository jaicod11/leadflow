import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, Header, status

from app.api.deps import DbSession
from app.core.config import settings
from app.core.exceptions import NotFoundError, UnauthorizedError
from app.schemas.demo import DemoResetRead
from app.seed import reset_demo_data

# Hidden from the OpenAPI docs: it only exists for the deployed demo's daily reset.
router = APIRouter(prefix="/demo", include_in_schema=False)


def require_demo_token(x_demo_token: Annotated[str | None, Header()] = None) -> None:
    """404 (as if the route didn't exist) unless DEMO_RESET_TOKEN is set; 401 unless X-Demo-Token matches."""
    expected = settings.DEMO_RESET_TOKEN
    if not expected:
        raise NotFoundError("Not found")
    if x_demo_token is None or not secrets.compare_digest(x_demo_token.encode(), expected.encode()):
        raise UnauthorizedError("Invalid demo token")


@router.post(
    "/reset",
    response_model=DemoResetRead,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_demo_token)],
)
def reset_demo(db: DbSession) -> DemoResetRead:
    counts = reset_demo_data(db)
    return DemoResetRead(leads=counts.leads, discussions=counts.discussions)
