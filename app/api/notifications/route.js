
import { createRecord, readJsonCollection, updateRecord } from '../../../lib/jsonStore';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const notifications = await readJsonCollection('notifications.json');
  if (email) {
    return Response.json(notifications.filter((n) => n.userEmail === email));
  }
  return Response.json(notifications);
}

export async function POST(request) {
  const payload = await request.json();
  const record = await createRecord('notifications.json', { read: false, createdAt: new Date().toISOString(), ...payload });
  return Response.json(record, { status: 201 });
}

export async function PUT(request) {
  const payload = await request.json();
  if (!payload.id) return Response.json({ error: 'missing id' }, { status: 400 });
  const updated = await updateRecord('notifications.json', payload.id, payload);
  return Response.json(updated);
}
