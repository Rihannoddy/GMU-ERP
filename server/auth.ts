import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import db from './db.ts';

export type UserRole = 'admin' | 'faculty' | 'student';

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
  status: string;
  student_id?: number | null;
  faculty_id?: number | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(process.cwd() + '_smartcampus_erp_secret_v1').digest('hex');

export function signToken(payload: { userId: number; role: UserRole; exp: number }): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token: string): { userId: number; role: UserRole; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [data, sig] = parts;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!parsed || typeof parsed.userId !== 'number' || !parsed.exp || Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function loadUserById(userId: number): AuthUser | null {
  const user = db
    .prepare(`SELECT id, email, role, full_name, avatar_url, status FROM users WHERE id = ? AND status = 'active'`)
    .get(userId) as AuthUser | undefined;
  if (!user) return null;

  if (user.role === 'student') {
    const student = db.prepare(`SELECT id FROM students WHERE user_id = ?`).get(user.id) as { id: number } | undefined;
    user.student_id = student?.id ?? null;
  } else if (user.role === 'faculty') {
    const fac = db.prepare(`SELECT id FROM faculty WHERE user_id = ?`).get(user.id) as { id: number } | undefined;
    user.faculty_id = fac?.id ?? null;
  }
  return user;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.cookies && req.cookies.sc_session) {
    token = req.cookies.sc_session;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const verified = verifyToken(token);
  if (!verified) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }

  const user = loadUserById(verified.userId);
  if (!user) {
    return res.status(401).json({ error: 'User account is inactive or no longer exists.' });
  }

  req.user = user;
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. This action requires ${roles.join(' or ')} privileges.`,
      });
    }
    next();
  };
}
