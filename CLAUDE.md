# STRICT GIT RULE — HIGHEST PRIORITY, NEVER BREAK THIS

I make ALL git commits myself. You must NEVER run any git command that changes the repository, staging area, or history. That includes: git add, git commit, git push, git pull, git reset, git restore, git checkout, git switch, git stash, git rebase, git merge, git rm, git mv, git tag, git branch -d/-D, git init, git clean.

Never use git -C (e.g. git -C <path> commit); it is denied entirely because it would bypass the deny list. Always run git from the repo root instead.

You MAY run read-only commands: git status, git diff, git log.

At the end of EVERY task, instead of committing, give me a suggested commit message in Conventional Commits format (e.g. "feat(api): add leads CRUD endpoints").

---

# LeadFlow

## Project summary

LeadFlow is a single-screen CRM (a lightweight lead management tool). A sales rep tracks leads, logs every discussion with a lead, and sets follow-up reminders.

- **(a) Lead list:** shows name, status badge, last discussion note, and time since last discussion. Has a status filter and search by name. Today's follow-ups are pinned at the top. Overdue follow-ups are highlighted in red.
- **(b) Lead timeline dialog:** a modal, not a new page. Shows discussion history newest first. A form at the bottom adds a note with an optional follow-up date and time. The lead's status can be changed from the dialog.
- **(c) Add New Lead modal:** name required, company and phone optional, status defaults to "new".

## Tech stack

- **Frontend** (`/frontend`): Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query.
- **Backend** (`/backend`): FastAPI + SQLAlchemy 2.0 (typed ORM) + Pydantic v2 + pydantic-settings + Alembic + PostgreSQL 16 (psycopg 3 driver).
- **Tests:** pytest + httpx.
- **Infra:** Docker Compose.
- **Deploy targets:** Vercel (frontend), Render (backend), Neon (Postgres).
- ALL config must come from environment variables. Nothing environment-specific may be hardcoded.

## Data model (planned)

- **Lead**
  - `id`: int PK
  - `name`: str, required, 1–120 chars, trimmed
  - `company`: str, nullable
  - `phone`: str, nullable
  - `status`: enum (`new`, `contacted`, `qualified`, `proposal_sent`, `won`, `lost`), default `new`
  - `follow_up_at`: timezone-aware datetime, nullable
  - `created_at`, `updated_at`
- **Discussion**
  - `id`: int PK
  - `lead_id`: FK -> `leads.id`, ON DELETE CASCADE, indexed
  - `note`: text, required, non-empty after trimming
  - `follow_up_at`: timezone-aware datetime, nullable (the follow-up set when this note was saved)
  - `created_at`
- All datetimes are stored in UTC and returned as ISO 8601 with a timezone offset.

### Business rules

- Saving a discussion WITH `follow_up_at` sets `lead.follow_up_at` to that value.
- "Last note" and "last discussion at" are derived from the lead's most recent discussion.
- "Today's follow-ups" and "overdue" are computed on the FRONTEND in the user's local timezone.
- Leads with status `won` or `lost` are never pinned or marked overdue.

## API conventions

All routes are under the `/api` prefix.

Planned endpoints:

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | |
| GET | `/api/leads?status=&search=` | each lead includes `last_note` and `last_discussion_at` |
| POST | `/api/leads` | 201 |
| GET | `/api/leads/{id}` | 200 / 404 |
| PATCH | `/api/leads/{id}` | 200 / 404 |
| GET | `/api/leads/{id}/discussions` | newest first |
| POST | `/api/leads/{id}/discussions` | 201 |

- Status codes: 201 for creates, 404 for missing resources, 422 for validation errors, 400 for business-rule violations.
- Every error returns JSON in the form `{"detail": "..."}`. Never leak stack traces.
- Routes stay thin. DB logic lives in a service/crud layer.

### Backend layout

- `app/core/` — settings (`config.py`)
- `app/db/` — declarative base and session/engine
- `app/models/` — SQLAlchemy ORM models
- `app/schemas/` — Pydantic request/response schemas
- `app/services/` — DB/business logic (service/crud layer)
- `app/api/routes/` — thin FastAPI routers
- `app/main.py` — FastAPI app, middleware, health check

## Coding conventions

- Type hints everywhere.
- Small, focused modules.
- No dead code. No unused dependencies.
- Clear naming.

## Working rules

- Do ONLY what the current prompt asks. Do not add unrequested features.
- If something is ambiguous, ASK me before assuming.
- Do not add authentication unless I explicitly ask (optional login may come at the very end).
- At the end of every task, report:
  1. files created/changed,
  2. how to run/verify,
  3. any issues or decisions made,
  4. the suggested commit message.

## Local development

```bash
docker compose up -d db --wait            # Postgres 16 on localhost:5433
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
cp .env.example .env                      # if .env does not exist yet
.venv/bin/alembic upgrade head            # apply migrations
.venv/bin/uvicorn app.main:app --reload --port 8000
curl http://localhost:8000/api/health
```

## Migrations

Alembic lives in `backend/alembic` (config: `backend/alembic.ini`). The DB URL comes from `settings.DATABASE_URL`, never from `alembic.ini`. Run these from `backend/`:

```bash
# Create a migration after changing models (models must be imported in app/models/__init__.py)
.venv/bin/alembic revision --autogenerate -m "short description"
# ALWAYS read and fix the generated file before applying it
# (e.g. autogenerate duplicates the CHECK constraint of non-native Enums).

.venv/bin/alembic upgrade head      # apply all migrations
.venv/bin/alembic downgrade -1      # roll back the last migration
.venv/bin/alembic downgrade base    # roll back everything
.venv/bin/alembic current           # show the applied revision
.venv/bin/alembic check             # fail if models and DB have drifted
```
