from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.main import app
from app.models import Discussion, Lead

RESET_URL = "/api/demo/reset"
TOKEN = "test-demo-token"


@pytest.fixture
def demo_token(monkeypatch: pytest.MonkeyPatch) -> str:
    monkeypatch.setattr(settings, "DEMO_RESET_TOKEN", TOKEN)
    return TOKEN


def test_reset_is_disabled_without_a_configured_token(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "DEMO_RESET_TOKEN", "")

    response = client.post(RESET_URL, headers={"X-Demo-Token": "anything"})

    assert response.status_code == 404
    assert response.json() == {"detail": "Not found"}


def test_reset_rejects_a_wrong_token(client: TestClient, demo_token: str) -> None:
    response = client.post(RESET_URL, headers={"X-Demo-Token": "wrong-token"})

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid demo token"}


def test_reset_rejects_a_missing_token(client: TestClient, demo_token: str) -> None:
    response = client.post(RESET_URL)

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid demo token"}


def test_reset_replaces_all_data_with_the_demo_set(
    client: TestClient, demo_token: str, make_lead: Callable[..., Lead], db: Session
) -> None:
    make_lead("Leftover Lead")

    response = client.post(RESET_URL, headers={"X-Demo-Token": demo_token})

    assert response.status_code == 200
    assert response.json() == {"leads": 10, "discussions": 27}
    db.expire_all()
    names = db.scalars(select(Lead.name)).all()
    assert len(names) == 10
    assert "Leftover Lead" not in names
    assert db.scalar(select(func.count()).select_from(Discussion)) == 27


def test_reset_is_hidden_from_the_api_docs() -> None:
    assert not any(path.startswith("/api/demo") for path in app.openapi()["paths"])
