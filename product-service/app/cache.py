import hashlib
import json
import os
from typing import Any

from redis import Redis
from redis.exceptions import RedisError

CACHE_TTL_SECONDS = 60


class CatalogCache:
    def __init__(self, client: Redis | None, ttl_seconds: int = CACHE_TTL_SECONDS):
        self.client = client
        self.ttl_seconds = ttl_seconds

    def get(self, key: str) -> Any | None:
        if self.client is None:
            return None

        try:
            value = self.client.get(key)
            return json.loads(value) if value is not None else None
        except (RedisError, json.JSONDecodeError, TypeError):
            return None

    def set(self, key: str, value: Any) -> None:
        if self.client is None:
            return

        try:
            self.client.setex(key, self.ttl_seconds, json.dumps(value))
        except (RedisError, TypeError):
            # Redis is an optimization. A cache outage should not break reads.
            return

    def close(self) -> None:
        if self.client is not None:
            self.client.close()


_cache: CatalogCache | None = None


def get_cache() -> CatalogCache:
    global _cache

    if _cache is None:
        redis_url = os.getenv("REDIS_URL")
        client = (
            Redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=1,
                socket_timeout=1,
            )
            if redis_url
            else None
        )
        _cache = CatalogCache(client)

    return _cache


def close_cache() -> None:
    global _cache

    if _cache is not None:
        _cache.close()
        _cache = None


def product_cache_key(product_id: int) -> str:
    return f"product:{product_id}"


def product_list_cache_key(search: str | None, category: str | None) -> str:
    normalized = json.dumps(
        {
            "search": search.casefold() if search else None,
            "category": category.casefold() if category else None,
        },
        sort_keys=True,
    )
    digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]
    return f"products:{digest}"

