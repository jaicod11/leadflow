from collections.abc import Iterator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


def create_db_engine(url: str) -> Engine:
    # Every connection uses UTC so timestamps come back from Postgres as UTC-aware datetimes.
    return create_engine(url, pool_pre_ping=True, connect_args={"options": "-c timezone=utc"})


engine = create_db_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """Yield a database session that is closed when the request finishes."""
    with SessionLocal() as session:
        yield session
