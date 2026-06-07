from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")


def _parse_int(name: str, default: int) -> int:
    raw_value = os.getenv(name, "").strip()
    if not raw_value:
        return default

    try:
        return int(raw_value)
    except ValueError:
        return default


def _parse_origins(raw_value: str) -> list[str]:
    origins = [origin.strip() for origin in raw_value.split(",")]
    return [origin for origin in origins if origin]


def _resolve_data_dir(raw_value: str | None) -> Path:
    if not raw_value or not raw_value.strip():
        return (BASE_DIR / "data").resolve()

    candidate = Path(raw_value.strip()).expanduser()
    if not candidate.is_absolute():
        candidate = BASE_DIR / candidate
    return candidate.resolve()


@dataclass(frozen=True)
class Settings:
    data_dir: Path
    allowed_origins: list[str]
    max_knowledge_chars: int
    max_message_chars: int
    app_encryption_key: str


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        data_dir=_resolve_data_dir(os.getenv("DATA_DIR")),
        allowed_origins=_parse_origins(
            os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
        ),
        max_knowledge_chars=_parse_int("MAX_KNOWLEDGE_CHARS", 50000),
        max_message_chars=_parse_int("MAX_MESSAGE_CHARS", 2000),
        app_encryption_key=os.getenv("APP_ENCRYPTION_KEY", "").strip(),
    )
