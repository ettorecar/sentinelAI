import time
import os
import asyncio
import json as _json
import httpx
from fastapi import FastAPI, Depends, Header, HTTPException, Query
from typing import Optional
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
            "maritime": {
                p: ("configured" if cfg["enabled"]() else "not_configured")
                for p, cfg in PROVIDERS.items()
            },
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
    if not resp.is_success:
        raise RuntimeError(
            f"BW token error {resp.status_code}: {resp.text}"
        )
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


# ── Digitraffic (Finnish Transport and Communications Agency) AIS integration ─
# Public REST API — no API key required.
# Real-time AIS positions for vessels in Finnish waters (Baltic Sea).
# Two endpoints joined by MMSI: /locations (positions) + /vessels (metadata).
DIGITRAFFIC_LOCATIONS_URL = "https://meri.digitraffic.fi/api/ais/v1/locations"
DIGITRAFFIC_VESSELS_URL   = "https://meri.digitraffic.fi/api/ais/v1/vessels"

_DIGITRAFFIC_SHIP_TYPE = {
    range(70, 80): "Cargo",
    range(80, 90): "Tanker",
    range(60, 70): "Passenger",
    range(30, 31): "Fishing",
    range(50, 60): "Other",
}


def _digitraffic_ship_type(code) -> str:
    try:
        c = int(code or 0)
    except (ValueError, TypeError):
        return "Other"
    for r, label in _DIGITRAFFIC_SHIP_TYPE.items():
        if c in r:
            return label
    return "Other"


def _digitraffic_nav_status(nav_stat) -> str:
    try:
        c = int(nav_stat or 15)
    except (ValueError, TypeError):
        c = 15
    return {0: "UNDERWAY", 1: "ANCHORED", 5: "MOORED", 6: "AGROUND", 8: "UNDERWAY"}.get(c, "UNKNOWN")


def fetch_digitraffic() -> list[dict]:
    """Fetch real-time AIS from Digitraffic (Finnish Transport Agency).
    Joins /locations (positions) with /vessels (metadata) by MMSI.
    Completely public — no API key required.
    """
    # Fetch both endpoints concurrently
    with httpx.Client(timeout=20) as client:
        loc_resp  = client.get(DIGITRAFFIC_LOCATIONS_URL)
        meta_resp = client.get(DIGITRAFFIC_VESSELS_URL)
    loc_resp.raise_for_status()
    meta_resp.raise_for_status()

    # Build metadata lookup: mmsi -> {name, shipType, draught, destination, ...}
    meta_by_mmsi: dict[int, dict] = {}
    for v in (meta_resp.json() or []):
        m = v.get("mmsi")
        if m:
            meta_by_mmsi[int(m)] = v

    # Parse location GeoJSON FeatureCollection
    geo = loc_resp.json()
    features = geo.get("features") or []

    vessels = []
    for feat in features[:100]:
        mmsi = feat.get("mmsi")
        if not mmsi:
            continue
        coords = (feat.get("geometry") or {}).get("coordinates")
        if not coords or len(coords) < 2:
            continue
        lon, lat = coords[0], coords[1]
        props = feat.get("properties") or {}
        meta  = meta_by_mmsi.get(int(mmsi), {})

        sog = props.get("sog") or 0.0
        cog = props.get("cog")
        vessels.append({
            "mmsi":      str(mmsi),
            "name":      (meta.get("name") or f"MMSI-{mmsi}").strip(),
            "flag":      "🇫🇮",
            "type":      _digitraffic_ship_type(meta.get("shipType")),
            "darkFleet": False,
            "anomaly":   "None detected",
            "risk":      "LOW",
            "speed":     f"{sog:.1f} kn",
            "course":    f"{cog:.0f}°" if cog is not None else "N/A",
            "draft":     f"{meta.get('draught', 0):.1f}m" if meta.get("draught") else "N/A",
            "dwt":       "N/A",
            "lastPort":  "N/A",
            "nextPort":  (meta.get("destination") or "N/A").strip() or "N/A",
            "status":    _digitraffic_nav_status(props.get("navStat")),
            "zone":      None,
            "track":     [[lat, lon]],
            "sigint":    None,
        })
    return vessels


# ── NOAA Marine Cadastre AIS integration ──────────────────────────────────────
# ── AISStream.io integration ──────────────────────────────────────────────────
# Global real-time AIS via WebSocket. Free tier — register at https://aisstream.io
# Set AISSTREAM_API_KEY in Railway env vars to enable.
AISSTREAM_API_KEY = os.getenv("AISSTREAM_API_KEY", "")
AISSTREAM_URL     = "wss://stream.aisstream.io/v0/stream"
_AISSTREAM_BBOX   = [[[-90, -180], [90, 180]]]   # global bounding box
_AISSTREAM_SECS   = 8                             # seconds to collect before disconnecting
_AISSTREAM_MAX    = 100                           # max vessels per request


def _ais_ship_type(type_id: int) -> str:
    if 70 <= type_id <= 79: return "Cargo"
    if 80 <= type_id <= 89: return "Tanker"
    if 60 <= type_id <= 69: return "Passenger"
    if type_id == 30:       return "Fishing"
    if type_id in (31, 32, 52): return "Tug"
    return "Other"


def _ais_nav_status(status: int) -> str:
    return {
        0: "UNDERWAY", 1: "ANCHORED", 5: "MOORED",
        6: "AGROUND",  8: "UNDERWAY",
    }.get(status, "UNDERWAY")


def _map_aisstream_vessel(msg: dict) -> dict | None:
    meta    = msg.get("MetaData", {})
    payload = (msg.get("Message", {}).get("PositionReport") or
               msg.get("Message", {}).get("ExtendedClassBPositionReport") or {})
    mmsi = str(meta.get("MMSI") or payload.get("UserID") or "")
    if not mmsi:
        return None
    lat = float(payload.get("Latitude") or meta.get("latitude_dd") or 0.0)
    lon = float(payload.get("Longitude") or meta.get("longitude_dd") or 0.0)
    if not lat or not lon:
        return None
    sog     = float(payload.get("Sog") or 0.0)
    cog     = payload.get("Cog")
    status  = int(payload.get("NavigationalStatus") or 0)
    type_id = int(meta.get("ShipType") or 0)
    return {
        "mmsi":      mmsi,
        "name":      (meta.get("ShipName") or "UNKNOWN").strip(),
        "flag":      "🌐",
        "type":      _ais_ship_type(type_id),
        "darkFleet": False,
        "anomaly":   "None detected",
        "risk":      "LOW",
        "speed":     f"{sog:.1f} kn",
        "course":    f"{cog:.0f}°" if cog is not None else "N/A",
        "draft":     "N/A",
        "dwt":       "N/A",
        "lastPort":  "N/A",
        "nextPort":  "N/A",
        "status":    _ais_nav_status(status),
        "zone":      None,
        "track":     [[lat, lon]],
        "sigint":    None,
    }


async def _collect_aisstream(api_key: str) -> list[dict]:
    import websockets
    subscription = {
        "APIKey":             api_key,
        "BoundingBoxes":      _AISSTREAM_BBOX,
        "FilterMessageTypes": ["PositionReport", "ExtendedClassBPositionReport"],
    }
    vessels_by_mmsi: dict = {}
    async with websockets.connect(AISSTREAM_URL, open_timeout=10) as ws:
        await ws.send(_json.dumps(subscription))
        deadline = asyncio.get_event_loop().time() + _AISSTREAM_SECS
        while asyncio.get_event_loop().time() < deadline:
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=1.0)
                msg = _json.loads(raw)
                v = _map_aisstream_vessel(msg)
                if v and v["mmsi"] not in vessels_by_mmsi:
                    vessels_by_mmsi[v["mmsi"]] = v
                if len(vessels_by_mmsi) >= _AISSTREAM_MAX:
                    break
            except asyncio.TimeoutError:
                continue
    return list(vessels_by_mmsi.values())


def fetch_aisstream() -> list[dict]:
    """Fetch real-time global AIS from AISStream.io via WebSocket (free tier).
    Opens a connection, collects up to 100 vessels for ~8 s, then closes.
    Register free and get your API key at https://aisstream.io
    Set AISSTREAM_API_KEY in Railway env vars to enable.
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_collect_aisstream(AISSTREAM_API_KEY))
    finally:
        loop.close()


# ── MarineTraffic integration ─────────────────────────────────────────────────
# Real-time vessel positions via MarineTraffic API v2 (PS07 — active vessels).
# Paid plan required. Register at https://www.marinetraffic.com/en/ais-api-services
# Set MARINE_TRAFFIC_API_KEY in Railway env vars to enable.
MARINE_TRAFFIC_API_KEY = os.getenv("MARINE_TRAFFIC_API_KEY", "")
_MT_BASE = "https://services.marinetraffic.com/api/exportvessel/v:8/{key}"


def _mt_ship_type(type_id) -> str:
    try:
        c = int(type_id or 0)
    except (ValueError, TypeError):
        c = 0
    if 70 <= c <= 79: return "Cargo"
    if 80 <= c <= 89: return "Tanker"
    if 60 <= c <= 69: return "Passenger"
    if c == 30:       return "Fishing"
    if c in (31, 32, 52): return "Tug"
    return "Other"


def _mt_nav_status(code) -> str:
    try:
        c = int(code or 15)
    except (ValueError, TypeError):
        c = 15
    return {0: "UNDERWAY", 1: "ANCHORED", 5: "MOORED", 6: "AGROUND", 8: "UNDERWAY"}.get(c, "UNDERWAY")


def _map_mt_vessel(v: dict) -> dict | None:
    mmsi = str(v.get("MMSI") or "")
    if not mmsi:
        return None
    try:
        lat = float(v.get("LAT") or 0.0)
        lon = float(v.get("LON") or 0.0)
    except (ValueError, TypeError):
        return None
    if not lat or not lon:
        return None
    try:
        sog = float(v.get("SPEED") or 0.0)
    except (ValueError, TypeError):
        sog = 0.0
    cog = v.get("COURSE")
    dwt = v.get("DWT")
    draught = v.get("DRAUGHT")
    return {
        "mmsi":      mmsi,
        "name":      (v.get("SHIP_NAME") or "UNKNOWN").strip(),
        "flag":      "🌐",
        "type":      _mt_ship_type(v.get("SHIPTYPE")),
        "darkFleet": False,
        "anomaly":   "None detected",
        "risk":      "LOW",
        "speed":     f"{sog:.1f} kn",
        "course":    f"{int(float(cog))}°" if cog is not None else "N/A",
        "draft":     f"{float(draught):.1f}m" if draught else "N/A",
        "dwt":       f"{int(float(dwt)):,}t" if dwt else "N/A",
        "lastPort":  v.get("LAST_PORT") or "N/A",
        "nextPort":  v.get("NEXT_PORT_NAME") or v.get("DESTINATION") or "N/A",
        "status":    _mt_nav_status(v.get("STATUS")),
        "zone":      None,
        "track":     [[lat, lon]],
        "sigint":    None,
    }


def fetch_marinetraffic() -> list[dict]:
    """Fetch vessel positions from MarineTraffic API v2 — PS07 active vessels.
    Returns last-known positions for vessels active in the past 60 minutes.
    Requires paid API plan. Register at https://www.marinetraffic.com/en/ais-api-services
    Set MARINE_TRAFFIC_API_KEY in Railway env vars.
    """
    url = _MT_BASE.format(key=MARINE_TRAFFIC_API_KEY)
    resp = httpx.get(url, params={
        "msgtype":  "simple",
        "protocol": "jsono",
        "timespan": 60,
    }, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, dict) and "errors" in data:
        raise RuntimeError(f"MarineTraffic API error: {data['errors']}")
    vessels = []
    for v in (data if isinstance(data, list) else []):
        mapped = _map_mt_vessel(v)
        if mapped:
            vessels.append(mapped)
    return vessels[:100]


# ── Provider registry ──────────────────────────────────────────────────────────
# To add a new provider: add an entry with "label", "enabled" callable, "fetch" callable.
# "fetch" must return list[dict] in the standard vessel schema.
# "enabled" must return True only when the required credentials are available.

def _stub(name: str):
    """Placeholder fetch for providers not yet implemented."""
    def _fn():
        raise NotImplementedError(f"{name} provider is not yet implemented")
    return _fn


PROVIDERS: dict[str, dict] = {
    # ── Live (no API key required) ─────────────────────────────────────────────
    "barentsWatch": {
        "label":   "BarentsWatch AIS",
        "enabled": lambda: bool(BW_CLIENT_ID and BW_CLIENT_SECRET),
        "fetch":   fetch_barentswatch,
    },
    "aisstream": {
        "label":   "AISStream.io",
        "enabled": lambda: bool(AISSTREAM_API_KEY),
        "fetch":   fetch_aisstream,
    },
    "digitraffic": {
        "label":   "Digitraffic (FIN)",
        "enabled": lambda: True,          # public endpoint, no credentials needed
        "fetch":   fetch_digitraffic,
    },
    # ── Free tier (API key required — set matching env var to enable) ──────────
    "marineTraffic": {
        "label":   "MarineTraffic",
        "enabled": lambda: bool(MARINE_TRAFFIC_API_KEY),
        "fetch":   fetch_marinetraffic,
    },
    "vesselFinder": {
        "label":   "VesselFinder",
        "enabled": lambda: bool(os.getenv("VESSEL_FINDER_API_KEY")),
        "fetch":   _stub("VesselFinder"),
    },
    "myShipTracking": {
        "label":   "MyShipTracking",
        "enabled": lambda: bool(os.getenv("MY_SHIP_TRACKING_API_KEY")),
        "fetch":   _stub("MyShipTracking"),
    },
    "fleetMon": {
        "label":   "FleetMon",
        "enabled": lambda: bool(os.getenv("FLEET_MON_API_KEY")),
        "fetch":   _stub("FleetMon"),
    },
    # ── Commercial (API token required) ───────────────────────────────────────
    "spire": {
        "label":   "Spire Maritime",
        "enabled": lambda: bool(os.getenv("SPIRE_API_TOKEN")),
        "fetch":   _stub("Spire"),
    },
    "exactEarth": {
        "label":   "exactEarth",
        "enabled": lambda: bool(os.getenv("EXACT_EARTH_API_KEY")),
        "fetch":   _stub("exactEarth"),
    },
}

DEFAULT_PROVIDERS = list(PROVIDERS.keys())


def _fetch_providers(requested: list[str] | None) -> tuple[list[dict], list[str], list[dict]]:
    """
    Try each requested provider (or all defaults when None).
    Returns (vessels, active_keys, errors).
    active_keys contains the provider key (not label) for each successful fetch.
    """
    to_try = requested if requested else DEFAULT_PROVIDERS
    all_vessels: list[dict] = []
    active: list[str] = []
    errors: list[dict] = []

    for name in to_try:
        provider = PROVIDERS.get(name)
        if not provider:
            errors.append({"provider": name, "error": "Unknown provider"})
            continue
        if not provider["enabled"]():
            errors.append({"provider": name, "error": "Not configured"})
            continue
        try:
            vessels = provider["fetch"]()
            for v in vessels:
                v["provider"] = name
            all_vessels.extend(vessels)
            active.append(name)   # return key, not label
        except Exception as exc:
            errors.append({"provider": name, "error": str(exc)})

    return all_vessels, active, errors


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
def maritime_vessels(
    sources: Optional[list[str]] = Query(default=None),
    _: None = Depends(require_auth),
):
    """
    Return vessel list from one or more data providers.

    - `sources` (optional, repeatable): provider keys to query, e.g.
      `?sources=barentsWatch&sources=fleetMon`.
      When omitted, all configured providers are tried.
    - If no provider is reachable the response falls back to mock data.
    """
    cache_key = "vessels:" + (",".join(sorted(sources)) if sources else "default")
    cached = cache_get(cache_key)
    if cached:
        return {**cached, "cache_hit": True, "cache_age_seconds": cache_age(cache_key)}

    vessels, active_providers, errors = _fetch_providers(sources)

    if vessels:
        data: dict = {
            "vessels":   vessels,
            "sigint":    _SIGINT,
            "source":    "live",
            "providers": active_providers,
            "fetched_at": time.time(),
            "cache_hit": False,
        }
    elif sources:
        # Sources were explicitly requested but all failed — return empty, NOT mock.
        # The frontend must show an empty live view, not fall back to demo vessels.
        data = {
            "vessels":   [],
            "sigint":    [],
            "source":    "live_empty",
            "providers": [],
            "fetched_at": time.time(),
            "cache_hit": False,
        }
    else:
        # No sources specified at all → demo/mock mode
        data = {
            "vessels":   _VESSELS,
            "sigint":    _SIGINT,
            "source":    "mock",
            "providers": [],
            "fetched_at": time.time(),
            "cache_hit": False,
        }

    if errors:
        data["errors"] = errors

    cache_set(cache_key, data)
    return data
