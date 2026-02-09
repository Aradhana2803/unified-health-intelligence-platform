import { Router } from 'express';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { requireAuth, requireRole, enforceConsent, AuthedRequest } from '../lib/middleware.js';

export const patientRouter = Router();

// Doctor search by UHID
patientRouter.get('/search', requireAuth, requireRole(['doctor','admin']), async (req: AuthedRequest, res) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) return res.status(400).json({ error: 'Missing q' });
  const r = await db.pool.query(
    `SELECT id, uhid, full_name, dob, sex, phone FROM patients WHERE uhid ILIKE $1 OR full_name ILIKE $1 LIMIT 20`,
    [`%${q}%`]
  );
  res.json({ items: r.rows });
});

// Patient self profile
patientRouter.get('/me', requireAuth, requireRole(['patient']), async (req: AuthedRequest, res) => {
  const r = await db.pool.query(`SELECT id, uhid, full_name, dob, sex, phone FROM patients WHERE id=$1`, [req.user!.patientId]);
  res.json(r.rows[0]);
});

// Unified timeline across hospitals (requires consent enforcement for doctors; patients ok)
patientRouter.get('/:patientId/timeline', requireAuth, enforceConsent('read_timeline'), async (req, res) => {
  const { patientId } = z.object({ patientId: z.string().uuid() }).parse(req.params);
  const r = await db.pool.query(
    `SELECT e.id as encounter_id, e.encounter_type, e.started_at,
            h.hospital_code, h.name as hospital_name,
            (SELECT id FROM ehr_versions v WHERE v.encounter_id=e.id ORDER BY created_at DESC LIMIT 1) as latest_version_id
     FROM encounters e
     JOIN hospitals h ON h.id=e.hospital_id
     WHERE e.patient_id=$1
     ORDER BY e.started_at DESC`,
    [patientId]
  );
  res.json({ encounters: r.rows });
});
