# Sentinel AI — Backend

FastAPI backend for Sentinel AI platform.

## Local dev

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health check: `GET http://localhost:8000/status`

## Railway deploy

Railway auto-detects `requirements.txt` and starts with:
```
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Set the following env vars in Railway dashboard:
- `PORT` — set automatically by Railway

## Frontend connection

In the frontend repo root, create `.env.local`:
```
VITE_API_URL=https://your-railway-app.railway.app
```

On Vercel, add `VITE_API_URL` as an environment variable pointing to your Railway URL.
If the variable is not set, the frontend shows "NOT CONFIGURED" and runs in full mock mode.
