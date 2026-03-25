"""Digitraffic AIS integration (Finnish Transport and Communications Agency).
Public REST API — no API key required.
Real-time AIS positions for vessels in Finnish waters (Baltic Sea).
"""
import httpx

DIGITRAFFIC_LOCATIONS_URL = "https://meri.digitraffic.fi/api/ais/v1/locations"
DIGITRAFFIC_VESSELS_URL   = "https://meri.digitraffic.fi/api/ais/v1/vessels"

_SHIP_TYPE_MAP = {
    range(70, 80): "Cargo",
    range(80, 90): "Tanker",
    range(60, 70): "Passenger",
    range(30, 31): "Fishing",
    range(50, 60): "Other",
}


def _ship_type(code) -> str:
    try:
        c = int(code or 0)
    except (ValueError, TypeError):
        return "Other"
    for r, label in _SHIP_TYPE_MAP.items():
        if c in r:
            return label
    return "Other"


def _nav_status(nav_stat) -> str:
    try:
        c = int(nav_stat or 15)
    except (ValueError, TypeError):
        c = 15
    return {0: "UNDERWAY", 1: "ANCHORED", 5: "MOORED", 6: "AGROUND", 8: "UNDERWAY"}.get(c, "UNKNOWN")


def fetch_digitraffic() -> list[dict]:
    """Fetch real-time AIS from Digitraffic. Joins /locations + /vessels by MMSI."""
    with httpx.Client(timeout=20) as client:
        loc_resp  = client.get(DIGITRAFFIC_LOCATIONS_URL)
        meta_resp = client.get(DIGITRAFFIC_VESSELS_URL)
    loc_resp.raise_for_status()
    meta_resp.raise_for_status()

    meta_by_mmsi: dict[int, dict] = {}
    for v in (meta_resp.json() or []):
        m = v.get("mmsi")
        if m:
            meta_by_mmsi[int(m)] = v

    features = (loc_resp.json().get("features") or [])
    vessels = []
    for feat in features[:100]:
        mmsi   = feat.get("mmsi")
        coords = (feat.get("geometry") or {}).get("coordinates")
        if not mmsi or not coords or len(coords) < 2:
            continue
        lon, lat = coords[0], coords[1]
        props = feat.get("properties") or {}
        meta  = meta_by_mmsi.get(int(mmsi), {})
        sog   = props.get("sog") or 0.0
        cog   = props.get("cog")
        vessels.append({
            "mmsi":      str(mmsi),
            "name":      (meta.get("name") or f"MMSI-{mmsi}").strip(),
            "flag":      "🇫🇮",
            "type":      _ship_type(meta.get("shipType")),
            "darkFleet": False,
            "anomaly":   "None detected",
            "risk":      "LOW",
            "speed":     f"{sog:.1f} kn",
            "course":    f"{cog:.0f}°" if cog is not None else "N/A",
            "draft":     f"{meta.get('draught', 0):.1f}m" if meta.get("draught") else "N/A",
            "dwt":       "N/A",
            "lastPort":  "N/A",
            "nextPort":  (meta.get("destination") or "N/A").strip() or "N/A",
            "status":    _nav_status(props.get("navStat")),
            "zone":      None,
            "track":     [[lat, lon]],
            "sigint":    None,
        })
    return vessels
