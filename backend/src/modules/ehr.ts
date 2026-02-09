import { Router } from 'express';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { requireAuth, requireRole, enforceConsent, AuthedRequest } from '../lib/middleware.js';
import { diffJson } from '../lib/diff.js';

export const ehrRouter = Router();

// Get versions for an encounter (doctor/patient with consent)
ehrRouter.get('/encounter/:encounterId/versions', requireAuth, async (req: AuthedRequest, res) => {
  const { encounterId } = z.object({ encounterId: z.string().uuid() }).parse(req.params);

  // Determine patientId for consent check
  const r0 = await db.pool.query(`SELECT patient_id FROM encounters WHERE id=$1`, [encounterId]);
  const patientId = r0.rows?.[0]?.patient_id;
  if (!patientId) return res.status(404).json({ error: 'Encounter not found' });

  // piggyback consent middleware by calling it directly is messy; inline check:
  // For simplicity, route through enforceConsent by faking req.params.patientId
  (req as any).params.patientId = patientId;

  return enforceConsent('read_versions')(req as any, res as any, async () => {
    const r = await db.pool.query(
      `SELECT id, parent_version_id, commit_message, created_at, created_by
       FROM ehr_versions WHERE encounter_id=$1 ORDER BY created_at ASC`,
      [encounterId]
    );
    res.json({ versions: r.rows });
  });
});

// Get a specific version snapshot
ehrRouter.get('/version/:versionId', requireAuth, async (req: AuthedRequest, res) => {
  const { versionId } = z.object({ versionId: z.string().uuid() }).parse(req.params);
  const r = await db.pool.query(
    `SELECT id, encounter_id, patient_id, hospital_id, parent_version_id, commit_message, data_json, created_at
     FROM ehr_versions WHERE id=$1`,
    [versionId]
  );
  const v = r.rows[0];
  if (!v) return res.status(404).json({ error: 'Not found' });

  (req as any).params.patientId = v.patient_id;
  return enforceConsent('read_version')(req as any, res as any, async () => res.json(v));
});

// Diff between versions
ehrRouter.get('/diff', requireAuth, async (req: AuthedRequest, res) => {
  const { from, to } = z.object({ from: z.string().uuid(), to: z.string().uuid() }).parse(req.query);

  const r = await db.pool.query(
    `SELECT id, patient_id, data_json FROM ehr_versions WHERE id = ANY($1::uuid[])`,
    [[from, to]]
  );
  const a = r.rows.find((x: any) => x.id === from);  
  const b = r.rows.find((x: any) => x.id === to); 
  if (!a || !b) return res.status(404).json({ error: 'Version not found' });

  (req as any).params.patientId = a.patient_id;
  return enforceConsent('read_diff')(req as any, res as any, async () => {
    const diff = diffJson(a.data_json, b.data_json);
    res.json({ from, to, diff });
  });
});

// Create new encounter
ehrRouter.post('/encounter', requireAuth, requireRole(['doctor','admin']), async (req: AuthedRequest, res) => {
  const body = z.object({
    patientId: z.string().uuid(),
    encounterType: z.string().default('OPD')
  }).parse(req.body);

  const u = req.user!;
  if (!u.hospitalId) return res.status(400).json({ error: 'Doctor missing hospital' });

  // Consent required to create? For MVP we allow if consent exists OR emergencyOverride
  (req as any).params.patientId = body.patientId;
  return enforceConsent('create_encounter')(req as any, res as any, async () => {
    const r = await db.pool.query(
      `INSERT INTO encounters (patient_id, hospital_id, encounter_type, created_by)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [body.patientId, u.hospitalId, body.encounterType, u.sub]
    );
    res.json({ encounterId: r.rows[0].id });
  });
});

// Commit new EHR version (no overwrite)
ehrRouter.post('/commit', requireAuth, requireRole(['doctor','admin']), async (req: AuthedRequest, res) => {
  const body = z.object({
    encounterId: z.string().uuid(),
    parentVersionId: z.string().uuid().nullable().optional(),
    commitMessage: z.string().min(1),
    data: z.any(),
    emergencyOverride: z.boolean().optional()
  }).parse(req.body);

  const u = req.user!;
  if (!u.hospitalId) return res.status(400).json({ error: 'Doctor missing hospital' });

  const r0 = await db.pool.query(`SELECT patient_id, hospital_id FROM encounters WHERE id=$1`, [body.encounterId]);
  const row = r0.rows[0];
  if (!row) return res.status(404).json({ error: 'Encounter not found' });
  if (row.hospital_id !== u.hospitalId) return res.status(403).json({ error: 'Encounter belongs to different hospital' });

  (req as any).params.patientId = row.patient_id;
  (req as any).body.patientId = row.patient_id;
  (req as any).body.emergencyOverride = body.emergencyOverride ?? false;

  return enforceConsent('commit_ehr')(req as any, res as any, async () => {
    const insert = await db.pool.query(
      `INSERT INTO ehr_versions (encounter_id, patient_id, hospital_id, parent_version_id, commit_message, data_json, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, created_at`,
      [body.encounterId, row.patient_id, u.hospitalId, body.parentVersionId ?? null, body.commitMessage, body.data, u.sub]
    );
    res.json({ versionId: insert.rows[0].id, createdAt: insert.rows[0].created_at });
  });
});
