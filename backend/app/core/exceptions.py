from collections.abc import Sequence
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.schemas.errors import ErrorResponse, FieldError, ValidationErrorResponse

# Request locations FastAPI prefixes to error paths; clients only care about the field itself.
_LOCATION_PREFIXES = {"body", "query", "path", "header", "cookie"}


class AppError(Exception):
    """Base class for errors whose message is safe to return to the client."""

    status_code: int
    headers: dict[str, str] | None = None

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND


class BusinessRuleError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT


class UnauthorizedError(AppError):
    """401 for the demo-reset token (X-Demo-Token), which is not a Bearer scheme."""

    status_code = status.HTTP_401_UNAUTHORIZED


class AuthenticationError(AppError):
    """401 for user authentication; tells the client to authenticate with a Bearer token."""

    status_code = status.HTTP_401_UNAUTHORIZED
    headers = {"WWW-Authenticate": "Bearer"}


def _field_path(loc: Sequence[int | str]) -> str:
    parts = [str(part) for part in loc]
    if len(parts) > 1 and parts[0] in _LOCATION_PREFIXES:
        parts = parts[1:]
    return ".".join(parts)


def _to_field_error(error: dict[str, Any]) -> FieldError:
    error_type = error["type"]
    if error_type == "json_invalid":
        return FieldError(field="body", message="Request body is not valid JSON")
    if error_type == "missing":
        message = "This field is required"
    elif error_type == "string_too_short" and error.get("ctx", {}).get("min_length") == 1:
        message = "This field cannot be empty"
    else:
        message = error["msg"].removeprefix("Value error, ")
    return FieldError(field=_field_path(error["loc"]), message=message)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        body = ErrorResponse(detail=exc.detail)
        return JSONResponse(status_code=exc.status_code, content=body.model_dump(), headers=exc.headers)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        body = ValidationErrorResponse(
            detail="Validation failed",
            errors=[_to_field_error(error) for error in exc.errors()],
        )
        return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, content=body.model_dump())
