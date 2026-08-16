import { createRecord, deleteRecord, readJsonCollection, updateRecord } from '../../../lib/jsonStore';

export async function GET() {
  const ebooks = await readJsonCollection('ebooks.json');
  return Response.json(ebooks);
}

export async function POST(request) {
  const payload = await request.json();
  const record = await createRecord('ebooks.json', payload);
  return Response.json(record, { status: 201 });
}

export async function PUT(request) {
  const payload = await request.json();
  const updated = await updateRecord('ebooks.json', payload.id, payload);
  return Response.json(updated);
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const deleted = await deleteRecord('ebooks.json', id);
  return Response.json({ deleted });
}
