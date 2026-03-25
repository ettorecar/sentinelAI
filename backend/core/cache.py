import os
import time

CACHE_TTL = int(os.getenv("CACHE_TTL_MINUTES", "15")) * 60

_cache: dict = {}
_START = time.time()


def cache_get(key: str):
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL:
        return entry["data"]
    return None


def cache_set(key: str, data) -> None:
    _cache[key] = {"data": data, "ts": time.time()}


def cache_age(key: str):
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL:
        return round(time.time() - entry["ts"])
    return None


def live_entries() -> int:
    return sum(1 for v in _cache.values() if (time.time() - v["ts"]) < CACHE_TTL)
