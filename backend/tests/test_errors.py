import logging

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


def test_unhandled_exception_returns_500_with_cors_headers(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    origin = settings.CORS_ORIGINS[0]

    def explode() -> None:
        raise RuntimeError("secret internal detail")

    # Test-only route, registered here and removed again so the app code stays untouched.
    app.add_api_route("/api/test-only/explode", explode)
    route = app.router.routes[-1]
    try:
        with caplog.at_level(logging.ERROR):
            response = client.get("/api/test-only/explode", headers={"Origin": origin})
    finally:
        app.router.routes.remove(route)

    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}
    assert response.headers["access-control-allow-origin"] == origin
    assert "secret" not in response.text
    error_records = [record for record in caplog.records if record.levelno >= logging.ERROR]
    assert len(error_records) == 1  # the traceback is logged exactly once
    assert error_records[0].exc_info is not None
