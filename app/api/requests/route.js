import { createRecord, deleteRecord, readJsonCollection, updateRecord } from '../../../lib/jsonStore';

async function createNotificationFor(email, payload) {
  const users = await readJsonCollection('users.json');
  const target = users.find((u) => (u.email || '') === email);
  if (target) {
    await createRecord('notifications.json', { userEmail: email, read: false, createdAt: new Date().toISOString(), ...payload });
  }
}

async function createNotificationForRole(role, payload) {
  const users = await readJsonCollection('users.json');
  const targets = users.filter((u) => u.role === role);
  for (const t of targets) {
    await createRecord('notifications.json', { userEmail: t.email, read: false, createdAt: new Date().toISOString(), ...payload });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const studentId = searchParams.get('studentId');
  const requests = await readJsonCollection('requests.json');

  if (email !== null) {
    return Response.json(requests.filter((req) => req.requestedBy === email));
  }
  if (studentId !== null) {
    return Response.json(requests.filter((req) => req.studentId === studentId));
  }
  return Response.json(requests);
}

export async function POST(request) {
  const payload = await request.json();
  const record = await createRecord('requests.json', {
    status: 'Pending',
    createdAt: new Date().toISOString(),
    title: payload.title || payload.bookTitle || '',
    studentName: payload.studentName || payload.studentName === '' ? payload.studentName : payload.requestedBy || '',
    studentId: payload.studentId || '',
    requestedBy: payload.requestedBy || payload.email || '',
    note: payload.note || '',
    ...payload,
  });
  // notify librarians about new request
  await createNotificationForRole('Librarian', { title: `New book request: ${record.title}`, type: 'RequestCreated', data: { requestId: record.id } });
  return Response.json(record, { status: 201 });
}

export async function PUT(request) {
  const payload = await request.json();
  const updated = await updateRecord('requests.json', payload.id, payload);
  // notify student when status changes
  if (payload.requestedBy) {
    await createNotificationFor(payload.requestedBy, { title: `Your request "${payload.title}" is ${payload.status}`, type: 'RequestUpdated', data: { requestId: payload.id, status: payload.status }, librarianRemarks: payload.librarianRemarks || '' });
  }
  return Response.json(updated);
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const deleted = await deleteRecord('requests.json', id);
  return Response.json({ deleted });
}
