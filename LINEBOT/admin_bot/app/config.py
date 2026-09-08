import os
from dotenv import load_dotenv

load_dotenv()


def normalize_db_url(url: str | None) -> str:
    if not url:
        return ""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://") and not url.startswith("postgresql+"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


class Settings:
    LINE_ADMIN_CHANNEL_ACCESS_TOKEN: str = os.getenv(
        "LINE_ADMIN_CHANNEL_ACCESS_TOKEN",
        os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "")
    )
    LINE_ADMIN_CHANNEL_SECRET: str = os.getenv(
        "LINE_ADMIN_CHANNEL_SECRET",
        os.getenv("LINE_CHANNEL_SECRET", "")
    )
    LINE_CHANNEL_ACCESS_TOKEN: str = os.getenv(
        "LINE_CHANNEL_ACCESS_TOKEN",
        os.getenv("LINE_ADMIN_CHANNEL_ACCESS_TOKEN", "")
    )
    LINE_CHANNEL_SECRET: str = os.getenv(
        "LINE_CHANNEL_SECRET",
        os.getenv("LINE_ADMIN_CHANNEL_SECRET", "")
    )
    RAW_DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    DATABASE_URL: str = normalize_db_url(RAW_DATABASE_URL)
    NEXT_PUBLIC_BASE_URL: str = os.getenv("NEXT_PUBLIC_BASE_URL", "")
    PORT: int = int(os.getenv("PORT", "8001"))


settings = Settings()

