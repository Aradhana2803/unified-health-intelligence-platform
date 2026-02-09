import { Router } from 'express';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { requireAuth, requireRole, AuthedRequest } from '../lib/middleware.js';
import { mongo } from '../lib/mongo.js';
import { createAlert } from './alerts.js';

export const ambulanceRouter = Router();

const CaseSchema = z.object({
  patientUhid: z.string().optional(),
  symptoms: z.array(z.string()).default([]),
  vitals: z.object({
    hr: z.number().optional(),
    bp: z.string().optional(),
    spo2: z.number().optional(),
    rr: z.number().optional()
  }).default({}),
  age: z.number().optional(),
  trauma_type: z.string().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    eta_min: z.number().optional()
  }).optional(),
  photos: z.array(z.object({ name: z.string(), base64: z.string() })).default([]),
  voiceNotes: z.array(z.object({ name: z.string(), base64: z.string() })).default([])
});

ambulanceRouter.post('/case', requireAuth, requireRole(['premed']), async (req: AuthedRequest, res) => {
  const body = CaseSchema.parse(req.body);
  const ambulanceId = req.user!.loginId;

  // Store media in Mongo (MVP: store base64 blobs; production should use object storage / GridFS)
  const mediaIds: string[] = [];
  const mdb = mongo.client().db();

  for (const p of [...body.photos, ...body.voiceNotes]) {
    const doc = await mdb.collection('media').insertOne({
      ambulanceId,
      patientUhid: body.patientUhid ?? null,
      name: p.name,
      base64: p.base64,
      createdAt: new Date()
    });
    mediaIds.push(String(doc.insertedId));
  }

  // Call AI service
  const aiUrl = (process.env.AI_URL ?? 'http://localhost:8000') + '/predict';
  const aiReq = {
    symptoms: body.symptoms,
    vitals: body.vitals,
    age: body.age ?? null,
    trauma_type: body.trauma_type ?? null
  };

  const aiRes = await fetch(aiUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(aiReq)
  });

  if (!aiRes.ok) {
    const t = await aiRes.text();
    return res.status(502).json({ error: 'AI service error', details: t });
  }
  const ai = await aiRes.json();

  // Create case
  const ins = await db.pool.query(
    `INSERT INTO ambulance_cases (ambulance_id, staff_code, patient_uhid, payload_json, ai_result_json)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at`,
    [ambulanceId, 'premed', body.patientUhid ?? null, { ...body, mediaIds }, ai]
  );

  // Trigger alerts if high risk
  const urgency = Number(ai.urgency_score ?? 0);
  if (urgency >= 70) {
    // For MVP choose HOSP-001 as routing suggestion unless ai provides hospital_code
    const hospitalCode = ai.hospital_routing?.hospital_code ?? 'HOSP-001';
    await createAlert({
      hospitalCode,
      patientUhid: body.patientUhid ?? null,
      caseId: ins.rows[0].id,
      severity: 'HIGH',
      title: `ER Pre-alert: ${ai.emergency_type}`,
      body: `Urgency ${urgency}/100 • Setup: ${ai.recommended_setup?.join(', ') ?? 'N/A'}`
    });
  }

  res.json({ caseId: ins.rows[0].id, createdAt: ins.rows[0].created_at, ai, mediaIds });
});

// Premed can list their recent cases
ambulanceRouter.get('/cases', requireAuth, requireRole(['premed']), async (req: AuthedRequest, res) => {
  const ambulanceId = req.user!.loginId;
  const r = await db.pool.query(
    `SELECT id, patient_uhid, ai_result_json, status, created_at
     FROM ambulance_cases WHERE ambulance_id=$1 ORDER BY created_at DESC LIMIT 50`,
    [ambulanceId]
  );
  res.json({ cases: r.rows });
});
