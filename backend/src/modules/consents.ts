import { Router } from 'express';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { requireAuth, requireRole, AuthedRequest } from '../lib/middleware.js';

export const consentRouter = Router();

// List consents for patient (patient only)
consentRouter.get('/me', requireAuth, requireRole(['patient']), async (req: AuthedRequest, res) => {
  const r = await db.pool.query(
    `SELECT c.id, h.hospital_code, h.name, c.granted, c.scope, c.updated_at
     FROM consents c JOIN hospitals h ON h.id=c.hospital_id
     WHERE c.patient_id=$1 ORDER BY h.hospital_code`,
    [req.user!.patientId]
  );
  res.json({ consents: r.rows });
});

// Toggle consent (patient only)
consentRouter.post('/me/toggle', requireAuth, requireRole(['patient']), async (req: AuthedRequest, res) => {
  const body = z.object({ hospitalCode: z.string(), granted: z.boolean() }).parse(req.body);

  const h = await db.pool.query(`SELECT id FROM hospitals WHERE hospital_code=$1`, [body.hospitalCode]);
  const hospitalId = h.rows?.[0]?.id;
  if (!hospitalId) return res.status(404).json({ error: 'Hospital not found' });

  const r = await db.pool.query(
    `INSERT INTO consents (patient_id, hospital_id, granted, scope)
     VALUES ($1,$2,$3,'ehr')
     ON CONFLICT (patient_id, hospital_id, scope) DO UPDATE
     SET granted=EXCLUDED.granted, updated_at=now()
     RETURNING id, granted, updated_at`,
    [req.user!.patientId, hospitalId, body.granted]
  );

  res.json({ consent: r.rows[0] });
});
