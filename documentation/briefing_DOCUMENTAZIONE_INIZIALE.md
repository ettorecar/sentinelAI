# SENTINEL — AI-Powered Defence Intelligence Platform
## Project Briefing & Development Roadmap

---

## 1. Visione generale

SENTINEL è una piattaforma web multi-tool orientata alla **defence intelligence** e alla sicurezza dual-use. L'obiettivo è costruire un prodotto software completo, vendibile **una tantum o su licenza** a:

- Governi / forze armate
- Aziende di cybersecurity e contractor della difesa
- Agenzie di intelligence civile
- Think tank e centri di ricerca strategica
- Organizzazioni NATO-affiliated

Il valore differenziale rispetto ai competitor è l'**integrazione nativa di AI (LLM)** in ogni tool, che rende l'analisi più veloce, accessibile e scalabile rispetto a soluzioni enterprise esistenti.

**Autore:** sviluppatore indipendente con background in Java Spring Boot, Python/PySpark, GameMaker Studio 2.

---

## 2. Stack tecnologico scelto

| Layer | Tecnologia |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend (futuro) | Python FastAPI |
| AI/LLM | Anthropic Claude API (o OpenAI, astraibile) |
| AI orchestration | LangChain (futuro) |
| Geo/Data | GeoPandas, Shapely, Pandas (futuro) |
| NLP | spaCy / HuggingFace (futuro) |
| Database | PostgreSQL su Supabase (futuro) |
| Cache | Redis (futuro) |
| Deploy frontend | Vercel (free tier per ora) |
| Deploy backend | Railway o Render (futuro) |

---

## 3. Stato attuale — MVP v0.5

La piattaforma è una **React SPA** (single file `App.jsx`) con **13 tool** implementati.
Attualmente **tutto è frontend-only**, senza backend né database.
Un tool è **AI live** (chiama Claude API direttamente dal browser), gli altri sono **mock con dati hardcodati**.

### Tool implementati

| # | Tool | Stato | AI | Modulo |
|---|---|---|---|---|
| 1 | 🌍 **Threat Map** | Mock | ❌ | Core |
| 2 | 🤖 **Red Team Scenario Generator** | ✅ Funzionante | ✅ Live (Claude API) | Core |
| 3 | 🔍 **OSINT Correlator** | Mock | ❌ | Core |
| 4 | 📰 **Disinformation Detector** | Mock | ❌ | Core |
| 5 | 🌊 **Maritime Anomaly Tracker** | Mock | ❌ | Core |
| 6 | 🛰️ **Satellite Pass Planner** | Mock | ❌ | Core |
| 7 | 📍 **Pattern-of-Life Analyzer** | Mock | ❌ | Core |
| 8 | 🧠 **PSYOP Content Analyzer** | Mock | ❌ | Core |
| 9 | 🦠 **Bio-Threat Early Warning** | Mock | ❌ | Core |
| 10 | 🔐 **Cyber Threat Intelligence** | Mock | ❌ | Core |
| 11 | 🛢️ **Oil Infrastructure Monitor** | Mock | ❌ | Energy |
| 12 | 🚢 **Strategic Chokepoint Monitor** | Mock | ❌ | Energy |
| 13 | 📊 **Energy Supply Chain Risk** | Mock | ❌ | Energy |

### Funzionalità UI implementate
- Navbar con routing tra tool, tab energy in arancione, badge "🛢️ ENERGY"
- Indicatore "3 CRITICAL" lampeggiante rosso in navbar
- **Home dashboard:** live feed, threat gauge SVG con gradiente, status bar operativo, sezione Energy Module in evidenza, griglia tool
- **Threat Map:** mappa SVG mondiale con 10 hotspot animati (pulse CRITICAL), click per dettaglio
- **Maritime:** mappa SVG Mediterraneo interattiva, vessel selezionabili, sincronizzata con tabella
- **OSINT:** grafo SVG entità con nodi, connessioni e color-coding rischio
- **Disinfo:** barre di intensità per tecniche rilevate
- **Bio-Threat:** sparkline trend 7 giorni per ogni alert, espansione click
- **CTI:** mini bar chart attività 7 giorni per threat actor, filtro per livello
- **Pattern-of-Life:** heatmap attività settimanale
- **Red Team:** attack timeline visiva a fasi con connettori e colori
- **Satellite:** orbita SVG animata con due satelliti in movimento, timeline 24h
- **Oil Infrastructure:** mappa SVG globale con 7 asset, click per dettaglio, filtro risk, incident log
- **Chokepoint Monitor:** mappa mondiale 6 chokepoint animati, sparkline flusso 7gg, barra tensione, rotta alternativa con costi
- **Energy Risk Analyzer:** donut chart fornitori colorato per rischio, score resilienza, scenari disruption con impatto GDP, esposizione chokepoint per 8 paesi

---

## 4. Roadmap — Cosa resta da fare

### Fase 1 — Completamento mock e polish visivo (frontend only)
- [ ] Aggiungere tool: **Energy Grid Resilience Simulator** (grafico rete elettrica SVG)
- [ ] Aggiungere tool: **Multilingual Battlefield Comms Translator** (UI traduzione)
- [ ] Migliorare Threat Map: filtri per tipo, timeline slider
- [ ] Funzionalità **Export Report PDF** (mock) — fondamentale per demo commerciale
- [ ] **Schermata di login / splash** per dare aspetto di prodotto finito
- [ ] Responsive mobile
- [ ] Dark/light mode toggle

### Fase 2 — AI live su tutti i tool
Priorità di implementazione suggerita:

1. **Disinfo Detector** → LLM analizza testo libero, classifica tecniche e produce attribution
2. **PSYOP Analyzer** → LLM identifica pattern in testo/trascrizioni
3. **OSINT Correlator** → LLM estrae entità da testo libero e popola il grafo
4. **Bio-Threat** → LLM aggrega testo da feed e classifica segnali
5. **Pattern-of-Life** → LLM analizza dati open-source e ricostruisce routine
6. **Energy Risk** → LLM genera scenari di disruption personalizzati
7. **Oil Infrastructure** → LLM analizza report di incidenti e aggiorna threat level
8. **Maritime** → anomaly detection su feed AIS reale
9. **Satellite** → calcolo reale da TLE (Space-Track API, libreria sgp4)

### Fase 3 — Backend Python FastAPI
- Setup progetto FastAPI
- Endpoint `/api/redteam` (migrazione da frontend)
- Endpoint `/api/disinfo`, `/api/osint`, `/api/energy`
- Integrazione LangChain per orchestrazione LLM
- Rate limiting e gestione API key sicura (chiave non più nel browser)

### Fase 4 — Dati reali
- **Maritime:** feed AIS reale (AISStream.io — free tier disponibile)
- **Satellite:** TLE da Space-Track.org + libreria `sgp4` per calcolo passaggi
- **Bio-Threat:** aggregazione ProMED, WHO RSS, news feed
- **OSINT:** NewsAPI, Telegram public channels, scraping fonti aperte
- **CTI:** feed MISP, AlienVault OTX (gratuiti)
- **Oil/Energy:** feed prezzi petrolio (EIA API, gratuita), AIS per tanker tracking
- **Chokepoint:** dati traffico marittimo reale (MarineTraffic API)

### Fase 5 — Prodotto commerciale
- Sistema di autenticazione (JWT)
- Dashboard multi-utente / multi-organizzazione
- Sistema licenze (one-time / subscription)
- Export report PDF reale (WeasyPrint o Puppeteer)
- Audit log delle analisi
- White-label per rivendita a contractor

---

## 5. Struttura file del progetto

```
sentinel/
├── BRIEFING.md          ← questo file
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.jsx
    └── App.jsx          ← intera piattaforma (single file per ora)
```

### package.json
```json
{
  "name": "sentinel-platform",
  "version": "0.5.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0"
  }
}
```

---

## 6. Workflow di sviluppo consigliato

```
GitHub repo (sentinel)
    ↓ push
Vercel (deploy automatico su ogni push)
    ↓ URL pubblico aggiornato in ~30 secondi
Claude Code (legge i file dal repo)
    ↓ modifica App.jsx
git push → Vercel deploya
```

### Istruzioni per nuova sessione Claude / Claude Code

Quando inizi una nuova sessione, fornisci:
1. Il file `App.jsx` (o il link al repo GitHub)
2. Questo file `BRIEFING.md`
3. Il messaggio iniziale:

```
Questo è il progetto SENTINEL, una piattaforma defence intelligence in React.
Leggi BRIEFING.md per il contesto completo.
Siamo alla v0.5 con 13 tool. Il codice attuale è in App.jsx.
[descrivi cosa vuoi fare in questa sessione]
```

---

## 7. Note commerciali e strategia

- Il prodotto è pensato per essere venduto **una tantum o su licenza** a enti pubblici/privati
- Target primario: contractor difesa, agenzie governative, NATO-affiliated org, aziende energetiche strategiche
- La strategia è avere una **piattaforma ombrello** con moduli tematici (Core Intelligence + Energy Module + eventuali futuri moduli)
- Differenziatore chiave: **AI nativa** in ogni analisi, non disponibile nei tool esistenti a prezzi accessibili
- Approccio go-to-market: demo funzionante → contatto diretto con potenziali acquirenti → licenza o acquisizione
- Il modulo Energy (tool 11-13) aggiunge un verticale molto concreto e appetibile per governi e aziende energetiche

---

*Ultimo aggiornamento: Marzo 2026 — v0.5 — 13 tool (Core + Energy Module)*
