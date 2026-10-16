import { createRecord, deleteRecord, readJsonCollection, updateRecord } from '../../../lib/jsonStore';
import { forbiddenResponse, getSessionUser, isStaff, unauthorizedResponse } from '../../../lib/serverAuth';

export async function GET(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (!isStaff(user)) return forbiddenResponse();

  const [borrowers, users, loans, requests, fines] = await Promise.all([
    readJsonCollection('borrowers.json'),
    readJsonCollection('users.json'),
    readJsonCollection('loans.json'),
    readJsonCollection('requests.json'),
    readJsonCollection('fines.json'),
  ]);
  const profiles = new Map();
  for (const student of users.filter((item) => String(item.role).toLowerCase() === 'student')) {
    const email = String(student.email || '').toLowerCase();
    profiles.set(email, { ...student, membership: student.membership || 'Active' });
  }
  for (const borrower of borrowers) {
    const email = String(borrower.email || '').toLowerCase();
    profiles.set(email, { ...profiles.get(email), ...borrower });
  }

  const result = [...profiles.values()].map((profile) => {
    const email = String(profile.email || '').toLowerCase();
    const borrowerLoans = loans.filter((loan) => String(loan.studentEmail || loan.borrower || loan.requestedBy || '').toLowerCase() === email);
    const borrowerRequests = requests.filter((item) => String(item.requestedBy || '').toLowerCase() === email);
    const borrowerFines = fines.filter((fine) => String(fine.studentEmail || '').toLowerCase() === email);
    return {
      ...profile,
      loans: borrowerLoans,
      borrowedBooks: borrowerLoans.filter((loan) => loan.status === 'Active').map((loan) => loan.title),
      loanHistory: borrowerLoans,
      requestHistory: borrowerRequests,
      fines: borrowerFines,
      outstandingFines: borrowerFines.filter((fine) => fine.paymentStatus !== 'Paid').reduce((sum, fine) => sum + Number(fine.amount || 0), 0),
    };
  });
  return Response.json(result);
}

export async function POST(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (!isStaff(user)) return forbiddenResponse();
  const payload = await request.json();
  const email = String(payload.email || '').trim().toLowerCase();
  if (!String(payload.name || '').trim() || !email || !email.includes('@')) {
    return Response.json({ error: 'A name and valid email are required' }, { status: 400 });
  }
  const existing = [...await readJsonCollection('borrowers.json'), ...await readJsonCollection('users.json')];
  if (existing.some((item) => String(item.email || '').toLowerCase() === email)) {
    return Response.json({ error: 'A borrower with this email already exists' }, { status: 409 });
  }
  const record = await createRecord('borrowers.json', { ...payload, email, name: String(payload.name).trim() });
  return Response.json(record, { status: 201 });
}

export async function PUT(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (!isStaff(user)) return forbiddenResponse();
  const payload = await request.json();
  if (!payload.id) return Response.json({ error: 'Borrower id is required' }, { status: 400 });
  const users = await readJsonCollection('users.json');
  const userRecord = users.find((item) => String(item.id) === String(payload.id) && String(item.role).toLowerCase() === 'student');
  const normalizedEmail = String(payload.email || '').trim().toLowerCase();
  if (!String(payload.name || '').trim() || !normalizedEmail.includes('@')) {
    return Response.json({ error: 'A name and valid email are required' }, { status: 400 });
  }
  const duplicate = [...users, ...await readJsonCollection('borrowers.json')].some((item) => String(item.id) !== String(payload.id) && String(item.email || '').toLowerCase() === normalizedEmail);
  if (duplicate) return Response.json({ error: 'A borrower with this email already exists' }, { status: 409 });
  const updated = userRecord
    ? await updateRecord('users.json', payload.id, { name: String(payload.name).trim(), email: normalizedEmail, phone: payload.phone, membership: payload.membership })
    : await updateRecord('borrowers.json', payload.id, { ...payload, name: String(payload.name).trim(), email: normalizedEmail });
  if (!updated) return Response.json({ error: 'Borrower not found' }, { status: 404 });
  return Response.json(updated);
}

export async function DELETE(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (!isStaff(user)) return forbiddenResponse();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const users = await readJsonCollection('users.json');
  if (users.some((item) => String(item.id) === String(id))) {
    return Response.json({ error: 'Registered student profiles cannot be deleted from borrower management' }, { status: 409 });
  }
  const [loans, requests, fines] = await Promise.all([
    readJsonCollection('loans.json'),
    readJsonCollection('requests.json'),
    readJsonCollection('fines.json'),
  ]);
  const email = (await readJsonCollection('borrowers.json')).find((item) => String(item.id) === String(id))?.email;
  if (email && [...loans, ...requests, ...fines].some((item) => String(item.studentEmail || item.borrower || item.requestedBy || '').toLowerCase() === String(email).toLowerCase())) {
    return Response.json({ error: 'Borrowers with transaction history cannot be deleted' }, { status: 409 });
  }
  const deleted = await deleteRecord('borrowers.json', id);
  return Response.json({ deleted });
}
