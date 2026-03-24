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


# ── VesselFinder integration ──────────────────────────────────────────────────
# Real-time vessel positions via geographic area query (livedata endpoint).
# Free tier: 100 req/day. Register at https://www.vesselfinder.com/api
# Set VESSEL_FINDER_API_KEY in Railway env vars to enable.
# Optionally set VESSEL_FINDER_BBOX="latmin,latmax,lonmin,lonmax" (default: global).
VESSEL_FINDER_API_KEY = os.getenv("VESSEL_FINDER_API_KEY", "")
_VF_LIVEDATA_URL      = "https://api.vesselfinder.com/livedata"
_VF_BBOX_DEFAULT      = "-90,90,-180,180"   # global; narrow down to save credits


def _vf_nav_status(code) -> str:
    try:
        c = int(code or 15)
    except (ValueError, TypeError):
        c = 15
    return {0: "UNDERWAY", 1: "ANCHORED", 5: "MOORED", 6: "AGROUND", 8: "UNDERWAY"}.get(c, "UNDERWAY")


def _vf_ship_type(type_id) -> str:
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


def _map_vf_vessel(entry: dict) -> dict | None:
    ais  = entry.get("AIS", {})
    mast = entry.get("MASTERDATA", {})
    voy  = entry.get("VOYAGE", {})
    mmsi = str(ais.get("MMSI") or "")
    if not mmsi:
        return None
    try:
        lat = float(ais.get("LATITUDE") or 0.0)
        lon = float(ais.get("LONGITUDE") or 0.0)
    except (ValueError, TypeError):
        return None
    if not lat or not lon:
        return None
    sog     = ais.get("SPEED")
    cog     = ais.get("COURSE")
    draught = ais.get("DRAUGHT")
    dwt     = mast.get("DWT")
    try:
        sog_f = float(sog or 0.0)
    except (ValueError, TypeError):
        sog_f = 0.0
    return {
        "mmsi":      mmsi,
        "name":      (ais.get("NAME") or "UNKNOWN").strip(),
        "flag":      "🌐",
        "type":      _vf_ship_type(ais.get("TYPE")),
        "darkFleet": False,
        "anomaly":   "None detected",
        "risk":      "LOW",
        "speed":     f"{sog_f:.1f} kn",
        "course":    f"{int(float(cog))}°" if cog is not None else "N/A",
        "draft":     f"{float(draught):.1f}m" if draught else "N/A",
        "dwt":       f"{int(float(dwt)):,}t" if dwt else "N/A",
        "lastPort":  voy.get("LASTPORT") or "N/A",
        "nextPort":  ais.get("DESTINATION") or "N/A",
        "status":    _vf_nav_status(ais.get("NAVSTAT")),
        "zone":      None,
        "track":     [[lat, lon]],
        "sigint":    None,
    }


def fetch_vesselfinder() -> list[dict]:
    """Fetch vessel positions from VesselFinder livedata (area query).
    Default bounding box: global. Set VESSEL_FINDER_BBOX env var to narrow down
    and save free-tier credits (e.g. '30,47,-5,42' for Mediterranean).
    Register free at https://www.vesselfinder.com/api — set VESSEL_FINDER_API_KEY.
    """
    bbox = os.getenv("VESSEL_FINDER_BBOX", _VF_BBOX_DEFAULT)
    try:
        latmin, latmax, lonmin, lonmax = [float(x) for x in bbox.split(",")]
    except Exception:
        latmin, latmax, lonmin, lonmax = -90, 90, -180, 180
    resp = httpx.get(_VF_LIVEDATA_URL, params={
        "userkey": VESSEL_FINDER_API_KEY,
        "latmin":  latmin,
        "latmax":  latmax,
        "lonmin":  lonmin,
        "lonmax":  lonmax,
    }, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, dict) and ("errors" in data or "error" in data):
        raise RuntimeError(f"VesselFinder error: {data.get('errors') or data.get('error')}")
    vessels = []
    for entry in (data if isinstance(data, list) else []):
        mapped = _map_vf_vessel(entry)
        if mapped:
            vessels.append(mapped)
    return vessels[:100]


# ── Datalastic integration ────────────────────────────────────────────────────
# Vessel lookup by MMSI via bulk endpoint — up to 100 MMSIs per request.
# Note: Datalastic has no area/broadcast endpoint; it requires known MMSIs.
# Provide a comma-separated list via DATALASTIC_MMSI_LIST env var.
# Free tier available. Register at https://datalastic.com
# Set DATALASTIC_API_KEY and DATALASTIC_MMSI_LIST in Railway env vars.
DATALASTIC_API_KEY  = os.getenv("DATALASTIC_API_KEY", "")
_DL_BULK_URL        = "https://api.datalastic.com/api/v0/vessel_bulk"

# Default watchlist: OFAC-sanctioned vessels from public SDN list (Jan 2025 designations).
# Source: https://home.treasury.gov/news/press-releases/jy2777
# Full machine-readable list: https://www.treasury.gov/ofac/downloads/sdn_advanced.xml
# Override with DATALASTIC_MMSI_LIST env var (comma-separated).
_DL_MMSI_DEFAULT = ",".join([
    # ── SDGT — OCEANLINK MARITIME DMCC network ────────────────────────────────
    "620999315",  # ANTHEA            Comoros  IMO 9281683
    "312513000",  # BAXTER            Belize   IMO 9282522
    "620999316",  # BOREAS            Comoros  IMO 9248497
    "620739000",  # CAPE GAS          Comoros  IMO 9002491
    "370921000",  # DEMETER           Panama   IMO 9258674
    "312038000",  # ELSA              Belize   IMO 9256468
    "620999379",  # HECATE            Comoros  IMO 9233753
    "304552000",  # MERAKI            Antigua  IMO 9194139
    "518999021",  # OUREA             Cook Is. IMO 9350422
    "621819067",  # YOUNG YONG        Djibouti IMO 9194127
    # ── IRAN-EO13846 / EO13902 designated ────────────────────────────────────
    "312171000",  # ANHONA            Belize       IMO 9354521
    "518999041",  # GOODWIN           Cook Is.     IMO 9379703
    "352002704",  # TYCHE I           Panama       IMO 9247390
    "636018950",  # ELZA              Liberia      IMO 9221671
    "422169700",  # MASAL             Iran         IMO 9169421
    "518999103",  # BERTHA/MONICA S   Cook Is.     IMO 9292163
    "372988000",  # BLACK PANTHER     Panama       IMO 9285756
    "668116233",  # CERES I           Sao Tome     IMO 9229439
    "334017000",  # FT ISLAND         Honduras     IMO 9166675
    "538010982",  # JAYA/MONOCEROS    Marshall Is. IMO 9410387
    "352002495",  # MEROPE            Panama       IMO 9281891
    "352002482",  # TONIL/PARAGON DAWN Panama      IMO 9307932
    "312242000",  # VESNA             Belize       IMO 9233349
    # ── RUSSIA-EO14024 designated (Sovcomflot) ────────────────────────────────
    "636014308",  # SCF PRIMORYE      Liberia IMO 9421960
    "626362000",  # GEORGY MASLOV     Gabon   IMO 9610793
    "626364000",  # KRYMSK            Gabon   IMO 9270529
    "626367000",  # LITEYNY PROSPECT  Gabon   IMO 9256078
    "626369000",  # NEVSKIY PROSPECT  Gabon   IMO 9256054
    "626372000",  # NS ANTARCTIC      Gabon   IMO 9413559
    "352003372",  # ANATOLY KOLODKIN  Panama  IMO 9610808
    "352002202",  # SAKHALIN ISLAND   Panama  IMO 9249128
])


def _dl_ship_type(type_str: str) -> str:
    t = (type_str or "").lower()
    if "cargo" in t or "container" in t or "bulk" in t: return "Cargo"
    if "tanker" in t:    return "Tanker"
    if "passenger" in t: return "Passenger"
    if "fishing" in t:   return "Fishing"
    if "tug" in t:       return "Tug"
    return "Other"


def _dl_nav_status(status_str: str) -> str:
    s = (status_str or "").lower()
    if "anchor" in s:  return "ANCHORED"
    if "moor" in s:    return "MOORED"
    if "aground" in s: return "AGROUND"
    if "way" in s:     return "UNDERWAY"
    return "UNDERWAY"


def _map_dl_vessel(v: dict) -> dict | None:
    mmsi = str(v.get("mmsi") or "")
    if not mmsi:
        return None
    try:
        lat = float(v.get("lat") or 0.0)
        lon = float(v.get("lon") or 0.0)
    except (ValueError, TypeError):
        return None
    if not lat or not lon:
        return None
    try:
        sog = float(v.get("speed") or 0.0)
    except (ValueError, TypeError):
        sog = 0.0
    cog = v.get("course")
    return {
        "mmsi":      mmsi,
        "name":      (v.get("name") or "UNKNOWN").strip(),
        "flag":      "🌐",
        "type":      _dl_ship_type(v.get("type_specific") or v.get("type") or ""),
        "darkFleet": False,
        "anomaly":   "None detected",
        "risk":      "LOW",
        "speed":     f"{sog:.1f} kn",
        "course":    f"{int(float(cog))}°" if cog is not None else "N/A",
        "draft":     "N/A",   # available on vessel_pro only
        "dwt":       "N/A",   # available on vessel_pro only
        "lastPort":  "N/A",
        "nextPort":  v.get("destination") or "N/A",
        "status":    _dl_nav_status(v.get("navigational_status") or ""),
        "zone":      None,
        "track":     [[lat, lon]],
        "sigint":    None,
    }


def fetch_datalastic() -> list[dict]:
    """Fetch vessel positions from Datalastic bulk endpoint.
    Queries up to 100 MMSIs defined in DATALASTIC_MMSI_LIST (comma-separated).
    Datalastic has no area/broadcast feed — MMSIs must be specified explicitly.
    Register free at https://datalastic.com — set DATALASTIC_API_KEY and
    DATALASTIC_MMSI_LIST in Railway env vars.
    """
    mmsi_list = [m.strip() for m in os.getenv("DATALASTIC_MMSI_LIST", _DL_MMSI_DEFAULT).split(",") if m.strip()]
    params: list[tuple] = [("api-key", DATALASTIC_API_KEY)]
    for m in mmsi_list[:100]:
        params.append(("mmsi[]", m))
    resp = httpx.get(_DL_BULK_URL, params=params, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, dict) and not data.get("meta", {}).get("success", True):
        raise RuntimeError(f"Datalastic error: {data}")
    entries = data if isinstance(data, list) else data.get("data", [])
    vessels = []
    for entry in entries:
        # bulk response may wrap each result in {"data": {...}}
        v = entry.get("data", entry) if isinstance(entry, dict) else {}
        mapped = _map_dl_vessel(v)
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
    "vesselFinder": {
        "label":   "VesselFinder",
        "enabled": lambda: bool(VESSEL_FINDER_API_KEY),
        "fetch":   fetch_vesselfinder,
    },
    "datalastic": {
        "label":   "Datalastic",
        "enabled": lambda: bool(DATALASTIC_API_KEY),
        "fetch":   fetch_datalastic,
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


# ── ACLED integration — maritime incident intelligence ─────────────────────────
# Armed Conflict Location & Event Data (ACLED) — free API key.
# Register at https://acleddata.com — set ACLED_API_KEY and ACLED_EMAIL env vars.
# Queried countries: Yemen (Houthi/Red Sea), Somalia (piracy), Philippines (S.China Sea),
# Indonesia (Malacca), Iran (Persian Gulf). Mapped to our SIGINT feed schema.
ACLED_API_KEY = os.getenv("ACLED_API_KEY", "")
ACLED_EMAIL   = os.getenv("ACLED_EMAIL",   "")
_ACLED_URL    = "https://api.acleddata.com/acled/read"
# Countries relevant to major maritime chokepoints / shipping threats
_ACLED_MARITIME_COUNTRIES = "Yemen,Somalia,Philippines,Indonesia,Iran,Malaysia,Taiwan,Ukraine"


def _acled_sig_type(event_type: str) -> str:
    et = (event_type or "").lower()
    if "explosion" in et:   return "ELINT"
    if "battle"    in et:   return "SIGINT"
    if "violence"  in et:   return "HUMINT"
    return "OSINT"


def _acled_severity(row: dict) -> str:
    try:
        fat = int(row.get("fatalities") or 0)
    except (ValueError, TypeError):
        fat = 0
    if fat > 0:
        return "CRITICAL"
    sub = (row.get("sub_event_type") or "").lower()
    if any(k in sub for k in ("attack", "shelling", "air/drone", "suicide bomb")):
        return "CRITICAL"
    return "HIGH"


def fetch_acled_sigint() -> list[dict]:
    """Fetch recent conflict events from ACLED for maritime-adjacent regions.
    Maps armed-conflict events (Yemen/Houthi, Somalia/piracy, S.China Sea tensions)
    to the SIGINT feed schema.  Returns up to 8 most recent events.
    Register free at https://acleddata.com — set ACLED_API_KEY and ACLED_EMAIL.
    """
    from datetime import datetime, timedelta
    since = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
    today = datetime.utcnow().strftime("%Y-%m-%d")
    resp = httpx.get(_ACLED_URL, params={
        "key":              ACLED_API_KEY,
        "email":            ACLED_EMAIL,
        "country":          _ACLED_MARITIME_COUNTRIES,
        "event_date":       since,
        "event_date_where": "BETWEEN",
        "event_date_end":   today,
        "limit":            50,
        "_format":          "json",
    }, timeout=20)
    resp.raise_for_status()
    rows = resp.json().get("data", [])
    # Sort by timestamp desc, take top 8
    rows = sorted(rows, key=lambda r: r.get("timestamp", 0), reverse=True)[:8]
    sigint = []
    for row in rows:
        try:
            ts_raw = row.get("timestamp") or row.get("event_date", "")
            try:
                ts = __import__("datetime").datetime.fromtimestamp(int(ts_raw)).strftime("%H:%M")
            except Exception:
                ts = str(ts_raw)[11:16] or "N/A"
            notes   = (row.get("notes") or row.get("event_type") or "Maritime incident").strip()[:200]
            actor   = (row.get("actor1") or "UNKNOWN").strip()[:40]
            country = (row.get("country") or "").strip()
            loc     = (row.get("location") or "").strip()
            sigint.append({
                "ts":     ts,
                "mmsi":   None,
                "vessel": f"{country} — {loc}" if loc else country or "MARITIME ZONE",
                "type":   _acled_sig_type(row.get("event_type", "")),
                "msg":    f"[{actor}] {notes}",
                "sev":    _acled_severity(row),
            })
        except Exception:
            continue
    return sigint


def _get_sigint() -> list[dict]:
    """Return SIGINT feed: real ACLED data if configured, else mock data."""
    if not (ACLED_API_KEY and ACLED_EMAIL):
        return _SIGINT
    cache_key = "sigint:acled"
    cached = cache_get(cache_key)
    if cached:
        return cached.get("items", _SIGINT)
    try:
        items = fetch_acled_sigint()
        cache_set(cache_key, {"items": items or _SIGINT})
        return items or _SIGINT
    except Exception:
        return _SIGINT


# ── Static chokepoint reference data ──────────────────────────────────────────
# Moved here from Chokepoint.jsx so the backend can enrich with live event data.
# flow / pct / history are semi-static (updated manually as geopolitical situation changes).
_CHOKEPOINTS = [
    {"id": "CP-01", "name": "Strait of Hormuz",    "location": "Persian Gulf",          "lat":  26.5, "lon":  56.5,  "risk": "CRITICAL", "flow": "21Mb/d",  "pct": "21%", "tension": "Extreme",  "threats": ["Iranian naval exercises", "Mine laying reports", "Drone harassment of tankers"],        "altRoute": "None — no viable alternative",                      "history": [18, 19, 20, 21, 20, 19, 21], "acled_country": "Iran,Oman"},
    {"id": "CP-02", "name": "Strait of Malacca",   "location": "SE Asia",               "lat":   2.0, "lon": 101.5,  "risk": "HIGH",     "flow": "16Mb/d",  "pct": "16%", "tension": "Elevated", "threats": ["Piracy incidents up 40%", "Territorial disputes", "Cyber attacks on port systems"],    "altRoute": "Lombok Strait (+4 days transit)",                    "history": [14, 15, 15, 16, 16, 15, 16], "acled_country": "Indonesia,Malaysia"},
    {"id": "CP-03", "name": "Bab-el-Mandeb",       "location": "Red Sea / Yemen",       "lat":  12.5, "lon":  43.5,  "risk": "CRITICAL", "flow": "8.8Mb/d", "pct": "9%",  "tension": "Extreme",  "threats": ["Houthi missile attacks", "Drone boats", "Coalition naval response"],                  "altRoute": "Cape of Good Hope (+15 days, +$1.2M/voyage)",        "history": [9, 8, 7, 6, 5, 4, 4],       "acled_country": "Yemen,Djibouti"},
    {"id": "CP-04", "name": "Suez Canal",           "location": "Egypt",                 "lat":  30.5, "lon":  32.5,  "risk": "MEDIUM",   "flow": "5.5Mb/d", "pct": "5%",  "tension": "Moderate", "threats": ["Diversion due to Houthi threat", "Congestion incidents"],                            "altRoute": "Cape of Good Hope or SUMED pipeline",                "history": [7, 7, 6, 6, 5, 5, 6],       "acled_country": "Egypt,Yemen"},
    {"id": "CP-05", "name": "Turkish Straits",      "location": "Bosphorus/Dardanelles", "lat":  41.0, "lon":  29.0,  "risk": "MEDIUM",   "flow": "2.4Mb/d", "pct": "2%",  "tension": "Moderate", "threats": ["Russian Black Sea fleet movements", "Sanctions complications"],                      "altRoute": "Trans-Anatolian Pipeline (TANAP)",                   "history": [3, 3, 2, 2, 2, 2, 2],       "acled_country": "Turkey,Ukraine"},
    {"id": "CP-06", "name": "Danish Straits",       "location": "North Sea",             "lat":  56.0, "lon":  10.5,  "risk": "LOW",      "flow": "1.5Mb/d", "pct": "1%",  "tension": "Low",      "threats": ["Occasional Russian submarine activity"],                                              "altRoute": "Pipeline alternatives available",                    "history": [1, 1, 2, 1, 1, 2, 1],       "acled_country": ""},
    {"id": "CP-07", "name": "Strait of Gibraltar",  "location": "Atlantic / Med",        "lat":  35.9, "lon":  -5.5,  "risk": "LOW",      "flow": "1.8Mb/d", "pct": "2%",  "tension": "Low",      "threats": ["Occasional migrant crisis spillover", "Russian sub activity"],                       "altRoute": "North Africa overland pipelines",                    "history": [2, 2, 1, 2, 2, 1, 2],       "acled_country": "Morocco"},
    {"id": "CP-08", "name": "Cape of Good Hope",    "location": "South Africa",          "lat": -34.4, "lon":  18.5,  "risk": "LOW",      "flow": "3.2Mb/d", "pct": "3%",  "tension": "Low",      "threats": ["Weather-driven routing disruptions", "Piracy uptick near Cape"],                     "altRoute": "Suez Canal (normal route)",                          "history": [2, 3, 3, 4, 4, 5, 6],       "acled_country": "South Africa,Somalia"},
    {"id": "CP-09", "name": "Panama Canal",         "location": "Central America",       "lat":   9.0, "lon": -79.5,  "risk": "MEDIUM",   "flow": "1.0Mb/d", "pct": "1%",  "tension": "Moderate", "threats": ["Water shortage reducing daily transits", "US-China geopolitical pressure", "Cartel activity near locks"], "altRoute": "Suez Canal or US land bridge", "history": [1, 1, 1, 1, 1, 1, 1], "acled_country": "Panama"},
    {"id": "CP-10", "name": "Luzon Strait",         "location": "Philippines / Taiwan",  "lat":  20.0, "lon": 121.0,  "risk": "HIGH",     "flow": "2.0Mb/d", "pct": "2%",  "tension": "Elevated", "threats": ["PLA Navy exercises", "Taiwan Strait tensions spillover", "Submarine cable vulnerability"], "altRoute": "Lombok Strait (+2 days transit)", "history": [1, 2, 2, 3, 3, 4, 5], "acled_country": "Philippines"},
]

# Countries queried per chokepoint for ACLED enrichment (batched into single request)
_CP_ACLED_ALL = ",".join({cp["acled_country"] for cp in _CHOKEPOINTS if cp["acled_country"]})


def _enrich_chokepoints_acled(cps: list[dict]) -> list[dict]:
    """Add `acled_events_30d` and `latest_incident` to each chokepoint using ACLED data.
    Single batched API call for all relevant countries.
    """
    from datetime import datetime, timedelta
    since = (__import__("datetime").datetime.utcnow() - __import__("datetime").timedelta(days=30)).strftime("%Y-%m-%d")
    today = __import__("datetime").datetime.utcnow().strftime("%Y-%m-%d")
    resp = httpx.get(_ACLED_URL, params={
        "key":              ACLED_API_KEY,
        "email":            ACLED_EMAIL,
        "country":          _CP_ACLED_ALL,
        "event_date":       since,
        "event_date_where": "BETWEEN",
        "event_date_end":   today,
        "limit":            500,
        "_format":          "json",
    }, timeout=20)
    if resp.status_code != 200:
        return cps
    rows = resp.json().get("data", [])
    # Group events by country
    by_country: dict[str, list] = {}
    for row in rows:
        c = (row.get("country") or "").strip()
        by_country.setdefault(c, []).append(row)
    enriched = []
    for cp in cps:
        cp = cp.copy()
        cp_countries = {c.strip() for c in cp.get("acled_country", "").split(",") if c.strip()}
        events: list = []
        for c in cp_countries:
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


@app.get("/api/maritime/chokepoints")
def maritime_chokepoints(_: None = Depends(require_auth)):
    """Return global chokepoint status.
    Static baseline data enriched with ACLED conflict event counts
    when ACLED_API_KEY + ACLED_EMAIL env vars are configured (free key).
    """
    cache_key = "chokepoints"
    cached = cache_get(cache_key)
    if cached:
        return {**cached, "cache_hit": True}
    cps = [cp.copy() for cp in _CHOKEPOINTS]
    source = "static"
    if ACLED_API_KEY and ACLED_EMAIL:
        try:
            cps = _enrich_chokepoints_acled(cps)
            source = "live"
        except Exception:
            pass  # silently fall back to static data
    # Strip internal field before returning
    for cp in cps:
        cp.pop("acled_country", None)
    data = {
        "chokepoints": cps,
        "source":      source,
        "fetched_at":  time.time(),
        "cache_hit":   False,
    }
    cache_set(cache_key, data)
    return data


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
            "sigint":    _get_sigint(),
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
