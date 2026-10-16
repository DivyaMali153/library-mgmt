import { promises as fs } from 'fs';
import path from 'path';
import { updateRecord } from '../../../lib/jsonStore';
import { forbiddenResponse, getSessionUser, isStaff, publicUser, unauthorizedResponse } from '../../../lib/serverAuth';

const filePath = path.join(process.cwd(), 'data', 'users.json');

export async function GET(request) {
  const currentUser = await getSessionUser(request);
  if (!currentUser) return unauthorizedResponse();
  const json = await fs.readFile(filePath, 'utf8');
  const users = JSON.parse(json);
  return Response.json(isStaff(currentUser) ? users.map(publicUser) : [publicUser(currentUser)]);
}

export async function POST(request) {
  const currentUser = await getSessionUser(request);
  if (!currentUser) return unauthorizedResponse();
  if (!isStaff(currentUser)) return forbiddenResponse();
  const payload = await request.json();
  const json = await fs.readFile(filePath, 'utf8');
  const users = JSON.parse(json);
  const user = { id: crypto.randomUUID(), ...payload };
  users.push(user);
  await fs.writeFile(filePath, JSON.stringify(users, null, 2));
  return Response.json(publicUser(user), { status: 201 });
}

export async function PUT(request) {
  const currentUser = await getSessionUser(request);
  if (!currentUser) return unauthorizedResponse();
  const payload = await request.json();
  if (!isStaff(currentUser)) {
    if (String(currentUser.id) !== String(payload.id)) return forbiddenResponse();
    const name = String(payload.name || '').trim();
    if (!name) return Response.json({ error: 'Name is required' }, { status: 400 });
    const updatedSelf = await updateRecord('users.json', currentUser.id, { name, phone: String(payload.phone || '').trim() });
    return Response.json(publicUser(updatedSelf));
  }
  const updated = await updateRecord('users.json', payload.id, payload);
  return Response.json(publicUser(updated));
}
