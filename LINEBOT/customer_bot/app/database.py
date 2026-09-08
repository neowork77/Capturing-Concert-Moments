from collections.abc import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from .config import settings

Base = declarative_base()

engine = None
SessionLocal = None

if settings.DATABASE_URL:
    connect_args = {}
    if "sslmode" not in settings.DATABASE_URL.lower():
        connect_args["sslmode"] = "require"

    # Supabase Connection Pooling works best with pool_pre_ping=True and SSL
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args=connect_args,
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency that yields a database session and closes it afterwards."""
    if SessionLocal is None:
        raise RuntimeError("DATABASE_URL is not set or engine is not initialized.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

