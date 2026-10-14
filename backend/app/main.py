from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.middleware import UnhandledErrorMiddleware

app = FastAPI(title="LeadFlow API")

# The middleware added LAST is the outermost, so UnhandledErrorMiddleware runs inside CORS
# and its 500 responses still get CORS headers.
app.add_middleware(UnhandledErrorMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    # Authorization carries the Bearer token; Content-Type is needed for JSON bodies.
    allow_headers=["Authorization", "Content-Type"],
)
register_exception_handlers(app)
app.include_router(api_router, prefix="/api")
