
# git-for-healthcare
# Unified Health Intelligence Platform (UHIP)
**aka "Git for Healthcare + Pre-Hospital AI Coordination"**

This repo is a **cloud-native web platform** MVP (hackathon-ready) with:
- **React + Vite** frontend (PWA, mobile-first, RBAC routing)
- **Node.js + Express** backend (REST + JWT + Socket.IO alerts)
- **Python FastAPI** AI microservice (rule-based + ML-ready hybrid)
- **PostgreSQL** for structured EHR/consent/audit/versioning
- **MongoDB** for media (photos, scans, voice notes metadata)

> Overlay system only: does **not replace** hospital EHR. Includes stub **FHIR adapter routes** for future Epic/SMART-on-FHIR integration.

## Architecture
```mermaid
flowchart LR
  subgraph Client
    L[Landing] -->|role| Login[Login Pages]
    Login --> App[RBAC App Shell]
  end

  subgraph Backend["Node.js API (Express)"]
    Auth[Auth + JWT] --> ConsentMW[Consent Middleware]
    ConsentMW --> EHR[EHR Versioning + Diff Engine]
    ConsentMW --> Alerts[Alerts + Socket.IO]
    ConsentMW --> FHIR[FHIR Adapters / API Gateway (stub)]
    EHR --> PG[(PostgreSQL)]
    Alerts --> PG
    ConsentMW --> Mongo[(MongoDB)]
  end

  subgraph AI["FastAPI AI Service"]
    Model[Rule+ML Hybrid]
  end

  App -->|REST| Backend
  App -->|WebSocket| Alerts
  Backend -->|/ai/predict| AI
```

## Quickstart (Docker)
Prereqs: Docker + Docker Compose

```bash
docker compose up --build
```

URLs:
- Frontend: http://localhost:5173
- Backend:  http://localhost:8080
- AI:       http://localhost:8000
- Postgres: localhost:5432 (user/pass/db in compose)
- Mongo:    localhost:27017

## Demo Credentials (Seeded)
### Doctor
- Hospital ID: `HOSP-001`
- Password: `doctor123`

### Pre-Med
- Ambulance ID: `AMB-007`
- Staff code: `premed123`

### Patient (Mock OTP)
- Phone / MRN / National ID: `9999999999`
- OTP: `123456`

## MVP Demo Script (5–8 minutes)
1. **Landing** → pick role
2. **Doctor login** → search patient by UHID: `UHID-0001`
3. Open patient → view **timeline** + **version tree**
4. Open encounter → compare versions using **diff viewer** (green/yellow/red)
5. Create **new visit version commit** (adds/changes fields) → observe new commit + diff
6. Switch to **Pre-Med** (mobile view) → submit ambulance case with vitals/symptoms
7. AI predicts high risk → backend triggers **ER pre-alert** → **Doctor dashboard banner + real-time alert**
8. Switch to **Patient** → unified timeline across hospitals, **consent toggle**, access logs
9. Show **audit log** entries for reads/writes + consent enforcement

## Key Concepts
### Git-like EHR versioning
- No overwrites: each update creates a new `ehr_versions` row
- Parent pointers: `parent_version_id` forms a commit chain
- Diffs stored as computed JSON categorization (new/modified/missing)

### Consent-driven sharing
- Consent table maps **patient → hospital** permissions
- Middleware blocks cross-hospital access unless consent exists or **emergency override** is active
- Every access logged in `access_logs`

### Interoperability stubs
- `/fhir/patient/:id`
- `/fhir/encounter/:id`
- `/fhir/observation/:id`
Adapters convert internal schema ↔ FHIR JSON (minimal mapping for MVP).

## Repo Structure
```
frontend/            # React + Vite + Tailwind + PWA
backend/             # Express REST API + Socket.IO
ai/                  # FastAPI AI service
db/                  # Postgres SQL migrations + seed
docker-compose.yml
```

## Dev (without Docker)
### Postgres + Mongo locally
Use docker compose for databases only:
```bash
docker compose up postgres mongo
```

### Backend
```bash
cd backend
cp .env.example .env
npm i
npm run dev
```

### AI
```bash
cd ai
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm i
npm run dev
```
## Notes / Next Steps
- Replace mock OTP with real provider
- Add SMART-on-FHIR OAuth and Epic gateway
- Improve diff UX (field-level, inline text diffs, attachments)
- Add encryption at rest using KMS + envelope encryption for PII columns
 fb37ede (Initial commit: UHIP MVP with versioned EHR and AI triage)
