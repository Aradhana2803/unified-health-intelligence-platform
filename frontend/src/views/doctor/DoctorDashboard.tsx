import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../../components/Layout';
import { api } from '../../lib/api';
import { io } from 'socket.io-client';
import { getHospitalCode } from '../../lib/auth';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const WS_BASE = import.meta.env.VITE_WS_BASE ?? 'http://localhost:8080';

type Alert = { id: string; severity: string; title: string; body: string; acked: boolean; created_at?: string; patient_uhid?: string };

export default function DoctorDashboard() {
  const [q, setQ] = useState('UHID-0001');
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);

  const [selectedEncounter, setSelectedEncounter] = useState<any | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [fromVersion, setFromVersion] = useState<string>('');
  const [toVersion, setToVersion] = useState<string>('');
  const [diff, setDiff] = useState<any | null>(null);
  const [versionData, setVersionData] = useState<any | null>(null);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [banner, setBanner] = useState<Alert | null>(null);
  const [emergencyOverride, setEmergencyOverride] = useState(false);

  useEffect(() => {
    const socket = io(WS_BASE, { transports: ['websocket'] });
    const hosp = getHospitalCode();
    if (hosp) socket.emit('join', hosp);
    socket.on('alert', (a: Alert) => {
      setBanner(a);
      setAlerts((prev) => [a, ...prev]);
    });
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    api.alerts().then((r) => setAlerts(r.alerts)).catch(() => {});
  }, []);

  const chartData = useMemo(() => {
    // demo: vitals HR over time from version snapshots if loaded
    const items = versions.slice(-10).map((v, i) => ({ name: `v${i+1}`, hr: (v.data_json?.vitals?.hr ?? null) }));
    return items.filter((x) => x.hr !== null);
  }, [versions]);

  return (
    <Layout title="Doctor Dashboard">
      {banner && (
        <div className="mb-4 rounded-2xl border border-amber-700 bg-amber-950/30 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-amber-200">{banner.severity} • Real-time Pre-Alert</div>
              <div className="text-lg font-semibold">{banner.title}</div>
              <div className="text-sm text-slate-200">{banner.body}</div>
            </div>
            <button
              className="rounded-lg border border-amber-600 px-3 py-1.5 text-sm hover:bg-amber-900/30"
              onClick={async () => {
                await api.ackAlert(banner.id);
                setBanner(null);
              }}
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="flex items-center gap-2">
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by UHID or name"
            />
            <button
              className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold hover:bg-sky-500"
              onClick={async () => {
                const r = await api.searchPatients(q);
                setPatients(r.items);
              }}
            >
              Search
            </button>
          </div>

          <div className="mt-3 text-xs text-slate-400">Tip: UHID-0001</div>

          <div className="mt-4 space-y-2">
            {patients.map((p) => (
              <button
                key={p.id}
                className={`w-full rounded-xl border px-3 py-2 text-left ${selectedPatient?.id === p.id ? 'border-sky-600 bg-sky-950/20' : 'border-slate-800 bg-slate-950/30 hover:border-slate-600'}`}
                onClick={async () => {
                  setSelectedPatient(p);
                  setSelectedEncounter(null);
                  setVersions([]);
                  setDiff(null);
                  const tl = await api.timeline(p.id, emergencyOverride);
                  setTimeline(tl.encounters);
                }}
              >
                <div className="font-semibold">{p.full_name}</div>
                <div className="text-xs text-slate-400">{p.uhid}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-slate-400">Timeline</div>
              <div className="text-lg font-semibold">{selectedPatient ? `${selectedPatient.full_name} • ${selectedPatient.uhid}` : 'Select a patient'}</div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={emergencyOverride} onChange={(e) => setEmergencyOverride(e.target.checked)} />
              Emergency override (demo)
            </label>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {timeline.map((e) => (
              <button
                key={e.encounter_id}
                className={`rounded-2xl border p-4 text-left ${selectedEncounter?.encounter_id === e.encounter_id ? 'border-sky-600 bg-sky-950/20' : 'border-slate-800 bg-slate-950/30 hover:border-slate-600'}`}
                onClick={async () => {
                  setSelectedEncounter(e);
                  const vs = await api.encounterVersions(e.encounter_id, emergencyOverride);
                  setVersions(vs.versions);
                  setFromVersion('');
                  setToVersion('');
                  setDiff(null);
                  setVersionData(null);
                }}
              >
                <div className="text-sm text-slate-400">{e.hospital_code} • {e.encounter_type}</div>
                <div className="mt-1 font-semibold">{new Date(e.started_at).toLocaleString()}</div>
                <div className="mt-2 text-xs text-slate-400">{e.hospital_name}</div>
              </button>
            ))}
          </div>

          {selectedEncounter && (
            <div className="mt-6 border-t border-slate-800 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-slate-400">Version history</div>
                  <div className="text-lg font-semibold">Git-like commits</div>
                </div>
                <button
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-900"
                  onClick={async () => {
                    // Demo commit: tweak vitals + add a note
                    const latest = versions[versions.length - 1];
                    const snap = latest ? await api.version(latest.id, emergencyOverride) : null;
                    const nextData = {
                      ...(snap?.data_json ?? {}),
                      vitals: { ...(snap?.data_json?.vitals ?? {}), hr: (snap?.data_json?.vitals?.hr ?? 80) + 5 },
                      note: 'Auto-added demo note'
                    };
                    await api.commit({
                      encounterId: selectedEncounter.encounter_id,
                      parentVersionId: latest?.id ?? null,
                      commitMessage: 'Demo update (new commit)',
                      data: nextData,
                      emergencyOverride
                    });
                    const vs = await api.encounterVersions(selectedEncounter.encounter_id, emergencyOverride);
                    setVersions(vs.versions);
                  }}
                >
                  + New version commit
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                {versions.map((v) => (
                  <button
                    key={v.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-left hover:border-slate-600"
                    onClick={async () => {
                      const snap = await api.version(v.id, emergencyOverride);
                      setVersionData(snap);
                    }}
                  >
                    <div className="text-xs text-slate-400">{new Date(v.created_at).toLocaleString()}</div>
                    <div className="mt-1 font-semibold">{v.commit_message}</div>
                    <div className="mt-1 text-xs text-slate-500">{v.id.slice(0, 8)}…</div>
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-sm text-slate-300">Diff viewer</div>
                  <select className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={fromVersion} onChange={(e) => setFromVersion(e.target.value)}>
                    <option value="">From version…</option>
                    {versions.map((v) => <option key={v.id} value={v.id}>{v.commit_message}</option>)}
                  </select>
                  <select className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm" value={toVersion} onChange={(e) => setToVersion(e.target.value)}>
                    <option value="">To version…</option>
                    {versions.map((v) => <option key={v.id} value={v.id}>{v.commit_message}</option>)}
                  </select>
                  <button
                    className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold hover:bg-sky-500"
                    onClick={async () => {
                      if (!fromVersion || !toVersion) return;
                      const r = await api.diff(fromVersion, toVersion, emergencyOverride);
                      setDiff(r.diff);
                    }}
                  >
                    Show diff
                  </button>
                </div>

                {diff && (
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <DiffCol title="New" tone="green" items={diff.new} />
                    <DiffCol title="Modified" tone="yellow" items={diff.modified} />
                    <DiffCol title="Missing" tone="red" items={diff.missing} />
                  </div>
                )}
              </div>

              {versionData && (
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                    <div className="text-sm text-slate-400">Snapshot JSON</div>
                    <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-200">
{JSON.stringify(versionData.data_json, null, 2)}
                    </pre>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                    <div className="text-sm text-slate-400">Vitals trend (demo)</div>
                    <div className="mt-2 h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Line dataKey="hr" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-400">Alerts</div>
            <div className="text-lg font-semibold">ER pre-alert feed</div>
          </div>
          <button className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-900" onClick={async () => setAlerts((await api.alerts()).alerts)}>
            Refresh
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {alerts.slice(0, 10).map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
              <div className="text-xs text-slate-400">{a.severity} • {a.patient_uhid ?? 'Unknown patient'}</div>
              <div className="mt-1 font-semibold">{a.title}</div>
              <div className="text-sm text-slate-300">{a.body}</div>
            </div>
          ))}
          {alerts.length === 0 && <div className="text-sm text-slate-400">No alerts yet.</div>}
        </div>
      </div>
    </Layout>
  );
}

function DiffCol({ title, items, tone }: { title: string; items: string[]; tone: 'green' | 'yellow' | 'red' }) {
  const cls =
    tone === 'green'
      ? 'border-green-900 bg-green-950/20 text-green-200'
      : tone === 'yellow'
      ? 'border-yellow-900 bg-yellow-950/20 text-yellow-200'
      : 'border-red-900 bg-red-950/20 text-red-200';

  return (
    <div className={`rounded-2xl border p-3 ${cls}`}>
      <div className="text-sm font-semibold">{title}</div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {items?.length ? items.map((x) => <li key={x}>{x}</li>) : <li className="list-none text-xs opacity-70">None</li>}
      </ul>
    </div>
  );
}
