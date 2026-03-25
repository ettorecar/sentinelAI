"""Maritime provider registry — vessel data aggregation layer.

To add a new maritime provider:
  1. Create backend/providers/maritime/<name>.py with a fetch_<name>() function
  2. Add an entry to PROVIDERS below
  3. Set the required env var in Railway
"""
import os

from .barentswatch  import fetch_barentswatch,  BW_CLIENT_ID, BW_CLIENT_SECRET
from .digitraffic   import fetch_digitraffic
from .aisstream     import fetch_aisstream,      AISSTREAM_API_KEY
from .vesselfinder  import fetch_vesselfinder,   VESSEL_FINDER_API_KEY
from .datalastic    import fetch_datalastic,     DATALASTIC_API_KEY


def _stub(name: str):
    """Placeholder fetch for providers not yet implemented."""
    def _fn():
        raise NotImplementedError(f"{name} provider is not yet implemented")
    return _fn


PROVIDERS: dict[str, dict] = {
    # ── Live (no API key required) ────────────────────────────────────────────
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
        "enabled": lambda: True,   # public endpoint, no credentials needed
        "fetch":   fetch_digitraffic,
    },
    # ── Free tier (API key required) ─────────────────────────────────────────
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
    # ── Commercial (API token required) ──────────────────────────────────────
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


def fetch_providers(requested: list[str] | None) -> tuple[list[dict], list[str], list[dict]]:
    """Try each requested provider (or all defaults when None).
    Returns (vessels, active_keys, errors).
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
            active.append(name)
        except Exception as exc:
            errors.append({"provider": name, "error": str(exc)})

    return all_vessels, active, errors
