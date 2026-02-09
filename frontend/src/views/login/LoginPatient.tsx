import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../../lib/api';
import { setRole, setHospitalCode } from '../../lib/auth';

export default function LoginPatient() {
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState('9999999999');
  const [otp, setOtp] = useState('123456');
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="text-sm text-slate-400">Patient Login</div>
          <div className="mt-1 text-2xl font-semibold">OTP (mock)</div>

          <label className="mt-4 block text-sm text-slate-300">National ID / MRN / Phone</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />

          <label className="mt-3 block text-sm text-slate-300">OTP</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />

          {err && <div className="mt-3 rounded-lg border border-red-900 bg-red-950/30 p-2 text-sm text-red-200">{err}</div>}

          <button
            className="mt-5 w-full rounded-lg bg-sky-600 px-4 py-2 font-semibold hover:bg-sky-500"
            onClick={async () => {
              setErr(null);
              try {
                const r = await api.loginPatient(identifier, otp);
                setToken(r.token);
                setRole('patient');
                setHospitalCode(null);
                nav('/patient');
              } catch (e: any) {
                setErr(String(e.message ?? e));
              }
            }}
          >
            Verify & Login
          </button>

          <div className="mt-4 text-xs text-slate-400">Seed: 9999999999 / OTP 123456</div>
        </div>
      </div>
    </div>
  );
}
