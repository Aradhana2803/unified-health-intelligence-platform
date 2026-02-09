import { Router } from 'express';
import { db } from '../lib/db.js';
import { requireAuth, AuthedRequest } from '../lib/middleware.js';

export const auditRouter = Router();

// Patient: view own logs; Doctor/Admin: view logs for a patient (if consent)
auditRouter.get('/logs', requireAuth, async (req: AuthedRequest, res) => {
  const u = req.user!;
  const patientId = (req.query.patientId as string | undefined) ?? null;

  if (u.role === 'patient') {
    const r = await db.pool.query(
      `SELECT created_at, actor_role, action, resource, decision
       FROM access_logs WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 200`,
      [u.patientId]
    );
    return res.json({ logs: r.rows });
  }

  if (!patientId) return res.status(400).json({ error: 'patientId required' });
  // For MVP: doctors can view logs only if consent exists (reuse consents table)
  if (!u.hospitalId) return res.status(400).json({ error: 'missing hospital' });
  const c = await db.pool.query(`SELECT granted FROM consents WHERE patient_id=$1 AND hospital_id=$2 AND scope='ehr'`, [patientId, u.hospitalId]);
  if (c.rows?.[0]?.granted !== true) return res.status(403).json({ error: 'Consent denied' });

  const r = await db.pool.query(
    `SELECT created_at, actor_role, action, resource, decision
     FROM access_logs WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 200`,
    [patientId]
  );
  res.json({ logs: r.rows });
});
