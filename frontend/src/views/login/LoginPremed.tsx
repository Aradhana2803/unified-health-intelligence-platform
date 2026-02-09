import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../../lib/api';
import { setRole, setHospitalCode } from '../../lib/auth';

export default function LoginPremed() {
  const nav = useNavigate();
  const [ambulanceId, setAmbulanceId] = useState('AMB-007');
  const [staffCode, setStaffCode] = useState('premed123');
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="text-sm text-slate-400">Pre-Med Login</div>
          <div className="mt-1 text-2xl font-semibold">Ambulance access</div>

          <label className="mt-4 block text-sm text-slate-300">Ambulance ID</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={ambulanceId}
            onChange={(e) => setAmbulanceId(e.target.value)}
          />

          <label className="mt-3 block text-sm text-slate-300">Staff Code</label>
          <input
            type="password"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={staffCode}
            onChange={(e) => setStaffCode(e.target.value)}
          />

          {err && <div className="mt-3 rounded-lg border border-red-900 bg-red-950/30 p-2 text-sm text-red-200">{err}</div>}

          <button
            className="mt-5 w-full rounded-lg bg-sky-600 px-4 py-2 font-semibold hover:bg-sky-500"
            onClick={async () => {
              setErr(null);
              try {
                const r = await api.loginPremed(ambulanceId, staffCode);
                setToken(r.token);
                setRole('premed');
                setHospitalCode(null);
                nav('/premed');
              } catch (e: any) {
                setErr(String(e.message ?? e));
              }
            }}
          >
            Login
          </button>

          <div className="mt-4 text-xs text-slate-400">Seed: AMB-007 / premed123</div>
        </div>
      </div>
    </div>
  );
}
