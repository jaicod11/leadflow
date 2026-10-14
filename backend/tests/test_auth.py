from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import JWT_ALGORITHM, create_access_token, hash_password, verify_password
from app.main import app
from app.models import User
from app.services import auth_service
from tests.conftest import TEST_USER_PASSWORD

MakeUser = Callable[..., User]
NEW_ACCOUNT = {"email": "  Ana.Rao@Example.com ", "name": "  Ana Rao ", "password": "s3cret-pass"}


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# --- register -------------------------------------------------------------------------------


def test_register_returns_201_with_a_token_and_the_user(client: TestClient) -> None:
    response = client.post("/api/auth/register", json=NEW_ACCOUNT)

    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert set(body["user"]) == {"id", "email", "name", "created_at"}  # never password_hash
    assert body["user"]["email"] == "ana.rao@example.com"  # trimmed + lowercased
    assert body["user"]["name"] == "Ana Rao"
    me = client.get("/api/auth/me", headers=_bearer(body["access_token"]))
    assert me.json()["email"] == "ana.rao@example.com"


def test_register_rejects_a_duplicate_email_in_any_case(client: TestClient, make_user: MakeUser) -> None:
    make_user(email="ana.rao@example.com")

    response = client.post("/api/auth/register", json={**NEW_ACCOUNT, "email": "ANA.RAO@example.COM"})

    assert response.status_code == 409
    assert response.json() == {"detail": "An account with this email already exists"}


def test_register_maps_a_concurrent_duplicate_to_409(
    client: TestClient, make_user: MakeUser, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Simulate losing the race: the "is the email free?" check passes, then the INSERT hits the unique index.
    make_user(email="ana.rao@example.com")
    monkeypatch.setattr(auth_service, "get_user_by_email", lambda db, email: None)

    response = client.post("/api/auth/register", json=NEW_ACCOUNT)

    assert response.status_code == 409
    assert response.json() == {"detail": "An account with this email already exists"}


@pytest.mark.parametrize(
    ("field", "value"),
    [("password", "short7!"), ("password", "x" * 129), ("email", "not-an-email"), ("name", "   ")],
)
def test_register_validates_input(client: TestClient, field: str, value: str) -> None:
    response = client.post("/api/auth/register", json={**NEW_ACCOUNT, field: value})

    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == field


def test_register_does_not_trim_the_password(client: TestClient) -> None:
    client.post("/api/auth/register", json={**NEW_ACCOUNT, "password": "  spaced pass  "})

    assert client.post("/api/auth/login", json={"email": NEW_ACCOUNT["email"], "password": "  spaced pass  "}).status_code == 200
    assert client.post("/api/auth/login", json={"email": NEW_ACCOUNT["email"], "password": "spaced pass"}).status_code == 401


# --- login ----------------------------------------------------------------------------------


def test_login_returns_a_working_token(client: TestClient, make_user: MakeUser) -> None:
    make_user(email="rep@example.com")

    response = client.post("/api/auth/login", json={"email": "REP@example.com ", "password": TEST_USER_PASSWORD})

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["email"] == "rep@example.com"
    assert client.get("/api/auth/me", headers=_bearer(body["access_token"])).status_code == 200


def test_wrong_password_and_unknown_email_get_the_identical_401(client: TestClient, make_user: MakeUser) -> None:
    make_user(email="rep@example.com")

    wrong_password = client.post("/api/auth/login", json={"email": "rep@example.com", "password": "nope-nope"})
    unknown_email = client.post("/api/auth/login", json={"email": "ghost@example.com", "password": "nope-nope"})

    for response in (wrong_password, unknown_email):
        assert response.status_code == 401
        assert response.json() == {"detail": "Invalid email or password"}
        assert response.headers["www-authenticate"] == "Bearer"


# --- /me and token checks -------------------------------------------------------------------


def test_me_returns_the_current_user(auth_client: TestClient) -> None:
    response = auth_client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json()["email"] == "rep@example.com"
    assert "password_hash" not in response.json()


def test_me_without_a_token_is_401_not_authenticated(client: TestClient) -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}
    assert response.headers["www-authenticate"] == "Bearer"


@pytest.mark.parametrize(
    "authorization",
    ["Bearer garbage", "Bearer a.b.c", "Basic dXNlcjpwYXNz", "Bearer"],
    ids=["garbage", "not-a-jwt", "wrong-scheme", "empty-token"],
)
def test_me_with_a_malformed_or_invalid_token_is_401(client: TestClient, authorization: str) -> None:
    response = client.get("/api/auth/me", headers={"Authorization": authorization})

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid or expired token"}
    assert response.headers["www-authenticate"] == "Bearer"


def test_me_with_an_expired_token_is_401(client: TestClient, make_user: MakeUser) -> None:
    user = make_user()
    issued = datetime.now(UTC) - timedelta(days=8)
    expired = jwt.encode(
        {"sub": str(user.id), "iat": issued, "exp": issued + timedelta(days=7)}, settings.JWT_SECRET, JWT_ALGORITHM
    )

    response = client.get("/api/auth/me", headers=_bearer(expired))

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid or expired token"}


def test_me_with_a_token_signed_by_another_key_is_401(client: TestClient, make_user: MakeUser) -> None:
    user = make_user()
    issued = datetime.now(UTC)
    forged = jwt.encode(
        {"sub": str(user.id), "iat": issued, "exp": issued + timedelta(hours=1)}, "y" * 32, JWT_ALGORITHM
    )

    assert client.get("/api/auth/me", headers=_bearer(forged)).status_code == 401


def test_me_with_a_token_for_a_deleted_user_is_401(client: TestClient, make_user: MakeUser, db: Session) -> None:
    user = make_user()
    token = create_access_token(user.id)
    db.delete(user)
    db.commit()

    response = client.get("/api/auth/me", headers=_bearer(token))

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid or expired token"}


# --- every leads/discussions endpoint is protected; health is public --------------------------


def _protected_endpoints() -> list[tuple[str, str]]:
    """Every operation under /api/leads in the OpenAPI schema, so a new endpoint can't slip through."""
    paths = app.openapi()["paths"]
    return [
        (method.upper(), path.replace("{lead_id}", "1"))
        for path, operations in paths.items()
        if path.startswith("/api/leads")
        for method in operations
    ]


def test_all_six_leads_and_discussions_endpoints_are_covered() -> None:
    assert len(_protected_endpoints()) == 6


@pytest.mark.parametrize(("method", "path"), _protected_endpoints())
def test_leads_and_discussions_endpoints_require_a_token(client: TestClient, method: str, path: str) -> None:
    response = client.request(method, path, json={})

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}
    assert response.headers["www-authenticate"] == "Bearer"


def test_health_is_public(client: TestClient) -> None:
    assert client.get("/api/health").status_code == 200


def test_cors_preflight_allows_the_authorization_header(client: TestClient) -> None:
    response = client.options(
        "/api/leads",
        headers={
            "Origin": settings.CORS_ORIGINS[0],
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code == 200
    assert "authorization" in response.headers["access-control-allow-headers"].lower()


# --- demo user ------------------------------------------------------------------------------


def test_ensure_demo_user_is_idempotent_and_resets_the_password(db: Session) -> None:
    first = auth_service.ensure_demo_user(db)
    first.password_hash = hash_password("someone-changed-it")
    db.commit()

    second = auth_service.ensure_demo_user(db)

    assert second.id == first.id
    assert db.scalar(select(func.count()).select_from(User)) == 1
    assert second.email == settings.DEMO_USER_EMAIL.lower()
    assert verify_password(settings.DEMO_USER_PASSWORD, second.password_hash)


def test_the_demo_user_can_log_in(client: TestClient, db: Session) -> None:
    auth_service.ensure_demo_user(db)

    response = client.post(
        "/api/auth/login", json={"email": settings.DEMO_USER_EMAIL, "password": settings.DEMO_USER_PASSWORD}
    )

    assert response.status_code == 200
    assert response.json()["user"]["name"] == settings.DEMO_USER_NAME


def test_verify_password_is_false_for_an_unrecognised_hash() -> None:
    assert verify_password("anything", "not-a-password-hash") is False

