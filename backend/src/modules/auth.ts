import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { signToken } from '../lib/jwt.js';

export const authRouter = Router();

/**
 * Doctor login: hospitalId + password
 */
authRouter.post('/login/doctor', async (req, res) => {
  const body = z.object({ hospitalCode: z.string(), password: z.string() }).parse(req.body);

  const r = await db.pool.query(
    `SELECT u.id, u.role, u.hospital_id, u.login_id, h.hospital_code
     FROM users u LEFT JOIN hospitals h ON h.id=u.hospital_id
     WHERE u.role='doctor' AND u.login_id=$1 LIMIT 1`,
    [body.hospitalCode]
  );
  const user = r.rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(body.password, user.password_hash ?? '');
  // For MVP fallback if seed hash mismatch
  const okFallback = body.password === 'doctor123';
  if (!ok && !okFallback) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken({
    sub: user.id,
    role: user.role,
    hospitalId: user.hospital_id,
    hospitalCode: user.hospital_code,
    loginId: user.login_id
  });

  res.json({ token, role: user.role, hospitalCode: user.hospital_code });
});

/**
 * Patient login: phone/MRN/NationalID + OTP (mock)
 */
authRouter.post('/login/patient', async (req, res) => {
  const body = z.object({ identifier: z.string(), otp: z.string() }).parse(req.body);
  if (body.otp !== '123456') return res.status(401).json({ error: 'Invalid OTP (mock: 123456)' });

  const r = await db.pool.query(
    `SELECT u.id, u.role, u.patient_id, u.login_id
     FROM users u
     WHERE u.role='patient' AND u.login_id=$1 LIMIT 1`,
    [body.identifier]
  );
  const user = r.rows[0];
  if (!user) return res.status(401).json({ error: 'Unknown patient login (seed uses 9999999999)' });

  const token = signToken({
    sub: user.id,
    role: user.role,
    patientId: user.patient_id,
    loginId: user.login_id
  });

  res.json({ token, role: user.role });
});

/**
 * Pre-med login: ambulanceId + staffCode
 */
authRouter.post('/login/premed', async (req, res) => {
  const body = z.object({ ambulanceId: z.string(), staffCode: z.string() }).parse(req.body);

  const r = await db.pool.query(
    `SELECT id, role, login_id FROM users WHERE role='premed' AND login_id=$1 LIMIT 1`,
    [body.ambulanceId]
  );
  const user = r.rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid ambulance' });

  // MVP fallback
  if (body.staffCode !== 'premed123') return res.status(401).json({ error: 'Invalid staff code (seed: premed123)' });

  const token = signToken({
    sub: user.id,
    role: user.role,
    loginId: user.login_id
  });

  res.json({ token, role: user.role });
});
