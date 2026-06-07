from __future__ import annotations

import ipaddress
import threading
import time
from collections import defaultdict, deque
from dataclasses import dataclass

from fastapi import HTTPException, Request, status


@dataclass(frozen=True)
class RateLimitRule:
    key: str
    limit: int
    window_seconds: int
    message: str


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._requests: dict[tuple[str, str], deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, identifier: str, rule: RateLimitRule) -> None:
        now = time.time()
        bucket_key = (rule.key, identifier)
        cutoff = now - rule.window_seconds

        with self._lock:
            bucket = self._requests[bucket_key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= rule.limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=rule.message,
                )

            bucket.append(now)


BOT_CREATION_RULE = RateLimitRule(
    key="bot_creation",
    limit=5,
    window_seconds=24 * 60 * 60,
    message="Bot creation limit reached for this IP. Please try again tomorrow.",
)

CHAT_RULE = RateLimitRule(
    key="chat",
    limit=30,
    window_seconds=60 * 60,
    message="Chat limit reached for this IP. Please try again in a little while.",
)

MANAGEMENT_RULE = RateLimitRule(
    key="management",
    limit=20,
    window_seconds=60 * 60,
    message="Management action limit reached for this IP. Please try again later.",
)

KEY_VALIDATION_RULE = RateLimitRule(
    key="key_validation",
    limit=20,
    window_seconds=60 * 60,
    message="API key validation limit reached for this IP. Please try again later.",
)

rate_limiter = InMemoryRateLimiter()


def extract_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        for candidate in forwarded_for.split(","):
            ip_candidate = candidate.strip()
            try:
                ipaddress.ip_address(ip_candidate)
                return ip_candidate
            except ValueError:
                continue

    if request.client and request.client.host:
        return request.client.host

    return "unknown"


def enforce_rate_limit(request: Request, rule: RateLimitRule) -> None:
    rate_limiter.check(extract_client_ip(request), rule)
