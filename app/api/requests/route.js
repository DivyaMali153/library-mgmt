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
    studentName: payload.studentName || (payload.studentName === '' ? payload.studentName : payload.requestedBy || ''),
    studentId: payload.studentId || '',
    requestedBy: payload.requestedBy || payload.email || '',
    note: payload.note || '',
    ...payload,
  });

  if ((payload.requestType || '').toLowerCase() === 'return') {
    await createNotificationForRole('Librarian', {
      title: `Return request: ${record.title}`,
      type: 'ReturnRequested',
      data: { requestId: record.id, loanId: payload.loanId || payload.bookId || record.id },
    });
    return Response.json(record, { status: 201 });
  }

  // notify librarians about new request
  await createNotificationForRole('Librarian', { title: `New book request: ${record.title}`, type: 'RequestCreated', data: { requestId: record.id } });
  return Response.json(record, { status: 201 });
}

export async function PUT(request) {
  const payload = await request.json();
  const updated = await updateRecord('requests.json', payload.id, payload);

  if (payload.requestType !== 'return' && payload.status === 'Accepted') {
    const loanRecords = await readJsonCollection('loans.json');
    const sameStudentAndBook = loanRecords.find((loan) => {
      const studentMatch = (loan.borrower || loan.studentEmail || loan.requestedBy || '').toLowerCase() === String(payload.requestedBy || '').toLowerCase();
      const bookMatch = (loan.bookId || loan.title || '').toLowerCase() === String(payload.bookId || payload.title || '').toLowerCase();
      return studentMatch && bookMatch && loan.status === 'Active';
    });

    if (!sameStudentAndBook) {
      await createRecord('loans.json', {
        bookId: payload.bookId || '',
        title: payload.title || '',
        borrower: payload.requestedBy || payload.email || '',
        borrowerName: payload.studentName || '',
        studentEmail: payload.requestedBy || payload.email || '',
        studentName: payload.studentName || '',
        issueDate: payload.issueDate || new Date().toISOString().slice(0, 10),
        dueDate: payload.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        status: 'Active',
        createdAt: new Date().toISOString(),
      });
    }
  }

  if (payload.requestType === 'return' && payload.status === 'Accepted') {
    const loanRecords = await readJsonCollection('loans.json');
    const currentLoan = loanRecords.find((loan) => String(loan.id) === String(payload.loanId || payload.bookId || ''));
    if (currentLoan) {
      await updateRecord('loans.json', currentLoan.id, {
        ...currentLoan,
        status: 'Returned',
        returnDate: payload.returnDate || new Date().toISOString().slice(0, 10),
        returnedAt: payload.handledAt || new Date().toISOString(),
      });
    }
  }

  if (payload.requestedBy) {
    const notificationTitle = payload.requestType === 'return'
      ? `Your return request for "${payload.title}" is ${payload.status}`
      : `Your request "${payload.title}" is ${payload.status}`;

    await createNotificationFor(payload.requestedBy, {
      title: notificationTitle,
      type: payload.requestType === 'return' ? 'ReturnUpdated' : 'RequestUpdated',
      data: { requestId: payload.id, status: payload.status },
      librarianRemarks: payload.librarianRemarks || '',
    });
  }
  return Response.json(updated);
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const deleted = await deleteRecord('requests.json', id);
  return Response.json({ deleted });
}
