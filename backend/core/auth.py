import os
from fastapi import Header, HTTPException

API_SECRET = os.getenv("API_SECRET", "")


def require_auth(x_sentinel_key: str = Header(default="")):
    """FastAPI dependency — validates X-Sentinel-Key on all /api/* routes."""
    if not API_SECRET:
        return  # no secret configured → open (local dev mode)
    if x_sentinel_key != API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Sentinel-Key")
