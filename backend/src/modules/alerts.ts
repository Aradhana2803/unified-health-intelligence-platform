import { Router } from 'express';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { requireAuth, requireRole, AuthedRequest } from '../lib/middleware.js';

let io: import('socket.io').Server | null = null;

export function attachIo(server: import('socket.io').Server) {
  io = server;
}

export const alertRouter = Router();

export async function createAlert(params: {
  hospitalCode: string;
  patientUhid: string | null;
  caseId: string;
  severity: string;
  title: string;
  body: string;
}) {
  const h = await db.pool.query(`SELECT id FROM hospitals WHERE hospital_code=$1`, [params.hospitalCode]);
  const hospitalId = h.rows?.[0]?.id ?? null;

  let patientId: string | null = null;
  if (params.patientUhid) {
    const p = await db.pool.query(`SELECT id FROM patients WHERE uhid=$1`, [params.patientUhid]);
    patientId = p.rows?.[0]?.id ?? null;
  }

  const ins = await db.pool.query(
    `INSERT INTO alerts (patient_id, hospital_id, case_id, severity, title, body)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at`,
    [patientId, hospitalId, params.caseId, params.severity, params.title, params.body]
  );

  // Push to hospital room
  if (io) {
    io.to(params.hospitalCode).emit('alert', {
      id: ins.rows[0].id,
      createdAt: ins.rows[0].created_at,
      ...params
    });
  }

  return ins.rows[0];
}

// Doctor: list alerts by hospital
alertRouter.get('/', requireAuth, requireRole(['doctor','admin']), async (req: AuthedRequest, res) => {
  const hospitalCode = req.user!.hospitalCode;
  if (!hospitalCode) return res.status(400).json({ error: 'Missing hospitalCode' });

  const r = await db.pool.query(
    `SELECT a.id, a.severity, a.title, a.body, a.acked, a.created_at,
            p.uhid as patient_uhid
     FROM alerts a
     LEFT JOIN patients p ON p.id=a.patient_id
     JOIN hospitals h ON h.id=a.hospital_id
     WHERE h.hospital_code=$1
     ORDER BY a.created_at DESC LIMIT 100`,
    [hospitalCode]
  );
  res.json({ alerts: r.rows });
});

// Acknowledge
alertRouter.post('/:alertId/ack', requireAuth, requireRole(['doctor','admin']), async (req: AuthedRequest, res) => {
  const { alertId } = z.object({ alertId: z.string().uuid() }).parse(req.params);
  await db.pool.query(`UPDATE alerts SET acked=true WHERE id=$1`, [alertId]);
  res.json({ ok: true });
});
