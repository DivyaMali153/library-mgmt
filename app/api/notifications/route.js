
import { createRecord, readJsonCollection, updateRecord } from '../../../lib/jsonStore';
import { forbiddenResponse, getSessionUser, isStaff, unauthorizedResponse } from '../../../lib/serverAuth';

export async function GET(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  const notifications = await readJsonCollection('notifications.json');
  return Response.json(notifications.filter((item) => String(item.userEmail || '').toLowerCase() === user.email.toLowerCase()));
}

export async function POST(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (!isStaff(user)) return forbiddenResponse();
  const payload = await request.json();
  const record = await createRecord('notifications.json', { read: false, createdAt: new Date().toISOString(), ...payload });
  return Response.json(record, { status: 201 });
}

export async function PUT(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  const payload = await request.json();
  if (!payload.id) return Response.json({ error: 'missing id' }, { status: 400 });
  const records = await readJsonCollection('notifications.json');
  const current = records.find((item) => String(item.id) === String(payload.id));
  if (!current) return Response.json({ error: 'notification not found' }, { status: 404 });
  if (String(current.userEmail || '').toLowerCase() !== user.email.toLowerCase()) return forbiddenResponse();
  const updated = await updateRecord('notifications.json', payload.id, { read: Boolean(payload.read) });
  return Response.json(updated);
}
