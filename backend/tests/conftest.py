"""Shared fixtures: a dedicated, freshly migrated test database and an API client wired to it."""

from collections.abc import Callable, Iterator
from typing import Any

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import Engine, create_engine, make_url, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import ENV_FILE, settings
from app.core.security import create_access_token, hash_password
from app.db.base import Base
from app.db.session import create_db_engine, get_db
from app.main import app
from app.models import Discussion, Lead, User

BACKEND_DIR = ENV_FILE.parent


class PytestSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    TEST_DATABASE_URL: str = "postgresql+psycopg://leadflow:leadflow@localhost:5433/leadflow_test"


TEST_DATABASE_URL = PytestSettings().TEST_DATABASE_URL


def _test_database_name() -> str:
    test_url, dev_url = make_url(TEST_DATABASE_URL), make_url(settings.DATABASE_URL)
    if not test_url.database:
        pytest.exit("TEST_DATABASE_URL must include a database name", returncode=1)
    if (test_url.host, test_url.port, test_url.database) == (dev_url.host, dev_url.port, dev_url.database):
        pytest.exit("TEST_DATABASE_URL must not point at the development database", returncode=1)
    return test_url.database


def _create_database_if_missing(name: str) -> None:
    admin_url = make_url(TEST_DATABASE_URL).set(database="postgres")
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    try:
        with admin_engine.connect() as connection:
            exists = connection.scalar(text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": name})
            if not exists:
                quoted_name = admin_engine.dialect.identifier_preparer.quote(name)
                connection.execute(text(f"CREATE DATABASE {quoted_name}"))
    finally:
        admin_engine.dispose()


def _migrate_from_scratch(engine: Engine) -> None:
    """Downgrade to base, then upgrade to head: exercises both directions of every migration."""
    config = Config()
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, "base")
        command.upgrade(config, "head")


@pytest.fixture(scope="session")
def engine() -> Iterator[Engine]:
    _create_database_if_missing(_test_database_name())
    test_engine = create_db_engine(TEST_DATABASE_URL)
    _migrate_from_scratch(test_engine)
    yield test_engine
    test_engine.dispose()


@pytest.fixture(scope="session")
def session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, expire_on_commit=False)


@pytest.fixture(autouse=True)
def clean_tables(engine: Engine) -> None:
    """Empty every table before each test so tests never depend on each other."""
    quote = engine.dialect.identifier_preparer.quote
    tables = ", ".join(quote(table.name) for table in Base.metadata.sorted_tables)
    with engine.begin() as connection:
        connection.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))


@pytest.fixture
def db(session_factory: sessionmaker[Session]) -> Iterator[Session]:
    with session_factory() as session:
        yield session


@pytest.fixture
def client(session_factory: sessionmaker[Session]) -> Iterator[TestClient]:
    def override_get_db() -> Iterator[Session]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_db)


@pytest.fixture
def make_lead(db: Session) -> Callable[..., Lead]:
    """Insert a lead straight through the ORM (no API validation or business rules)."""

    def factory(name: str = "Test Lead", **fields: Any) -> Lead:
        lead = Lead(name=name, **fields)
        db.add(lead)
        db.commit()
        return lead

    return factory


@pytest.fixture
def make_discussion(db: Session) -> Callable[..., Discussion]:
    """Insert a discussion straight through the ORM. Unlike the API, it does not touch the lead."""

    def factory(lead: Lead, note: str = "Test note", **fields: Any) -> Discussion:
        discussion = Discussion(lead_id=lead.id, note=note, **fields)
        db.add(discussion)
        db.commit()
        return discussion

    return factory


TEST_USER_PASSWORD = "correct-horse-battery"


@pytest.fixture
def make_user(db: Session) -> Callable[..., User]:
    """Insert a user straight through the ORM, with a real password hash."""

    def factory(
        email: str = "rep@example.com", name: str = "Sales Rep", password: str = TEST_USER_PASSWORD
    ) -> User:
        user = User(email=email.lower(), name=name, password_hash=hash_password(password))
        db.add(user)
        db.commit()
        return user

    return factory


@pytest.fixture
def auth_client(client: TestClient, make_user: Callable[..., User]) -> TestClient:
    """The API client, logged in as a fresh user (sends "Authorization: Bearer <token>")."""
    user = make_user()
    client.headers["Authorization"] = f"Bearer {create_access_token(user.id)}"
    return client
