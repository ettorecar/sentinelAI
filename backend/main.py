import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.auth    import API_SECRET
from core.cache   import CACHE_TTL, live_entries, _START
from providers    import PROVIDERS
from routers      import maritime
from routers      import energy   # next feature — EnergyGrid

app = FastAPI(title="Sentinel AI Backend", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to your Vercel domain in production
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(maritime.router)
app.include_router(energy.router)


@app.get("/status")
def status():
    """Public health-check — no auth required."""
    return {
        "status":  "online",
        "version": "0.2.0",
        "uptime_seconds": round(time.time() - _START),
        "auth":  "enabled" if API_SECRET else "disabled",
        "cache": {"ttl_minutes": CACHE_TTL // 60, "live_entries": live_entries()},
        "services": {
            "api": "online",
            "maritime": {
                p: ("configured" if cfg["enabled"]() else "not_configured")
                for p, cfg in PROVIDERS.items()
            },
        },
    }
