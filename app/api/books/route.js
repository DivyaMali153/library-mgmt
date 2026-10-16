import { createRecord, deleteRecord, readJsonCollection, updateRecord } from '../../../lib/jsonStore';
import { forbiddenResponse, getSessionUser, isStaff, unauthorizedResponse } from '../../../lib/serverAuth';

export async function GET() {
  const books = await readJsonCollection('books.json');
  return Response.json(books);
}

export async function POST(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (!isStaff(user)) return forbiddenResponse();
  const payload = await request.json();
  const title = String(payload.title || '').trim();
  const author = String(payload.author || '').trim();
  const subject = String(payload.subject || payload.category || '').trim();
  const availableCopies = Number(payload.availableCopies);
  if (!title || !author || !subject || !Number.isInteger(availableCopies) || availableCopies < 0) {
    return Response.json({ error: 'Title, author, category, and a non-negative whole-number copy count are required' }, { status: 400 });
  }
  const books = await readJsonCollection('books.json');
  if (payload.isbn && books.some((book) => String(book.isbn || '').toLowerCase() === String(payload.isbn).trim().toLowerCase())) {
    return Response.json({ error: 'A book with this ISBN already exists' }, { status: 409 });
  }
  if (books.some((book) => book.title.trim().toLowerCase() === title.toLowerCase() && book.author.trim().toLowerCase() === author.toLowerCase())) {
    return Response.json({ error: 'This book already exists in the catalogue' }, { status: 409 });
  }
  const record = await createRecord('books.json', { ...payload, title, author, subject, availableCopies, status: availableCopies > 0 ? 'Available' : 'Not Available' });
  return Response.json(record, { status: 201 });
}

export async function PUT(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (!isStaff(user)) return forbiddenResponse();
  const payload = await request.json();
  const books = await readJsonCollection('books.json');
  const current = books.find((book) => String(book.id) === String(payload.id));
  if (!current) return Response.json({ error: 'Book not found' }, { status: 404 });
  const title = String(payload.title || '').trim();
  const author = String(payload.author || '').trim();
  const subject = String(payload.subject || payload.category || '').trim();
  const availableCopies = Number(payload.availableCopies);
  if (!title || !author || !subject || !Number.isInteger(availableCopies) || availableCopies < 0) {
    return Response.json({ error: 'Title, author, category, and a non-negative whole-number copy count are required' }, { status: 400 });
  }
  if (books.some((book) => String(book.id) !== String(current.id) && payload.isbn && String(book.isbn || '').toLowerCase() === String(payload.isbn).trim().toLowerCase())) {
    return Response.json({ error: 'A book with this ISBN already exists' }, { status: 409 });
  }
  const duplicateTitle = books.some((book) => String(book.id) !== String(current.id) && book.title.trim().toLowerCase() === title.toLowerCase() && book.author.trim().toLowerCase() === author.toLowerCase());
  if (duplicateTitle) return Response.json({ error: 'This book already exists in the catalogue' }, { status: 409 });
  const updated = await updateRecord('books.json', current.id, { ...payload, title, author, subject, availableCopies, status: availableCopies > 0 ? 'Available' : 'Not Available' });
  return Response.json(updated);
}

export async function DELETE(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (!isStaff(user)) return forbiddenResponse();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const loans = await readJsonCollection('loans.json');
  if (loans.some((loan) => String(loan.bookId) === String(id) && loan.status === 'Active')) {
    return Response.json({ error: 'A book with an active loan cannot be deleted' }, { status: 409 });
  }
  const deleted = await deleteRecord('books.json', id);
  return Response.json({ deleted });
}
