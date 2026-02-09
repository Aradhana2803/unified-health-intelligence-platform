const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080';

export type Role = 'doctor' | 'patient' | 'premed' | 'admin';

export function getToken() {
  return localStorage.getItem('token') ?? '';
}
export function setToken(t: string) {
  localStorage.setItem('token', t);
}
export function clearToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('hospitalCode');
}

async function req(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(opts.headers as any)
  };
  if (token) headers['authorization'] = `Bearer ${token}`;
  const r = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `HTTP ${r.status}`);
  }
  return r.json();
}

export const api = {
  health: () => req('/health'),
  loginDoctor: (hospitalCode: string, password: string) =>
    req('/auth/login/doctor', { method: 'POST', body: JSON.stringify({ hospitalCode, password }) }),
  loginPatient: (identifier: string, otp: string) =>
    req('/auth/login/patient', { method: 'POST', body: JSON.stringify({ identifier, otp }) }),
  loginPremed: (ambulanceId: string, staffCode: string) =>
    req('/auth/login/premed', { method: 'POST', body: JSON.stringify({ ambulanceId, staffCode }) }),

  searchPatients: (q: string) => req(`/patients/search?q=${encodeURIComponent(q)}`),
  myProfile: () => req('/patients/me'),
  timeline: (patientId: string, emergencyOverride?: boolean) =>
    req(`/patients/${patientId}/timeline${emergencyOverride ? '?emergencyOverride=true' : ''}`),

  encounterVersions: (encounterId: string, emergencyOverride?: boolean) =>
    req(`/ehr/encounter/${encounterId}/versions${emergencyOverride ? '?emergencyOverride=true' : ''}`),
  version: (versionId: string, emergencyOverride?: boolean) =>
    req(`/ehr/version/${versionId}${emergencyOverride ? '?emergencyOverride=true' : ''}`),
  diff: (from: string, to: string, emergencyOverride?: boolean) =>
    req(`/ehr/diff?from=${from}&to=${to}${emergencyOverride ? '&emergencyOverride=true' : ''}`),
  commit: (payload: any) => req('/ehr/commit', { method: 'POST', body: JSON.stringify(payload) }),

  consentsMe: () => req('/consents/me'),
  consentToggle: (hospitalCode: string, granted: boolean) =>
    req('/consents/me/toggle', { method: 'POST', body: JSON.stringify({ hospitalCode, granted }) }),

  auditMe: () => req('/audit/logs'),
  auditByPatient: (patientId: string) => req(`/audit/logs?patientId=${patientId}`),

  submitAmbulanceCase: (payload: any) => req('/ambulance/case', { method: 'POST', body: JSON.stringify(payload) }),
  myAmbulanceCases: () => req('/ambulance/cases'),

  alerts: () => req('/alerts'),
  ackAlert: (alertId: string) => req(`/alerts/${alertId}/ack`, { method: 'POST' })
};
