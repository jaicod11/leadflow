FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_ROOT_USER_ACTION=ignore

WORKDIR /app

# Runtime dependencies only (requirements-dev.txt stays out of the image).
COPY requirements.txt .
RUN pip install -r requirements.txt

RUN useradd --create-home --uid 10001 leadflow

COPY --chown=leadflow:leadflow app ./app
COPY --chown=leadflow:leadflow alembic ./alembic
COPY --chown=leadflow:leadflow alembic.ini docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER leadflow

EXPOSE 8000

# python:slim has no curl, so probe the health endpoint with the standard library.
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\", \"8000\")}/api/health', timeout=4)"

ENTRYPOINT ["./docker-entrypoint.sh"]
