import time
import os
from typing import Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Sentinel AI Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to your Vercel domain in production
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Cache ─────────────────────────────────────────────────────────────────────
# Configurable TTL via env var, default 15 minutes.
CACHE_TTL = int(os.getenv("CACHE_TTL_MINUTES", "15")) * 60

_cache: dict[str, dict] = {}  # { key: {"data": Any, "ts": float} }


def cache_get(key: str) -> Any | None:
    """Return cached value if fresher than CACHE_TTL, else None."""
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL:
        return entry["data"]
    return None


def cache_set(key: str, data: Any) -> None:
    _cache[key] = {"data": data, "ts": time.time()}


def cache_age(key: str) -> int | None:
    """Return age in seconds of a cache entry, or None if missing/expired."""
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL:
        return round(time.time() - entry["ts"])
    return None


# ── Startup time ──────────────────────────────────────────────────────────────
_START = time.time()


# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/status")
def status():
    """
    Lightweight health-check — used by frontend to verify BE is reachable.
    Returns uptime, cache TTL config, and count of live cache entries.
    """
    live_entries = sum(
        1 for v in _cache.values()
        if (time.time() - v["ts"]) < CACHE_TTL
    )
    return {
        "status": "online",
        "version": "0.1.0",
        "uptime_seconds": round(time.time() - _START),
        "cache": {
            "ttl_minutes": CACHE_TTL // 60,
            "live_entries": live_entries,
        },
        "services": {
            "api": "online",
        },
    }


# ── Example cached AI endpoint (template for future tools) ───────────────────
#
# from anthropic import Anthropic
# client = Anthropic()  # reads ANTHROPIC_API_KEY from env automatically
#
# @app.post("/api/threatmap/brief")
# async def threatmap_brief(payload: dict):
#     key = f"threatmap_brief_{payload.get('region', 'global')}"
#     cached = cache_get(key)
#     if cached:
#         return {**cached, "cache_hit": True, "cache_age_seconds": cache_age(key)}
#
#     # Cache miss → call Claude
#     msg = client.messages.create(
#         model="claude-opus-4-6",
#         max_tokens=1200,
#         system="You are a senior intelligence analyst...",
#         messages=[{"role": "user", "content": payload.get("prompt", "")}],
#     )
#     result = {"brief": msg.content[0].text}
#     cache_set(key, result)
#     return {**result, "cache_hit": False}
