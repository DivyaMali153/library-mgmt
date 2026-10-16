import { AuthConfigurationError, createSession, getSessionUser, publicUser, sessionCookie } from '../../../lib/serverAuth';
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

  let token;
  try {
    token = await createSession(user);
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return Response.json({ error: 'Authentication is not configured on the server' }, { status: 500 });
    }
    throw error;
  }
  return Response.json({ user: publicUser(user) }, { headers: { 'Set-Cookie': sessionCookie(token) } });
}

export async function DELETE(request) {
  return Response.json({ success: true }, { headers: { 'Set-Cookie': sessionCookie('', 0) } });
}