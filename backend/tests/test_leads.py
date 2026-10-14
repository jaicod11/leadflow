from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.models import Discussion, Lead, LeadStatus

MakeLead = Callable[..., Lead]
MakeDiscussion = Callable[..., Discussion]


def _names(response_json: list[dict[str, Any]]) -> list[str]:
    return [lead["name"] for lead in response_json]


# --- create ---------------------------------------------------------------------------------


def test_create_lead_with_only_a_name_uses_defaults(auth_client: TestClient) -> None:
    response = auth_client.post("/api/leads", json={"name": "Alice Johnson"})

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Alice Johnson"
    assert body["company"] is None
    assert body["phone"] is None
    assert body["status"] == "new"
    assert body["follow_up_at"] is None
    assert body["last_note"] is None
    assert body["last_discussion_at"] is None
    assert body["created_at"].endswith("+00:00")


def test_create_lead_trims_name(auth_client: TestClient) -> None:
    response = auth_client.post("/api/leads", json={"name": "   Alice Johnson  "})

    assert response.status_code == 201
    assert response.json()["name"] == "Alice Johnson"


def test_create_lead_turns_blank_optional_fields_into_null(auth_client: TestClient) -> None:
    response = auth_client.post("/api/leads", json={"name": "Alice", "company": "   ", "phone": ""})

    assert response.status_code == 201
    assert response.json()["company"] is None
    assert response.json()["phone"] is None


def test_create_lead_rejects_blank_name(auth_client: TestClient) -> None:
    response = auth_client.post("/api/leads", json={"name": "   "})

    assert response.status_code == 422
    assert response.json() == {
        "detail": "Validation failed",
        "errors": [{"field": "name", "message": "This field cannot be empty"}],
    }


def test_create_lead_rejects_invalid_phone(auth_client: TestClient) -> None:
    response = auth_client.post("/api/leads", json={"name": "Alice", "phone": "abc"})

    assert response.status_code == 422
    assert response.json()["errors"] == [
        {"field": "phone", "message": "Phone may only contain digits, spaces, and + - ( ) . characters"}
    ]


def test_create_lead_ignores_status(auth_client: TestClient) -> None:
    response = auth_client.post("/api/leads", json={"name": "Alice", "status": "won"})

    assert response.status_code == 201
    assert response.json()["status"] == "new"


# --- list -----------------------------------------------------------------------------------


def test_list_leads_includes_latest_discussion(
    auth_client: TestClient, make_lead: MakeLead, make_discussion: MakeDiscussion
) -> None:
    now = datetime.now(UTC)
    lead = make_lead("Alice", created_at=now - timedelta(days=10))
    make_discussion(lead, "Older note", created_at=now - timedelta(days=5))
    make_discussion(lead, "Latest note", created_at=now - timedelta(days=1))
    make_lead("Bob")

    response = auth_client.get("/api/leads")

    assert response.status_code == 200
    by_name = {lead["name"]: lead for lead in response.json()}
    assert by_name["Alice"]["last_note"] == "Latest note"
    assert datetime.fromisoformat(by_name["Alice"]["last_discussion_at"]) == now - timedelta(days=1)
    assert by_name["Bob"]["last_note"] is None
    assert by_name["Bob"]["last_discussion_at"] is None


def test_list_leads_orders_by_most_recent_activity(
    auth_client: TestClient, make_lead: MakeLead, make_discussion: MakeDiscussion
) -> None:
    now = datetime.now(UTC)
    old_but_active = make_lead("Old but active", created_at=now - timedelta(days=30))
    make_discussion(old_but_active, "Just talked", created_at=now - timedelta(hours=1))
    make_lead("Created yesterday", created_at=now - timedelta(days=1))
    make_lead("Created last week", created_at=now - timedelta(days=7))

    response = auth_client.get("/api/leads")

    assert _names(response.json()) == ["Old but active", "Created yesterday", "Created last week"]


def test_list_leads_filters_by_status(auth_client: TestClient, make_lead: MakeLead) -> None:
    make_lead("Qualified One", status=LeadStatus.QUALIFIED)
    make_lead("Qualified Two", status=LeadStatus.QUALIFIED)
    make_lead("Brand New")

    response = auth_client.get("/api/leads", params={"status": "qualified"})

    assert response.status_code == 200
    assert sorted(_names(response.json())) == ["Qualified One", "Qualified Two"]


def test_list_leads_search_is_case_insensitive(auth_client: TestClient, make_lead: MakeLead) -> None:
    make_lead("Alice Johnson")
    make_lead("Bob Martinez")

    response = auth_client.get("/api/leads", params={"search": "  jOhN "})

    assert _names(response.json()) == ["Alice Johnson"]


def test_list_leads_blank_search_returns_everything(auth_client: TestClient, make_lead: MakeLead) -> None:
    make_lead("Alice Johnson")
    make_lead("Bob Martinez")

    response = auth_client.get("/api/leads", params={"search": "   "})

    assert len(response.json()) == 2


@pytest.mark.parametrize(
    ("search", "expected"),
    [("%", ["100% Advisors"]), ("_", ["Under_score Capital"]), ("\\", ["Back\\slash Wealth"])],
)
def test_list_leads_search_matches_wildcards_literally(
    auth_client: TestClient, make_lead: MakeLead, search: str, expected: list[str]
) -> None:
    for name in ("100% Advisors", "Under_score Capital", "Underxscore Capital", "Back\\slash Wealth"):
        make_lead(name)

    response = auth_client.get("/api/leads", params={"search": search})

    assert _names(response.json()) == expected


def test_list_leads_rejects_invalid_status(auth_client: TestClient) -> None:
    response = auth_client.get("/api/leads", params={"status": "banana"})

    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "status"


# --- get ------------------------------------------------------------------------------------


def test_get_missing_lead_returns_404(auth_client: TestClient) -> None:
    response = auth_client.get("/api/leads/9999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Lead not found"}


# --- update ---------------------------------------------------------------------------------


def test_patch_status_persists(auth_client: TestClient, make_lead: MakeLead) -> None:
    lead = make_lead()

    response = auth_client.patch(f"/api/leads/{lead.id}", json={"status": "qualified"})

    assert response.status_code == 200
    assert response.json()["status"] == "qualified"
    assert auth_client.get(f"/api/leads/{lead.id}").json()["status"] == "qualified"


def test_patch_empty_body_returns_400(auth_client: TestClient, make_lead: MakeLead) -> None:
    lead = make_lead()

    response = auth_client.patch(f"/api/leads/{lead.id}", json={})

    assert response.status_code == 400
    assert response.json() == {"detail": "No fields to update"}


def test_patch_invalid_status_returns_422(auth_client: TestClient, make_lead: MakeLead) -> None:
    lead = make_lead()

    response = auth_client.patch(f"/api/leads/{lead.id}", json={"status": "banana"})

    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "status"


def test_patch_null_name_returns_422(auth_client: TestClient, make_lead: MakeLead) -> None:
    lead = make_lead()

    response = auth_client.patch(f"/api/leads/{lead.id}", json={"name": None})

    assert response.status_code == 422
    assert response.json()["errors"] == [{"field": "name", "message": "This field cannot be null"}]


def test_patch_past_follow_up_returns_400(auth_client: TestClient, make_lead: MakeLead) -> None:
    lead = make_lead()
    yesterday = datetime.now(UTC) - timedelta(days=1)

    response = auth_client.patch(f"/api/leads/{lead.id}", json={"follow_up_at": yesterday.isoformat()})

    assert response.status_code == 400
    assert response.json() == {"detail": "Follow-up time must be in the future"}


def test_patch_null_follow_up_clears_it(auth_client: TestClient, make_lead: MakeLead) -> None:
    lead = make_lead(follow_up_at=datetime.now(UTC) + timedelta(days=2))

    response = auth_client.patch(f"/api/leads/{lead.id}", json={"follow_up_at": None})

    assert response.status_code == 200
    assert response.json()["follow_up_at"] is None
    assert auth_client.get(f"/api/leads/{lead.id}").json()["follow_up_at"] is None
