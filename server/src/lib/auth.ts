import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

const COOKIE = 'imbio_session';
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 días

export type SessionUser = { username: string };

function secret(): string {
  return process.env.AUTH_SECRET || process.env.AUTH_PASSWORD || 'dev-insecure-secret';
}

function isHttps(): boolean {
  const base = process.env.PUBLIC_BASE_URL ?? '';
  return base.startsWith('https://') || process.env.NODE_ENV === 'production';
}

export function loadUsers(): Map<string, string> {
  const map = new Map<string, string>();
  const multi = process.env.AUTH_USERS?.trim();
  if (multi) {
    for (const part of multi.split(',')) {
      const i = part.indexOf(':');
      if (i <= 0) continue;
      const u = part.slice(0, i).trim();
      const p = part.slice(i + 1);
      if (u && p) map.set(u, p);
    }
  }
  const u = process.env.AUTH_USER?.trim();
  const p = process.env.AUTH_PASSWORD;
  if (u && p) map.set(u, p);
  if (map.size === 0 && process.env.NODE_ENV !== 'production') {
    map.set('imbio', 'imbio');
  }
  return map;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) {
    const dummy = Buffer.alloc(ba.length);
    timingSafeEqual(ba, dummy);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

export function verifyCredentials(username: string, password: string): boolean {
  const users = loadUsers();
  const expected = users.get(username);
  if (!expected) {
    const dummy = users.values().next().value ?? 'x';
    safeEqual(password, dummy);
    return false;
  }
  return safeEqual(password, expected);
}

function b64url(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf) : buf;
  return b.toString('base64url');
}

export function signSession(user: SessionUser): string {
  const payload = b64url(JSON.stringify({ u: user.username, exp: Date.now() + MAX_AGE_SEC * 1000 }));
  const sig = createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function readSession(req: FastifyRequest): SessionUser | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  let token: string | undefined;
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === COOKIE) {
      token = decodeURIComponent(rest.join('='));
      break;
    }
  }
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', secret()).update(payload).digest('base64url');
  if (!safeEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      u?: string;
      exp?: number;
    };
    if (!data.u || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    if (!loadUsers().has(data.u)) return null;
    return { username: data.u };
  } catch {
    return null;
  }
}

export function setSessionCookie(reply: FastifyReply, token: string): void {
  const parts = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${MAX_AGE_SEC}`,
    'SameSite=Lax',
  ];
  if (isHttps()) parts.push('Secure');
  reply.header('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(reply: FastifyReply): void {
  const parts = [`${COOKIE}=`, 'HttpOnly', 'Path=/', 'Max-Age=0', 'SameSite=Lax'];
  if (isHttps()) parts.push('Secure');
  reply.header('Set-Cookie', parts.join('; '));
}

