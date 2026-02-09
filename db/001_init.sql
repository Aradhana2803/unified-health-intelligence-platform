-- Unified Health Intelligence Platform schema (MVP)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uhid TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  dob DATE,
  sex TEXT,
  phone TEXT,
  national_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('doctor','patient','premed','admin')),
  hospital_id UUID REFERENCES hospitals(id),
  patient_id UUID REFERENCES patients(id),
  login_id TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS encounters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  encounter_type TEXT NOT NULL DEFAULT 'OPD',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

-- Versioned EHR snapshots (Git commits)
CREATE TABLE IF NOT EXISTS ehr_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  encounter_id UUID NOT NULL REFERENCES encounters(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  parent_version_id UUID REFERENCES ehr_versions(id),
  commit_message TEXT NOT NULL,
  data_json JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stored categorized diffs (optional caching)
CREATE TABLE IF NOT EXISTS ehr_diffs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_version_id UUID NOT NULL REFERENCES ehr_versions(id),
  to_version_id UUID NOT NULL REFERENCES ehr_versions(id),
  diff_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_version_id, to_version_id)
);

-- Consent: patient grants hospital access
CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  granted BOOLEAN NOT NULL DEFAULT true,
  scope TEXT NOT NULL DEFAULT 'ehr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(patient_id, hospital_id, scope)
);

CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES users(id),
  actor_role TEXT,
  patient_id UUID REFERENCES patients(id),
  hospital_id UUID REFERENCES hospitals(id),
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id UUID,
  decision TEXT NOT NULL, -- allowed/blocked/emergency_override
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ambulance_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ambulance_id TEXT NOT NULL,
  staff_code TEXT,
  patient_uhid TEXT,
  payload_json JSONB NOT NULL,
  ai_result_json JSONB,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id),
  hospital_id UUID REFERENCES hospitals(id),
  case_id UUID REFERENCES ambulance_cases(id),
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  acked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
