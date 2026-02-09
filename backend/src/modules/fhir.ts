import { Router } from 'express';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { requireAuth, requireRole, enforceConsent, AuthedRequest } from '../lib/middleware.js';

export const fhirRouter = Router();

/**
 * Minimal FHIR adapter stubs (MVP)
 * Future: SMART-on-FHIR, Epic-ready gateway, full resource mapping.
 */

fhirRouter.get('/patient/:patientId', requireAuth, async (req: AuthedRequest, res) => {
  const { patientId } = z.object({ patientId: z.string().uuid() }).parse(req.params);
  (req as any).params.patientId = patientId;

  return enforceConsent('fhir_patient')(req as any, res as any, async () => {
    const r = await db.pool.query(`SELECT uhid, full_name, dob, sex, phone FROM patients WHERE id=$1`, [patientId]);
    const p = r.rows[0];
    if (!p) return res.status(404).json({ error: 'Not found' });

    res.json({
      resourceType: 'Patient',
      id: patientId,
      identifier: [{ system: 'urn:uhi', value: p.uhid }],
      name: [{ text: p.full_name }],
      gender: p.sex?.toLowerCase() === 'm' ? 'male' : p.sex?.toLowerCase() === 'f' ? 'female' : 'unknown',
      birthDate: p.dob,
      telecom: [{ system: 'phone', value: p.phone }]
    });
  });
});

fhirRouter.get('/encounter/:encounterId', requireAuth, async (req: AuthedRequest, res) => {
  const { encounterId } = z.object({ encounterId: z.string().uuid() }).parse(req.params);
  const r = await db.pool.query(
    `SELECT e.id, e.patient_id, e.encounter_type, e.started_at, h.hospital_code
     FROM encounters e JOIN hospitals h ON h.id=e.hospital_id
     WHERE e.id=$1`,
    [encounterId]
  );
  const e = r.rows[0];
  if (!e) return res.status(404).json({ error: 'Not found' });
  (req as any).params.patientId = e.patient_id;

  return enforceConsent('fhir_encounter')(req as any, res as any, async () => {
    res.json({
      resourceType: 'Encounter',
      id: e.id,
      status: 'finished',
      class: { code: e.encounter_type },
      subject: { reference: `Patient/${e.patient_id}` },
      period: { start: e.started_at },
      serviceProvider: { display: e.hospital_code }
    });
  });
});

fhirRouter.get('/observation/:versionId', requireAuth, async (req: AuthedRequest, res) => {
  const { versionId } = z.object({ versionId: z.string().uuid() }).parse(req.params);
  const r = await db.pool.query(`SELECT patient_id, data_json, created_at FROM ehr_versions WHERE id=$1`, [versionId]);
  const v = r.rows[0];
  if (!v) return res.status(404).json({ error: 'Not found' });
  (req as any).params.patientId = v.patient_id;

  return enforceConsent('fhir_observation')(req as any, res as any, async () => {
    res.json({
      resourceType: 'Observation',
      id: versionId,
      status: 'final',
      subject: { reference: `Patient/${v.patient_id}` },
      effectiveDateTime: v.created_at,
      valueString: JSON.stringify(v.data_json)
    });
  });
});
