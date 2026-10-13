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
- **Tests:** pytest + FastAPI `TestClient`, backed by `httpx2` (the client Starlette 1.8 recommends; plain `httpx` triggers a deprecation warning).
- **Infra:** Docker Compose.
- **Deploy targets:** Vercel (frontend), Render (backend), Neon (Postgres).
- ALL config must come from environment variables. Nothing environment-specific may be hardcoded.

## Data model

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

## API

All routes are under the `/api` prefix (interactive docs at `/docs`).

- **Datetimes:** responses are UTC ISO 8601 with an explicit offset, e.g. `2026-10-14T10:00:00+00:00`. Request datetimes must carry a timezone offset; naive values get a 422. DB connections run with `timezone=utc`.
- **CORS:** origins come from `CORS_ORIGINS`. Allowed methods are GET, POST, PATCH and OPTIONS.

### Endpoints

| Method | Path | Body | Success | Errors |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | — | 200 `{"status":"ok","database":"ok"}` | 503 `{"status":"error","database":"unreachable"}` |
| GET | `/api/leads?status=&search=` | — | 200 `LeadRead[]` | 422 (e.g. invalid `status`) |
| POST | `/api/leads` | `LeadCreate` | 201 `LeadRead` | 422 |
| GET | `/api/leads/{lead_id}` | — | 200 `LeadRead` | 404, 422 |
| PATCH | `/api/leads/{lead_id}` | `LeadUpdate` | 200 `LeadRead` | 400 (empty body, follow-up in the past), 404, 422 |
| GET | `/api/leads/{lead_id}/discussions` | — | 200 `DiscussionRead[]`, newest first | 404, 422 |
| POST | `/api/leads/{lead_id}/discussions` | `DiscussionCreate` | 201 `DiscussionRead` | 400 (follow-up in the past), 404, 422 |

There is no DELETE endpoint and no pagination; both are out of scope.

### Payloads

- **`LeadCreate`**
  - `name`: required, trimmed, 1–120 chars.
  - `company`: optional, trimmed, `""` becomes `null`, max 120.
  - `phone`: optional, trimmed, `""` becomes `null`, max 32. Only digits, spaces and `+ - ( ) .` are allowed.
  - There is no `status` field; new leads are always `new`.
- **`LeadUpdate`** (partial; only the fields sent are applied, using `exclude_unset`)
  - `name`, `company`, `phone`: same rules as `LeadCreate`.
  - `status`: a `LeadStatus` value.
  - `follow_up_at`: a timezone-aware datetime, or `null` to clear it. A non-null value more than 60 s in the past returns 400 `"Follow-up time must be in the future"`.
  - `name` and `status` cannot be `null`.
  - `{}` returns 400 `"No fields to update"`.
- **`LeadRead`**: `id, name, company, phone, status, follow_up_at, created_at, updated_at, last_note, last_discussion_at`. The last two come from the lead's most recent discussion and are `null` if it has none.
- **`DiscussionCreate`**
  - `note`: required, trimmed, 1–5000 chars.
  - `follow_up_at`: optional and timezone-aware. More than 60 s in the past returns 400 `"Follow-up time must be in the future"`.
- **`DiscussionRead`**: `id, lead_id, note, follow_up_at, created_at`.

### Behavior

- **Lead list:** built with ONE query. The latest discussion comes from a `LEFT JOIN LATERAL` subquery, so there are no N+1 queries.
  - Sorted by `COALESCE(last_discussion_at, created_at) DESC, id DESC`.
  - `search` is trimmed and matched as a case-insensitive substring of `name` (ILIKE). `%`, `_` and `\` are escaped; a blank search means no filter.
- **Discussion order:** "newest first" is always `created_at DESC, id DESC`. This applies to queries and to the `Lead.discussions` relationship.
- **Creating a discussion:** one transaction inserts the discussion, sets `lead.follow_up_at` if `follow_up_at` was given, and bumps `lead.updated_at`. It never changes the lead's status.
- **Follow-up rule:** both PATCH and discussion creation reject a follow-up more than 60 s in the past. The rule lives in ONE helper, `lead_service.ensure_follow_up_in_future`.

### Errors

| Status | When | Body |
| --- | --- | --- |
| 400 | Business rule violated (`BusinessRuleError`) | `{"detail": "..."}` |
| 404 | Missing resource (`NotFoundError`) | `{"detail": "Lead not found"}` |
| 422 | Request validation failed | `{"detail": "Validation failed", "errors": [{"field": "name", "message": "..."}]}` |
| 500 | Unhandled exception | `{"detail": "Internal server error"}` (traceback logged server-side, exactly once) |

- In 422 errors, `field` is the dotted location without the `body`/`query`/`path` prefix. Invalid JSON is reported as `field: "body"`. Messages are human readable, for display next to form fields.
- 500s are produced by `UnhandledErrorMiddleware` (`app/core/middleware.py`), not by an exception handler. It is registered INSIDE `CORSMiddleware` so 500 responses carry CORS headers. Do not add an `Exception` handler; Starlette would run it outside CORS.
- Services raise `NotFoundError` / `BusinessRuleError` from `app/core/exceptions.py`. They never build HTTP responses.
- Routes stay thin: they call one service function. DB logic lives in `app/services/`.
- Every route declares `response_model`, `status_code`, a tag (`health`, `leads`, `discussions`) and a `summary`. Error responses are documented with the specs in `app/api/responses.py`.

### Backend layout

- `app/core/`: settings (`config.py`), exceptions and their handlers (`exceptions.py`), the 500 middleware (`middleware.py`)
- `app/db/`: declarative base and session/engine
- `app/models/`: SQLAlchemy ORM models
- `app/schemas/`: Pydantic request/response schemas (`common.py` holds the shared `UtcDatetime`)
- `app/services/`: DB/business logic (`lead_service.py`, `discussion_service.py`)
- `app/api/routes/`: thin routers (`health.py`, `leads.py`, `discussions.py`)
- `app/api/router.py`: aggregates the routers
- `app/api/deps.py`: the `DbSession` dependency
- `app/api/responses.py`: OpenAPI error-response specs
- `app/main.py`: FastAPI app, middleware, exception handlers, and the `/api` mount
- `app/seed.py`: demo data seeder (`python -m app.seed`)
- `tests/`: pytest suite (`conftest.py` holds fixtures and factories)

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
.venv/bin/python -m app.seed              # demo data (only if the DB is empty)
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

## Seeding

Run from `backend/` against the database in `DATABASE_URL`:

```bash
.venv/bin/python -m app.seed           # seeds only if the leads table is empty; otherwise prints a message and changes nothing
.venv/bin/python -m app.seed --reset   # TRUNCATE leads, discussions RESTART IDENTITY CASCADE, then seed (one transaction)
```

- Creates 10 fictional leads and 27 discussions, written directly through the ORM so past timestamps are possible. All six statuses are covered.
- Every timestamp is relative to now. "Today" is the current date in `SEED_TIMEZONE` (default `Asia/Kolkata`), so the demo always shows:
  - 2 follow-ups later today (falling back to 23:30 or 23:59 late at night)
  - 1 follow-up earlier today that is already past (skipped just after midnight)
  - 2 overdue follow-ups, and 2 in the future
  - won and lost leads with past follow-ups
  - 1 `new` lead with no discussions, for the empty state
- The data obeys the API's rules: each lead is created before its first discussion, `lead.follow_up_at` equals the follow-up of its latest discussion that set one, and `updated_at` equals its last discussion's time.
- It prints a summary table: name, status, follow-up in `SEED_TIMEZONE`, and discussion count.

## Testing

```bash
cd backend && .venv/bin/pytest -v      # needs the db container running
```

- Tests use a SEPARATE database, `TEST_DATABASE_URL` (default `postgresql+psycopg://leadflow:leadflow@localhost:5433/leadflow_test`), in the same Postgres container. It is read from env vars or `backend/.env`. The suite refuses to run if it points at the dev database.
- `tests/conftest.py` does the following once per run:
  - creates the test database if it is missing (autocommit connection to the `postgres` DB);
  - runs Alembic `downgrade base` and then `upgrade head` on it, so every run exercises the migrations in both directions (Alembic receives the connection through `config.attributes["connection"]`);
  - overrides `get_db` so the API uses the test DB.
- Before each test it truncates every table (RESTART IDENTITY), so tests are independent.
- Factories: `make_lead(name=..., **fields)` and `make_discussion(lead, note=..., **fields)` insert rows directly through the ORM. They apply no API rules, so you can set `created_at`, `status` and so on.
- pytest is configured in `backend/pyproject.toml`. Any warning raised from `app.*` or `tests.*` is an error, and the suite must run with zero warnings.
- To test a 500, register a throwaway route inside the test and remove it afterwards (see `tests/test_errors.py`). Never add test-only routes to app code.
