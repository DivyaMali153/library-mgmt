import { createHmac, timingSafeEqual } from 'crypto';
import { readJsonCollection } from './jsonStore';

const COOKIE_NAME = 'librarySession';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEVELOPMENT_SECRET = 'library-management-local-development-secret';

export class AuthConfigurationError extends Error {}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV !== 'production' && !secret) return DEVELOPMENT_SECRET;

  throw new AuthConfigurationError('AUTH_SECRET must be set to at least 32 characters');
}

function sign(payload) {
  return createHmac('sha256', getAuthSecret()).update(payload).digest();
}

function getCookie(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const sessionCookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!sessionCookie) return '';

  try {
    return decodeURIComponent(sessionCookie.slice(COOKIE_NAME.length + 1));
  } catch {
    return '';
  }
}

export function sessionCookie(token, maxAge = SESSION_TTL_MS / 1000) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

export async function createSession(user) {
  const payload = Buffer.from(JSON.stringify({
    userId: String(user.id),
    expiresAt: Date.now() + SESSION_TTL_MS,
  })).toString('base64url');
  return `${payload}.${sign(payload).toString('base64url')}`;
}

export async function getSessionUser(request) {
  const token = getCookie(request);
  if (!token) return null;

  const separator = token.lastIndexOf('.');
  if (separator < 1) return null;

  const payload = token.slice(0, separator);
  const signature = Buffer.from(token.slice(separator + 1), 'base64url');
  const expectedSignature = sign(payload);
  if (signature.length !== expectedSignature.length || !timingSafeEqual(signature, expectedSignature)) return null;

  let session;
  try {
    session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (
    typeof session.userId !== 'string' ||
    !Number.isFinite(session.expiresAt) ||
    session.expiresAt <= Date.now()
  ) return null;

  const users = await readJsonCollection('users.json');
  return users.find((user) => String(user.id) === session.userId) || null;
}

export function publicUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

export function isStaff(user) {
  return ['administrator', 'librarian'].includes(String(user?.role || '').toLowerCase());
}

export function unauthorizedResponse() {
  return Response.json({ error: 'Authentication required' }, { status: 401 });
}

export function forbiddenResponse() {
  return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
}