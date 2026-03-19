import time
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

_START = time.time()


@app.get("/status")
def status():
    """Lightweight health-check — used by frontend to verify BE is reachable."""
    return {
        "status": "online",
        "version": "0.1.0",
        "uptime_seconds": round(time.time() - _START),
        "services": {
            "api": "online",
        },
    }
