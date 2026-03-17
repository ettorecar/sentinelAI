# SENTINEL — Architecture & Go-To-Market Strategy
## Documento strategico per sviluppo backend e monetizzazione

---

## 1. Modello di accesso — "Shared Intelligence Feed"

La piattaforma è strutturata su **due layer distinti** di accesso:

### Layer 1 — Pubblico, aggiornato automaticamente
Dati condivisi tra tutti gli utenti, generati dal backend ogni 30 minuti tramite una singola chiamata AI. Costi prevedibili e minimi (~$1-2/giorno). Nessuna autenticazione richiesta.

Tool che rientrano in questo layer:
- 🌍 **Threat Map** — hotspot geopolitici attivi
- 🚢 **Chokepoint Monitor** — status dei 6 chokepoint principali
- 🛢️ **Oil Infrastructure Monitor** — alert infrastrutture energetiche
- 🦠 **Bio-Threat Warning** — segnali epidemiologici attivi
- 🔐 **Cyber Threat Intel** — threat actor profiles e IOC feed
- 🌊 **Maritime Tracker** — anomalie AIS aggregate

### Layer 2 — Personalizzato, richiede API key utente
Analisi su input specifico dell'utente. La chiave API è fornita dall'utente stesso — zero costi per la piattaforma, zero rischio bot.

**✅ TUTTI IMPLEMENTATI (v0.7):**
- 🤖 **Red Team Generator** — scenario su target specifico ✅ AI live
- 📰 **Disinfo Detector** — analisi testo specifico ✅ AI live
- 🧠 **PSYOP Analyzer** — analisi contenuto specifico ✅ AI live
- 🔍 **OSINT Correlator** — correlazione entità specifica ✅ AI live
- 📍 **Pattern of Life** — analisi soggetto specifico ✅ AI live
- 📊 **Energy Risk Analyzer** — scenario paese/disruption custom ✅ AI live
- 📋 **Intelligence Report Generator** — brief multi-dominio ✅ AI live (NUOVO)
- 🌐 **Translator** — traduzione militare con fallback mock ✅ AI live (NUOVO)

---

## 2. Razionale strategico

### Perché questo modello funziona per SENTINEL

Il target di SENTINEL è **B2B istituzionale** (governi, contractor, aziende energetiche). Questo tipo di cliente non compra mai tramite checkout online — compra dopo una demo, una trattativa, un contratto. Quindi:

- Un paywall non serve per monetizzare direttamente
- Serve per **qualificare l'interesse** e raccogliere contatti
- Il layer pubblico è lo **strumento di acquisizione** (giornalisti, analisti, curiosi tornano regolarmente)
- Il layer privato è la **dimostrazione di valore** che porta alla trattativa commerciale

### Viralità attesa del layer pubblico
Contenuti come lo status di Hormuz aggiornato, il CTI feed con IOC recenti o la Bio-Threat map sono esattamente il tipo di contenuto che viene linkato e condiviso nel mondo della sicurezza e del giornalismo investigativo. L'aggiornamento ogni 30 minuti crea un motivo per tornare.

### Costi sotto controllo
Con aggiornamento ogni 30 minuti:
- 48 chiamate AI/giorno per il layer pubblico
- Costo stimato per chiamata: $0.01–0.05 (prompt aggregato, output JSON)
- Costo massimo stimato: **~$2/giorno, ~$60/mese**
- Completamente assorbibile prima di qualsiasi ricavo

---

## 3. Architettura tecnica target

> **⚠️ Aggiornamento v0.7:** La scelta tecnologica backend è stata aggiornata a **Node.js + Vercel Functions** (serverless, stesso progetto Vercel) invece di Python FastAPI. Questo semplifica il deploy e mantiene lo stack JavaScript uniforme.

```
┌─────────────────────────────────────────────────────┐
│                  FRONTEND (React/Vite)               │
│                  Deploy: Vercel                      │
│                                                      │
│  Layer 1 tools → GET /api/feed (dati cached)        │
│  Layer 2 tools → POST /api/analyze (API key utente) │
└──────────────────────┬──────────────────────────────┘
                       │ REST
┌──────────────────────▼──────────────────────────────┐
│         BACKEND (Node.js — Vercel Functions)         │
│         Deploy: Vercel (stessa app, cartella api/)   │
│                                                      │
│  /api/feed          → restituisce JSON cached dal DB │
│  /api/analyze/*     → proxy verso Claude API        │
│                       con chiave utente              │
│                                                      │
│  Scheduler (APScheduler)                            │
│    → ogni 30min: chiama Claude con prompt aggregato  │
│    → salva risultato su DB                           │
│    → invalida cache                                  │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│           DATABASE (PostgreSQL su Supabase)          │
│                                                      │
│  tabella: shared_feed                               │
│    - id, timestamp, category, data (JSONB)          │
│                                                      │
│  tabella: feed_history (futuro)                     │
│    - storico aggiornamenti per trend analysis        │
└─────────────────────────────────────────────────────┘
```

---

## 4. Implementazione backend — dettaglio

### Struttura progetto Node.js + Vercel Functions

```
sentinel/
├── src/                    # React frontend (invariato)
├── api/                    # Vercel Functions (Node.js)
│   ├── feed.js             # GET /api/feed (dati cached)
│   ├── analyze/
│   │   ├── redteam.js      # POST /api/analyze/redteam
│   │   ├── disinfo.js      # POST /api/analyze/disinfo
│   │   └── ...
│   └── _lib/
│       ├── claude.js       # wrapper Claude API
│       └── cache.js        # Vercel KV / Upstash
├── vercel.json             # config cron + routes
└── package.json
```

### Cron job (Vercel Cron — equivalente APScheduler)
```json
// vercel.json
{
  "crons": [
    { "path": "/api/refresh-feed", "schedule": "*/30 * * * *" }
  ]
}
```

### Job scheduler — logica principale

```python
# scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from services.claude import call_claude
from services.cache import save_feed
from datetime import datetime

SHARED_FEED_PROMPT = """
Sei un analista intelligence senior. Genera un aggiornamento 
situazionale globale realistico in JSON puro (no markdown).
Timestamp di riferimento: {timestamp}

Genera dati per queste categorie:
{{
  "threat_map": [
    {{"id": int, "label": str, "type": str, "level": "CRITICAL|HIGH|MEDIUM|LOW",
      "x": int, "y": int, "actors": str}}
    // 8-10 hotspot geopolitici attivi e realistici
  ],
  "chokepoints": [
    {{"id": str, "name": str, "risk": str, "flow": str, 
      "tension": str, "active_threats": [str]}}
    // 6 chokepoint principali con status attuale
  ],
  "oil_incidents": [
    {{"id": str, "name": str, "country": str, "risk": str, 
      "incident": str, "barrel": str}}
    // 5-7 asset/incidenti infrastrutture energetiche
  ],
  "bio_signals": [
    {{"id": str, "region": str, "signal": str, 
      "level": str, "confidence": int, "type": str}}
    // 4-5 segnali epidemiologici attivi
  ],
  "cti_feed": {{
    "actors": [...],  // 4 threat actor attivi con TTP
    "iocs": [...]     // 5 IOC recenti
  }},
  "maritime_anomalies": [...]  // 5-6 vessel con anomalie
}}
"""

async def refresh_shared_intelligence():
    prompt = SHARED_FEED_PROMPT.format(timestamp=datetime.now().isoformat())
    result = await call_claude(prompt)
    await save_feed("shared_feed", result)
    print(f"Feed aggiornato: {datetime.now()}")

scheduler = AsyncIOScheduler()
scheduler.add_job(refresh_shared_intelligence, 'interval', minutes=30)
```

### Endpoint feed

```python
# routes/feed.py
from fastapi import APIRouter
from services.cache import get_feed

router = APIRouter()

@router.get("/api/feed")
async def get_shared_feed():
    """Tutti gli utenti chiamano questo endpoint.
    Restituisce il JSON cached, aggiornato ogni 30min."""
    data = await get_feed("shared_feed")
    return data

@router.get("/api/feed/status")
async def get_feed_status():
    """Timestamp ultimo aggiornamento."""
    return await get_feed("shared_feed_meta")
```

### Endpoint analyze (Layer 2)

```python
# routes/analyze.py
from fastapi import APIRouter, Header, HTTPException
from services.claude import call_claude_with_key

router = APIRouter()

@router.post("/api/analyze/redteam")
async def analyze_redteam(
    payload: RedTeamRequest,
    x_api_key: str = Header(None)
):
    """Usa la chiave API dell'utente — zero costi per la piattaforma."""
    if not x_api_key:
        raise HTTPException(401, "API key required")
    result = await call_claude_with_key(
        key=x_api_key,
        prompt=build_redteam_prompt(payload)
    )
    return result

# Stessa struttura per /analyze/disinfo, /analyze/osint, ecc.
```

---

## 5. Roadmap rivista

| Fase | Stato | Obiettivo |
|---|---|---|
| **v0.5** | ✅ Completato | 13 tool mock, deploy Vercel |
| **v0.6** | ✅ Completato | AI live su tutti Layer 2, refactor modulare |
| **v0.7** | ✅ Completato | Global API key context, AI su Layer 1, IntelReport, 17 tool |
| **v0.8** | 🔜 Prossimo | Backend Node.js Vercel Functions + cron feed Layer 1 |
| **v0.9** | Futuro | Dati reali (AIS, TLE, OTX) |
| **v1.0** | Futuro | Demo commerciale, contatti istituzionali |

---

## 6. Fonti dati reali per Layer 1 (future integrazioni)

| Tool | Fonte | Costo |
|---|---|---|
| Maritime | AISStream.io | Free tier disponibile |
| Satellite | Space-Track.org + sgp4 | Gratuito |
| Bio-Threat | ProMED, WHO RSS | Gratuito |
| OSINT | NewsAPI | Free tier (100 req/day) |
| CTI | AlienVault OTX, MISP | Gratuito |
| Oil/Energy | EIA API (US Energy Info) | Gratuito |
| Chokepoint | MarineTraffic API | A pagamento (valutare) |
| Geopolitica | ACLED API (conflict data) | Gratuito per ricerca |

---

## 7. Istruzioni per Claude Code — prossimi passi (backend Node.js)

Quando inizi a lavorare sul backend (v0.8), la priorità è:

1. **Creare `api/feed.js`** come Vercel Function con dato mock inizialmente
2. **Creare `api/refresh-feed.js`** per il cron Vercel (ogni 30min → chiama Claude → salva su KV)
3. **Creare `api/_lib/claude.js`** wrapper Claude API lato server
4. **Creare `api/_lib/kv.js`** wrapper Vercel KV (Upstash Redis)
5. **Collegare il frontend**: aggiungere `useFeed()` hook che chiama GET /api/feed
6. **Sostituire progressivamente** i dati mock nei Layer 1 tool

```javascript
// api/feed.js (Vercel Function)
import { kv } from '@vercel/kv';
export default async function handler(req, res) {
  const data = await kv.get('shared_feed');
  res.json(data ?? FALLBACK_MOCK_DATA);
}
```

```javascript
// src/hooks/useFeed.js (frontend)
export function useFeed() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/feed').then(r => r.json()).then(setData);
  }, []);
  return data;
}
```

Mantenere sempre un **fallback ai dati mock** nel frontend — la piattaforma deve sempre essere funzionante visivamente anche senza backend.

---

*Ultimo aggiornamento: Marzo 2026 — v0.7 — 17 tool, global API key context, Node.js Vercel Functions per backend*
*Documento: ARCHITECTURE.md*
