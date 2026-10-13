from pydantic import BaseModel


class ErrorResponse(BaseModel):
    detail: str


class FieldError(BaseModel):
    field: str
    message: str


class ValidationErrorResponse(BaseModel):
    detail: str
    errors: list[FieldError]
