"""AISStream.io integration.
Global real-time AIS via WebSocket. Free tier — register at https://aisstream.io
Set AISSTREAM_API_KEY in Railway env vars to enable.
"""
import os
import asyncio
import json as _json
import httpx  # noqa: F401 (kept for consistency, websockets used directly)

AISSTREAM_API_KEY = os.getenv("AISSTREAM_API_KEY", "")
AISSTREAM_URL     = "wss://stream.aisstream.io/v0/stream"
_BBOX             = [[[-90, -180], [90, 180]]]
_COLLECT_SECS     = 8
_MAX_VESSELS      = 100


def _ship_type(type_id: int) -> str:
    if 70 <= type_id <= 79: return "Cargo"
    if 80 <= type_id <= 89: return "Tanker"
    if 60 <= type_id <= 69: return "Passenger"
    if type_id == 30:       return "Fishing"
    if type_id in (31, 32, 52): return "Tug"
    return "Other"


def _nav_status(status: int) -> str:
    return {0: "UNDERWAY", 1: "ANCHORED", 5: "MOORED", 6: "AGROUND", 8: "UNDERWAY"}.get(status, "UNDERWAY")


def _map_vessel(msg: dict) -> dict | None:
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
        "type":      _ship_type(type_id),
        "darkFleet": False,
        "anomaly":   "None detected",
        "risk":      "LOW",
        "speed":     f"{sog:.1f} kn",
        "course":    f"{cog:.0f}°" if cog is not None else "N/A",
        "draft":     "N/A",
        "dwt":       "N/A",
        "lastPort":  "N/A",
        "nextPort":  "N/A",
        "status":    _nav_status(status),
        "zone":      None,
        "track":     [[lat, lon]],
        "sigint":    None,
    }


async def _collect(api_key: str) -> list[dict]:
    import websockets
    subscription = {
        "APIKey":             api_key,
        "BoundingBoxes":      _BBOX,
        "FilterMessageTypes": ["PositionReport", "ExtendedClassBPositionReport"],
    }
    vessels_by_mmsi: dict = {}
    async with websockets.connect(AISSTREAM_URL, open_timeout=10) as ws:
        await ws.send(_json.dumps(subscription))
        deadline = asyncio.get_event_loop().time() + _COLLECT_SECS
        while asyncio.get_event_loop().time() < deadline:
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=1.0)
                v = _map_vessel(_json.loads(raw))
                if v and v["mmsi"] not in vessels_by_mmsi:
                    vessels_by_mmsi[v["mmsi"]] = v
                if len(vessels_by_mmsi) >= _MAX_VESSELS:
                    break
            except asyncio.TimeoutError:
                continue
    return list(vessels_by_mmsi.values())


def fetch_aisstream() -> list[dict]:
    """Fetch real-time global AIS from AISStream.io via WebSocket (free tier)."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_collect(AISSTREAM_API_KEY))
    finally:
        loop.close()
