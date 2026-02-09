export type Role = 'doctor' | 'patient' | 'premed' | 'admin';

export function getRole(): Role | null {
  return (localStorage.getItem('role') as Role) || null;
}
export function setRole(r: Role) {
  localStorage.setItem('role', r);
}
export function getHospitalCode() {
  return localStorage.getItem('hospitalCode') ?? null;
}
export function setHospitalCode(code: string | null) {
  if (!code) localStorage.removeItem('hospitalCode');
  else localStorage.setItem('hospitalCode', code);
}
