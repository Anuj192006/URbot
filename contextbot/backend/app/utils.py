from __future__ import annotations

import hashlib
import re
import secrets
import string
import unicodedata
from datetime import datetime, timezone
from uuid import uuid4


SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def slugify_name(name: str, max_length: int = 60) -> str:
    normalized = unicodedata.normalize("NFKD", name)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    lowered = ascii_value.lower()
    sanitized = re.sub(r"[^a-z0-9]+", "-", lowered).strip("-")
    collapsed = re.sub(r"-{2,}", "-", sanitized)
    if not collapsed:
        collapsed = "bot"
    return collapsed[:max_length].strip("-") or "bot"


def generate_slug(name: str) -> str:
    suffix = "".join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(5))
    return f"{slugify_name(name)}-{suffix}"


def generate_bot_id() -> str:
    return str(uuid4())


def generate_edit_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def is_valid_slug(slug: str) -> bool:
    return bool(SLUG_PATTERN.fullmatch(slug))
