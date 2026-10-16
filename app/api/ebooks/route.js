import { createRecord, deleteRecord, readJsonCollection, updateRecord } from '../../../lib/jsonStore';
import { forbiddenResponse, getSessionUser, isStaff, unauthorizedResponse } from '../../../lib/serverAuth';
import { promises as fs } from 'fs';
import path from 'path';

function duplicateBook(ebooks, payload, currentId) {
  const title = String(payload.title || '').trim().toLowerCase();
  const author = String(payload.author || '').trim().toLowerCase();
  return ebooks.some((ebook) => String(ebook.id) !== String(currentId || '')
    && String(ebook.title || '').trim().toLowerCase() === title
    && String(ebook.author || '').trim().toLowerCase() === author);
}

export async function GET() {
  const ebooks = await readJsonCollection('ebooks.json');
  return Response.json(ebooks);
}

export async function POST(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (!isStaff(user)) return forbiddenResponse();
  const payload = await request.json();
  const ebooks = await readJsonCollection('ebooks.json');
  const category = String(payload.category || payload.subject || '').trim();
  if (!String(payload.title || '').trim() || !String(payload.author || '').trim() || !category || !String(payload.pdfUrl || '').trim()) {
    return Response.json({ error: 'Title, author, category, and a PDF are required' }, { status: 400 });
  }
  if (duplicateBook(ebooks, payload)) return Response.json({ error: 'An e-book with this title and author already exists' }, { status: 409 });
  const record = await createRecord('ebooks.json', {
    ...payload,
    title: String(payload.title).trim(),
    author: String(payload.author).trim(),
    category,
    subject: category,
    description: String(payload.description || '').trim(),
    status: 'Available',
    availability: 'Available',
    createdAt: new Date().toISOString(),
  });
  return Response.json(record, { status: 201 });
}

export async function PUT(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (!isStaff(user)) return forbiddenResponse();
  const payload = await request.json();
  const ebooks = await readJsonCollection('ebooks.json');
  const current = ebooks.find((ebook) => String(ebook.id) === String(payload.id));
  if (!current) return Response.json({ error: 'E-book not found' }, { status: 404 });
  const category = String(payload.category || payload.subject || current.category || '').trim();
  const updates = {
    title: String(payload.title || '').trim(),
    author: String(payload.author || '').trim(),
    category,
    subject: category,
    description: String(payload.description || '').trim(),
  };
  if (!updates.title || !updates.author || !updates.category) return Response.json({ error: 'Title, author, and category are required' }, { status: 400 });
  if (duplicateBook(ebooks, updates, current.id)) return Response.json({ error: 'An e-book with this title and author already exists' }, { status: 409 });
  const updated = await updateRecord('ebooks.json', current.id, updates);
  return Response.json(updated);
}

export async function DELETE(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (!isStaff(user)) return forbiddenResponse();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const ebooks = await readJsonCollection('ebooks.json');
  const target = ebooks.find((ebook) => String(ebook.id) === String(id));
  if (!target) return Response.json({ error: 'E-book not found' }, { status: 404 });
  const deleted = await deleteRecord('ebooks.json', id);
  if (deleted && target.storageFilename) {
    await fs.unlink(path.join(process.cwd(), 'data', 'ebooks', path.basename(target.storageFilename))).catch(() => {});
  }
  return Response.json({ deleted });
}
