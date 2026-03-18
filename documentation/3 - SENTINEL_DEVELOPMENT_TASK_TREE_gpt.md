
# SENTINEL_DEVELOPMENT_TASK_TREE.md

Agent‑based development roadmap.

> **Stato aggiornato: Marzo 2026 — v0.8**
> La piattaforma ha completato le fasi frontend (Blocchi E/F/G/H). Il prossimo step è la Fase 1 backend (Node.js + Vercel Functions).
> Stack backend scelto: **Node.js + Vercel Functions** (non Python FastAPI).

---

# ✅ FASE 0 — Frontend completo (COMPLETATA v0.8)

Tool implementati (19 totali = 18 intel + Workspace):
- [x] Home dashboard con live feed cliccabile
- [x] Threat Map + AI on-demand per hotspot + prefill export per IntelReport
- [x] Red Team Scenario Generator — MITRE ATT&CK heatmap 11 tattiche + kill chain animata 7 fasi
- [x] OSINT Correlator (AI live)
- [x] Disinformation Detector — barchart 7gg×4 piattaforme + sparkline spread velocity
- [x] Maritime Anomaly Tracker + AI on-demand + prefill export
- [x] Satellite Pass Planner — ground track SVG sinusoidale + terminatore giorno/notte + countdown
- [x] Pattern-of-Life Analyzer (AI live)
- [x] PSYOP Content Analyzer — radar chart esagonale 6 assi + barre demografiche
- [x] Bio-Threat Early Warning — mappa SVG mondo + gauge R₀ + timeline 7gg multi-segnale
- [x] Cyber Threat Intelligence — IOC donut chart + threat-level bar + prefill export
- [x] Multilingual Battlefield Translator (AI live + mock fallback)
- [x] Oil Infrastructure Monitor + AI on-demand
- [x] Strategic Chokepoint Monitor + AI on-demand
- [x] Energy Supply Chain Risk — radial network SVG + grouped bar compare
- [x] Energy Grid Resilience Simulator + AI cascade on-demand
- [x] **Intelligence Report Generator** — tabbed output 4 tab + 3 KPI cards + "Import from →" prefill dropdown
- [x] **Scenario Builder** (AI live — wizard 3 step: setup, domain events, cascade/escalation analysis)
- [x] **Workspace** — session log di tutte le analisi, export JSON, storage inspector

UX e navigazione (Blocco G):
- [x] URL hash routing (`#threatmap`, `#cti` etc.) con browser back/forward
- [x] Tasto `?` apre pannello shortcut help
- [x] Nav hamburger collassabile <860px
- [x] Breadcrumb `← Home` + tool name con accent color

Live feed e session (Blocco H):
- [x] FEED_POOL 17 voci — alert iniettato ogni ~90s nella notification bell
- [x] NotificationBell ora stateful (liveNotifs prop da AppInner)
- [x] Workspace: session log con timestamp relativo + excerpt analisi + link diretto al tool
- [x] Export Session JSON: scarica tutte le chiavi `sentinel_*` localStorage come JSON strutturato
- [x] IntelReport "Import from →": dropdown 5 tool, legge `sentinel_prefill_{id}`, auto-seleziona domini
- [x] `useLastAnalysis.stamp(excerpt?)` esteso per salvare `sentinel_excerpt_{toolId}`

Infrastruttura AI frontend:
- [x] Global API Key — React Context (in-memory, no localStorage)
- [x] ApiKeyBanner in App.jsx (banner persistente, password field)
- [x] `useApiKey()` hook usato da tutti i tool
- [x] Messaggio "Set API key in the banner above" in tutti i tool

Da fare (frontend — bassa priorità, pre-backend):
- [ ] AI Copilot — chat globale trasversale (stand-by)
- [ ] Export PDF reale (Puppeteer serverless)
- [ ] Responsive mobile completo

---

# PHASE 1 — Platform Foundations (Node.js Backend)

Backend:
- Setup Vercel Functions project structure (`api/` folder)
- API routing
- Logging (Vercel built-in)

Database:
- Vercel KV (Upstash Redis) per cache feed
- PostgreSQL Supabase per storico (futuro)

Cache:
- Vercel KV integration
- caching layer per shared feed

---

# PHASE 2 — Data Ingestion (Layer 1 Feed)

Collectors (Node.js):
- Cron Vercel ogni 30min → chiama Claude → salva su KV
- RSS news feeds (futuro)
- AIS maritime feeds (AISStream.io)

Tasks:
- data normalization
- metadata extraction
- raw storage su KV

---

# PHASE 3 — Event Processing

Tasks:
- entity extraction
- event classification
- event storage

Tools:
- Claude API (già integrato)
- futuro: spaCy via microservice

---

# PHASE 4 — Knowledge Graph

Tasks:
- build entity graph
- link events
- compute relationship strength

---

# PHASE 5 — Analytics

Tasks:
- risk scoring
- temporal pattern detection
- event correlation

---

# PHASE 6 — AI Integration

Tasks:
- [x] LLM interface (già completato frontend)
- LangChain integration (futuro lato Node)
- AI copilot (stand-by, bassa priorità)

Reports:
- [x] automated intelligence briefs (IntelReport tool)
- [x] PDF export via window.print()
- [ ] PDF export reale (Puppeteer serverless)

---

# PHASE 7 — Advanced Features

Tasks:
- narrative analysis
- predictive models
- [x] scenario simulations (Scenario Builder tool — completato v0.8)

---

# PHASE 8 — Expansion

Tasks:
- early warning system
- infrastructure monitoring

---

Long term outcome:

AI‑assisted geopolitical intelligence platform
