import { createRecord, deleteRecord, readJsonCollection, updateRecord } from '../../../lib/jsonStore';

export async function GET() {
  const books = await readJsonCollection('books.json');
  return Response.json(books);
}

export async function POST(request) {
  const payload = await request.json();
  const record = await createRecord('books.json', payload);
  return Response.json(record, { status: 201 });
}

export async function PUT(request) {
  const payload = await request.json();
  const updated = await updateRecord('books.json', payload.id, payload);
  return Response.json(updated);
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const deleted = await deleteRecord('books.json', id);
  return Response.json({ deleted });
}
