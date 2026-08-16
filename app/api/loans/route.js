import { promises as fs } from 'fs';
import path from 'path';
import { updateRecord } from '../../../lib/jsonStore';

const filePath = path.join(process.cwd(), 'data', 'loans.json');

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const json = await fs.readFile(filePath, 'utf8');
  const loans = JSON.parse(json);
  if (email) {
    return Response.json(
      loans.filter((loan) => {
        const borrowerEmail = (loan.borrower || loan.studentEmail || loan.requestedBy || '').toLowerCase();
        return borrowerEmail === String(email).toLowerCase();
      }),
    );
  }
  return Response.json(loans);
}

export async function POST(request) {
  const payload = await request.json();
  const json = await fs.readFile(filePath, 'utf8');
  const loans = JSON.parse(json);
  const loan = {
    id: crypto.randomUUID(),
    borrower: payload.borrower || payload.studentEmail || payload.requestedBy || '',
    borrowerName: payload.borrowerName || payload.studentName || payload.borrower || '',
    ...payload,
  };
  loans.push(loan);
  await fs.writeFile(filePath, JSON.stringify(loans, null, 2));
  return Response.json(loan, { status: 201 });
}

export async function PUT(request) {
  const payload = await request.json();
  const updated = await updateRecord('loans.json', payload.id, payload);
  return Response.json(updated);
}
