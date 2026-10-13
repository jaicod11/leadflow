from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Discussion
from app.schemas.discussion import DiscussionCreate
from app.services.lead_service import ensure_follow_up_in_future, require_lead


def list_discussions(db: Session, lead_id: int) -> list[Discussion]:
    require_lead(db, lead_id)
    query = (
        select(Discussion)
        .where(Discussion.lead_id == lead_id)
        .order_by(Discussion.created_at.desc(), Discussion.id.desc())
    )
    return list(db.scalars(query))


def create_discussion(db: Session, lead_id: int, data: DiscussionCreate) -> Discussion:
    lead = require_lead(db, lead_id)
    ensure_follow_up_in_future(data.follow_up_at)

    discussion = Discussion(lead_id=lead.id, note=data.note, follow_up_at=data.follow_up_at)
    db.add(discussion)
    if data.follow_up_at is not None:
        lead.follow_up_at = data.follow_up_at
    lead.updated_at = func.now()
    db.commit()  # discussion insert + lead update land in one transaction
    return discussion
