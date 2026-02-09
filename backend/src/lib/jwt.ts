import jwt from 'jsonwebtoken';

export type Role = 'doctor' | 'patient' | 'premed' | 'admin';

export type JwtClaims = {
  sub: string;      // user_id
  role: Role;
  hospitalId?: string | null;
  hospitalCode?: string | null;
  patientId?: string | null;
  loginId: string;
};

const secret = process.env.JWT_SECRET ?? 'dev_secret_change_me';

export function signToken(claims: JwtClaims) {
  return jwt.sign(claims, secret, { expiresIn: '8h' });
}

export function verifyToken(token: string): JwtClaims {
  return jwt.verify(token, secret) as JwtClaims;
}
