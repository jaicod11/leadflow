from datetime import UTC, datetime

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Discussion, Lead, LeadStatus, User
from app.seed import seed


def _snapshot(db: Session) -> tuple[list[tuple[object, ...]], list[tuple[object, ...]]]:
    db.expire_all()
    leads = db.execute(
        select(Lead.id, Lead.name, Lead.status, Lead.follow_up_at, Lead.created_at, Lead.updated_at).order_by(Lead.id)
    ).all()
    discussions = db.execute(
        select(Discussion.id, Discussion.lead_id, Discussion.note, Discussion.created_at).order_by(Discussion.id)
    ).all()
    return [tuple(row) for row in leads], [tuple(row) for row in discussions]


def test_seed_on_empty_database_creates_demo_leads(db: Session) -> None:
    assert seed(db) is True

    db.expire_all()
    leads = db.scalars(select(Lead)).all()
    assert len(leads) == 10
    assert {lead.status for lead in leads} == set(LeadStatus)
    assert any(lead.status == LeadStatus.NEW and not lead.discussions for lead in leads)


def test_seed_data_is_consistent(db: Session) -> None:
    seed(db)
    now = datetime.now(UTC)

    db.expire_all()
    for lead in db.scalars(select(Lead)):
        discussions = sorted(lead.discussions, key=lambda d: (d.created_at, d.id))
        if discussions:
            assert lead.created_at < discussions[0].created_at, lead.name
            assert lead.updated_at == discussions[-1].created_at, lead.name
        for discussion in discussions:
            assert discussion.created_at < now, lead.name
            if discussion.follow_up_at is not None:
                assert discussion.follow_up_at > discussion.created_at, lead.name
        latest_follow_up = next((d.follow_up_at for d in reversed(discussions) if d.follow_up_at), None)
        assert lead.follow_up_at == latest_follow_up, lead.name
        if lead.status in (LeadStatus.WON, LeadStatus.LOST):
            assert lead.follow_up_at is not None and lead.follow_up_at < now, lead.name


def test_seed_without_reset_leaves_existing_data_unchanged(
    db: Session, capsys: pytest.CaptureFixture[str]
) -> None:
    seed(db)
    before = _snapshot(db)

    assert seed(db) is False

    assert _snapshot(db) == before
    assert "nothing was changed" in capsys.readouterr().out


def test_seed_with_reset_replaces_existing_data(db: Session) -> None:
    db.add(Lead(name="Leftover Lead"))
    db.commit()

    assert seed(db, reset=True) is True

    names = db.scalars(select(Lead.name).order_by(Lead.id)).all()
    assert len(names) == 10
    assert "Leftover Lead" not in names
    assert db.scalar(select(Lead.id).order_by(Lead.id).limit(1)) == 1  # identities restarted


def test_seed_with_existing_leads_still_creates_the_demo_user(
    db: Session, capsys: pytest.CaptureFixture[str]
) -> None:
    db.add(Lead(name="Existing Lead"))
    db.commit()

    assert seed(db) is False  # leads are left alone...

    db.expire_all()
    assert db.scalars(select(Lead.name)).all() == ["Existing Lead"]
    demo_user = db.scalar(select(User).where(User.email == settings.DEMO_USER_EMAIL.lower()))
    assert demo_user is not None  # ...but the demo user is created
    assert f"Demo login: {settings.DEMO_USER_EMAIL}" in capsys.readouterr().out

