"""VesselFinder integration.
Real-time vessel positions via geographic area query (livedata endpoint).
Free tier: 100 req/day. Register at https://www.vesselfinder.com/api
Set VESSEL_FINDER_API_KEY in Railway env vars to enable.
Optionally set VESSEL_FINDER_BBOX="latmin,latmax,lonmin,lonmax" (default: global).
"""
import os
import httpx

VESSEL_FINDER_API_KEY = os.getenv("VESSEL_FINDER_API_KEY", "")
_LIVEDATA_URL         = "https://api.vesselfinder.com/livedata"
_BBOX_DEFAULT         = "-90,90,-180,180"


def _nav_status(code) -> str:
    try:
        c = int(code or 15)
    except (ValueError, TypeError):
        c = 15
    return {0: "UNDERWAY", 1: "ANCHORED", 5: "MOORED", 6: "AGROUND", 8: "UNDERWAY"}.get(c, "UNDERWAY")


def _ship_type(type_id) -> str:
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


def _map_vessel(entry: dict) -> dict | None:
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
        "type":      _ship_type(ais.get("TYPE")),
        "darkFleet": False,
        "anomaly":   "None detected",
        "risk":      "LOW",
        "speed":     f"{sog_f:.1f} kn",
        "course":    f"{int(float(cog))}°" if cog is not None else "N/A",
        "draft":     f"{float(draught):.1f}m" if draught else "N/A",
        "dwt":       f"{int(float(dwt)):,}t" if dwt else "N/A",
        "lastPort":  voy.get("LASTPORT") or "N/A",
        "nextPort":  ais.get("DESTINATION") or "N/A",
        "status":    _nav_status(ais.get("NAVSTAT")),
        "zone":      None,
        "track":     [[lat, lon]],
        "sigint":    None,
    }


def fetch_vesselfinder() -> list[dict]:
    """Fetch vessel positions from VesselFinder livedata (area query)."""
    bbox = os.getenv("VESSEL_FINDER_BBOX", _BBOX_DEFAULT)
    try:
        latmin, latmax, lonmin, lonmax = [float(x) for x in bbox.split(",")]
    except Exception:
        latmin, latmax, lonmin, lonmax = -90, 90, -180, 180
    resp = httpx.get(_LIVEDATA_URL, params={
        "userkey": VESSEL_FINDER_API_KEY,
        "latmin":  latmin, "latmax": latmax,
        "lonmin":  lonmin, "lonmax": lonmax,
    }, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, dict) and ("errors" in data or "error" in data):
        raise RuntimeError(f"VesselFinder error: {data.get('errors') or data.get('error')}")
    vessels = []
    for entry in (data if isinstance(data, list) else []):
        mapped = _map_vessel(entry)
        if mapped:
            vessels.append(mapped)
    return vessels[:100]
