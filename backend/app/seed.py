"""Seed the database with demo leads and discussions.

Run from backend/:
    python -m app.seed           # seeds only if the leads table is empty
    python -m app.seed --reset   # wipes leads and discussions, then seeds

All timestamps are relative to now, and "today" is the current date in SEED_TIMEZONE,
so the demo follow-ups (later today, overdue, upcoming) look right whenever it is run.
"""

import argparse
from dataclasses import dataclass, field
from datetime import UTC, datetime, time, timedelta
from typing import Literal
from zoneinfo import ZoneInfo

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Discussion, Lead, LeadStatus

# How a seeded discussion sets a follow-up:
#   "current": the lead's current follow-up (its demo scenario, see LeadSpec.follow_up);
#   "next":    an earlier follow-up that the next logged discussion fulfilled.
FollowUpRef = Literal["current", "next"]


@dataclass(frozen=True)
class NoteSpec:
    at: datetime
    text: str
    follow_up: FollowUpRef | None = None


@dataclass(frozen=True)
class LeadSpec:
    name: str
    company: str
    phone: str | None
    status: LeadStatus
    created_at: datetime
    follow_up: datetime | None = None
    notes: list[NoteSpec] = field(default_factory=list)  # oldest first


def _floor_to_quarter_hour(value: datetime) -> datetime:
    return value.replace(minute=value.minute - value.minute % 15, second=0, microsecond=0)


def _ceil_to_quarter_hour(value: datetime) -> datetime:
    floored = _floor_to_quarter_hour(value)
    return floored if floored == value else floored + timedelta(minutes=15)


class DemoClock:
    """Builds timestamps relative to now, with "today" defined in the seed timezone."""

    def __init__(self, now: datetime, tz: ZoneInfo) -> None:
        self.now = now
        self.tz = tz
        self.today = now.astimezone(tz).date()
        self.messages: list[str] = []

    def on(self, days: int, at: str) -> datetime:
        """Local time `at` ("HH:MM") on the day `days` away from today (negative = in the past)."""
        return datetime.combine(self.today + timedelta(days=days), time.fromisoformat(at), tzinfo=self.tz)

    def later_today(self, hours: int) -> datetime | None:
        """About `hours` from now; if that is already tomorrow, 23:30 or 23:59 today, whichever is still ahead."""
        candidate = _ceil_to_quarter_hour((self.now + timedelta(hours=hours)).astimezone(self.tz))
        if candidate.date() == self.today:
            return candidate
        for fallback in ("23:30", "23:59"):
            candidate = self.on(0, fallback)
            if candidate > self.now:
                return candidate
        self.messages.append("WARNING: too late in the day for a future follow-up today; a 'later today' lead has none.")
        return None

    def earlier_today(self, hours: int) -> datetime | None:
        """About `hours` ago but not before midnight; skipped when it is just after midnight."""
        midnight = self.on(0, "00:00")
        candidate = max(_floor_to_quarter_hour((self.now - timedelta(hours=hours)).astimezone(self.tz)), midnight)
        if self.now - candidate < timedelta(minutes=15):
            self.messages.append("NOTE: it is just after midnight, so the 'earlier today' (overdue) follow-up was skipped.")
            return None
        return candidate


def _demo_leads(clock: DemoClock) -> list[LeadSpec]:
    """Fictional people and companies. Phone numbers use ranges reserved for fiction (UK 020 7946 0xxx, US 555-01xx)."""
    on = clock.on
    return [
        LeadSpec(
            name="Ananya Iyer",
            company="Kestrelmoor Wealth Partners",
            phone=None,
            status=LeadStatus.NEW,
            created_at=on(-1, "09:40"),
        ),
        LeadSpec(
            name="Daniel Whitcombe",
            company="Harbourlight Advisory Group",
            phone="+44 20 7946 0321",
            status=LeadStatus.NEW,
            created_at=on(-2, "11:05"),
            follow_up=clock.later_today(hours=2),
            notes=[
                NoteSpec(
                    on(-1, "16:10"),
                    "Inbound demo request from the website. 9 advisers, still emailing PDF valuation reports "
                    "to clients. Left a voicemail; he replied by email asking for a quick call later today.",
                    "current",
                ),
            ],
        ),
        LeadSpec(
            name="Rohan Mehta",
            company="Saffronvale Capital Advisors",
            phone=None,
            status=LeadStatus.CONTACTED,
            created_at=on(-12, "10:20"),
            follow_up=clock.earlier_today(hours=2),
            notes=[
                NoteSpec(
                    on(-9, "11:00"),
                    "Intro call after LinkedIn outreach. 6 relationship managers, ₹850 Cr AUM, quarterly client "
                    "reports built by hand in Excel. Interested, but busy with month-end close.",
                    "next",
                ),
                NoteSpec(
                    on(-3, "15:30"),
                    "Second call. Keen on automated quarterly reports and an audit trail for SEBI inspections. "
                    "Agreed to speak again today to fix a demo slot with their COO.",
                    "current",
                ),
            ],
        ),
        LeadSpec(
            name="Sofia Lindqvist",
            company="Brightfjord Financial Planning",
            phone=None,
            status=LeadStatus.CONTACTED,
            created_at=on(-15, "13:00"),
            follow_up=on(-1, "11:00"),
            notes=[
                NoteSpec(
                    on(-12, "10:00"),
                    "Met at a fintech meetup. 4 planners outgrowing their CRM; biggest pain is collecting KYC "
                    "documents from clients over email.",
                    "next",
                ),
                NoteSpec(
                    on(-5, "14:00"),
                    "Intro call. Sent the product overview deck and two customer stories. She is reviewing them "
                    "with her business partner; chase if no reply.",
                    "current",
                ),
            ],
        ),
        LeadSpec(
            name="Kavya Reddy",
            company="Tealpoint Payments",
            phone=None,
            status=LeadStatus.QUALIFIED,
            created_at=on(-23, "09:15"),
            follow_up=clock.later_today(hours=4),
            notes=[
                NoteSpec(
                    on(-20, "12:00"),
                    "Discovery call with their Head of Partnerships. They want to embed portfolio analytics in "
                    "their investing app (~40k active users). API-first integration is a must.",
                    "next",
                ),
                NoteSpec(
                    on(-13, "16:30"),
                    "Technical deep-dive with their CTO: REST API, webhooks, rate limits and sandbox access. "
                    "Sandbox keys issued.",
                    "next",
                ),
                NoteSpec(
                    on(-2, "11:45"),
                    "Budget approved for this quarter; the CPO is the final decision maker. Call later today to "
                    "agree the agenda for the CPO demo.",
                    "current",
                ),
            ],
        ),
        LeadSpec(
            name="Marcus Adeyemi",
            company="Copperwind Asset Management",
            phone="+44 20 7946 0874",
            status=LeadStatus.QUALIFIED,
            created_at=on(-27, "14:20"),
            follow_up=on(-3, "15:00"),
            notes=[
                NoteSpec(
                    on(-24, "10:30"),
                    "Discovery call. 18 relationship managers, £1.2bn AUM. Unhappy with their reporting vendor's "
                    "renewal price; contract ends next quarter.",
                    "next",
                ),
                NoteSpec(
                    on(-16, "15:00"),
                    "Live demo for the RM team. Strong reaction to the consolidated household view and automated "
                    "fee reports. Questions about migrating 7 years of history.",
                    "next",
                ),
                NoteSpec(
                    on(-8, "12:15"),
                    "Sent the data-migration plan and draft answers to their security questionnaire. Their IT "
                    "lead is reviewing and promised feedback within a few days.",
                    "current",
                ),
            ],
        ),
        LeadSpec(
            name="Priya Raghavan",
            company="Meadowmark Trust Advisors",
            phone=None,
            status=LeadStatus.PROPOSAL_SENT,
            created_at=on(-30, "10:00"),
            follow_up=on(2, "10:30"),
            notes=[
                NoteSpec(
                    on(-27, "11:30"),
                    "Discovery call with the founding partners. 25 advisers, ₹2,400 Cr AUM, moving off a legacy "
                    "desktop portfolio tool.",
                    "next",
                ),
                NoteSpec(
                    on(-19, "15:00"),
                    "Demo for the partners and their operations head. They liked the client portal and one-click "
                    "quarterly reports.",
                    "next",
                ),
                NoteSpec(
                    on(-11, "14:30"),
                    "Security review: shared our SOC 2 Type II report and pen-test summary, confirmed client data "
                    "stays in the India region. Their IT consultant signed off.",
                    "next",
                ),
                NoteSpec(
                    on(-3, "17:00"),
                    "Proposal sent: 25 seats on the annual plan plus the onboarding package. They are comparing "
                    "one other vendor; decision after their partners' meeting.",
                    "current",
                ),
            ],
        ),
        LeadSpec(
            name="Thomas Brennan",
            company="Quillbrook Family Office",
            phone="+1 (212) 555-0148",
            status=LeadStatus.PROPOSAL_SENT,
            created_at=on(-29, "16:00"),
            follow_up=on(7, "14:00"),
            notes=[
                NoteSpec(
                    on(-26, "16:30"),
                    "Referral from an existing customer. Single-family office with private equity, real estate "
                    "and direct investments across 14 entities.",
                    "next",
                ),
                NoteSpec(
                    on(-18, "13:00"),
                    "Demo focused on alternative assets and look-through reporting. The CFO wants one "
                    "consolidated report across all entities.",
                    "next",
                ),
                NoteSpec(
                    on(-9, "17:30"),
                    "Pricing sent for the enterprise tier. The CFO pushed back on the implementation fee.",
                    "next",
                ),
                NoteSpec(
                    on(-1, "18:00"),
                    "Revised proposal: 3-year term with the implementation fee waived. Their legal team is "
                    "reviewing our MSA redlines; the CFO is travelling until next week.",
                    "current",
                ),
            ],
        ),
        LeadSpec(
            name="Aarav Kapoor",
            company="Ledgerlume Technologies",
            phone=None,
            status=LeadStatus.WON,
            created_at=on(-33, "11:00"),
            follow_up=on(-5, "11:00"),
            notes=[
                NoteSpec(
                    on(-30, "12:00"),
                    "Discovery call. Robo-advisory fintech that needs white-labelled performance reports for "
                    "12k investors.",
                    "next",
                ),
                NoteSpec(
                    on(-23, "15:30"),
                    "Demo with product and engineering. Validated white-label theming and the PDF report API.",
                    "next",
                ),
                NoteSpec(
                    on(-16, "11:00"),
                    "Pricing sent for the growth plan with usage-based report volumes.",
                    "next",
                ),
                NoteSpec(
                    on(-9, "16:00"),
                    "Negotiation: agreed a 12% discount for annual prepayment. Contract sent for signature.",
                    "current",
                ),
                NoteSpec(
                    on(-4, "10:30"),
                    "Contract signed. Kickoff booked with the onboarding team; handing over to customer success.",
                ),
            ],
        ),
        LeadSpec(
            name="Elena Marchetti",
            company="Ironvale Private Wealth",
            phone=None,
            status=LeadStatus.LOST,
            created_at=on(-25, "09:30"),
            follow_up=on(-8, "12:00"),
            notes=[
                NoteSpec(
                    on(-22, "10:00"),
                    "Discovery call. 11 private bankers, frustrated with their current vendor's mobile app.",
                    "next",
                ),
                NoteSpec(
                    on(-15, "14:00"),
                    "Demo and pricing sent. They liked the client app but flagged budget pressure this year.",
                    "current",
                ),
                NoteSpec(
                    on(-7, "16:45"),
                    "Lost: they renewed with their incumbent after a steep discount. Open to revisiting at their "
                    "next renewal in 12 months.",
                ),
            ],
        ),
    ]


def _build_lead(spec: LeadSpec) -> Lead:
    discussions: list[Discussion] = []
    for index, note in enumerate(spec.notes):
        if note.follow_up == "current":
            follow_up_at = spec.follow_up
        elif note.follow_up == "next":
            follow_up_at = spec.notes[index + 1].at
        else:
            follow_up_at = None
        discussions.append(Discussion(note=note.text, follow_up_at=follow_up_at, created_at=note.at))

    # Same rules as the API: the lead keeps the follow-up of its latest discussion that set one,
    # and updated_at moves with every logged discussion.
    follow_up_at = next((d.follow_up_at for d in reversed(discussions) if d.follow_up_at is not None), None)
    updated_at = discussions[-1].created_at if discussions else spec.created_at
    return Lead(
        name=spec.name,
        company=spec.company,
        phone=spec.phone,
        status=spec.status,
        follow_up_at=follow_up_at,
        created_at=spec.created_at,
        updated_at=updated_at,
        discussions=discussions,
    )


def _print_summary(leads: list[Lead], clock: DemoClock) -> None:
    local_now = clock.now.astimezone(clock.tz)
    total_discussions = sum(len(lead.discussions) for lead in leads)
    print(f"Seeded {len(leads)} leads and {total_discussions} discussions.")
    print(f"Now in {clock.tz.key}: {local_now:%a %d %b %Y %H:%M}")
    for message in clock.messages:
        print(message)

    headers = ("Name", "Status", f"Follow-up ({clock.tz.key})", "Discussions")
    rows = [
        (
            lead.name,
            lead.status.value,
            f"{lead.follow_up_at.astimezone(clock.tz):%a %d %b %Y %H:%M}" if lead.follow_up_at else "-",
            str(len(lead.discussions)),
        )
        for lead in leads
    ]
    widths = [max(len(header), *(len(row[i]) for row in rows)) for i, header in enumerate(headers)]
    print()
    for line in [headers, tuple("-" * width for width in widths), *rows]:
        print("  ".join(value.ljust(width) for value, width in zip(line, widths, strict=True)).rstrip())


def seed(db: Session, *, reset: bool = False) -> bool:
    """Insert the demo data and return True; return False without changes if leads exist and reset is False."""
    if reset:
        db.execute(text("TRUNCATE leads, discussions RESTART IDENTITY CASCADE"))
    elif db.scalar(select(func.count()).select_from(Lead)):
        print("The leads table already has data, so nothing was changed. Use --reset to wipe it and seed again.")
        return False

    clock = DemoClock(datetime.now(UTC), ZoneInfo(settings.SEED_TIMEZONE))
    leads = [_build_lead(spec) for spec in _demo_leads(clock)]
    db.add_all(leads)
    db.commit()  # the optional TRUNCATE and all inserts land in one transaction
    _print_summary(leads, clock)
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the LeadFlow database with demo leads and discussions.")
    parser.add_argument("--reset", action="store_true", help="delete all leads and discussions before seeding")
    args = parser.parse_args()
    with SessionLocal() as db:
        seed(db, reset=args.reset)


if __name__ == "__main__":
    main()
