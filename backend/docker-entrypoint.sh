#!/bin/sh
# Container start-up: migrate, optionally seed demo data, then serve the API.
set -eu

alembic upgrade head

if [ "${SEED_ON_STARTUP:-false}" = "true" ]; then
  # Idempotent: app.seed leaves the database alone when leads already exist.
  python -m app.seed
fi

# PORT is injected by Render. Behind its proxy, trust X-Forwarded-* so the real scheme/client IP are used.
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips "*"
