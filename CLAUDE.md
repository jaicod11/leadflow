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

- **Frontend** (`/frontend`): Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS v4 + shadcn/ui (Radix, "nova" style, neutral) + TanStack Query v5 + date-fns + sonner. See the Frontend section below.
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

# in a second terminal
cd frontend
npm install
cp .env.example .env.local                # if .env.local does not exist yet
npm run dev                               # http://localhost:3000
```

## Frontend

Next.js **16.4** is newer than most training data, and its APIs and conventions differ (e.g. Tailwind v4 runs through the `@tailwindcss/turbopack` loader in `next.config.ts`, with no PostCSS config; Cache Components and Partial Prefetching are on). Before writing Next.js-specific code, read the relevant guide in `frontend/node_modules/next/dist/docs/` and heed deprecation notices. `agentRules: false` in `next.config.ts` stops `next dev` from writing its own `AGENTS.md`, so this paragraph replaces it.

### Folder structure (`frontend/src/`)

- `app/`: `layout.tsx` (metadata, fonts, `<Providers>`), `page.tsx` (the single screen), `providers.tsx` (QueryClient, TooltipProvider, Toaster, dev-only React Query Devtools), `globals.css` (Tailwind + shadcn theme)
- `components/ui/`: shadcn components (button, badge, dialog, input, textarea, label, select, checkbox, skeleton, separator, scroll-area, tooltip, sonner). Add more with `npx shadcn@latest add <name>`, then run `npm run format`. There is no calendar/date-picker; follow-ups use native `<input type="date">` and `<input type="time">`.
- `components/`
  - `leads-screen.tsx`: client wrapper for the single screen. It holds UI state shared with the dialogs (`selectedLeadId`) and wraps `LeadList` in `<Suspense>`.
  - `app-header.tsx`: logo and the blue "+ Add New Lead" button (disabled, with a "Coming soon" tooltip until the Add Lead modal exists).
- `components/leads/`: the lead list, split into small files.
  - `lead-list.tsx` is the container (filters + `useLeads` + `useNow` + `groupLeads`).
  - Also `lead-toolbar.tsx`, `lead-section.tsx`, `lead-card.tsx`, `lead-status-badge.tsx`, `lead-follow-up-chip.tsx`, `lead-list-skeleton.tsx`, `lead-list-states.tsx` (error and empty states).
- `components/leads/timeline/`: the lead timeline dialog. See "Timeline dialog" below.
- `hooks/`
  - React Query: `use-leads.ts` (`useLeads`), `use-lead.ts` (`useLead`, seeded from cached lists), `use-lead-mutations.ts` (`useCreateLead`, `useUpdateLead`), `use-discussions.ts` (`useDiscussions`, `useCreateDiscussion`).
  - UI: `use-lead-filters.ts` (status + search, synced to the URL), `use-now.ts` (current time, refreshed every 60 s), `use-debounced-value.ts`.
- `lib/dates.ts`: pure date logic (`formatTimeAgo`, `isFollowUpToday`, `isFollowUpOverdue`, `formatFollowUp`, `formatTimestamp`). There is no React here, and every relative function takes `now`.
  - `formatFollowUp(iso, now, { midSentence: true })` lowercases "today/tomorrow/yesterday" for use mid-sentence, e.g. "Overdue · due yesterday at 11:00 AM". Without the option they are capitalized.
- `lib/lead-groups.ts`: `groupLeads(leads, now)` returns `{ today, others }`.
- `lib/follow-up-form.ts`: pure helpers for the native date/time inputs: `getDefaultFollowUp(now)`, `toFollowUpIso(date, time)`, `validateFollowUp(date, time, now)`.
- `test/lead-factory.ts`: test-only helpers (`makeLead`, `istToApi`).
- `lib/api/`: `client.ts` (`apiFetch<T>`, `ApiError`), `leads.ts`, `discussions.ts`
- `lib/types.ts`: TypeScript mirrors of the backend schemas (snake_case, datetimes as ISO strings). Keep them in sync with `backend/app/schemas/`.
- `lib/lead-status.ts`: status order, labels, badge classes, `isClosedStatus()`
- `lib/query-keys.ts`: query key factory (`leads.all`, `leads.lists()`, `leads.list(params)`, `leads.detail(id)`, `discussions.byLead(id)`)
- `lib/env.ts`: reads and validates `NEXT_PUBLIC_API_URL`
- `lib/utils.ts`: shadcn `cn()`

### Data-access rules

- **Components only talk to the API through the hooks in `src/hooks/`.** Hooks call `src/lib/api/*`, and only `src/lib/api/client.ts` calls `fetch`. Components never call `fetch` or `apiFetch` directly.
- **Errors:** every API failure is an `ApiError` with `status`, `message` (the API's `detail`) and `fieldErrors` (`{ field: message }` from a 422). Status `0` means the API was unreachable. React Query's `error` is typed as `ApiError`.
- **Invalidation:** mutations invalidate on success, so lists update immediately.
  - Creating a lead invalidates all lead lists.
  - Updating a lead invalidates all lead lists and that lead's detail.
  - Creating a discussion invalidates that lead's discussions, all lead lists, and the lead's detail.
- **Toasts:** hooks never show toasts; components decide.
- **Query defaults** (in `providers.tsx`): `staleTime` 30 s, `retry: 1` for queries, no retry for mutations, refetch on window focus. `useLeads` uses `keepPreviousData` so filtering and searching never flash an empty list.
- **Dates:** "today" and "overdue" are computed on the frontend in the user's local timezone (see Business rules). Use date-fns, and keep date logic in `lib/dates.ts` as pure functions that take `now`. Components get `now` from `useNow()`.

### Lead list rules

- **Today:** `isFollowUpToday` is true when `follow_up_at` falls on the same local calendar day as `now`. It's always false for won/lost (`isClosedStatus`).
- **Overdue:** `isFollowUpOverdue` is true when `follow_up_at < now`. It's always false for won/lost. A follow-up earlier today is BOTH today and overdue.
- **Grouping:** `groupLeads` puts every lead in exactly one group.
  - `today`: today's follow-ups sorted by `follow_up_at` ASC, so the ones already due come first.
  - `others`: everything else, in API order (most recent activity first).
  - Sections render as "TODAY'S FOLLOW-UPS · n" then "ALL LEADS · n". An empty section is not rendered.
- **Card styling** (by precedence):
  1. Overdue (in either section): red left border, very light red background, red chip "Overdue · due …".
  2. Today and not yet due: light blue background, blue border, blue chip "Follow-up today at 2:00 PM".
  3. Future follow-up: gray chip "Follow-up Thu, 15 Oct at 10:30 AM".
  4. Won/lost: faded (opacity 60%) and never show a follow-up chip.
- **Selection:** every card is a `<button>` that calls `onSelect(lead.id)`.
- **Live time:** `useNow()` re-renders every 60 s, so relative times, today and overdue update without a refresh, including across midnight.
- **URL params:**
  - `?status=<lead status>&q=<search>`. The URL is read once on load, and every change is written back with `router.replace(…, { scroll: false })`, so there are no new history entries.
  - Invalid `status` values are ignored and removed. The search is debounced 300 ms and trimmed.
  - `useLeadFilters` uses `useSearchParams`, so `LeadList` must stay inside `<Suspense>`. With Cache Components, anything reading the URL or the current time during render needs a Suspense boundary, otherwise the build fails.
- **States:**
  - The skeleton shows on the first load.
  - Later refetches keep the previous results (`keepPreviousData`) and show a small spinner next to the section counts.
  - Errors show the `ApiError` message with a Retry button.
  - The empty state reads "No leads yet" with no filters, or "No leads match your filters" with a "Clear filters" button.

### Timeline dialog (`components/leads/timeline/`)

- **Open/close:** clicking a card sets `selectedLeadId` in `LeadsScreen`, which opens `lead-timeline-dialog.tsx` (a shadcn Dialog, not a page). Closing it (×, Esc, overlay, Close) clears the selection. The dialog keeps showing the last lead while its close animation runs.
- **Layout:** a flex column, `max-h-[85vh]`, `sm:max-w-xl`, nearly full width on mobile.
  - **Header** (`timeline-header.tsx`):
    - name, company and `tel:` phone;
    - `lead-status-select.tsx` (PATCH status, toasts "Status updated to …", reverts to the server value on error);
    - the active follow-up chip with **Mark done**, which PATCHes `follow_up_at: null` and toasts "Follow-up cleared".
  - **Middle** (`discussion-timeline.tsx`): scrolls. Discussions are shown in API order (newest first, never re-sorted), with a blue dot on the newest.
  - **Footer** (`add-discussion-form.tsx` + `follow-up-fields.tsx`): stays fixed.
    - The textarea is auto-focused; Cmd/Ctrl+Enter submits.
    - The counter appears after 4500 chars (max 5000).
    - "Set follow-up" prefills `getDefaultFollowUp`.
- **Accessibility:** every state renders a `DialogTitle` and `DialogDescription` (sr-only where needed) to avoid Radix warnings.
- **Form errors:**
  - Client-side `validateFollowUp` runs before sending.
  - `ApiError.fieldErrors.note` / `follow_up_at` show inline.
  - Any other API error shows in a red alert above Save.
  - The typed note is never cleared on error.
  - On success the form resets, focus returns to the textarea, and the dialog stays open.
- **Data:** `useLead(id)` uses `initialData` from any cached lead list (so the header renders instantly) and still refetches in the background. `useCreateDiscussion` / `useUpdateLead` invalidation updates the timeline, the header and the list behind the dialog.
- **Load failure:** if the lead fails to load (or returns 404, even when a cached copy exists), the dialog shows the error with a Close button.

### Commands (run from `frontend/`)

```bash
npm run dev            # dev server on http://localhost:3000 (needs the API on :8000)
npm run build          # production build
npm run lint           # ESLint (eslint-config-next)
npx tsc --noEmit       # type check
npm run format         # Prettier (+ Tailwind class sorting) over src/
npm run format:check   # verify formatting
npm test               # Vitest unit tests (src/**/*.test.ts); TZ is pinned to Asia/Kolkata in vitest.config.mts
```

### Environment

- `NEXT_PUBLIC_API_URL`: the API base URL including `/api`, e.g. `http://localhost:8000/api` locally, or the Render URL in production. A trailing slash is stripped, and the app throws a clear error at startup if it's missing.
- `NEXT_PUBLIC_*` values are inlined at build time, so restart `npm run dev` or rebuild after changing them.
- Template: `frontend/.env.example`. The local copy is `frontend/.env.local` (gitignored).
- The API must allow the frontend origin via `CORS_ORIGINS` in `backend/.env`.

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
