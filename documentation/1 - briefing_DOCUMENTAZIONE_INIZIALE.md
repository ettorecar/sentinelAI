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
| Frontend | React + Vite (no Tailwind — inline styles) |
| Backend (futuro) | Node.js + Vercel Functions (serverless) |
| AI/LLM | Anthropic Claude API (claude-sonnet-4-20250514) |
| AI orchestration | Nativa React (context) — futuro: LangChain lato Node |
| Database | PostgreSQL su Supabase (futuro) |
| Cache | Redis (futuro) |
| Deploy frontend | Vercel (free tier) |
| Deploy backend | Vercel Functions (serverless, stesso progetto) |

> **Nota architetturale:** la decisione è di restare su **Node.js + Vercel Functions** anziché passare a Python FastAPI, per semplicità di deploy e coerenza dello stack JavaScript.

---

## 3. Stato attuale — v0.8 (Marzo 2026)

La piattaforma è una **React SPA modulare** con **19 tool** implementati (+ Workspace).
Frontend-only (no backend). API key Claude inserita dall'utente tramite banner globale (in-memory, non persistita).

### Tool implementati

| # | Tool | Stato | AI | Modulo |
|---|---|---|---|---|
| 1 | 🌍 **Threat Map** | Mock + AI on-demand | ✅ AI click su hotspot | Core |
| 2 | 🤖 **Red Team Scenario Generator** | ✅ AI live | ✅ MITRE heatmap + kill chain animata | Core |
| 3 | 🔍 **OSINT Correlator** | ✅ AI live | ✅ Entity correlation | Core |
| 4 | 📰 **Disinformation Detector** | ✅ AI live | ✅ Barchart 7gg + sparkline velocità | Core |
| 5 | 🌊 **Maritime Anomaly Tracker** | Mock + AI on-demand | ✅ AI analisi vessel + prefill export | Core |
| 6 | 🛰️ **Satellite Pass Planner** | Mock + AI on-demand | ✅ Ground track SVG + countdown | Core |
| 7 | 📍 **Pattern-of-Life Analyzer** | ✅ AI live | ✅ Ricostruzione spazio-temporale | Core |
| 8 | 🧠 **PSYOP Content Analyzer** | ✅ AI live | ✅ Radar chart 6 assi + barre demografiche | Core |
| 9 | 🦠 **Bio-Threat Early Warning** | Mock + AI on-demand | ✅ Mappa SVG + gauge R₀ + timeline | Core |
| 10 | 🔐 **Cyber Threat Intelligence** | Mock + AI on-demand | ✅ Donut IOC + threat bar + prefill export | Core |
| 11 | 🌐 **Multilingual Battlefield Translator** | Mock + AI on-demand | ✅ AI translation+analysis | Core |
| 12 | 🛢️ **Oil Infrastructure Monitor** | Mock + AI on-demand | ✅ AI threat assessment | Energy |
| 13 | 🚢 **Strategic Chokepoint Monitor** | Mock + AI on-demand | ✅ AI geopolitical analysis | Energy |
| 14 | 📊 **Energy Supply Chain Risk** | ✅ AI live | ✅ Radial network + grouped bar + compare | Energy |
| 15 | ⚡ **Energy Grid Resilience Simulator** | Mock + AI on-demand | ✅ AI cascade analysis | Energy |
| 16 | 📋 **Intelligence Report Generator** | ✅ AI live | ✅ Tabbed output + 3 KPI + import prefill | Report |
| 17 | 🎯 **Scenario Builder** | ✅ AI live | ✅ Wizard 3-step, cascade/escalation | Report |
| 18 | 🗂️ **Workspace** | Session locale | — Session log + export JSON | Session |
| 19 | 🏠 **Home Dashboard** | Live feed cliccabile | — | — |

### Architettura AI attuale
- **Global API Key:** React Context (in-memory, no localStorage). Banner fisso in alto con campo password. Tutti i tool leggono la chiave dal context via `useApiKey()`.
- **Layer 2 tools** (usano input utente): RedTeam, OSINT, Disinfo, PatLife, PSYOP, EnergyRisk, IntelReport, ScenarioBuilder — generazione AI completa
- **Layer 1 tools** (dati mock + AI on-demand): ThreatMap, Maritime, Satellite, BioThreat, CTI, OilInfra, Chokepoint, EnergyGrid — pulsante "🤖 AI Analysis" sul dettaglio selezionato

### Aggiunte UX v0.8 (Blocchi E/F/G/H)
- **Blocco G:** URL hash routing (`#threatmap` etc), tasto `?` shortcut help, nav hamburger <860px, breadcrumb con `← Home`
- **Blocco E:** Visualizzazioni SVG avanzate in Disinfo, PSYOP, BioThreat, EnergyRisk (barchart, radar, mappa mondo, radial network)
- **Blocco F:** MITRE ATT&CK heatmap + kill chain (RedTeam), ground track + countdown (Satellite), IOC donut (CTI), report tabbed + KPI (IntelReport)
- **Blocco H:** Live alert feed 17 voci ogni ~90s (bell), Workspace page con session log, IntelReport "Import from →" prefill, Export Session JSON

---

## 4. Roadmap aggiornata

### ✅ Fase 1 — Completamento mock e polish visivo (COMPLETATA v0.7)
- [x] Tool: Energy Grid Resilience Simulator
- [x] Tool: Multilingual Battlefield Comms Translator
- [x] Tool: Intelligence Report Generator
- [x] Export Report via window.print()
- [x] Global API key (in-memory context)
- [x] AI su tutti i Layer 1 tool (click on-demand)
- [x] Feed Home cliccabile con navigazione ai tool

### ✅ Fase 1b — UX & Visualizzazioni avanzate (COMPLETATA v0.8)
- [x] **Blocco G** — URL hash routing, shortcut help `?`, nav hamburger <860px, breadcrumb
- [x] **Blocco E** — SVG avanzati: barchart Disinfo, radar PSYOP, mappa BioThreat, radial EnergyRisk
- [x] **Blocco F** — MITRE heatmap + kill chain (RedTeam), ground track SVG (Satellite), IOC donut (CTI), tabbed report + KPI (IntelReport)
- [x] **Blocco H** — Live alert feed ~90s, Workspace session log, IntelReport prefill import, Export Session JSON
- [x] Tool: Scenario Builder (wizard 3-step, cascade/escalation)
- [x] SplashScreen con input API key
- [x] 19 tool totali (18 intel + Workspace)

### ⏳ Da fare prima del backend (frontend-only)
- [ ] **AI Copilot** — chat globale trasversale a tutti i tool (stand-by, bassa priorità)
- [ ] Responsive mobile completo
- [ ] Export PDF reale (Puppeteer o react-pdf)

### 🔜 Fase 2 — Backend Node.js + Vercel Functions
- Serverless functions per Layer 1 (dati aggiornati AI ogni 30min, cachati)
- Endpoint `/api/feed` con APScheduler-equivalent (cron Vercel)
- Endpoint `/api/analyze/*` proxy sicuro verso Claude (chiave lato server)
- KV store (Vercel KV / Upstash Redis) per cache
- Struttura: monorepo `src/` (React) + `api/` (Vercel Functions Node)

### 🔜 Fase 3 — Dati reali
- Maritime: AIS feed (AISStream.io)
- Satellite: TLE da Space-Track.org + sgp4
- Bio-Threat: ProMED, WHO RSS
- CTI: AlienVault OTX, MISP feed
- Oil/Energy: EIA API
- Chokepoint: MarineTraffic API

### 🔜 Fase 4 — Prodotto commerciale v1.0
- Autenticazione JWT
- Dashboard multi-utente
- Export PDF reale
- Audit log
- Sistema licenze

---

## 5. Struttura file del progetto

```
sentinel/
├── documentation/       ← 4 file di briefing e architettura
├── public/
├── src/
│   ├── main.jsx
│   ├── App.jsx          ← routing, navbar, ApiKeyBanner
│   ├── constants.js     ← NAV, TOOL_DESC, ENERGY_IDS
│   ├── context/
│   │   └── ApiKeyContext.jsx  ← useState in-memory, useApiKey() hook
│   ├── components/
│   │   └── shared.jsx   ← BADGE, Card, Input, Btn, ST, MockBadge, LiveBadge, etc.
│   └── tools/           ← 1 file per tool
│       ├── Home.jsx
│       ├── ThreatMap.jsx
│       ├── RedTeam.jsx
│       ├── Osint.jsx
│       ├── Disinfo.jsx
│       ├── Maritime.jsx
│       ├── Satellite.jsx
│       ├── PatLife.jsx
│       ├── Psyop.jsx
│       ├── BioThreat.jsx
│       ├── Cti.jsx
│       ├── Translator.jsx
│       ├── OilInfra.jsx
│       ├── Chokepoint.jsx
│       ├── EnergyRisk.jsx
│       ├── EnergyGrid.jsx
│       ├── IntelReport.jsx
│       ├── ScenarioBuilder.jsx
│       └── Workspace.jsx
└── package.json
```

---

## 6. Workflow di sviluppo

```
GitHub repo (sentinelAI)
    ↓ push su branch claude/...
Vercel (deploy automatico su ogni push)
    ↓ URL pubblico aggiornato in ~30 secondi
Claude Code (legge i file dal repo)
    ↓ modifica src/
git push → Vercel deploya
```

### Istruzioni per nuova sessione Claude Code

Fornire in apertura:
1. Il link al repo GitHub o i 4 file in `documentation/`
2. Il messaggio: "Siamo alla v0.7 con 17 tool. Leggi i 4 file doc per il contesto. Voglio [descrizione task]."

---

## 7. Note commerciali e strategia

- Target primario: contractor difesa, agenzie governative, NATO-affiliated, aziende energetiche strategiche
- Go-to-market: demo funzionante → contatto diretto → licenza o acquisizione
- Differenziatori chiave: AI nativa in ogni analisi, modularità (Core + Energy + Report), zero costi fissi lato piattaforma (API key utente)
- Il modulo Energy (tool 12-15) + Report Generator aggiunge verticali concreti per governi e aziende energetiche

---

*Ultimo aggiornamento: Marzo 2026 — v0.8 — 19 tool (Core + Energy + Report + Session)*
