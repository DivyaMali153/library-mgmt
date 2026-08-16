import { promises as fs } from 'fs';
import path from 'path';
import { updateRecord } from '../../../lib/jsonStore';

const filePath = path.join(process.cwd(), 'data', 'users.json');

export async function GET() {
  const json = await fs.readFile(filePath, 'utf8');
  return Response.json(JSON.parse(json));
}

export async function POST(request) {
  const payload = await request.json();
  const json = await fs.readFile(filePath, 'utf8');
  const users = JSON.parse(json);
  const user = { id: crypto.randomUUID(), ...payload };
  users.push(user);
  await fs.writeFile(filePath, JSON.stringify(users, null, 2));
  return Response.json(user, { status: 201 });
}

export async function PUT(request) {
  const payload = await request.json();
  const updated = await updateRecord('users.json', payload.id, payload);
  return Response.json(updated);
}
