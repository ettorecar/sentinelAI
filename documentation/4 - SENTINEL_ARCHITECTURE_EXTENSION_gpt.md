
# SENTINEL_ARCHITECTURE_EXTENSION.md
Architecture Extension Document

This document extends the architecture defined in BRIEFING.md.
It does not replace or modify the original technology stack.

Original stack (unchanged):
- Frontend: React + Vite
- Backend: Python FastAPI
- Database: PostgreSQL (Supabase)
- Cache: Redis
- AI orchestration: LangChain
- Data stack: Python (Pandas, GeoPandas, NLP tools)

---

# 1. System Architecture Overview

Frontend (React)
↓
API Gateway (FastAPI)
↓
Service Layer
    ├ Intelligence Services
    ├ Analytics Services
    ├ Data Ingestion Services
    ├ AI Orchestration Layer
↓
Data Layer
    ├ PostgreSQL
    ├ Redis
    ├ Object Storage

---

# 2. Data Pipeline Architecture

External Sources
↓
Collectors
↓
Normalization
↓
Event Extraction
↓
Event Database

Possible sources:
- News feeds
- RSS geopolitical sources
- AIS maritime feeds
- Cyber threat feeds
- Energy market feeds
- Airspace feeds (OpenSky Network, FAA NOTAM, EuroControl, ICAO)
- Open-source intelligence datasets

---

# 3. Event Processing Engine

Events are the fundamental unit of intelligence.

Event schema:

timestamp  
location  
actors  
category  
confidence  
source  
impact_score  

Event categories:
- military
- cyber
- energy
- shipping
- disinformation
- biosecurity

---

# 4. Knowledge Graph Architecture

Entities:
- people
- organizations
- ships
- infrastructure
- countries
- cyber actors

Relationships:
- operates
- owns
- connected_to
- located_in
- attacked

Possible technologies:
- networkx
- Neo4j (optional)

---

# 5. AI Orchestration Layer

User Query
↓
AI Copilot
↓
LangChain orchestration
↓
Tool access
↓
Knowledge retrieval
↓
Response generation

Capabilities:
- cross-module analysis
- automated reporting
- hypothesis generation
- reasoning over events

---

# 6. Intelligence Analytics Engine

Modules:
• Temporal analysis  
• Correlation engine  
• Risk scoring system  
• Scenario simulation  

---

# 7. Data Storage Strategy

PostgreSQL
• events
• entities
• relationships

Redis
• cache
• session storage

Object storage
• reports
• datasets

---

# 8. Long-Term Vision

AI‑assisted geopolitical intelligence system
