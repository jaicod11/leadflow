# LeadFlow

A single-screen lead management tool (a lightweight CRM): track leads, log every discussion, and never miss a follow-up.

<!-- TODO(Jaideep): add the links once deployed / recorded -->
- **Live demo:** _coming soon_
- **Demo video:** _coming soon_

## Screenshots

Screenshots live in [`docs/screenshots/`](docs/screenshots/).

<!-- TODO(Jaideep): add images to docs/screenshots/ and uncomment
![Lead list with today's follow-ups and overdue leads](docs/screenshots/lead-list.png)
![Lead timeline dialog](docs/screenshots/timeline-dialog.png)
![Add New Lead modal](docs/screenshots/add-lead.png)
-->

---

## Features

**Core**

- [x] Lead list showing name, status badge, last discussion note, and time since the last discussion
- [x] Status filter and search by name
- [x] Today's follow-ups pinned at the top
- [x] Overdue follow-ups highlighted in red
- [x] Lead timeline dialog (a modal, not a new page) with the discussion history, newest first
- [x] Log a discussion with an optional follow-up date and time
- [x] Change a lead's status from the dialog
- [x] Add New Lead modal: name required, company and phone optional, status defaults to New

**Bonus**

- [x] Search by name (case-insensitive)
- [x] Overdue follow-ups in red
- [x] Status filter chips
- [x] Docker Compose for the full stack (Postgres + API + web)
- [x] Seed script with realistic demo data
- [x] Login: sign-in and create-account pages, email + password with JWT access tokens, and a one-click demo account (`demo@leadflow.app` / `demo1234`); see [Authentication](#authentication)

**Extras**

- [x] "Mark done" clears a lead's follow-up from the dialog
- [x] Filters and search are synced to the URL (`?status=qualified&q=pri`), so a refresh or a shared link keeps them
- [x] Live time: "time ago", today and overdue update every minute without a refresh, including across midnight
- [x] A newly created lead is scrolled into view and briefly highlighted, and filters that would hide it are cleared
- [x] Consistent JSON errors with field-level messages, shown inline under form fields
- [x] Tests: 82 backend (pytest) and 165 frontend (Vitest)
- [x] GitHub Actions CI for both apps
- [x] Deployment-ready: Render Blueprint, cold-start friendly frontend (retries + "waking up" notice), and a daily demo reset

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | Next.js 16 (App Router) + TypeScript | Typed React with a prerendered app shell; one framework for dev server, build and production server |
| UI | Tailwind CSS v4 + shadcn/ui (Radix) | Accessible dialog/select/checkbox primitives that live in the repo as plain code, styled with utility classes |
| Server state | TanStack Query v5 | Caching, loading/error states, background refetch, and invalidation after mutations, so the list updates immediately |
| Dates | date-fns | Small, tree-shakeable helpers for local-timezone "today / tomorrow / overdue" logic |
| API | FastAPI | Request validation from type hints and automatic OpenAPI docs at `/docs` |
| ORM | SQLAlchemy 2.0 (typed) | Typed models plus full SQL power (the lead list is one query using a `LATERAL` join) |
| Validation & config | Pydantic v2 + pydantic-settings | One place for request/response rules and environment-based settings |
| Migrations | Alembic | Versioned, reversible schema changes |
| Database | PostgreSQL 16 (psycopg 3) | `timestamptz`, `ILIKE`, `LATERAL`; the same engine as Neon in production |
| Tests | pytest + FastAPI TestClient, Vitest | API tests against a real Postgres test database; fast unit tests for the pure frontend logic |
| Packaging | Docker Compose, GitHub Actions | One command to run everything locally; every push is linted, type-checked, tested and built |

## Quick start with Docker

**Prerequisites:** Docker with Compose v2 (Docker Desktop is fine), and free ports 3000, 8000 and 5433.

```bash
git clone <repository-url> LeadFlow
cd LeadFlow
docker compose up --build -d
docker compose ps        # wait until db, api and web are "healthy"
```

No `.env` file is needed. On start-up the API container runs the migrations and seeds the demo data (only if the database is empty).

Open http://localhost:3000 and click **Use demo account** on the sign-in page (`demo@leadflow.app` / `demo1234`), or create your own account.

| What | URL |
| --- | --- |
| App | http://localhost:3000 |
| API | http://localhost:8000/api |
| API docs (Swagger UI) | http://localhost:8000/docs |
| Postgres | `localhost:5433` (user, password and database: `leadflow`) |

```bash
docker compose logs api                                  # migrations, seed summary, requests
docker compose exec api python -m app.seed --reset       # refresh the demo data (see Seeding)
docker compose down                                      # stop; data is kept in the volume
docker compose down -v                                   # stop and delete all data
```

## Local development (without Docker for the apps)

**Prerequisites:** Python 3.11+, Node.js 22.12+ (Next.js alone needs 20.9+, but Vitest 5 needs 22.12+), and Docker for Postgres only.

**Database**

```bash
docker compose up -d db          # Postgres 16 on localhost:5433
```

**Backend** (http://localhost:8000)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
alembic upgrade head
python -m app.seed               # demo data; does nothing if leads already exist
uvicorn app.main:app --reload --port 8000
```

**Frontend** (http://localhost:3000), in a second terminal

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

## Seeding

`python -m app.seed` creates **10 fictional leads** (wealth managers, advisory firms and fintechs) with **27 B2B sales discussions** spread over the past few weeks. They cover all six statuses and every follow-up scenario:

- 2 follow-ups **later today**, 1 **earlier today** (already overdue), 2 **overdue** (yesterday and 3 days ago), and 2 **upcoming** (in 2 and 7 days)
- won and lost leads with past follow-ups (they are never pinned or flagged)
- one new lead with **no discussions** (the empty state)

The seed is idempotent: without `--reset` it leaves an existing database untouched. With `--reset` it wipes leads and discussions and seeds again, in one transaction.

> **Important:** every timestamp is relative to the moment the seed runs, and "today" is the current date in `SEED_TIMEZONE` (default `Asia/Kolkata`). Re-run it with `--reset` shortly before a demo so "later today" is still in the future:
>
> ```bash
> cd backend && python -m app.seed --reset                  # local
> docker compose exec api python -m app.seed --reset        # Docker
> ```

## Testing

**Backend:** 82 tests (pytest). The suite needs the `db` container. It uses a **separate `leadflow_test` database**, which it creates if missing and migrates down and up on every run (so the migrations get tested too). It truncates all tables before each test.

```bash
cd backend
source .venv/bin/activate
pytest -v
```

**Frontend:** 165 unit tests (Vitest) for the pure date, grouping, follow-up, lead-form, retry and demo-mode logic, the auth helpers (token storage, safe redirects, login/register validation) and the API client's auth handling (mocked `fetch`), with the timezone pinned to Asia/Kolkata. Plus lint, types, formatting and a production build:

```bash
cd frontend
npm test
npm run lint
npx next typegen                 # once on a fresh clone: generates route types for tsc
npx tsc --noEmit
npm run format:check
npm run build
```

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs all of the above on every push and pull request, with a Postgres 16 service container for the backend job.

## Environment variables

Every variable is listed in the root [`.env.example`](.env.example). Locally, the backend reads `backend/.env` ([template](backend/.env.example)) and the frontend reads `frontend/.env.local` ([template](frontend/.env.example)). Docker Compose needs no env file; copy `.env.example` to `.env` at the root only to override its defaults.

| Variable | Used by | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | backend | yes | compose: the `db` service | SQLAlchemy URL. `postgres://` and `postgresql://` URLs (Render, Neon) are rewritten to the psycopg driver |
| `CORS_ORIGINS` | backend, compose | yes | compose: `http://localhost:3000` | Comma-separated browser origins allowed to call the API |
| `SEED_TIMEZONE` | backend (seed), compose | no | `Asia/Kolkata` | Timezone that defines "today" for the seeded follow-ups |
| `SEED_ON_STARTUP` | API container, compose | no | `false` (compose: `true`) | Seed demo data when the API container starts; skipped if leads exist |
| `DEMO_RESET_TOKEN` | backend, compose | no | empty (disabled) | Enables `POST /api/demo/reset` when set; callers must send it in `X-Demo-Token` |
| `JWT_SECRET` | backend, compose | **yes** | compose: a dev-only value | HS256 signing key for access tokens. At least 32 characters, or the API refuses to start. Use `openssl rand -hex 32` in production |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | backend, compose | no | `10080` (7 days) | Access-token lifetime |
| `DEMO_USER_EMAIL` | backend, compose | no | `demo@leadflow.app` | Email of the one-click demo account (kept present by the seed and the demo reset) |
| `DEMO_USER_PASSWORD` | backend, compose | no | `demo1234` | Its password, which is reset to this value on every seed and demo reset |
| `DEMO_USER_NAME` | backend, compose | no | `Demo User` | Its display name |
| `PORT` | API container | no | `8000` | Port uvicorn listens on inside the container (Render injects it) |
| `TEST_DATABASE_URL` | backend tests | no | `…@localhost:5433/leadflow_test` | Separate test database; must differ from `DATABASE_URL` |
| `NEXT_PUBLIC_API_URL` | frontend (build time), compose build arg | yes | compose: `http://localhost:8000/api` | API base URL including `/api`. Inlined into the browser bundle, so rebuild after changing it |
| `NEXT_PUBLIC_DEMO_MODE` | frontend (build time), compose build arg | no | `false` | `true` shows the "Demo instance · data resets daily at 9:00 AM IST" footer |

The reset workflow also needs two **GitHub repository secrets**, `DEMO_API_URL` and `DEMO_RESET_TOKEN` (see [Deployment](#deployment)).

## Project structure

```text
LeadFlow/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # thin FastAPI routers: health, auth, leads, discussions, demo
│   │   ├── core/            # settings, exceptions + handlers, 500 middleware
│   │   ├── db/              # declarative base, engine/session
│   │   ├── models/          # User, Lead, Discussion (SQLAlchemy)
│   │   ├── schemas/         # Pydantic request/response models
│   │   ├── services/        # all DB and business logic
│   │   ├── main.py          # FastAPI app
│   │   └── seed.py          # python -m app.seed
│   ├── alembic/             # migrations
│   ├── tests/               # pytest suite
│   ├── Dockerfile
│   └── docker-entrypoint.sh # migrate, optional seed, uvicorn
├── frontend/
│   ├── src/
│   │   ├── app/             # layout, providers, pages: / (leads), /login, /register
│   │   ├── components/      # auth (provider, route guard, forms, user menu), lead list, dialogs, shadcn/ui
│   │   ├── hooks/           # React Query and UI hooks
│   │   └── lib/             # API client, types, pure date/grouping/form logic (+ Vitest tests)
│   └── Dockerfile
├── docs/screenshots/
├── .github/workflows/
│   ├── ci.yml               # tests, lint, types, build on every push/PR
│   └── reset-demo.yml       # daily demo-data reset (09:00 IST)
├── docker-compose.yml
├── render.yaml              # Render Blueprint for the API
├── .env.example
└── CLAUDE.md                # rules the AI coding agent followed (see AI usage)
```

## API reference

Interactive docs: **http://localhost:8000/docs**. All routes are under `/api`. Datetimes are UTC ISO 8601 with an offset, e.g. `2026-10-14T10:00:00+00:00`, and request datetimes must include an offset.

🔒 = requires `Authorization: Bearer <access_token>` (see [Authentication](#authentication)). In `/docs`, call `POST /api/auth/login`, then paste the `access_token` into **Authorize**.

| Method | Path | Auth | Success | Errors |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | public | 200 `{"status":"ok","database":"ok"}` | 503 `{"status":"error","database":"unreachable"}` |
| POST | `/api/auth/register` | public | 201 `{access_token, token_type, user}` | 409, 422 |
| POST | `/api/auth/login` | public | 200 `{access_token, token_type, user}` | 401, 422 |
| GET | `/api/auth/me` | 🔒 | 200 user (`id`, `email`, `name`, `created_at`) | 401 |
| GET | `/api/leads?status=&search=` | 🔒 | 200 list of leads (each with `last_note`, `last_discussion_at`) | 401, 422 |
| POST | `/api/leads` | 🔒 | 201 lead | 401, 422 |
| GET | `/api/leads/{lead_id}` | 🔒 | 200 lead | 401, 404, 422 |
| PATCH | `/api/leads/{lead_id}` | 🔒 | 200 lead | 400, 401, 404, 422 |
| GET | `/api/leads/{lead_id}/discussions` | 🔒 | 200 discussions, newest first | 401, 404, 422 |
| POST | `/api/leads/{lead_id}/discussions` | 🔒 | 201 discussion | 400, 401, 404, 422 |

There is one more endpoint, hidden from `/docs` and meant only for the deployed demo: `POST /api/demo/reset` with the header `X-Demo-Token`. It doesn't use a Bearer token, so the GitHub workflow can call it.
- It is disabled (404) unless `DEMO_RESET_TOKEN` is set.
- A missing or wrong token gets 401.
- Success is 200 `{"leads": 10, "discussions": 27}`, after it wipes the leads and discussions (never users), seeds them again, and makes sure the demo user exists.

Error responses are always JSON:

```jsonc
// 400 business rule, 404 not found, 409 conflict, 500 unexpected error
{ "detail": "Follow-up time must be in the future" }

// 401 (with header WWW-Authenticate: Bearer)
{ "detail": "Not authenticated" }          // no token
{ "detail": "Invalid or expired token" }   // malformed, tampered, expired, or the user was deleted
{ "detail": "Invalid email or password" }  // login

// 422 validation (field = dotted path without the body/query/path prefix)
{ "detail": "Validation failed", "errors": [{ "field": "name", "message": "This field cannot be empty" }] }
```

## Authentication

Login is optional in the assignment, and LeadFlow implements it as **email + password**, with the API issuing JWT access tokens.

- **Demo account:** `demo@leadflow.app` / `demo1234`, configurable via `DEMO_USER_*`.
  - The seed creates it on every run, even when the leads already exist (which matters on Render).
  - The daily demo reset re-creates it if needed and resets its password, so the public credentials always work.
- **Tokens:**
  - The token is an HS256 JWT signed with `JWT_SECRET`, which is required and must be at least 32 characters.
  - Claims: `sub` (user id), `iat`, `exp`. It lasts 7 days (`ACCESS_TOKEN_EXPIRE_MINUTES`).
  - Clients send it as `Authorization: Bearer <token>`.
- **Passwords:** hashed with Argon2id via `pwdlib`, as the FastAPI security tutorial now recommends.
  - Emails are stored lowercase, and are unique regardless of case.
  - Login answers an unknown email exactly like a wrong password. For unknown emails it still verifies against a dummy hash, so response times don't reveal which accounts exist.
- **Shared workspace:** every logged-in user sees and edits the same leads; there is no `owner_id`. Authentication gates *access* rather than splitting data, which suits a small sales team and keeps the demo simple.

**In the web app**

- **Pages:** `/login` (Sign in) and `/register` (Create account). The sign-in page shows the demo credentials and a **Use demo account** button that fills them in and signs in.
  - Forms are validated in the browser first, with the same rules as the API (email format; name 1–80 characters; password 8–128 characters).
  - A wrong password shows "Invalid email or password", keeps the email and clears the password. A taken email shows "An account with this email already exists" under the Email field.
- **Session:** the token is stored in `localStorage` (`leadflow.token`) and sent as `Authorization: Bearer …` on every API call. On page load, `GET /api/auth/me` checks it before any lead data is shown.
- **Protected screen:** the leads screen is guarded on the client (the app is client-rendered; the API enforces auth on every request). A signed-out visitor is sent to `/login?next=<the page they asked for>`, and lands back there (filters included) after signing in.
  - `next` is only followed if it is a same-site path (it must start with a single `/`), so `?next=https://evil.com` can't turn the login page into an open redirect.
- **Expiry:** any 401 from the API (other than a failed login) means the token has expired or is invalid. The app then signs out, clears all cached data, and returns to the sign-in page with "Your session expired. Please sign in again."
- **Log out:** from the avatar menu in the header. It removes the token and clears every cached lead from memory, so the Back button can't bring the data back. Signing out in one tab signs out the other open tabs too.

**Why Bearer tokens instead of cookies?**
- The frontend (Vercel) and the API (Render) are on different domains, so a session cookie would be a *third-party* cookie, which Safari and Brave block (and Chrome restricts).
- A header token works in every browser, needs no CSRF protection (browsers never attach it automatically), and makes `/docs` and `curl` easy to use.
- The trade-off: the frontend has to store the token somewhere JavaScript can read it, so it is exposed if the page ever has an XSS bug. React's escaping and the absence of `dangerouslySetInnerHTML` keep that risk low.
- The tokens can't be revoked before they expire. A server-side denylist or short-lived access tokens plus refresh tokens would fix that if needed.

## Design decisions & assumptions

- **"Today" and "overdue" use the browser's timezone.** The API stores and returns UTC. The frontend decides what is today or overdue in the user's local time.
- **Won and lost leads are never pinned or flagged.** Their follow-ups are ignored for "today" and "overdue", and the cards are faded.
- **Follow-ups must be in the future.** Both the API and the form reject a follow-up more than 60 seconds in the past (the grace period absorbs clock skew). Clearing a follow-up is always allowed.
- **A discussion's follow-up replaces the lead's.** Logging a discussion with a follow-up sets the lead's next follow-up. Logging one without a follow-up leaves the existing one unchanged.
- **Status never changes automatically.** Only the status dropdown changes it.
- **"Mark done" clears the follow-up.** It sets `follow_up_at` to null; the lead stays in the list.
- **An overdue follow-up from earlier today stays in Today's section, in red.** It is both "today" and "overdue", and today's items are sorted earliest first, so those come first.
- **No delete and no pagination.** Both are out of scope for this assignment.

## AI usage

<!-- TODO(Jaideep): review and rewrite this section in your own words -->

This project was built with AI assistance:

- **Code generation:** the code was written by **Claude Code** (an AI coding agent) working directly in this repository.
- **Prompts:** I prepared a sequence of step-by-step task prompts with **Claude** (chat), based on the assignment brief: foundation, database, API, tests, frontend, dialogs, then packaging and docs.
- **Review and verification:** I reviewed the output of every step and verified the behaviour myself in the browser before moving on. The agent also ran the automated checks (pytest, Vitest, lint, type-check, build) and headless-browser flows, and reported the results after each task.
- **Version control:** I made every git commit myself. Claude Code was blocked from git write commands (add, commit, push, reset, checkout, and so on) in [`.claude/settings.json`](.claude/settings.json).
- **Rules:** [`CLAUDE.md`](CLAUDE.md) is the rule file the agent followed: conventions, the API contract, and working rules such as "do only what the prompt asks", "ask when something is ambiguous" and "report after every task".

## Known limitations & future work

- **Token in `localStorage`:** any script running on the page can read it, so an XSS bug would expose it. The safer setup is an `httpOnly` cookie set through a same-origin proxy (for example Next.js route handlers forwarding `/api` to Render), so the cookie stays first-party. That needs an extra network hop and CSRF protection, so it was left for later.
- **No server-side token revocation:** access tokens can't be revoked before they expire (7 days). Logging out only deletes the token in the browser; there is no denylist or refresh-token rotation.
- **No password reset** and no email verification.
- **No login rate limiting:** repeated wrong passwords are not throttled or locked out.
- **Pagination:** the list loads every lead at once, which is fine for hundreds of leads but not thousands.
- **Delete / archive:** leads and discussions can't be removed yet.
- **Reminders and notifications:** follow-ups are only visible in the app (no email or push).
- **Shared workspace:** every user sees and edits every lead; leads have no owner or assignee, and there are no roles.

## Deployment

**Architecture:** Browser → **Vercel** (Next.js) → **Render** (FastAPI in Docker, free plan) → **Neon** (Postgres).

The repo is deployment-ready:
- [`render.yaml`](render.yaml) is the Render Blueprint.
- The API container migrates the database (and seeds it if empty) on start-up.
- [`.github/workflows/reset-demo.yml`](.github/workflows/reset-demo.yml) refreshes the demo data every morning.

### 1. Neon (database)

1. Create a Neon project. Choose **AWS Asia Pacific (Singapore)**, the same region as the API in `render.yaml`.
2. Open **Connect**, switch **connection pooling off**, and copy the **direct** connection string. Its host must **not** contain `-pooler`:
   `postgresql://<user>:<password>@ep-<id>.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
   - **Why direct:** every API connection sends the startup option `-c timezone=utc`, which Neon's pooler doesn't accept.
   - **No editing needed:** the API rewrites `postgresql://` to the psycopg driver automatically.

You don't need to create tables. The API runs `alembic upgrade head` every time it starts.

### 2. Render (API)

1. In Render: **New → Blueprint**, then pick this GitHub repo. Render reads `render.yaml` and proposes the `leadflow-api` web service (Docker, free plan, Singapore). It redeploys on every push that changes `backend/`.
2. Enter the values Render asks for:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | the Neon **direct** connection string from step 1 |
   | `CORS_ORIGINS` | `http://localhost:3000` for now; you replace it in step 4 |
   | `DEMO_RESET_TOKEN` | a long random string, e.g. the output of `openssl rand -hex 32` (keep it for step 5) |
   | `JWT_SECRET` | another, different `openssl rand -hex 32` value. It signs the login tokens; changing it logs everyone out |

   `SEED_ON_STARTUP=true` and `SEED_TIMEZONE=Asia/Kolkata` come from `render.yaml`, and Render injects `PORT`.
3. After the first deploy, open `https://<your-service>.onrender.com/api/health`. It should return `{"status":"ok","database":"ok"}`. The first start seeds the demo data.

### 3. Vercel (frontend)

1. In Vercel: **Add New → Project**, then import this repo.
2. Set **Root Directory** to `frontend`. The framework (Next.js) is detected automatically. Use Node.js 22.x or newer.
3. Add these environment variables before the first deploy. They are inlined at build time, so redeploy after changing them.

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_URL` | `https://<your-service>.onrender.com/api` |
   | `NEXT_PUBLIC_DEMO_MODE` | `true` (shows the "data resets daily" footer) |

4. Deploy and note the URL, e.g. `https://leadflow.vercel.app`.

### 4. Allow the Vercel URL on Render

In Render, go to **leadflow-api → Environment** and set `CORS_ORIGINS` to your Vercel URL, e.g. `https://leadflow.vercel.app`. Separate several origins with commas; a trailing slash is ignored. Saving redeploys the API.

Vercel preview deployments have their own URLs, so they are blocked unless you add them too.

### 5. GitHub secrets for the daily reset

In the GitHub repo, go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret | Value |
| --- | --- |
| `DEMO_API_URL` | `https://<your-service>.onrender.com/api` |
| `DEMO_RESET_TOKEN` | the same value as on Render |

Then open **Actions → Reset demo data → Run workflow** once to test it. Without these secrets the workflow skips with a notice instead of failing.

### Free tier notes

- **Cold starts:** Render's free web services sleep after about 15 minutes without traffic, and the first request can take up to a minute. The frontend copes:
  - it retries network errors and 502/503/504 up to 3 times with exponential backoff (never 4xx);
  - it shows *"Waking up the API server — free hosting can take up to a minute on the first visit…"* if the first load takes more than 4 seconds.

  Neon's free compute also scales to zero when idle and resumes on the first query.
- **Daily reset:** the seed is relative to "now", so the demo's "today" follow-ups go stale. The reset workflow runs at **03:30 UTC (09:00 IST)**. It calls `POST /api/demo/reset` with a 120-second timeout and up to 4 attempts with backoff (15, 30, then 60 s), and fails on anything but HTTP 200. GitHub may start scheduled runs a little late, and it pauses schedules in repos with no activity for 60 days.
