# Sentinel AI — Backend

FastAPI backend for Sentinel AI platform.

## Local dev

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

- Public: `GET http://localhost:8000/status`
- Protected: `GET http://localhost:8000/api/maritime/vessels` with header `X-Sentinel-Key: <your-secret>`

Without `API_SECRET` set the server runs open (all `/api/*` routes unprotected). Suitable for local dev.

## Railway deploy

Railway auto-detects `requirements.txt` and starts with:
```
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Required env vars in Railway dashboard

| Variable | Description |
|---|---|
| `API_SECRET` | Shared secret — must match `VITE_API_SECRET` on Vercel |
| `CACHE_TTL_MINUTES` | Cache TTL in minutes (default: 15) |

Generate a secret:
```bash
python3 -c "import secrets; print('ssk_' + secrets.token_hex(32))"
```

## Frontend connection

In `.env.local` (dev) or Vercel environment variables (prod):
```
VITE_API_URL=https://your-railway-app.railway.app
VITE_API_SECRET=ssk_<same value as API_SECRET on Railway>
```

All frontend→backend calls go through `src/utils/beClient.js` which automatically
attaches the `X-Sentinel-Key` header. The `/status` ping is public (no key needed).
