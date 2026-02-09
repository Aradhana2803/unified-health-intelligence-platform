import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { api } from '../../lib/api';

export default function PatientDashboard() {
  const [profile, setProfile] = useState<any | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.myProfile();
        setProfile(me);
        const tl = await api.timeline(me.id);
        setTimeline(tl.encounters);
        const cs = await api.consentsMe();
        setConsents(cs.consents);
        const al = await api.auditMe();
        setLogs(al.logs);
      } catch (e: any) {
        setErr(String(e.message ?? e));
      }
    })();
  }, []);

  return (
    <Layout title="Patient Dashboard">
      {err && <div className="mb-4 rounded-2xl border border-red-900 bg-red-950/30 p-4 text-red-200">{err}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="text-sm text-slate-400">Profile</div>
          <div className="mt-1 text-lg font-semibold">{profile ? profile.full_name : 'Loading…'}</div>
          {profile && (
            <div className="mt-2 text-sm text-slate-300">
              <div>UHID: <span className="text-slate-200">{profile.uhid}</span></div>
              <div>Phone: <span className="text-slate-200">{profile.phone}</span></div>
            </div>
          )}
          <button className="mt-4 w-full rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-900" onClick={async () => setLogs((await api.auditMe()).logs)}>
            Refresh access logs
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 lg:col-span-2">
          <div className="text-sm text-slate-400">Unified timeline</div>
          <div className="mt-1 text-lg font-semibold">Multi-hospital encounters</div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {timeline.map((e) => (
              <div key={e.encounter_id} className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="text-xs text-slate-400">{e.hospital_code} • {e.encounter_type}</div>
                <div className="mt-1 font-semibold">{new Date(e.started_at).toLocaleString()}</div>
                <div className="mt-1 text-sm text-slate-300">{e.hospital_name}</div>
                <div className="mt-3 flex gap-2">
                  <a
                    className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold hover:bg-sky-500"
                    href={(import.meta.env.VITE_API_BASE ?? 'http://localhost:8080') + `/fhir/encounter/${e.encounter_id}`}
                    target="_blank"
                  >
                    Download (FHIR stub)
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="text-sm text-slate-400">Consent manager</div>
          <div className="mt-1 text-lg font-semibold">Grant / Revoke</div>
          <div className="mt-3 space-y-2">
            {consents.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                <div>
                  <div className="font-semibold">{c.hospital_code}</div>
                  <div className="text-xs text-slate-400">{c.name}</div>
                </div>
                <button
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${c.granted ? 'bg-green-700 hover:bg-green-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                  onClick={async () => {
                    const next = !c.granted;
                    await api.consentToggle(c.hospital_code, next);
                    const cs = await api.consentsMe();
                    setConsents(cs.consents);
                  }}
                >
                  {c.granted ? 'Granted' : 'Revoked'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="text-sm text-slate-400">Audit trail</div>
          <div className="mt-1 text-lg font-semibold">Every access is logged</div>
          <div className="mt-3 max-h-96 overflow-auto rounded-xl border border-slate-800 bg-slate-950/30">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-950">
                <tr className="text-left text-xs text-slate-400">
                  <th className="p-2">Time</th>
                  <th className="p-2">Role</th>
                  <th className="p-2">Action</th>
                  <th className="p-2">Decision</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={i} className="border-t border-slate-800">
                    <td className="p-2 text-xs text-slate-400">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="p-2">{l.actor_role}</td>
                    <td className="p-2">{l.action}</td>
                    <td className="p-2">{l.decision}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td className="p-3 text-slate-400" colSpan={4}>No logs yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
