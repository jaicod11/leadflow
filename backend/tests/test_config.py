import pytest
from psycopg.conninfo import conninfo_to_dict, make_conninfo
from sqlalchemy import make_url

from app.core.config import Settings
from app.db.session import create_db_engine

# The exact shape of a Neon DIRECT (non "-pooler") connection string. We need the direct host because
# every connection sends the startup option "-c timezone=utc", which Neon's pooler doesn't accept.
NEON_URL = "postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require&channel_binding=require"


def make_settings(**values: str) -> Settings:
    return Settings.model_validate(
        {"DATABASE_URL": "postgresql+psycopg://u:p@localhost/db", "CORS_ORIGINS": "http://localhost:3000", **values}
    )


@pytest.mark.parametrize("scheme", ["postgresql://", "postgres://"])
def test_driverless_urls_are_rewritten_for_psycopg_and_keep_the_query(scheme: str) -> None:
    settings = make_settings(DATABASE_URL=NEON_URL.replace("postgresql://", scheme))

    assert settings.DATABASE_URL == (
        "postgresql+psycopg://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require&channel_binding=require"
    )


def test_neon_url_is_understood_by_sqlalchemy_and_psycopg() -> None:
    url = make_url(make_settings(DATABASE_URL=NEON_URL).DATABASE_URL)
    assert url.drivername == "postgresql+psycopg"
    assert (url.host, url.database, url.username) == ("ep-xxx.region.aws.neon.tech", "dbname", "user")
    assert dict(url.query) == {"sslmode": "require", "channel_binding": "require"}

    engine = create_db_engine(url.render_as_string(hide_password=False))  # builds without connecting
    try:
        _, connect_kwargs = engine.dialect.create_connect_args(engine.url)
        # "context" is a psycopg adapters object, not a libpq parameter; everything else goes to libpq,
        # which (bundled with psycopg) validates every parameter name while parsing the conninfo.
        libpq_params = {key: value for key, value in connect_kwargs.items() if key != "context"}
        conninfo = make_conninfo(**libpq_params)
        expected = {
            "host": "ep-xxx.region.aws.neon.tech",
            "dbname": "dbname",
            "sslmode": "require",
            "channel_binding": "require",
        }
        assert conninfo_to_dict(conninfo).items() >= expected.items()
    finally:
        engine.dispose()


def test_cors_origins_accept_full_https_vercel_urls() -> None:
    settings = make_settings(CORS_ORIGINS="https://leadflow-demo.vercel.app/, http://localhost:3000")

    assert settings.CORS_ORIGINS == ["https://leadflow-demo.vercel.app", "http://localhost:3000"]
