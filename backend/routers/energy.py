"""Energy Grid router — /api/energy/grid

Real-time power generation, load, and cross-border flow data.
Aggregates multiple free providers (same pattern as maritime/vessels):

  Provider            | Coverage      | Auth         | Env var
  --------------------|---------------|--------------|-----------------------------
  Energy-Charts       | EU + 30 cntrs | None (free)  | always enabled
  ENTSO-E Transparency| Pan-EU        | Token        | ENTSOE_TOKEN
  EIA Open Data       | USA           | API key      | EIA_API_KEY

Energy-Charts (Fraunhofer ISE): https://api.energy-charts.info/
  - No auth, completely free
  - Real-time generation mix, installed capacity, prices
  - 30+ countries

ENTSO-E Transparency Platform: https://transparency.entsoe.eu/
  - Free registration at https://transparency.entsoe.eu/usrm/user/createPublicUser
  - Pan-European generation, load, cross-border flows
  - Set ENTSOE_TOKEN env var

EIA Open Data API: https://api.eia.gov/v2/
  - Completely free, just register at https://www.eia.gov/opendata/
  - US electricity generation by source, net imports/exports
  - Set EIA_API_KEY env var
"""
import os
import time
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, Query

from core.auth  import require_auth
from core.cache import cache_get, cache_set, cache_age

router = APIRouter()

# ── Provider credentials ───────────────────────────────────────────────────────
ENTSOE_TOKEN = os.getenv("ENTSOE_TOKEN", "")
EIA_API_KEY  = os.getenv("EIA_API_KEY",  "")

# ── API base URLs ──────────────────────────────────────────────────────────────
_ENERGY_CHARTS_BASE = "https://api.energy-charts.info"
_ENTSOE_BASE        = "https://web-api.tp.entsoe.eu/api"
_EIA_BASE           = "https://api.eia.gov/v2"

# ── Normalised grid record schema ──────────────────────────────────────────────
# Each provider maps its response to this shape:
# {
#   "country":    str,           # ISO-2 country code or region name
#   "ts":         str,           # ISO timestamp of measurement
#   "generation": {              # MW by source
#       "solar": float, "wind": float, "gas": float,
#       "nuclear": float, "coal": float, "hydro": float, "other": float
#   },
#   "load_mw":    float | None,  # total demand in MW
#   "renewables_pct": float,     # % of generation from renewables
#   "price_eur_mwh":  float | None,  # day-ahead price (if available)
#   "provider":   str,
# }


# ── Energy-Charts provider ─────────────────────────────────────────────────────

def fetch_energy_charts(country: str = "de") -> dict:
    """Fetch current generation mix from Energy-Charts API (no auth required).
    country: ISO-2 code, e.g. 'de', 'fr', 'it', 'es', 'gb', 'pl', ...
    Full country list: https://api.energy-charts.info/
    """
    resp = httpx.get(f"{_ENERGY_CHARTS_BASE}/power", params={"country": country}, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    # Response: {"unix_seconds": [...], "production_types": [{"name": ..., "data": [...]}]}
    unix_ts = data.get("unix_seconds", [])
    if not unix_ts:
        raise RuntimeError("Energy-Charts: no timestamp data")

    latest_idx = len(unix_ts) - 1
    ts = __import__("datetime").datetime.utcfromtimestamp(unix_ts[latest_idx]).isoformat() + "Z"

    gen: dict[str, float] = {}
    for pt in data.get("production_types", []):
        name   = (pt.get("name") or "").lower()
        values = pt.get("data") or []
        val    = float(values[latest_idx] or 0) if latest_idx < len(values) else 0.0
        if "solar"   in name: gen["solar"]   = gen.get("solar",   0) + val
        elif "wind"  in name: gen["wind"]    = gen.get("wind",    0) + val
        elif "gas"   in name or "fossil gas" in name: gen["gas"] = gen.get("gas", 0) + val
        elif "nuclear" in name: gen["nuclear"] = gen.get("nuclear", 0) + val
        elif "coal"  in name or "lignite" in name: gen["coal"] = gen.get("coal", 0) + val
        elif "hydro" in name or "run-of-river" in name: gen["hydro"] = gen.get("hydro", 0) + val
        else: gen["other"] = gen.get("other", 0) + val

    total    = sum(gen.values()) or 1
    renewables = gen.get("solar", 0) + gen.get("wind", 0) + gen.get("hydro", 0)
    return {
        "country":        country.upper(),
        "ts":             ts,
        "generation":     gen,
        "load_mw":        None,  # load available via separate /total_power endpoint
        "renewables_pct": round(renewables / total * 100, 1),
        "price_eur_mwh":  None,  # available via /price endpoint
        "provider":       "energyCharts",
    }


# ── ENTSO-E provider ───────────────────────────────────────────────────────────

def fetch_entsoe(bidding_zone: str = "10Y1001A1001A83F") -> dict:
    """Fetch current generation mix from ENTSO-E Transparency Platform.
    bidding_zone: EIC code. Defaults to Germany (10Y1001A1001A83F).
    Common codes: DE=10Y1001A1001A83F, FR=10YFR-RTE------C, IT=10YIT-GRTN-----W
    Register free: https://transparency.entsoe.eu/usrm/user/createPublicUser
    Set ENTSOE_TOKEN env var.
    """
    from datetime import datetime, timedelta
    now   = datetime.utcnow()
    start = (now - timedelta(hours=2)).strftime("%Y%m%d%H00")
    end   = now.strftime("%Y%m%d%H00")
    resp  = httpx.get(_ENTSOE_BASE, params={
        "securityToken":  ENTSOE_TOKEN,
        "documentType":   "A75",   # Actual generation per type
        "processType":    "A16",   # Realised
        "in_Domain":      bidding_zone,
        "periodStart":    start,
        "periodEnd":      end,
    }, timeout=20)
    resp.raise_for_status()
    # ENTSO-E returns XML — parse basic generation values
    import xml.etree.ElementTree as ET
    ns  = {"ns": "urn:iec62325.351:tc57wg16:451-6:generationloaddocument:3:0"}
    root = ET.fromstring(resp.text)
    gen: dict[str, float] = {}
    ts  = now.isoformat() + "Z"
    for ts_series in root.findall(".//ns:TimeSeries", ns):
        psr_type = ts_series.findtext("ns:MktPSRType/ns:psrType", namespaces=ns) or "other"
        points   = ts_series.findall(".//ns:Point", ns)
        val      = float(points[-1].findtext("ns:quantity", "0", ns)) if points else 0.0
        label = {
            "B01": "hydro",   "B09": "wind", "B10": "wind",
            "B11": "solar",   "B14": "nuclear", "B02": "coal",
            "B04": "gas",     "B05": "coal",
        }.get(psr_type, "other")
        gen[label] = gen.get(label, 0) + val
    total      = sum(gen.values()) or 1
    renewables = gen.get("solar", 0) + gen.get("wind", 0) + gen.get("hydro", 0)
    return {
        "country":        bidding_zone,
        "ts":             ts,
        "generation":     gen,
        "load_mw":        None,
        "renewables_pct": round(renewables / total * 100, 1),
        "price_eur_mwh":  None,
        "provider":       "entsoe",
    }


# ── EIA provider ───────────────────────────────────────────────────────────────

def fetch_eia() -> dict:
    """Fetch US electricity generation mix from EIA Open Data API.
    Free API key at https://www.eia.gov/opendata/ — set EIA_API_KEY env var.
    """
    from datetime import datetime, timedelta
    start = (datetime.utcnow() - timedelta(hours=3)).strftime("%Y-%m-%dT%H")
    resp  = httpx.get(f"{_EIA_BASE}/electricity/rto/fuel-type-data/data/", params={
        "api_key":     EIA_API_KEY,
        "frequency":   "hourly",
        "data[0]":     "value",
        "facets[respondent][]": "US48",  # contiguous US
        "sort[0][column]": "period",
        "sort[0][direction]": "desc",
        "offset": 0,
        "length": 20,
    }, timeout=20)
    resp.raise_for_status()
    records = resp.json().get("response", {}).get("data", [])
    gen: dict[str, float] = {}
    ts  = datetime.utcnow().isoformat() + "Z"
    for rec in records:
        fuel  = (rec.get("fueltype") or "other").lower()
        val   = float(rec.get("value") or 0)
        label = {"sun": "solar", "wnd": "wind", "ng": "gas", "nuc": "nuclear",
                 "col": "coal", "wat": "hydro"}.get(fuel, "other")
        gen[label] = gen.get(label, 0) + val
        if rec.get("period"):
            ts = rec["period"]
    total      = sum(gen.values()) or 1
    renewables = gen.get("solar", 0) + gen.get("wind", 0) + gen.get("hydro", 0)
    return {
        "country":        "US",
        "ts":             ts,
        "generation":     gen,
        "load_mw":        total,
        "renewables_pct": round(renewables / total * 100, 1),
        "price_eur_mwh":  None,
        "provider":       "eia",
    }


# ── Provider registry (mirrors maritime pattern) ───────────────────────────────

ENERGY_PROVIDERS: dict[str, dict] = {
    "energyCharts": {
        "label":   "Energy-Charts (Fraunhofer ISE)",
        "enabled": lambda: True,   # no auth required
        "fetch":   lambda: [fetch_energy_charts(c) for c in ("de", "fr", "it", "es", "gb", "pl")],
    },
    "entsoe": {
        "label":   "ENTSO-E Transparency",
        "enabled": lambda: bool(ENTSOE_TOKEN),
        "fetch":   lambda: [fetch_entsoe()],
    },
    "eia": {
        "label":   "EIA Open Data",
        "enabled": lambda: bool(EIA_API_KEY),
        "fetch":   lambda: [fetch_eia()],
    },
}


def _fetch_energy_providers() -> tuple[list[dict], list[str], list[dict]]:
    records: list[dict] = []
    active:  list[str]  = []
    errors:  list[dict] = []
    for name, cfg in ENERGY_PROVIDERS.items():
        if not cfg["enabled"]():
            errors.append({"provider": name, "error": "Not configured"})
            continue
        try:
            records.extend(cfg["fetch"]())
            active.append(name)
        except Exception as exc:
            errors.append({"provider": name, "error": str(exc)})
    return records, active, errors


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/api/energy/grid")
def energy_grid(
    country: Optional[str] = Query(default=None, description="ISO-2 country code filter"),
    _: None = Depends(require_auth),
):
    """Real-time power generation mix from Energy-Charts, ENTSO-E, and EIA.
    Returns generation by source (MW), renewables %, and optional price.
    Cached for CACHE_TTL minutes.
    """
    cache_key = f"energy:grid:{country or 'all'}"
    cached = cache_get(cache_key)
    if cached:
        return {**cached, "cache_hit": True, "cache_age_seconds": cache_age(cache_key)}

    records, active, errors = _fetch_energy_providers()

    if country:
        records = [r for r in records if r.get("country", "").upper() == country.upper()]

    data: dict = {
        "grid":       records,
        "source":     "live" if records else "mock",
        "providers":  active,
        "fetched_at": time.time(),
        "cache_hit":  False,
    }
    if errors:
        data["errors"] = errors

    cache_set(cache_key, data)
    return data


@router.get("/api/energy/providers")
def energy_providers(_: None = Depends(require_auth)):
    """List available energy data providers and their configuration status."""
    return {
        name: {
            "label":   cfg["label"],
            "status":  "configured" if cfg["enabled"]() else "not_configured",
        }
        for name, cfg in ENERGY_PROVIDERS.items()
    }
