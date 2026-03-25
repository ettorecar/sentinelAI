"""Datalastic integration.
Vessel lookup by MMSI via bulk endpoint — up to 100 MMSIs per request.
Datalastic has no area/broadcast endpoint; it requires known MMSIs.
Default watchlist: 31 OFAC-sanctioned vessels (public SDN list, Jan 2025).
Override with DATALASTIC_MMSI_LIST env var (comma-separated).
Free tier available. Register at https://datalastic.com
Set DATALASTIC_API_KEY in Railway env vars to enable.
"""
import os
import httpx

DATALASTIC_API_KEY = os.getenv("DATALASTIC_API_KEY", "")
_BULK_URL          = "https://api.datalastic.com/api/v0/vessel_bulk"

# Default watchlist: OFAC-sanctioned vessels (Jan 2025 designations).
# Source: https://home.treasury.gov/news/press-releases/jy2777
# Full list: https://www.treasury.gov/ofac/downloads/sdn_advanced.xml
_MMSI_DEFAULT = ",".join([
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


def _ship_type(type_str: str) -> str:
    t = (type_str or "").lower()
    if "cargo" in t or "container" in t or "bulk" in t: return "Cargo"
    if "tanker"    in t: return "Tanker"
    if "passenger" in t: return "Passenger"
    if "fishing"   in t: return "Fishing"
    if "tug"       in t: return "Tug"
    return "Other"


def _nav_status(status_str: str) -> str:
    s = (status_str or "").lower()
    if "anchor" in s:  return "ANCHORED"
    if "moor"   in s:  return "MOORED"
    if "aground" in s: return "AGROUND"
    return "UNDERWAY"


def _map_vessel(v: dict) -> dict | None:
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
        "type":      _ship_type(v.get("type_specific") or v.get("type") or ""),
        "darkFleet": False,
        "anomaly":   "None detected",
        "risk":      "LOW",
        "speed":     f"{sog:.1f} kn",
        "course":    f"{int(float(cog))}°" if cog is not None else "N/A",
        "draft":     "N/A",
        "dwt":       "N/A",
        "lastPort":  "N/A",
        "nextPort":  v.get("destination") or "N/A",
        "status":    _nav_status(v.get("navigational_status") or ""),
        "zone":      None,
        "track":     [[lat, lon]],
        "sigint":    None,
    }


def fetch_datalastic() -> list[dict]:
    """Fetch vessel positions from Datalastic bulk endpoint (MMSI watchlist)."""
    mmsi_list = [m.strip() for m in os.getenv("DATALASTIC_MMSI_LIST", _MMSI_DEFAULT).split(",") if m.strip()]
    params: list[tuple] = [("api-key", DATALASTIC_API_KEY)]
    for m in mmsi_list[:100]:
        params.append(("mmsi[]", m))
    resp = httpx.get(_BULK_URL, params=params, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, dict) and not data.get("meta", {}).get("success", True):
        raise RuntimeError(f"Datalastic error: {data}")
    entries = data if isinstance(data, list) else data.get("data", [])
    vessels = []
    for entry in entries:
        v = entry.get("data", entry) if isinstance(entry, dict) else {}
        mapped = _map_vessel(v)
        if mapped:
            vessels.append(mapped)
    return vessels[:100]
