"""BarentsWatch AIS integration.
Set BW_CLIENT_ID + BW_CLIENT_SECRET in Railway env vars to enable live data.
Free registration: https://www.barentswatch.no/
"""
import os
import time
import httpx

BW_CLIENT_ID     = os.getenv("BW_CLIENT_ID", "")
BW_CLIENT_SECRET = os.getenv("BW_CLIENT_SECRET", "")
BW_SCOPE         = os.getenv("BW_SCOPE", "api")
BW_TOKEN_URL     = "https://id.barentswatch.no/connect/token"
BW_AIS_URL       = "https://live.ais.barentswatch.no/v1/latest/combined"

_bw_token: dict = {"access_token": None, "expires_at": 0.0}


def _get_bw_token() -> str:
    if _bw_token["access_token"] and time.time() < _bw_token["expires_at"] - 60:
        return _bw_token["access_token"]
    resp = httpx.post(BW_TOKEN_URL, data={
        "grant_type":    "client_credentials",
        "client_id":     BW_CLIENT_ID,
        "client_secret": BW_CLIENT_SECRET,
        "scope":         BW_SCOPE,
    }, timeout=10)
    if not resp.is_success:
        raise RuntimeError(f"BW token error {resp.status_code}: {resp.text}")
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
        "mmsi":      str(v.get("mmsi", "")),
        "name":      (v.get("name") or "UNKNOWN").strip(),
        "flag":      _flag(v.get("country", "")),
        "type":      _ship_type(v.get("shipType") or 0),
        "darkFleet": False,
        "anomaly":   "None detected",
        "risk":      "LOW",
        "speed":     f"{sog:.1f} kn",
        "course":    f"{cog:.0f}°" if cog is not None else "N/A",
        "draft":     f"{v.get('draught', 0):.1f}m" if v.get("draught") else "N/A",
        "dwt":       "N/A",
        "lastPort":  "N/A",
        "nextPort":  (v.get("destination") or "N/A").strip() or "N/A",
        "status":    _nav_status(v.get("navigationalStatus") or 0),
        "zone":      None,
        "track":     [[lat, lon]],
        "sigint":    None,
    }


def fetch_barentswatch() -> list[dict]:
    """Call BarentsWatch API and return mapped vessel list."""
    token = _get_bw_token()
    resp  = httpx.get(BW_AIS_URL, headers={"Authorization": f"Bearer {token}"}, timeout=15)
    resp.raise_for_status()
    raw = resp.json()
    return [_map_vessel(v) for v in raw if v.get("latitude") and v.get("longitude")][:100]
