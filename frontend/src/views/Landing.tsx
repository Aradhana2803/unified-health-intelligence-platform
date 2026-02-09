import React from 'react';
import { Link } from 'react-router-dom';

function RoleCard({ title, subtitle, to, emoji }: { title: string; subtitle: string; to: string; emoji: string }) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-sm hover:border-slate-600"
    >
      <div className="text-3xl">{emoji}</div>
      <div className="mt-3 text-xl font-semibold">{title}</div>
      <div className="mt-1 text-sm text-slate-400">{subtitle}</div>
      <div className="mt-4 text-sm text-sky-400 group-hover:underline">Continue →</div>
    </Link>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/70 to-slate-950 p-6">
          <div className="text-sm text-slate-400">Unified Health Intelligence Platform</div>
          <div className="mt-2 text-3xl font-bold">Git-like versioned EHR + Pre-hospital AI coordination</div>
          <div className="mt-3 max-w-2xl text-slate-300">
            One backend and data layer for Doctors, Patients, and Ambulance teams. No overwrites — every update is a commit.
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <RoleCard title="Hospital" subtitle="Doctor dashboard + diffs + alerts" to="/login/doctor" emoji="👨‍⚕️" />
          <RoleCard title="Patient" subtitle="Unified timeline + consents + audit logs" to="/login/patient" emoji="👤" />
          <RoleCard title="Pre-Med" subtitle="Mobile triage + AI + ER pre-alerts" to="/login/premed" emoji="🚑" />
        </div>

        <div className="mt-10 text-xs text-slate-500">
          MVP seeded users: Doctor HOSP-001 / doctor123 • Patient 9999999999 / OTP 123456 • Pre-med AMB-007 / premed123
        </div>
      </div>
    </div>
  );
}
