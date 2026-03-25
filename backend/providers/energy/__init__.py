"""Energy provider registry.

Provider files go here when the energy router grows to need separate modules.
Currently energy providers are defined inline in routers/energy.py since
there are only three and they are self-contained.

To add a new energy provider:
  1. Create backend/providers/energy/<name>.py with a fetch_<name>() function
  2. Add an entry to PROVIDERS in routers/energy.py (or move registry here)
  3. Set the required env var in Railway
"""
