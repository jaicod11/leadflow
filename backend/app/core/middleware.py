import logging

from fastapi import status
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.schemas.errors import ErrorResponse

logger = logging.getLogger(__name__)


class UnhandledErrorMiddleware:
    """Turn any unhandled exception into a 500 {"detail": "Internal server error"} response.

    Registered INSIDE the CORS middleware so 500 responses still carry CORS headers. The
    exception is swallowed after logging, so the traceback is logged exactly once.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        response_started = False

        async def send_tracking_start(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, receive, send_tracking_start)
        except Exception:
            if response_started:
                raise  # too late for a clean 500; let the server log it and close the connection
            logger.exception("Unhandled error on %s %s", scope["method"], scope["path"])
            body = ErrorResponse(detail="Internal server error")
            response = JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=body.model_dump())
            await response(scope, receive, send)
