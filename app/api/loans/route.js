import { createRecord, deleteRecord, readJsonCollection, updateRecord, writeJsonCollection } from '../../../lib/jsonStore';
import { forbiddenResponse, getSessionUser, isStaff, unauthorizedResponse } from '../../../lib/serverAuth';
import { syncOverdueFines } from '../../../lib/fineUtils';

export async function GET(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  const loans = await readJsonCollection('loans.json');
  if (isStaff(user)) return Response.json(loans);
  return Response.json(loans.filter((loan) => {
    const borrowerEmail = loan.studentEmail || loan.borrower || loan.requestedBy || '';
    return borrowerEmail.toLowerCase() === user.email.toLowerCase();
  }));
}

export async function POST(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (!isStaff(user)) return forbiddenResponse();
  const payload = await request.json();
  const borrowerEmail = String(payload.studentEmail || payload.borrower || payload.requestedBy || '').trim().toLowerCase();
  const title = String(payload.title || '').trim();
  if (!title || !borrowerEmail) return Response.json({ error: 'Book title and student email are required' }, { status: 400 });

  const status = payload.status === 'Returned' ? 'Returned' : 'Active';
  const loans = await readJsonCollection('loans.json');

  if (status === 'Active') {
    const activeDuplicate = loans.find((loan) => {
      const loanEmail = String(loan.studentEmail || loan.borrower || loan.requestedBy || '').toLowerCase();
      return loan.status === 'Active' && loanEmail === borrowerEmail && String(loan.bookId || loan.title) === String(payload.bookId || title);
    });
    if (activeDuplicate) return Response.json({ error: 'This student already has an active issue record for this book' }, { status: 409 });
  }

  const books = await readJsonCollection('books.json');
  const book = books.find((item) => String(item.id) === String(payload.bookId));
  if (status === 'Active' && payload.bookId && (!book || Number(book.availableCopies) < 1)) {
    return Response.json({ error: 'Book is not currently available' }, { status: 409 });
  }

  const now = new Date();
  const issueDate = payload.issueDate || now.toISOString().slice(0, 10);
  const dueDate = payload.dueDate || new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const returnDate = status === 'Returned' ? (payload.returnDate || issueDate) : null;
  const returnedAt = status === 'Returned' ? now.toISOString() : null;

  const loan = await createRecord('loans.json', {
    bookId: payload.bookId || '',
    title,
    borrower: borrowerEmail,
    borrowerName: payload.borrowerName || payload.studentName || borrowerEmail.split('@')[0],
    studentEmail: borrowerEmail,
    studentName: payload.studentName || payload.borrowerName || borrowerEmail.split('@')[0],
    issueDate,
    issuedAt: now.toISOString(),
    dueDate,
    dueAt: `${dueDate}T23:59:59.999Z`,
    status,
    returnDate,
    returnedAt,
    remarks: String(payload.remarks || '').trim(),
    createdAt: now.toISOString(),
  });

  if (status === 'Active' && book) {
    const availableCopies = Number(book.availableCopies) - 1;
    await updateRecord('books.json', book.id, {
      availableCopies,
      status: availableCopies > 0 ? 'Available' : 'Not Available',
    });
  }

  const notifications = await readJsonCollection('notifications.json');
  if (status === 'Active' && !notifications.some((item) => item.eventKey === `loan-issued:${loan.id}`)) {
    await createRecord('notifications.json', {
      userEmail: borrowerEmail,
      eventKey: `loan-issued:${loan.id}`,
      read: false,
      createdAt: now.toISOString(),
      title: `Book issued: ${loan.title}. Due ${loan.dueDate}`,
      type: 'BookIssued',
      data: { loanId: loan.id, dueDate: loan.dueDate },
    });
  }

  if (status === 'Returned') {
    try {
      await syncOverdueFines();
    } catch {}
  }

  return Response.json(loan, { status: 201 });
}

export async function PUT(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  const payload = await request.json();
  const loans = await readJsonCollection('loans.json');
  const current = loans.find((loan) => String(loan.id) === String(payload.id));
  if (!current) return Response.json({ error: 'Loan not found' }, { status: 404 });
  const ownerEmail = String(current.studentEmail || current.borrower || current.requestedBy || '').toLowerCase();
  if (!isStaff(user) && ownerEmail !== user.email.toLowerCase()) return forbiddenResponse();
  if (!isStaff(user) && (payload.status !== current.status || payload.returnDate || payload.returnedAt)) return forbiddenResponse();

  const updates = isStaff(user)
    ? { ...payload }
    : { dueDate: payload.dueDate, dueAt: payload.dueDate ? `${payload.dueDate}T23:59:59.999Z` : current.dueAt };
  delete updates.id;

  if (isStaff(user)) {
    if (payload.studentEmail) updates.borrower = payload.studentEmail.toLowerCase();
    if (payload.studentName) updates.borrowerName = payload.studentName;

    // Transition from Active to Returned
    if (payload.status === 'Returned' && current.status !== 'Returned') {
      updates.returnDate = payload.returnDate || new Date().toISOString().slice(0, 10);
      updates.returnedAt = payload.returnedAt || new Date().toISOString();
      if (current.bookId) {
        const books = await readJsonCollection('books.json');
        const book = books.find((item) => String(item.id) === String(current.bookId));
        if (book) {
          const availableCopies = Number(book.availableCopies || 0) + 1;
          await updateRecord('books.json', book.id, { availableCopies, status: 'Available' });
        }
      }
    }

    // Transition from Returned to Active
    if (payload.status === 'Active' && current.status === 'Returned') {
      updates.returnDate = null;
      updates.returnedAt = null;
      if (current.bookId) {
        const books = await readJsonCollection('books.json');
        const book = books.find((item) => String(item.id) === String(current.bookId));
        if (book && Number(book.availableCopies) > 0) {
          const availableCopies = Number(book.availableCopies) - 1;
          await updateRecord('books.json', book.id, { availableCopies, status: availableCopies > 0 ? 'Available' : 'Not Available' });
        }
      }
    }
  }

  const updated = await updateRecord('loans.json', current.id, updates);
  if (current.status !== 'Returned' && updated.status === 'Returned') {
    const notifications = await readJsonCollection('notifications.json');
    if (!notifications.some((item) => item.eventKey === `loan-returned:${current.id}`)) {
      await createRecord('notifications.json', {
        userEmail: ownerEmail,
        eventKey: `loan-returned:${current.id}`,
        read: false,
        createdAt: new Date().toISOString(),
        title: `Book returned: ${current.title}`,
        type: 'BookReturned',
        data: { loanId: current.id },
      });
    }
    try {
      await syncOverdueFines();
    } catch (err) {
      console.error('Error syncing overdue fines on return:', err);
    }
  }
  return Response.json(updated);
}

export async function DELETE(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (!isStaff(user)) return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'Loan ID is required' }, { status: 400 });

  const loans = await readJsonCollection('loans.json');
  const current = loans.find((item) => String(item.id) === String(id));
  if (!current) return Response.json({ error: 'Loan not found' }, { status: 404 });

  // If active loan is deleted, return the book copy to stock
  if (current.status === 'Active' && current.bookId) {
    const books = await readJsonCollection('books.json');
    const book = books.find((b) => String(b.id) === String(current.bookId));
    if (book) {
      const availableCopies = Number(book.availableCopies || 0) + 1;
      await updateRecord('books.json', book.id, { availableCopies, status: 'Available' });
    }
  }

  const deleted = await deleteRecord('loans.json', id);
  return Response.json({ success: deleted });
}
