import { createRecord, readJsonCollection, updateRecord } from '../../../lib/jsonStore';
import { forbiddenResponse, getSessionUser, isStaff, unauthorizedResponse } from '../../../lib/serverAuth';

async function createNotificationFor(email, eventKey, payload) {
  const notifications = await readJsonCollection('notifications.json');
  const alreadySent = notifications.some((item) => item.eventKey === eventKey
    || (String(item.userEmail || '').toLowerCase() === String(email || '').toLowerCase()
      && item.type === payload.type
      && payload.data
      && Object.entries(payload.data).every(([key, value]) => String(item.data?.[key]) === String(value))));
  if (alreadySent) return;
  await createRecord('notifications.json', {
    userEmail: email,
    eventKey,
    read: false,
    createdAt: new Date().toISOString(),
    ...payload,
  });
}

async function createNotificationForRole(role, eventKey, payload) {
  const users = await readJsonCollection('users.json');
  const recipients = users.filter((user) => String(user.role).toLowerCase() === role.toLowerCase());
  for (const user of recipients) {
    await createNotificationFor(user.email, `${eventKey}:${user.id}`, payload);
  }
}

export async function GET(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  const requests = await readJsonCollection('requests.json');
  return Response.json(isStaff(user)
    ? requests
    : requests.filter((item) => String(item.requestedBy || '').toLowerCase() === String(user.email).toLowerCase()));
}

export async function POST(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (String(user.role).toLowerCase() !== 'student') return forbiddenResponse();

  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const requestType = String(payload.requestType || 'physical').toLowerCase();
  let title = String(payload.title || payload.bookTitle || '').trim();
  if (!['physical', 'ebook', 'return'].includes(requestType) || !title || title.length > 200) {
    return Response.json({ error: 'A valid request type and title are required' }, { status: 400 });
  }

  if (requestType === 'physical' && payload.bookId) {
    const books = await readJsonCollection('books.json');
    const book = books.find((item) => String(item.id) === String(payload.bookId));
    if (!book || Number(book.availableCopies) < 1) return Response.json({ error: 'Book is not currently available' }, { status: 409 });
    title = book.title;
    payload.author = book.author || payload.author;
  }
  if (requestType === 'ebook') {
    const ebooks = await readJsonCollection('ebooks.json');
    const ebook = ebooks.find((item) => String(item.id) === String(payload.ebookId));
    if (!ebook || (ebook.availability || ebook.status) !== 'Available') return Response.json({ error: 'E-book is not available' }, { status: 404 });
    title = ebook.title;
    payload.author = ebook.author || payload.author;
  }

  const existingRequests = await readJsonCollection('requests.json');
  const duplicate = existingRequests.find((item) => {
    const blocksResubmission = item.status === 'Pending' || (requestType === 'ebook' && item.status === 'Accepted');
    if (!blocksResubmission || String(item.requestedBy || '').toLowerCase() !== user.email.toLowerCase()) return false;
    if (requestType === 'return') return item.requestType === 'return' && String(item.loanId) === String(payload.loanId);
    const itemRef = item.ebookId || item.bookId || item.title;
    const payloadRef = payload.ebookId || payload.bookId || title;
    return item.requestType === requestType && String(itemRef).toLowerCase() === String(payloadRef).toLowerCase();
  });
  if (duplicate) {
    if (duplicate.status === 'Pending') {
      await createNotificationForRole('Librarian', `request-created:${duplicate.id}`, {
        title: duplicate.requestType === 'return' ? `Return request: ${duplicate.title}` : `New book request: ${duplicate.title}`,
        type: duplicate.requestType === 'return' ? 'ReturnRequested' : 'RequestCreated',
        data: { requestId: duplicate.id },
      });
      await createNotificationForRole('Administrator', `request-created:${duplicate.id}`, {
        title: `New ${duplicate.requestType} request: ${duplicate.title}`,
        type: 'RequestCreated',
        data: { requestId: duplicate.id },
      });
    }
    return Response.json(duplicate);
  }

  if (requestType === 'physical' && payload.bookId) {
    const loans = await readJsonCollection('loans.json');
    const activeLoan = loans.some((loan) => loan.status === 'Active'
      && String(loan.studentEmail || loan.borrower || loan.requestedBy).toLowerCase() === user.email.toLowerCase()
      && String(loan.bookId) === String(payload.bookId));
    if (activeLoan) return Response.json({ error: 'You already have an active loan for this book' }, { status: 409 });
  }

  if (requestType === 'return') {
    const loans = await readJsonCollection('loans.json');
    const loan = loans.find((item) => String(item.id) === String(payload.loanId) && String(item.status).toLowerCase() === 'active');
    const ownerEmail = loan?.studentEmail || loan?.borrower || loan?.requestedBy;
    if (!loan || String(ownerEmail || '').toLowerCase() !== user.email.toLowerCase()) {
      return Response.json({ error: 'Active loan not found for this student' }, { status: 400 });
    }
  }

  const record = await createRecord('requests.json', {
    requestType,
    title,
    author: String(payload.author || '').trim(),
    bookId: payload.bookId || '',
    ebookId: payload.ebookId || '',
    loanId: payload.loanId || '',
    studentName: user.name || '',
    studentId: user.id || '',
    requestedBy: user.email,
    note: String(payload.note || '').trim(),
    status: 'Pending',
    createdAt: new Date().toISOString(),
  });

  await createNotificationForRole('Librarian', `request-created:${record.id}`, {
    title: requestType === 'return' ? `Return request: ${record.title}` : `New book request: ${record.title}`,
    type: requestType === 'return' ? 'ReturnRequested' : 'RequestCreated',
    data: { requestId: record.id, loanId: record.loanId || '' },
  });
  await createNotificationForRole('Administrator', `request-created:${record.id}`, {
    title: `New ${requestType} request: ${record.title}`,
    type: 'RequestCreated',
    data: { requestId: record.id },
  });
  return Response.json(record, { status: 201 });
}

export async function PUT(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (!isStaff(user)) return forbiddenResponse();

  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }
  if (!payload.id) return Response.json({ error: 'Request id is required' }, { status: 400 });

  const records = await readJsonCollection('requests.json');
  const current = records.find((item) => String(item.id) === String(payload.id));
  if (!current) return Response.json({ error: 'Request not found' }, { status: 404 });
  const allowedStatuses = ['Accepted', 'Rejected', 'Issued', 'Not Available'];
  if (!allowedStatuses.includes(payload.status)) return Response.json({ error: 'Invalid request status' }, { status: 400 });
  if (current.status === payload.status) {
    if (current.status === 'Issued' && current.loanId) {
      await createNotificationFor(current.requestedBy, `loan-issued:${current.loanId}`, {
        title: `Book issued: ${current.title}. Due ${current.dueDate}`,
        type: 'BookIssued',
        data: { loanId: current.loanId, dueDate: current.dueDate },
      });
    }
    await createNotificationFor(current.requestedBy, `request-status:${current.id}:${current.status}`, {
      title: `Your request "${current.title}" is ${current.status}`,
      type: current.requestType === 'return' ? 'ReturnUpdated' : 'RequestUpdated',
      data: { requestId: current.id, status: current.status },
      librarianRemarks: current.librarianRemarks || '',
    });
    return Response.json(current);
  }
  if (payload.status === 'Issued' && current.requestType !== 'physical') {
    return Response.json({ error: 'Only physical book requests can be issued' }, { status: 400 });
  }
  if (current.status !== 'Pending' && !(current.status === 'Accepted' && payload.status === 'Issued')) {
    return Response.json({ error: 'This request has already been handled' }, { status: 409 });
  }
  if (current.requestType === 'ebook' && payload.status === 'Issued') {
    return Response.json({ error: 'E-book requests cannot issue physical loans' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updates = {
    status: payload.status,
    librarianRemarks: String(payload.librarianRemarks || '').trim(),
    handledAt: now,
  };
  if (payload.loanId) updates.loanId = payload.loanId;
  if (payload.issueDate) updates.issueDate = payload.issueDate;
  if (payload.dueDate) updates.dueDate = payload.dueDate;
  if (payload.returnDate) updates.returnDate = payload.returnDate;

  if (payload.status === 'Issued') {
    const bookId = payload.bookId || current.bookId;
    const books = await readJsonCollection('books.json');
    const book = books.find((item) => String(item.id) === String(bookId));
    if (!book || Number(book.availableCopies) < 1) return Response.json({ error: 'Book is not currently available' }, { status: 409 });
    const loans = await readJsonCollection('loans.json');
    const duplicateLoan = loans.some((loan) => loan.status === 'Active'
      && String(loan.studentEmail || loan.borrower || loan.requestedBy).toLowerCase() === String(current.requestedBy).toLowerCase()
      && String(loan.bookId || loan.title) === String(book.id));
    if (duplicateLoan) return Response.json({ error: 'Student already has an active loan for this book' }, { status: 409 });

    const issueDate = new Date().toISOString().slice(0, 10);
    const dueDate = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    const loan = await createRecord('loans.json', {
      bookId: book.id,
      title: book.title,
      borrower: current.requestedBy,
      borrowerName: current.studentName || '',
      studentEmail: current.requestedBy,
      studentName: current.studentName || '',
      issueDate,
      issuedAt: now,
      dueDate,
      dueAt: `${dueDate}T23:59:59.999Z`,
      status: 'Active',
      createdAt: now,
    });
    const availableCopies = Number(book.availableCopies) - 1;
    await updateRecord('books.json', book.id, { availableCopies, status: availableCopies > 0 ? 'Available' : 'Not Available' });
    updates.bookId = book.id;
    updates.title = book.title;
    updates.loanId = loan.id;
    updates.issueDate = issueDate;
    updates.dueDate = dueDate;
  }

  if (current.requestType === 'return' && payload.status === 'Accepted') {
    const loanId = current.loanId || current.bookId;
    const loans = await readJsonCollection('loans.json');
    const loan = loans.find((item) => String(item.id) === String(loanId));
    if (!loan || loan.status !== 'Active') return Response.json({ error: 'Active loan not found' }, { status: 409 });
    updates.returnDate = new Date().toISOString().slice(0, 10);
    await updateRecord('loans.json', loan.id, {
      status: 'Returned',
      returnDate: updates.returnDate,
      returnedAt: now,
    });
    if (loan.bookId) {
      const books = await readJsonCollection('books.json');
      const book = books.find((item) => String(item.id) === String(loan.bookId));
      if (book) {
        const availableCopies = Number(book.availableCopies || 0) + 1;
        await updateRecord('books.json', book.id, { availableCopies, status: 'Available' });
      }
    }
  }

  const updated = await updateRecord('requests.json', current.id, updates);
  if (payload.status === 'Issued' && updated.loanId) {
    await createNotificationFor(current.requestedBy, `loan-issued:${updated.loanId}`, {
      title: `Book issued: ${updated.title}. Due ${updated.dueDate}`,
      type: 'BookIssued',
      data: { loanId: updated.loanId, dueDate: updated.dueDate },
    });
  }
  if (current.status !== updated.status && current.requestedBy) {
    const label = current.requestType === 'return' ? 'return request' : 'request';
    await createNotificationFor(current.requestedBy, `request-status:${current.id}:${updated.status}`, {
      title: `Your ${label} "${current.title}" is ${updated.status}`,
      type: current.requestType === 'return' ? 'ReturnUpdated' : 'RequestUpdated',
      data: { requestId: current.id, status: updated.status },
      librarianRemarks: updated.librarianRemarks || '',
    });
  }
  return Response.json(updated);
}
