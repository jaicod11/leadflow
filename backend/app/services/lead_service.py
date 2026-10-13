from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, true
from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models import Discussion, Lead, LeadStatus
from app.schemas.lead import LeadCreate, LeadRead, LeadUpdate

LEAD_NOT_FOUND = "Lead not found"

# Tolerates small clock differences between the browser and the server.
FOLLOW_UP_GRACE_PERIOD = timedelta(seconds=60)

# Latest discussion per lead, as a LATERAL subquery so the lead list stays a single query
# (one index lookup on discussions(lead_id, created_at) per lead, no N+1).
_LATEST_DISCUSSION = (
    select(Discussion.note, Discussion.created_at)
    .where(Discussion.lead_id == Lead.id)
    .order_by(Discussion.created_at.desc(), Discussion.id.desc())
    .limit(1)
    .lateral("latest_discussion")
)

# Every LeadRead field as a flat row: the lead's columns plus the derived last-discussion fields.
_LEAD_READ_QUERY = (
    select(
        Lead.id,
        Lead.name,
        Lead.company,
        Lead.phone,
        Lead.status,
        Lead.follow_up_at,
        Lead.created_at,
        Lead.updated_at,
        _LATEST_DISCUSSION.c.note.label("last_note"),
        _LATEST_DISCUSSION.c.created_at.label("last_discussion_at"),
    )
    .select_from(Lead)
    .outerjoin(_LATEST_DISCUSSION, true())
)


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def ensure_follow_up_in_future(follow_up_at: datetime | None) -> None:
    """Reject follow-ups more than FOLLOW_UP_GRACE_PERIOD in the past. None (no/cleared follow-up) is allowed."""
    if follow_up_at is not None and follow_up_at < datetime.now(UTC) - FOLLOW_UP_GRACE_PERIOD:
        raise BusinessRuleError("Follow-up time must be in the future")


def require_lead(db: Session, lead_id: int) -> Lead:
    """Return the Lead entity, or raise NotFoundError."""
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise NotFoundError(LEAD_NOT_FOUND)
    return lead


def list_leads(db: Session, status: LeadStatus | None = None, search: str | None = None) -> list[LeadRead]:
    query = _LEAD_READ_QUERY
    if status is not None:
        query = query.where(Lead.status == status)
    search = (search or "").strip()
    if search:
        query = query.where(Lead.name.ilike(f"%{_escape_like(search)}%", escape="\\"))
    last_activity_at = func.coalesce(_LATEST_DISCUSSION.c.created_at, Lead.created_at)
    rows = db.execute(query.order_by(last_activity_at.desc(), Lead.id.desc()))
    return [LeadRead.model_validate(row) for row in rows]


def get_lead(db: Session, lead_id: int) -> LeadRead:
    row = db.execute(_LEAD_READ_QUERY.where(Lead.id == lead_id)).one_or_none()
    if row is None:
        raise NotFoundError(LEAD_NOT_FOUND)
    return LeadRead.model_validate(row)


def create_lead(db: Session, data: LeadCreate) -> LeadRead:
    lead = Lead(**data.model_dump())
    db.add(lead)
    db.commit()
    return get_lead(db, lead.id)


def update_lead(db: Session, lead_id: int, data: LeadUpdate) -> LeadRead:
    lead = require_lead(db, lead_id)
    changes = data.model_dump(exclude_unset=True)
    if not changes:
        raise BusinessRuleError("No fields to update")
    if "follow_up_at" in changes:
        ensure_follow_up_in_future(changes["follow_up_at"])
    for field, value in changes.items():
        setattr(lead, field, value)
    db.commit()
    return get_lead(db, lead_id)
