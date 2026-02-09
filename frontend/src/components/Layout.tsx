import React from 'react';
import { clearToken } from '../lib/api';
import { getRole, getHospitalCode } from '../lib/auth';
import { useNavigate } from 'react-router-dom';

export default function Layout({ title, children }: { title: string; children: React.ReactNode }) {
  const nav = useNavigate();
  const role = getRole();
  const hosp = getHospitalCode();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-sm text-slate-400">UHIP</div>
            <div className="text-lg font-semibold">{title}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-400">
              {role}{hosp ? ` • ${hosp}` : ''}
            </div>
            <button
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-900"
              onClick={() => {
                clearToken();
                nav('/');
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-4">{children}</main>
    </div>
  );
}
