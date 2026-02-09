import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../../lib/api';
import { setRole, setHospitalCode } from '../../lib/auth';

export default function LoginDoctor() {
  const nav = useNavigate();
  const [hospitalCode, setHospital] = useState('HOSP-001');
  const [password, setPassword] = useState('doctor123');
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="text-sm text-slate-400">Doctor Login</div>
          <div className="mt-1 text-2xl font-semibold">Hospital access</div>

          <label className="mt-4 block text-sm text-slate-300">Hospital ID</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={hospitalCode}
            onChange={(e) => setHospital(e.target.value)}
          />

          <label className="mt-3 block text-sm text-slate-300">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {err && <div className="mt-3 rounded-lg border border-red-900 bg-red-950/30 p-2 text-sm text-red-200">{err}</div>}

          <button
            className="mt-5 w-full rounded-lg bg-sky-600 px-4 py-2 font-semibold hover:bg-sky-500"
            onClick={async () => {
              setErr(null);
              try {
                const r = await api.loginDoctor(hospitalCode, password);
                setToken(r.token);
                setRole('doctor');
                setHospitalCode(r.hospitalCode ?? hospitalCode);
                nav('/doctor');
              } catch (e: any) {
                setErr(String(e.message ?? e));
              }
            }}
          >
            Login
          </button>

          <div className="mt-4 text-xs text-slate-400">Seed: HOSP-001 / doctor123</div>
        </div>
      </div>
    </div>
  );
}
