import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { api } from '../../lib/api';

export default function PremedDashboard() {
  const [patientUhid, setPatientUhid] = useState('UHID-0001');
  const [age, setAge] = useState<number>(45);
  const [symptoms, setSymptoms] = useState('chest pain, shortness of breath');
  const [hr, setHr] = useState<number>(130);
  const [bp, setBp] = useState('90/60');
  const [spo2, setSpo2] = useState<number>(89);
  const [traumaType, setTraumaType] = useState<string>('');
  const [ai, setAi] = useState<any | null>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.myAmbulanceCases().then((r) => setCases(r.cases)).catch(() => {});
  }, []);

  return (
    <Layout title="Pre-Med Dashboard (Mobile)">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="text-sm text-slate-400">Ambulance Case</div>
          <div className="mt-1 text-lg font-semibold">Symptoms + vitals + media</div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Patient UHID (optional)" value={patientUhid} onChange={(v) => setPatientUhid(v)} />
            <Field label="Age" value={String(age)} onChange={(v) => setAge(Number(v))} />
            <Field label="HR" value={String(hr)} onChange={(v) => setHr(Number(v))} />
            <Field label="BP" value={bp} onChange={(v) => setBp(v)} />
            <Field label="SpO2" value={String(spo2)} onChange={(v) => setSpo2(Number(v))} />
            <Field label="Trauma type (optional)" value={traumaType} onChange={(v) => setTraumaType(v)} />
          </div>

          <label className="mt-3 block text-sm text-slate-300">Symptoms (comma-separated)</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            rows={3}
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
          />

          {err && <div className="mt-3 rounded-lg border border-red-900 bg-red-950/30 p-2 text-sm text-red-200">{err}</div>}

          <button
            className="mt-4 w-full rounded-lg bg-sky-600 px-4 py-2 font-semibold hover:bg-sky-500"
            onClick={async () => {
              setErr(null);
              setAi(null);
              try {
                const payload = {
                  patientUhid: patientUhid || undefined,
                  age,
                  symptoms: symptoms.split(',').map((s) => s.trim()).filter(Boolean),
                  vitals: { hr, bp, spo2 },
                  trauma_type: traumaType || undefined,
                  // Mock media for MVP: empty arrays (or you can paste base64)
                  photos: [],
                  voiceNotes: []
                };
                const r = await api.submitAmbulanceCase(payload);
                setAi(r.ai);
                setCases((await api.myAmbulanceCases()).cases);
              } catch (e: any) {
                setErr(String(e.message ?? e));
              }
            }}
          >
            Submit to AI → send pre-alert if high risk
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="text-sm text-slate-400">AI Result</div>
          <div className="mt-1 text-lg font-semibold">Emergency classification</div>

          {ai ? (
            <div className="mt-3 space-y-2">
              <KPI label="emergency_type" value={ai.emergency_type} />
              <KPI label="emergency_class" value={ai.emergency_class} />
              <KPI label="confidence" value={String(ai.confidence)} />
              <KPI label="urgency_score" value={String(ai.urgency_score)} />
              <KPI label="recommended_setup" value={(ai.recommended_setup ?? []).join(', ')} />
              <KPI label="hospital_routing" value={`${ai.hospital_routing?.hospital_code ?? ''} • ${ai.hospital_routing?.rationale ?? ''}`} />
              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-xs text-slate-300">
                Raw: <pre className="mt-2 overflow-auto">{JSON.stringify(ai, null, 2)}</pre>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-slate-400">Submit a case to see AI output.</div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-400">Recent cases</div>
            <div className="mt-1 text-lg font-semibold">Ambulance case history</div>
          </div>
          <button className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-900" onClick={async () => setCases((await api.myAmbulanceCases()).cases)}>
            Refresh
          </button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {cases.map((c) => (
            <div key={c.id} className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="text-xs text-slate-400">{new Date(c.created_at).toLocaleString()} • {c.patient_uhid ?? 'Unknown patient'}</div>
              <div className="mt-1 font-semibold">{c.ai_result_json?.emergency_type ?? '—'}</div>
              <div className="mt-1 text-sm text-slate-300">
                Urgency: {c.ai_result_json?.urgency_score ?? '—'} • Class: {c.ai_result_json?.emergency_class ?? '—'}
              </div>
            </div>
          ))}
          {cases.length === 0 && <div className="text-sm text-slate-400">No cases yet.</div>}
        </div>
      </div>
    </Layout>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm text-slate-300">{label}</label>
      <input className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
