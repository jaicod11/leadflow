from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.api.responses import CONFLICT_ERROR, UNAUTHORIZED_ERROR, VALIDATION_ERROR
from app.core.exceptions import AuthenticationError
from app.models import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserRead
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an account (and log straight in)",
    responses={**CONFLICT_ERROR, **VALIDATION_ERROR},
)
def register(data: RegisterRequest, db: DbSession) -> TokenResponse:
    user = auth_service.register_user(db, data)
    return auth_service.build_token_response(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Log in with email and password",
    responses={**UNAUTHORIZED_ERROR, **VALIDATION_ERROR},
)
def login(data: LoginRequest, db: DbSession) -> TokenResponse:
    user = auth_service.authenticate_user(db, data.email, data.password)
    if user is None:
        raise AuthenticationError("Invalid email or password")
    return auth_service.build_token_response(user)


@router.get(
    "/me",
    response_model=UserRead,
    status_code=status.HTTP_200_OK,
    summary="The logged-in user",
    responses=UNAUTHORIZED_ERROR,
)
def me(user: CurrentUser) -> User:
    return user
