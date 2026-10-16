import { createHash, randomBytes, randomUUID } from 'crypto';
import { readJsonCollection, writeJsonCollection } from './jsonStore';

const COOKIE_NAME = 'librarySession';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function getCookie(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const sessionCookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return sessionCookie ? decodeURIComponent(sessionCookie.slice(COOKIE_NAME.length + 1)) : '';
}

export function sessionCookie(token, maxAge = SESSION_TTL_MS / 1000) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

export async function createSession(user) {
  const token = randomBytes(32).toString('hex');
  const sessions = await readJsonCollection('sessions.json');
  sessions.push({
    id: randomUUID(),
    tokenHash: hashToken(token),
    userId: user.id,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  });
  await writeJsonCollection('sessions.json', sessions);
  return token;
}

export async function getSessionUser(request) {
  const token = getCookie(request);
  if (!token) return null;

  const sessions = await readJsonCollection('sessions.json');
  const tokenHash = hashToken(token);
  const session = sessions.find((item) => item.tokenHash === tokenHash);
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) return null;

  const users = await readJsonCollection('users.json');
  return users.find((user) => String(user.id) === String(session.userId)) || null;
}

export async function revokeSession(request) {
  const token = getCookie(request);
  if (!token) return;
  const tokenHash = hashToken(token);
  const sessions = await readJsonCollection('sessions.json');
  await writeJsonCollection('sessions.json', sessions.filter((item) => item.tokenHash !== tokenHash));
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