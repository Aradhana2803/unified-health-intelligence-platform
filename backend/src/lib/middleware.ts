import { NextFunction, Request, Response } from 'express';
import { verifyToken, Role, JwtClaims } from './jwt.js';
import { db } from './db.js';

export type AuthedRequest = Request & { user?: JwtClaims };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization ?? '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Missing user' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

/**
 * Consent enforcement middleware (MVP)
 * - Doctors can access patient data only if patient granted consent to doctor's hospital, OR emergencyOverride=true
 * - Patients can access their own data
 * - Premed can submit cases but can't browse EHR
 */
export function enforceConsent(action: string) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const u = req.user;
    if (!u) return res.status(401).json({ error: 'Missing user' });

    const patientId = (req.params.patientId ?? req.query.patientId ?? req.body.patientId) as string | undefined;
    const emergencyOverride = String(req.query.emergencyOverride ?? req.body.emergencyOverride ?? 'false') === 'true';

    // Patients: only their own patientId
    if (u.role === 'patient') {
      if (patientId && u.patientId !== patientId) {
        await logAccess(req, 'blocked', action);
        return res.status(403).json({ error: 'Consent: patient scope mismatch' });
      }
      await logAccess(req, 'allowed', action);
      return next();
    }

    // Doctors/admin: require hospital consent unless override
    if (u.role === 'doctor' || u.role === 'admin') {
      if (emergencyOverride) {
        await logAccess(req, 'emergency_override', action);
        return next();
      }
      if (!patientId || !u.hospitalId) {
        await logAccess(req, 'blocked', action);
        return res.status(400).json({ error: 'Missing patientId or hospital' });
      }
      const r = await db.pool.query(
        `SELECT granted FROM consents WHERE patient_id=$1 AND hospital_id=$2 AND scope='ehr'`,
        [patientId, u.hospitalId]
      );
      const granted = r.rows?.[0]?.granted === true;
      if (!granted) {
        await logAccess(req, 'blocked', action);
        return res.status(403).json({ error: 'Consent denied' });
      }
      await logAccess(req, 'allowed', action);
      return next();
    }

    // Premed: no EHR read
    await logAccess(req, 'blocked', action);
    return res.status(403).json({ error: 'Premed cannot access EHR' });
  };
}

async function logAccess(req: AuthedRequest, decision: string, action: string) {
  try {
    const u = req.user;
    const patientId = (req.params.patientId ?? req.query.patientId ?? req.body.patientId) as string | undefined;
    const hospitalId = u?.hospitalId ?? null;
    await db.pool.query(
      `INSERT INTO access_logs (actor_user_id, actor_role, patient_id, hospital_id, action, resource, resource_id, decision, ip)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        u?.sub ?? null,
        u?.role ?? null,
        patientId ?? null,
        hospitalId,
        action,
        req.path,
        null,
        decision,
        req.ip
      ]
    );
  } catch {
    // ignore logging failures for MVP
  }
}
