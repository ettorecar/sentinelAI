import time
import os
import httpx
from fastapi import FastAPI, Depends, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Sentinel AI Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to your Vercel domain in production
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Auth ──────────────────────────────────────────────────────────────────────
# Set API_SECRET in Railway env vars.  Same value goes in VITE_API_SECRET on Vercel.
# If API_SECRET is empty the server runs open (useful for local dev without a key).
API_SECRET = os.getenv("API_SECRET", "")


def require_auth(x_sentinel_key: str = Header(default="")):
    """FastAPI dependency — validates X-Sentinel-Key on all /api/* routes."""
    if not API_SECRET:
        return  # no secret configured → open (local dev mode)
    if x_sentinel_key != API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Sentinel-Key")


# ── Cache ─────────────────────────────────────────────────────────────────────
CACHE_TTL = int(os.getenv("CACHE_TTL_MINUTES", "15")) * 60

_cache: dict = {}


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


# ── Startup time ──────────────────────────────────────────────────────────────
_START = time.time()


# ── Public routes ─────────────────────────────────────────────────────────────
@app.get("/status")
def status():
    """Public health-check — no auth required (minimal info, no Claude calls)."""
    live_entries = sum(
        1 for v in _cache.values()
        if (time.time() - v["ts"]) < CACHE_TTL
    )
    return {
        "status": "online",
        "version": "0.1.0",
        "uptime_seconds": round(time.time() - _START),
        "auth": "enabled" if API_SECRET else "disabled",
        "cache": {
            "ttl_minutes": CACHE_TTL // 60,
            "live_entries": live_entries,
        },
        "services": {
            "api": "online",
            "maritime": "live" if (BW_CLIENT_ID and BW_CLIENT_SECRET) else "mock",
        },
    }


# ── BarentsWatch AIS integration ──────────────────────────────────────────────
# Set BW_CLIENT_ID + BW_CLIENT_SECRET in Railway env vars to enable live data.
# Free registration: https://www.barentswatch.no/
BW_CLIENT_ID     = os.getenv("BW_CLIENT_ID", "")
BW_CLIENT_SECRET = os.getenv("BW_CLIENT_SECRET", "")
BW_SCOPE         = os.getenv("BW_SCOPE", "api")
BW_TOKEN_URL     = "https://id.barentswatch.no/connect/token"
BW_AIS_URL       = "https://live.ais.barentswatch.no/v1/latest/combined"

_bw_token: dict = {"access_token": None, "expires_at": 0.0}


def _get_bw_token() -> str:
    """Fetch (or return cached) BarentsWatch OAuth2 bearer token."""
    if _bw_token["access_token"] and time.time() < _bw_token["expires_at"] - 60:
        return _bw_token["access_token"]
    resp = httpx.post(BW_TOKEN_URL, data={
        "grant_type":    "client_credentials",
        "client_id":     BW_CLIENT_ID,
        "client_secret": BW_CLIENT_SECRET,
        "scope":         BW_SCOPE,
    }, timeout=10)
    resp.raise_for_status()
    payload = resp.json()
    _bw_token["access_token"] = payload["access_token"]
    _bw_token["expires_at"]   = time.time() + payload.get("expires_in", 3600)
    return _bw_token["access_token"]


def _flag(country: str) -> str:
    c = (country or "").upper()
    if len(c) != 2:
        return "🏳️"
    return "".join(chr(ord(ch) + 127397) for ch in c)


def _ship_type(code: int) -> str:
    if 70 <= code <= 79: return "Cargo"
    if 80 <= code <= 89: return "Tanker"
    if 60 <= code <= 69: return "Passenger"
    if code == 30:       return "Fishing"
    if code == 52:       return "Tug"
    return "Other"


def _nav_status(code: int) -> str:
    return {0: "UNDERWAY", 1: "ANCHORED", 5: "MOORED", 6: "AGROUND", 8: "UNDERWAY"}.get(code, "UNKNOWN")


def _map_vessel(v: dict) -> dict:
    lat = v.get("latitude") or 0.0
    lon = v.get("longitude") or 0.0
    sog = v.get("speedOverGround") or 0.0
    cog = v.get("courseOverGround")
    return {
        "mmsi":     str(v.get("mmsi", "")),
        "name":     (v.get("name") or "UNKNOWN").strip(),
        "flag":     _flag(v.get("country", "")),
        "type":     _ship_type(v.get("shipType") or 0),
        "darkFleet": False,
        "anomaly":  "None detected",
        "risk":     "LOW",
        "speed":    f"{sog:.1f} kn",
        "course":   f"{cog:.0f}°" if cog is not None else "N/A",
        "draft":    f"{v.get('draught', 0):.1f}m" if v.get("draught") else "N/A",
        "dwt":      "N/A",
        "lastPort": "N/A",
        "nextPort": (v.get("destination") or "N/A").strip() or "N/A",
        "status":   _nav_status(v.get("navigationalStatus") or 0),
        "zone":     None,
        "track":    [[lat, lon]],
        "sigint":   None,
    }


def fetch_barentswatch() -> list[dict]:
    """Call BarentsWatch API and return mapped vessel list. Raises on failure."""
    token = _get_bw_token()
    resp  = httpx.get(BW_AIS_URL, headers={"Authorization": f"Bearer {token}"}, timeout=15)
    resp.raise_for_status()
    raw = resp.json()
    # Filter out vessels with no position and limit to 100
    return [_map_vessel(v) for v in raw if v.get("latitude") and v.get("longitude")][:100]


# ── Protected routes (/api/*) ─────────────────────────────────────────────────
# All routes below require a valid X-Sentinel-Key header.

_VESSELS = [
    {
        "mmsi": "247123456", "name": "ADRIATICA SUN", "flag": "🇮🇹", "type": "Cargo", "darkFleet": False,
        "anomaly": "AIS blackout 8h — resumed near Libyan coastal waters", "risk": "HIGH",
        "speed": "0.0 kn", "course": "N/A", "draft": "7.2m", "dwt": "18,400t",
        "lastPort": "Benghazi (LY)", "nextPort": "Unknown",
        "status": "ANCHORED", "zone": "LY-MC",
        "track": [[40.5, 18.5], [40.5, 18.5]],
        "sigint": "VHF intercept — Arabic comms, non-standard call signs, Libyan militia freq",
    },
    {
        "mmsi": "212987654", "name": "AEGEAN STAR", "flag": "🇬🇷", "type": "Tanker", "darkFleet": False,
        "anomaly": "Unusual anchorage — Peloponnese coast, no cargo declared", "risk": "MEDIUM",
        "speed": "0.4 kn", "course": "217°", "draft": "11.1m", "dwt": "74,200t",
        "lastPort": "Piraeus (GR)", "nextPort": "Alexandria (EG)",
        "status": "DRIFTING", "zone": None,
        "track": [[37.5, 23.5], [37.3, 23.8], [37.1, 24.2], [36.9, 24.7]],
        "sigint": None,
    },
    {
        "mmsi": "538001234", "name": "PACIFIC WOLF", "flag": "🇲🇭", "type": "Bulk", "darkFleet": True,
        "anomaly": "Speed anomaly +8 kn — exceeds class limit, AIS gaps noted", "risk": "MEDIUM",
        "speed": "19.2 kn", "course": "084°", "draft": "9.8m", "dwt": "52,000t",
        "lastPort": "Novorossiysk (RU)", "nextPort": "Port Said (EG)",
        "status": "UNDERWAY", "zone": None,
        "track": [[39.0, 20.0], [38.8, 22.0], [38.5, 24.5], [38.2, 27.0], [37.8, 29.5]],
        "sigint": "Encrypted satcomm burst — unusual frequency pattern, IRGC profile",
    },
    {
        "mmsi": "636091234", "name": "LIBERIA MOON", "flag": "🇱🇷", "type": "Container", "darkFleet": False,
        "anomaly": "None detected", "risk": "LOW",
        "speed": "14.1 kn", "course": "262°", "draft": "12.5m", "dwt": "42,000t",
        "lastPort": "Port Said (EG)", "nextPort": "Rotterdam (NL)",
        "status": "UNDERWAY", "zone": None,
        "track": [[37.0, 12.0], [37.5, 9.0], [38.0, 5.0], [38.5, 1.0], [39.0, -3.0]],
        "sigint": None,
    },
    {
        "mmsi": "308765432", "name": "SAMOS PIONEER", "flag": "🇵🇦", "type": "Tanker", "darkFleet": True,
        "anomaly": "AIS spoofing — GPS position inconsistent with satellite imagery", "risk": "HIGH",
        "speed": "8.3 kn", "course": "155°", "draft": "14.2m", "dwt": "105,000t",
        "lastPort": "Bandar Abbas (IR)", "nextPort": "Undeclared",
        "status": "UNDERWAY", "zone": "IR-HZ",
        "track": [[26.8, 56.2], [26.5, 56.8], [26.2, 57.5], [25.8, 58.2]],
        "sigint": "OFAC SDN match — operator Bandar Kish Shipping LLC, Iranian crude network",
    },
    {
        "mmsi": "341876543", "name": "BOREALIS SKY", "flag": "🇵🇦", "type": "Cargo", "darkFleet": True,
        "anomaly": "Dark fleet — 14d AIS blackout, reappeared Red Sea sector", "risk": "HIGH",
        "speed": "11.6 kn", "course": "335°", "draft": "8.4m", "dwt": "26,700t",
        "lastPort": "Unknown (last: Jeddah)", "nextPort": "Unknown",
        "status": "UNDERWAY", "zone": "YE-RS",
        "track": [[12.5, 43.8], [13.1, 43.5], [13.8, 43.1], [14.5, 42.8]],
        "sigint": "Vessel linked to IRGC-Q logistics network — OFAC watch list priority",
    },
    {
        "mmsi": "249112233", "name": "KAVKAZ", "flag": "🇷🇺", "type": "Tanker", "darkFleet": True,
        "anomaly": "Shadow fleet — STS transfer Black Sea, sanctions evasion suspected", "risk": "HIGH",
        "speed": "6.1 kn", "course": "012°", "draft": "13.8m", "dwt": "92,000t",
        "lastPort": "Novorossiysk (RU)", "nextPort": "Unknown",
        "status": "UNDERWAY", "zone": "UA-BS",
        "track": [[44.8, 33.0], [45.2, 32.8], [45.6, 32.5], [46.0, 32.2]],
        "sigint": "STS operation detected — radar contact 43.9°N 33.7°E, unknown tanker",
    },
    {
        "mmsi": "518000987", "name": "SOUTHERN CROSS", "flag": "🇸🇬", "type": "Container", "darkFleet": False,
        "anomaly": "Red Sea avoidance — Cape of Good Hope diversion, +11 days transit", "risk": "MEDIUM",
        "speed": "17.4 kn", "course": "290°", "draft": "11.9m", "dwt": "67,000t",
        "lastPort": "Singapore (SG)", "nextPort": "Cape Town (ZA) — DIVERTED",
        "status": "UNDERWAY", "zone": None,
        "track": [[1.3, 104.0], [5.0, 98.0], [8.0, 88.0], [11.0, 75.0], [14.0, 62.0]],
        "sigint": None,
    },
    {
        "mmsi": "636098765", "name": "MARITIME JUSTICE", "flag": "🇱🇷", "type": "Bulk", "darkFleet": False,
        "anomaly": "Loitering — 36h outside Hormuz, no declared destination", "risk": "MEDIUM",
        "speed": "1.2 kn", "course": "Variable", "draft": "10.3m", "dwt": "58,000t",
        "lastPort": "Dubai (AE)", "nextPort": "None declared",
        "status": "DRIFTING", "zone": "IR-HZ",
        "track": [[25.5, 57.0], [25.6, 57.2], [25.5, 57.4], [25.4, 57.2]],
        "sigint": None,
    },
    {
        "mmsi": "212345678", "name": "HERMES", "flag": "🇬🇷", "type": "Tanker", "darkFleet": False,
        "anomaly": "None — convoy escort active (NATO Op. ASPIDES)", "risk": "LOW",
        "speed": "13.8 kn", "course": "096°", "draft": "12.0m", "dwt": "80,000t",
        "lastPort": "Rota (ES)", "nextPort": "Alexandria (EG)",
        "status": "UNDERWAY", "zone": None,
        "track": [[35.9, -5.6], [35.8, -1.0], [35.6, 4.0], [35.4, 9.0], [35.2, 14.0]],
        "sigint": None,
    },
    {
        "mmsi": "477123789", "name": "ORIENT FORTUNE", "flag": "🇭🇰", "type": "Container", "darkFleet": False,
        "anomaly": "Cape of Good Hope diversion — Red Sea avoidance, +11 days", "risk": "MEDIUM",
        "speed": "15.2 kn", "course": "245°", "draft": "13.1m", "dwt": "89,000t",
        "lastPort": "Shanghai (CN)", "nextPort": "Cape Town (ZA) — DIVERTED",
        "status": "UNDERWAY", "zone": None,
        "track": [[22.0, 115.0], [18.0, 111.0], [12.0, 105.0], [5.0, 101.0], [0.0, 102.0]],
        "sigint": None,
    },
    {
        "mmsi": "538012345", "name": "DARK PHANTOM", "flag": "🇲🇭", "type": "Tanker", "darkFleet": True,
        "anomaly": "No AIS since Jan 2026 — VLCC reacquired by SAR satellite, Bab el-Mandeb", "risk": "HIGH",
        "speed": "9.0 kn", "course": "190°", "draft": "16.0m", "dwt": "280,000t",
        "lastPort": "Unknown (last known: Kharg Island, IR)", "nextPort": "Unknown",
        "status": "UNDERWAY", "zone": "YE-RS",
        "track": [[14.0, 44.5], [13.5, 44.2], [12.8, 43.9], [12.0, 43.5]],
        "sigint": "VLCC — linked to Iranian crude exports via Kish Maritime LLC (OFAC designated)",
    },
]

_SIGINT = [
    {"ts": "14:47", "mmsi": "538001234", "vessel": "PACIFIC WOLF",  "type": "ELINT",  "msg": "Encrypted burst comms — 400MHz range, IRGC pattern match", "sev": "HIGH"},
    {"ts": "14:31", "mmsi": "341876543", "vessel": "BOREALIS SKY",  "type": "HUMINT", "msg": "Agent report: vessel loading at undisclosed Yemen anchorage, arms cargo suspected", "sev": "CRITICAL"},
    {"ts": "14:12", "mmsi": "247123456", "vessel": "ADRIATICA SUN", "type": "SIGINT", "msg": "Arabic VHF — non-IMO call sign, Libyan militia frequency confirmed", "sev": "HIGH"},
    {"ts": "13:58", "mmsi": "249112233", "vessel": "KAVKAZ",        "type": "IMINT",  "msg": "Satellite imagery confirms STS transfer with unknown tanker — 45.2°N 32.8°E", "sev": "HIGH"},
    {"ts": "13:44", "mmsi": "308765432", "vessel": "SAMOS PIONEER", "type": "OSINT",  "msg": "OFAC SDN match confirmed — operator Bandar Kish Shipping LLC, Tehran nexus", "sev": "CRITICAL"},
    {"ts": "13:22", "mmsi": "538012345", "vessel": "DARK PHANTOM",  "type": "ELINT",  "msg": "VLCC reacquired via SAR satellite — 13.8°N 44.4°E, no AIS broadcast", "sev": "CRITICAL"},
    {"ts": "12:55", "mmsi": None,        "vessel": "UNKNOWN",        "type": "ACINT",  "msg": "Underwater acoustic contact — Hormuz narrows, submarine probable, Type 209 profile", "sev": "HIGH"},
    {"ts": "12:30", "mmsi": None,        "vessel": "YE-RS zone",     "type": "RADINT", "msg": "Houthi C2 radar emission — 14.2°N 43.1°E, Silkworm/YJ-12 variant lock-on sequence", "sev": "CRITICAL"},
]


@app.get("/api/maritime/vessels")
def maritime_vessels(_: None = Depends(require_auth)):
    key = "maritime_vessels"
    cached = cache_get(key)
    if cached:
        return {**cached, "cache_hit": True, "cache_age_seconds": cache_age(key)}

    if BW_CLIENT_ID and BW_CLIENT_SECRET:
        try:
            vessels = fetch_barentswatch()
            data = {
                "vessels": vessels,
                "sigint":  _SIGINT,
                "source":  "live",
                "provider": "BarentsWatch AIS",
                "fetched_at": time.time(),
                "cache_hit": False,
            }
        except Exception as exc:
            # Credentials set but fetch failed — return mock with error note
            data = {
                "vessels": _VESSELS,
                "sigint":  _SIGINT,
                "source":  "mock",
                "error":   str(exc),
                "fetched_at": time.time(),
                "cache_hit": False,
            }
    else:
        data = {
            "vessels": _VESSELS,
            "sigint":  _SIGINT,
            "source":  "mock",
            "fetched_at": time.time(),
            "cache_hit": False,
        }

    cache_set(key, data)
    return data
