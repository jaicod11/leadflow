"""Error responses documented in OpenAPI, matching the shapes produced by app.core.exceptions."""

from typing import Any

from app.schemas.errors import ErrorResponse, ValidationErrorResponse

ResponsesSpec = dict[int | str, dict[str, Any]]

BUSINESS_RULE_ERROR: ResponsesSpec = {400: {"model": ErrorResponse, "description": "Business rule violated"}}
NOT_FOUND_ERROR: ResponsesSpec = {404: {"model": ErrorResponse, "description": "Lead not found"}}
VALIDATION_ERROR: ResponsesSpec = {422: {"model": ValidationErrorResponse, "description": "Validation failed"}}
UNAUTHORIZED_ERROR: ResponsesSpec = {
    401: {"model": ErrorResponse, "description": "Missing, invalid or expired Bearer token (or wrong credentials)"}
}
CONFLICT_ERROR: ResponsesSpec = {409: {"model": ErrorResponse, "description": "Email already registered"}}
