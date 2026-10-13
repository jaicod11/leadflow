#!/bin/sh
# Container start-up: migrate, optionally seed demo data, then serve the API.
set -eu

alembic upgrade head

if [ "${SEED_ON_STARTUP:-false}" = "true" ]; then
  # Idempotent: app.seed leaves the database alone when leads already exist.
  python -m app.seed
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
