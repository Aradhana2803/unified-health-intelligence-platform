import React from 'react';
import { Navigate } from 'react-router-dom';
import { getToken } from '../lib/api';
import { getRole, Role } from '../lib/auth';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = getToken();
  if (!token) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const r = getRole();
  if (!r) return <Navigate to="/" replace />;
  if (r !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}
