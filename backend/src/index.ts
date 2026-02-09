import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { db } from './lib/db.js';
import { mongo } from './lib/mongo.js';
import { authRouter } from './modules/auth.js';
import { patientRouter } from './modules/patients.js';
import { ehrRouter } from './modules/ehr.js';
import { consentRouter } from './modules/consents.js';
import { auditRouter } from './modules/audit.js';
import { ambulanceRouter } from './modules/ambulance.js';
import { fhirRouter } from './modules/fhir.js';
import { attachIo, alertRouter } from './modules/alerts.js';

const app = express();
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*', credentials: true }));

app.get('/health', async (_req, res) => {
  const pgOk = await db.ping();
  const mongoOk = await mongo.ping();
  res.json({ ok: true, pgOk, mongoOk, ts: new Date().toISOString() });
});

app.use('/auth', authRouter);
app.use('/patients', patientRouter);
app.use('/ehr', ehrRouter);
app.use('/consents', consentRouter);
app.use('/audit', auditRouter);
app.use('/ambulance', ambulanceRouter);
app.use('/alerts', alertRouter);
app.use('/fhir', fhirRouter);

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN ?? '*', credentials: true }
});
attachIo(io);

io.on('connection', (socket) => {
  // Clients join rooms by hospitalCode for targeted alerts
  socket.on('join', (room: string) => socket.join(room));
});

const port = Number(process.env.PORT ?? 8080);
httpServer.listen(port, async () => {
  await db.init();
  await mongo.init();
  console.log(`Backend listening on :${port}`);
});
