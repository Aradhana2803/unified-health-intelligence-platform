-- Seed hospitals
INSERT INTO hospitals (hospital_code, name)
VALUES
('HOSP-001', 'City General Hospital'),
('HOSP-002', 'Lakeside Specialty Center')
ON CONFLICT (hospital_code) DO NOTHING;

-- Seed patients
INSERT INTO patients (uhid, full_name, dob, sex, phone, national_id)
VALUES
('UHID-0001', 'Aarav Mehta', '1992-06-12', 'M', '9999999999', 'NID-1234'),
('UHID-0002', 'Sara Khan', '1986-11-03', 'F', '8888888888', 'NID-5678')
ON CONFLICT (uhid) DO NOTHING;

-- Seed users
-- Doctor (HOSP-001) password: doctor123 (bcrypt hash generated offline; for MVP we accept plaintext if hash is null)
INSERT INTO users (role, hospital_id, login_id, password_hash)
SELECT 'doctor', h.id, 'HOSP-001', '$2b$10$Xy.1QO8Q8bBf7b9zvQyQfOqzK6Qdlwq0xw2rX9y/7u4fPzD6qZ2vW'
FROM hospitals h WHERE h.hospital_code='HOSP-001'
ON CONFLICT (login_id) DO NOTHING;

-- Pre-med (ambulance)
INSERT INTO users (role, login_id, password_hash)
VALUES ('premed', 'AMB-007', '$2b$10$hP1kq9e7Uu6V9Jq0b7dGfOQKxK4p4e1s9w5z0lJk9QeQqBf7aY9bC')
ON CONFLICT (login_id) DO NOTHING;

-- Patient user (mock) links to UHID-0001
INSERT INTO users (role, patient_id, login_id, password_hash)
SELECT 'patient', p.id, '9999999999', NULL
FROM patients p WHERE p.uhid='UHID-0001'
ON CONFLICT (login_id) DO NOTHING;

-- Encounters + versions for UHID-0001 across two hospitals
WITH p AS (SELECT id FROM patients WHERE uhid='UHID-0001'),
     h1 AS (SELECT id FROM hospitals WHERE hospital_code='HOSP-001'),
     h2 AS (SELECT id FROM hospitals WHERE hospital_code='HOSP-002'),
     d AS (SELECT id FROM users WHERE login_id='HOSP-001')
INSERT INTO encounters (patient_id, hospital_id, encounter_type, started_at, created_by)
SELECT p.id, h1.id, 'ER', now() - interval '20 days', d.id FROM p,h1,d
UNION ALL
SELECT p.id, h2.id, 'OPD', now() - interval '7 days', d.id FROM p,h2,d
ON CONFLICT DO NOTHING;

-- Create initial EHR versions
DO $$
DECLARE
  enc1 UUID;
  enc2 UUID;
  pat UUID;
  hosp1 UUID;
  hosp2 UUID;
  doc UUID;
  v1 UUID;
BEGIN
  SELECT e.id INTO enc1 FROM encounters e
    JOIN patients p ON p.id=e.patient_id
    JOIN hospitals h ON h.id=e.hospital_id
    WHERE p.uhid='UHID-0001' AND h.hospital_code='HOSP-001'
    ORDER BY e.started_at ASC LIMIT 1;
  SELECT e.id INTO enc2 FROM encounters e
    JOIN patients p ON p.id=e.patient_id
    JOIN hospitals h ON h.id=e.hospital_id
    WHERE p.uhid='UHID-0001' AND h.hospital_code='HOSP-002'
    ORDER BY e.started_at ASC LIMIT 1;

  SELECT id INTO pat FROM patients WHERE uhid='UHID-0001';
  SELECT id INTO hosp1 FROM hospitals WHERE hospital_code='HOSP-001';
  SELECT id INTO hosp2 FROM hospitals WHERE hospital_code='HOSP-002';
  SELECT id INTO doc FROM users WHERE login_id='HOSP-001';

  INSERT INTO ehr_versions (encounter_id, patient_id, hospital_id, parent_version_id, commit_message, data_json, created_by, created_at)
  VALUES (enc1, pat, hosp1, NULL, 'Initial ER triage', '{"chief_complaint":"Chest pain","vitals":{"hr":110,"bp":"150/95","spo2":94},"assessment":"Rule out ACS","plan":["ECG","Troponin","O2"],"follow_up":"Cardiology consult"}', doc, now() - interval '20 days')
  RETURNING id INTO v1;

  INSERT INTO ehr_versions (encounter_id, patient_id, hospital_id, parent_version_id, commit_message, data_json, created_by, created_at)
  VALUES (enc1, pat, hosp1, v1, 'Repeat vitals + meds', '{"chief_complaint":"Chest pain","vitals":{"hr":98,"bp":"140/90","spo2":96},"assessment":"ACS unlikely","meds":["Aspirin"],"plan":["Repeat troponin"],"follow_up":"OPD in 1 week"}', doc, now() - interval '19 days');

  INSERT INTO ehr_versions (encounter_id, patient_id, hospital_id, parent_version_id, commit_message, data_json, created_by, created_at)
  VALUES (enc2, pat, hosp2, NULL, 'OPD follow-up', '{"chief_complaint":"Fatigue","vitals":{"hr":78,"bp":"120/80","spo2":98},"assessment":"Post-viral fatigue","plan":["Rest","Hydration"],"labs":["CBC","TSH"],"follow_up":"If persists 2 weeks"}', doc, now() - interval '7 days');
END $$;

-- Default consent: patient grants HOSP-001, denies HOSP-002 (demo toggle)
INSERT INTO consents (patient_id, hospital_id, granted, scope)
SELECT p.id, h.id, (h.hospital_code='HOSP-001'), 'ehr'
FROM patients p, hospitals h
WHERE p.uhid='UHID-0001'
ON CONFLICT (patient_id, hospital_id, scope)
DO UPDATE SET granted=EXCLUDED.granted, updated_at=now();
