"""ACLED integration — maritime conflict event intelligence.
Armed Conflict Location & Event Data — free account at https://acleddata.com
Auth: OAuth2 password grant (Sep 2025 new system).
Set ACLED_EMAIL and ACLED_PASSWORD env vars. No API key needed.
Provides the SIGINT feed: conflict events near major maritime chokepoints.
"""
import os
import time
import httpx

ACLED_EMAIL    = os.getenv("ACLED_EMAIL",    "")
ACLED_PASSWORD = os.getenv("ACLED_PASSWORD", "")
_DATA_URL      = "https://acleddata.com/api/acled/read"
_AUTH_URL      = "https://acleddata.com/oauth/token"

# Countries covering major maritime chokepoints / shipping threat zones:
# Yemen (Houthi/Red Sea), Somalia (piracy), Philippines/Indonesia/Malaysia (Malacca/S.China Sea),
# Iran (Persian Gulf/Hormuz), Taiwan (Luzon Strait), Ukraine (Black Sea).
_COUNTRIES = "Yemen:OR:country=Somalia:OR:country=Philippines:OR:country=Indonesia:OR:country=Iran:OR:country=Malaysia:OR:country=Taiwan:OR:country=Ukraine"

_token_cache: dict = {}


def _bearer() -> str:
    """Return a valid OAuth Bearer token, refreshing when expired."""
    if _token_cache.get("token") and time.time() < _token_cache.get("expires_at", 0) - 60:
        return _token_cache["token"]
    resp = httpx.post(_AUTH_URL, data={
        "username":   ACLED_EMAIL,
        "password":   ACLED_PASSWORD,
        "grant_type": "password",
        "client_id":  "acled",
    }, timeout=15)
    resp.raise_for_status()
    body = resp.json()
    token = body.get("access_token") or body.get("token") or ""
    if not token:
        raise RuntimeError(f"ACLED auth: missing token in response: {body}")
    expires_in = int(body.get("expires_in") or 86400)
    _token_cache["token"]      = token
    _token_cache["expires_at"] = time.time() + expires_in
    return token


def _sig_type(event_type: str) -> str:
    et = (event_type or "").lower()
    if "explosion" in et: return "ELINT"
    if "battle"    in et: return "SIGINT"
    if "violence"  in et: return "HUMINT"
    return "OSINT"


def _severity(row: dict) -> str:
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


def fetch_sigint() -> list[dict]:
    """Fetch recent conflict events and map to SIGINT feed schema (up to 8 entries)."""
    from datetime import datetime, timedelta
    since = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
    today = datetime.utcnow().strftime("%Y-%m-%d")
    token = _bearer()
    url   = f"{_DATA_URL}?country={_COUNTRIES}&event_date={since}&event_date_where=BETWEEN&event_date_end={today}&limit=50&_format=json"
    resp  = httpx.get(url, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, timeout=20)
    resp.raise_for_status()
    body = resp.json()
    if body.get("status") != 200:
        raise RuntimeError(f"ACLED {body.get('status')}: {body.get('message', 'unknown error')}")
    rows = sorted(body.get("data", []), key=lambda r: r.get("timestamp", 0), reverse=True)[:8]
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
                "type":   _sig_type(row.get("event_type", "")),
                "msg":    f"[{actor}] {notes}",
                "sev":    _severity(row),
            })
        except Exception:
            continue
    return sigint
