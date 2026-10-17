import { createRecord, readJsonCollection, updateRecord } from '../../../lib/jsonStore';
import { forbiddenResponse, getSessionUser, isStaff, unauthorizedResponse } from '../../../lib/serverAuth';
import { syncOverdueFines } from '../../../lib/fineUtils';

export async function GET(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();

  // Ensure any newly overdue loans or fine updates are synced and notifications dispatched
  try {
    await syncOverdueFines();
  } catch (err) {
    console.error('Error syncing overdue fines in notifications route:', err);
  }

  const notifications = await readJsonCollection('notifications.json');
  const userEmail = String(user.email || '').trim().toLowerCase();
  const userNotifications = notifications
    .filter((item) => String(item.userEmail || '').trim().toLowerCase() === userEmail)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return Response.json(userNotifications);
}

export async function POST(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (!isStaff(user)) return forbiddenResponse();
  const payload = await request.json();
  const record = await createRecord('notifications.json', {
    read: false,
    createdAt: new Date().toISOString(),
    ...payload,
    userEmail: String(payload.userEmail || '').trim().toLowerCase(),
  });
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
  if (String(current.userEmail || '').trim().toLowerCase() !== String(user.email || '').trim().toLowerCase()) {
    return forbiddenResponse();
  }
  const updated = await updateRecord('notifications.json', payload.id, { read: Boolean(payload.read) });
  return Response.json(updated);
}
