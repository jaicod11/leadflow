from collections.abc import Callable
from datetime import UTC, datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.models import Discussion, Lead

MakeLead = Callable[..., Lead]
MakeDiscussion = Callable[..., Discussion]

IST = timezone(timedelta(hours=5, minutes=30))


def test_create_discussion_sets_lead_follow_up_and_last_note(client: TestClient, make_lead: MakeLead) -> None:
    lead = make_lead()
    follow_up = (datetime.now(IST) + timedelta(days=1)).replace(microsecond=0)

    response = client.post(
        f"/api/leads/{lead.id}/discussions",
        json={"note": "  Sent pricing.  ", "follow_up_at": follow_up.isoformat()},
    )

    assert response.status_code == 201
    discussion = response.json()
    assert discussion["note"] == "Sent pricing."
    assert discussion["follow_up_at"] == follow_up.astimezone(UTC).isoformat()

    updated = client.get(f"/api/leads/{lead.id}").json()
    assert datetime.fromisoformat(updated["follow_up_at"]) == follow_up
    assert updated["last_note"] == "Sent pricing."
    assert updated["last_discussion_at"] == discussion["created_at"]
    assert updated["updated_at"] == discussion["created_at"]
    assert updated["status"] == "new"  # never changed automatically


def test_create_discussion_without_follow_up_keeps_existing_follow_up(
    client: TestClient, make_lead: MakeLead
) -> None:
    existing_follow_up = (datetime.now(UTC) + timedelta(days=3)).replace(microsecond=0)
    lead = make_lead(follow_up_at=existing_follow_up)

    response = client.post(f"/api/leads/{lead.id}/discussions", json={"note": "Quick check-in"})

    assert response.status_code == 201
    assert response.json()["follow_up_at"] is None
    updated = client.get(f"/api/leads/{lead.id}").json()
    assert datetime.fromisoformat(updated["follow_up_at"]) == existing_follow_up
    assert updated["last_note"] == "Quick check-in"


def test_create_discussion_past_follow_up_returns_400(client: TestClient, make_lead: MakeLead) -> None:
    lead = make_lead()
    yesterday = datetime.now(UTC) - timedelta(days=1)

    response = client.post(
        f"/api/leads/{lead.id}/discussions", json={"note": "Late", "follow_up_at": yesterday.isoformat()}
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Follow-up time must be in the future"}


def test_create_discussion_allows_follow_up_within_grace_period(client: TestClient, make_lead: MakeLead) -> None:
    lead = make_lead()
    thirty_seconds_ago = datetime.now(UTC) - timedelta(seconds=30)

    response = client.post(
        f"/api/leads/{lead.id}/discussions", json={"note": "Now-ish", "follow_up_at": thirty_seconds_ago.isoformat()}
    )

    assert response.status_code == 201


def test_create_discussion_naive_follow_up_returns_422(client: TestClient, make_lead: MakeLead) -> None:
    lead = make_lead()

    response = client.post(
        f"/api/leads/{lead.id}/discussions", json={"note": "Hello", "follow_up_at": "2030-01-01T10:00:00"}
    )

    assert response.status_code == 422
    assert response.json()["errors"] == [{"field": "follow_up_at", "message": "Input should have timezone info"}]


def test_create_discussion_blank_note_returns_422(client: TestClient, make_lead: MakeLead) -> None:
    lead = make_lead()

    response = client.post(f"/api/leads/{lead.id}/discussions", json={"note": "   "})

    assert response.status_code == 422
    assert response.json() == {
        "detail": "Validation failed",
        "errors": [{"field": "note", "message": "This field cannot be empty"}],
    }


def test_list_discussions_newest_first_with_id_tiebreak(
    client: TestClient, make_lead: MakeLead, make_discussion: MakeDiscussion
) -> None:
    lead = make_lead()
    same_time = datetime.now(UTC) - timedelta(hours=1)
    oldest = make_discussion(lead, "Oldest", created_at=same_time - timedelta(days=1))
    tie_first = make_discussion(lead, "Tie, inserted first", created_at=same_time)
    tie_second = make_discussion(lead, "Tie, inserted second", created_at=same_time)

    response = client.get(f"/api/leads/{lead.id}/discussions")

    assert response.status_code == 200
    assert [d["id"] for d in response.json()] == [tie_second.id, tie_first.id, oldest.id]


@pytest.mark.parametrize("method", ["GET", "POST"])
def test_discussion_endpoints_return_404_for_missing_lead(client: TestClient, method: str) -> None:
    response = client.request(method, "/api/leads/9999/discussions", json={"note": "Hello"})

    assert response.status_code == 404
    assert response.json() == {"detail": "Lead not found"}
