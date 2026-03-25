"""Top-level provider package.

Domain sub-packages:
  providers/maritime/  — AIS vessel data (BarentsWatch, Digitraffic, AISStream, …)
  providers/energy/    — Power grid data (Energy-Charts, ENTSO-E, EIA, …)
"""
from .maritime import PROVIDERS, DEFAULT_PROVIDERS, fetch_providers
