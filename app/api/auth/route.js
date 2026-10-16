import { createSession, getSessionUser, publicUser, revokeSession, sessionCookie } from '../../../lib/serverAuth';
import { readJsonCollection } from '../../../lib/jsonStore';

export async function GET(request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ user: null }, { status: 401 });
  return Response.json({ user: publicUser(user) });
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  const users = await readJsonCollection('users.json');
  const user = users.find((item) => String(item.email || '').toLowerCase() === email && item.password === password);
  if (!user) return Response.json({ error: 'Invalid email or password' }, { status: 401 });

  const token = await createSession(user);
  return Response.json({ user: publicUser(user) }, { headers: { 'Set-Cookie': sessionCookie(token) } });
}

export async function DELETE(request) {
  await revokeSession(request);
  return Response.json({ success: true }, { headers: { 'Set-Cookie': sessionCookie('', 0) } });
}