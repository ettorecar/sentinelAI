"""Maritime router — /api/maritime/vessels and /api/maritime/chokepoints.

Owns:
- Mock vessel/SIGINT datasets (fallback when no providers are configured)
- Static chokepoint reference data
- ACLED enrichment for chokepoints
- Route handlers
"""
import time
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, Query

from core.auth    import require_auth
from core.cache   import cache_get, cache_set, cache_age
from providers    import fetch_providers, PROVIDERS
from providers.acled import (
    ACLED_EMAIL, ACLED_PASSWORD,
    fetch_sigint as _fetch_acled_sigint,
    _bearer as _acled_bearer,
    _DATA_URL as _ACLED_DATA_URL,
)

router = APIRouter()


# ── Mock data (fallback when no live providers are configured) ─────────────────

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


# ── Chokepoint reference data ──────────────────────────────────────────────────

_CHOKEPOINTS = [
    {"id": "CP-01", "name": "Strait of Hormuz",   "location": "Persian Gulf",          "lat":  26.5, "lon":  56.5,  "risk": "CRITICAL", "flow": "21Mb/d",  "pct": "21%", "tension": "Extreme",  "threats": ["Iranian naval exercises", "Mine laying reports", "Drone harassment of tankers"],        "altRoute": "None — no viable alternative",                "history": [18, 19, 20, 21, 20, 19, 21], "acled_country": "Iran,Oman"},
    {"id": "CP-02", "name": "Strait of Malacca",  "location": "SE Asia",               "lat":   2.0, "lon": 101.5,  "risk": "HIGH",     "flow": "16Mb/d",  "pct": "16%", "tension": "Elevated", "threats": ["Piracy incidents up 40%", "Territorial disputes", "Cyber attacks on port systems"],    "altRoute": "Lombok Strait (+4 days transit)",             "history": [14, 15, 15, 16, 16, 15, 16], "acled_country": "Indonesia,Malaysia"},
    {"id": "CP-03", "name": "Bab-el-Mandeb",      "location": "Red Sea / Yemen",       "lat":  12.5, "lon":  43.5,  "risk": "CRITICAL", "flow": "8.8Mb/d", "pct": "9%",  "tension": "Extreme",  "threats": ["Houthi missile attacks", "Drone boats", "Coalition naval response"],                  "altRoute": "Cape of Good Hope (+15 days, +$1.2M/voyage)", "history": [9, 8, 7, 6, 5, 4, 4],       "acled_country": "Yemen,Djibouti"},
    {"id": "CP-04", "name": "Suez Canal",          "location": "Egypt",                 "lat":  30.5, "lon":  32.5,  "risk": "MEDIUM",   "flow": "5.5Mb/d", "pct": "5%",  "tension": "Moderate", "threats": ["Diversion due to Houthi threat", "Congestion incidents"],                            "altRoute": "Cape of Good Hope or SUMED pipeline",         "history": [7, 7, 6, 6, 5, 5, 6],       "acled_country": "Egypt,Yemen"},
    {"id": "CP-05", "name": "Turkish Straits",     "location": "Bosphorus/Dardanelles", "lat":  41.0, "lon":  29.0,  "risk": "MEDIUM",   "flow": "2.4Mb/d", "pct": "2%",  "tension": "Moderate", "threats": ["Russian Black Sea fleet movements", "Sanctions complications"],                      "altRoute": "Trans-Anatolian Pipeline (TANAP)",             "history": [3, 3, 2, 2, 2, 2, 2],       "acled_country": "Turkey,Ukraine"},
    {"id": "CP-06", "name": "Danish Straits",      "location": "North Sea",             "lat":  56.0, "lon":  10.5,  "risk": "LOW",      "flow": "1.5Mb/d", "pct": "1%",  "tension": "Low",      "threats": ["Occasional Russian submarine activity"],                                              "altRoute": "Pipeline alternatives available",              "history": [1, 1, 2, 1, 1, 2, 1],       "acled_country": ""},
    {"id": "CP-07", "name": "Strait of Gibraltar", "location": "Atlantic / Med",        "lat":  35.9, "lon":  -5.5,  "risk": "LOW",      "flow": "1.8Mb/d", "pct": "2%",  "tension": "Low",      "threats": ["Occasional migrant crisis spillover", "Russian sub activity"],                       "altRoute": "North Africa overland pipelines",              "history": [2, 2, 1, 2, 2, 1, 2],       "acled_country": "Morocco"},
    {"id": "CP-08", "name": "Cape of Good Hope",   "location": "South Africa",          "lat": -34.4, "lon":  18.5,  "risk": "LOW",      "flow": "3.2Mb/d", "pct": "3%",  "tension": "Low",      "threats": ["Weather-driven routing disruptions", "Piracy uptick near Cape"],                     "altRoute": "Suez Canal (normal route)",                    "history": [2, 3, 3, 4, 4, 5, 6],       "acled_country": "South Africa,Somalia"},
    {"id": "CP-09", "name": "Panama Canal",        "location": "Central America",       "lat":   9.0, "lon": -79.5,  "risk": "MEDIUM",   "flow": "1.0Mb/d", "pct": "1%",  "tension": "Moderate", "threats": ["Water shortage reducing daily transits", "US-China geopolitical pressure", "Cartel activity near locks"], "altRoute": "Suez Canal or US land bridge", "history": [1, 1, 1, 1, 1, 1, 1], "acled_country": "Panama"},
    {"id": "CP-10", "name": "Luzon Strait",        "location": "Philippines / Taiwan",  "lat":  20.0, "lon": 121.0,  "risk": "HIGH",     "flow": "2.0Mb/d", "pct": "2%",  "tension": "Elevated", "threats": ["PLA Navy exercises", "Taiwan Strait tensions spillover", "Submarine cable vulnerability"], "altRoute": "Lombok Strait (+2 days transit)", "history": [1, 2, 2, 3, 3, 4, 5], "acled_country": "Philippines"},
]

_CP_ACLED_ALL = ":OR:country=".join({
    c.strip()
    for cp in _CHOKEPOINTS if cp["acled_country"]
    for c in cp["acled_country"].split(",")
    if c.strip()
})


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_sigint() -> tuple[list[dict], str | None]:
    """Return (sigint_feed, error|None). Real ACLED data if configured, else mock."""
    if not (ACLED_EMAIL and ACLED_PASSWORD):
        return _SIGINT, None
    cache_key = "sigint:acled"
    cached = cache_get(cache_key)
    if cached:
        return cached.get("items", _SIGINT), cached.get("error")
    try:
        items = _fetch_acled_sigint()
        cache_set(cache_key, {"items": items or _SIGINT, "error": None})
        return items or _SIGINT, None
    except Exception as exc:
        err = str(exc)
        cache_set(cache_key, {"items": _SIGINT, "error": err})
        return _SIGINT, err


def _enrich_chokepoints(cps: list[dict]) -> list[dict]:
    """Add acled_events_30d and latest_incident to each chokepoint."""
    from datetime import datetime, timedelta
    since = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
    today = datetime.utcnow().strftime("%Y-%m-%d")
    token = _acled_bearer()
    url   = f"{_ACLED_DATA_URL}?country={_CP_ACLED_ALL}&event_date={since}&event_date_where=BETWEEN&event_date_end={today}&limit=500&_format=json"
    resp  = httpx.get(url, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, timeout=20)
    try:
        resp.raise_for_status()
        body = resp.json()
        if body.get("status") != 200:
            return cps
        rows = body.get("data", [])
    except Exception:
        return cps
    by_country: dict[str, list] = {}
    for row in rows:
        by_country.setdefault((row.get("country") or "").strip(), []).append(row)
    enriched = []
    for cp in cps:
        cp = cp.copy()
        events: list = []
        for c in {c.strip() for c in cp.get("acled_country", "").split(",") if c.strip()}:
            events.extend(by_country.get(c, []))
        cp["acled_events_30d"] = len(events)
        if events:
            latest = max(events, key=lambda r: r.get("timestamp", 0))
            actor  = (latest.get("actor1") or "").strip()[:40]
            notes  = (latest.get("notes") or latest.get("event_type") or "").strip()[:150]
            cp["latest_incident"] = f"[{actor}] {notes}" if actor else notes
        else:
            cp["latest_incident"] = None
        enriched.append(cp)
    return enriched


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/api/maritime/chokepoints")
def maritime_chokepoints(_: None = Depends(require_auth)):
    """Global chokepoint status — static baseline + optional ACLED enrichment."""
    cache_key = "chokepoints"
    cached = cache_get(cache_key)
    if cached:
        return {**cached, "cache_hit": True}
    cps    = [cp.copy() for cp in _CHOKEPOINTS]
    source = "static"
    if ACLED_EMAIL and ACLED_PASSWORD:
        try:
            cps    = _enrich_chokepoints(cps)
            source = "live"
        except Exception:
            pass
    for cp in cps:
        cp.pop("acled_country", None)
    data = {"chokepoints": cps, "source": source, "fetched_at": time.time(), "cache_hit": False}
    cache_set(cache_key, data)
    return data


@router.get("/api/maritime/vessels")
def maritime_vessels(
    sources: Optional[list[str]] = Query(default=None),
    _: None = Depends(require_auth),
):
    """Vessel list from one or more AIS providers (or mock data if none configured)."""
    cache_key = "vessels:" + (",".join(sorted(sources)) if sources else "default")
    cached = cache_get(cache_key)
    if cached:
        return {**cached, "cache_hit": True, "cache_age_seconds": cache_age(cache_key)}

    vessels, active_providers, errors = fetch_providers(sources)
    sigint_feed, sigint_error = _get_sigint()

    if vessels:
        data: dict = {
            "vessels":       vessels,
            "sigint":        sigint_feed,
            "sigint_source": "live" if sigint_error is None and (ACLED_EMAIL and ACLED_PASSWORD) else "mock",
            "source":        "live",
            "providers":     active_providers,
            "fetched_at":    time.time(),
            "cache_hit":     False,
        }
        if sigint_error:
            data["sigint_error"] = sigint_error
    elif sources:
        data = {"vessels": [], "sigint": [], "source": "live_empty", "providers": [], "fetched_at": time.time(), "cache_hit": False}
    else:
        data = {"vessels": _VESSELS, "sigint": _SIGINT, "source": "mock", "providers": [], "fetched_at": time.time(), "cache_hit": False}

    if errors:
        data["errors"] = errors
    cache_set(cache_key, data)
    return data
