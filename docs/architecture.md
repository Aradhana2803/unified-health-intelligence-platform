# Unified Health Intelligence Platform (UHIP) — Architecture

UHIP is a cloud-native **overlay platform** that unifies patient history across hospitals, stores EHR updates as immutable versions (Git-like commits), enforces patient consent centrally, and enables pre-hospital (ambulance) AI triage with real-time hospital pre-alerts.

---

## 1) Why an Overlay (Not an EHR Replacement)

### Problem with replacing EHRs
Hospitals already run large EHR systems (Epic, Cerner, etc.) that are deeply integrated with billing, labs, scheduling, and compliance. Replacing them is:
- operationally risky
- expensive
- slow (multi-year rollouts)
- requires extensive certification and vendor integration

### Overlay approach (what UHIP does)
UHIP acts as an **intelligence + coordination layer**:
- pulls or receives clinical summaries / encounter snapshots
- stores them in a versioned, patient-centric timeline
- provides diff-based viewing across visits and hospitals
- enforces consent and audit logging
- supports emergency pre-alert workflows

**Key benefit:** hospitals keep their existing EHR; UHIP adds a unified view + versioning + coordination.

### Future interoperability
Because we’re an overlay, we can integrate via:
- HL7 FHIR APIs (Patient / Encounter / Observation)
- SMART-on-FHIR later (OAuth scopes, EHR launch context)
- Epic-ready gateway/adapters (without storing or replacing Epic data)

---

## 2) Why Versioning is Better Than Overwrite (Git-like EHR)

### Problem with overwrite
Traditional EHR updates often behave like "latest state":
- earlier content can be edited or overwritten
- it’s hard to understand what changed between visits
- auditors can’t easily reconstruct clinical evolution
- clinicians miss trends and missing follow-ups

### UHIP versioning model
Every encounter update creates a **new immutable version**:
- No overwrite of previous versions
- Each version is a "commit" containing structured EHR JSON
- Versions form a history chain/tree (supports branching if needed)

### Benefits
- **Traceability:** complete record evolution over time
- **Diff viewing:** show what changed since last visit
- **Clinical safety:** highlight missing follow-ups
- **Auditability:** supports compliance and medico-legal review

### Diff logic (high-level)
Given Version A and Version B:
- New fields in B → **green**
- Modified fields (A != B) → **yellow**
- Missing/expected follow-up fields (present earlier but absent later or rule-defined) → **red**

---

## 3) Central Consent Enforcement (How It Works)

### Problem
If data is shared across hospitals, consent must be enforced consistently:
- not left to each UI screen
- not duplicated across services
- must be logged for audit

### UHIP approach
Consent is enforced **in the backend API layer** using middleware:
1. User authenticates (JWT with role + subject id)
2. Every request for patient data goes through `consent middleware`
3. Middleware checks:
   - requester role (doctor/premed/patient/admin)
   - relationship (same patient, emergency case, hospital scope)
   - active consent record in `consents` table
4. Decision:
   - allow → continue request
   - deny → return 403 + log denial in `access_logs`

### Audit trail
All accesses are logged:
- who accessed what
- when
- why (purpose / emergency flag)
- result (allowed/denied)

This creates a single source of truth for compliance.

---

## 4) System Overview (Components)

### Frontend (React + PWA)
- Role-based routing:
  - Doctor dashboard
  - Patient dashboard
  - Pre-Med dashboard (mobile-first)
- Diff viewer UI
- Consent management UI
- Real-time alerts UI via WebSocket

### Backend (Node.js + Express/Nest-style structure)
- REST APIs for:
  - auth (JWT, OAuth-ready)
  - patients / encounters / versions
  - diffs
  - consents
  - access logs
  - ambulance cases
  - alerts
- WebSocket (Socket.IO) for ER pre-alert push
- Consent enforcement middleware
- FHIR adapter stubs (future: real mapping)

### AI Service (FastAPI)
- Input: symptoms, vitals, age, trauma_type
- Output:
  - emergency_class / emergency_type
  - confidence/probability
  - recommended_setup
  - urgency_score
- Current: hybrid rule engine (ML-ready for future training)

### Databases
- PostgreSQL: patients, encounters, versions, consents, logs, alerts, ambulance cases
- MongoDB: images/scans/voice notes (unstructured media)

---

## 5) End-to-End Data Flow

### A) Doctor workflow (EHR version + diff)
1. Doctor logs in → JWT issued
2. Doctor searches patient by UHID
3. Backend checks consent (unless doctor is viewing own hospital + permitted scope)
4. Backend returns timeline + encounters + version list
5. Doctor adds/updates visit → backend creates new `ehr_version` (commit)
6. Diff engine compares previous version vs new version → returns diff
7. Access is recorded in `access_logs`

### B) Pre-Med workflow (AI triage + alert)
1. Pre-Med logs in → JWT issued
2. Pre-Med submits vitals/symptoms + optional media
3. Backend stores ambulance case + calls AI service
4. AI returns risk classification + urgency score
5. If high risk → backend creates alert + pushes WebSocket event to hospital dashboard
6. Doctor acknowledges alert → stored as alert status update + logged

### C) Patient workflow (unified view + consent)
1. Patient logs in (OTP mock) → JWT issued
2. Patient views unified timeline across hospitals
3. Patient toggles consent (grant/revoke)
4. Future accesses by doctors/premed are allowed/denied based on consent
5. Patient can view access logs for transparency

---

## 6) Responsibilities (Who Owns What)

### Frontend
- Rendering role dashboards
- Collecting user inputs (visits, vitals, consent toggles)
- Showing diffs and timelines
- Receiving live alerts (WebSocket)

### Backend
- Source of truth for authorization, consent enforcement, auditing
- Versioning + diff computation orchestration
- Data aggregation across hospitals (overlay timeline)
- Alert routing + persistence

### AI Service
- Stateless inference service
- Produces triage outputs from ambulance inputs
- Does not store PHI by default (recommended design)

### Databases
- PostgreSQL: transactional + audit-friendly structured data
- MongoDB: unstructured media storage

---

## 7) Key Design Principles
- **Immutable clinical history:** append-only versioning
- **Consent by default:** enforced at API boundary
- **Audit everywhere:** every access and decision logged
- **Overlay, not replacement:** interoperability-first
- **Real-time emergency coordination:** WebSocket-driven alerts

