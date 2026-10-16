import { createRecord, readJsonCollection, readJsonData, updateRecord, writeJsonData } from '../../../lib/jsonStore';
import { forbiddenResponse, getSessionUser, isStaff, unauthorizedResponse } from '../../../lib/serverAuth';

const dayMs = 24 * 60 * 60 * 1000;

async function readSettings() {
  const settings = await readJsonData('library-settings.json');
  return {
    fineRatePerDay: Number(settings?.fineRatePerDay ?? 5),
    paymentDeadlineDays: Number(settings?.paymentDeadlineDays ?? 7),
  };
}

async function createNotification(email, eventKey, title, type, data) {
  const notifications = await readJsonCollection('notifications.json');
  if (notifications.some((item) => item.eventKey === eventKey
    || (String(item.userEmail || '').toLowerCase() === String(email || '').toLowerCase()
      && item.type === type
      && data
      && Object.entries(data).every(([key, value]) => String(item.data?.[key]) === String(value))))) return;
  await createRecord('notifications.json', {
    userEmail: email,
    eventKey,
    read: false,
    createdAt: new Date().toISOString(),
    title,
    type,
    data,
  });
}

async function syncOverdueFines(settings) {
  const loans = await readJsonCollection('loans.json');
  const fines = await readJsonCollection('fines.json');
  const now = new Date();

  for (const loan of loans) {
    if (!loan.dueDate) continue;
    const dueAt = new Date(`${loan.dueDate}T00:00:00`);
    const endAt = loan.status === 'Returned' && loan.returnDate
      ? new Date(`${loan.returnDate}T00:00:00`)
      : now;
    const overdueDays = Math.max(0, Math.floor((endAt.getTime() - dueAt.getTime()) / dayMs));
    if (overdueDays < 1) continue;

    const studentEmail = String(loan.studentEmail || loan.borrower || loan.requestedBy || '').toLowerCase();
    if (!studentEmail) continue;
    const existing = fines.find((fine) => String(fine.loanId) === String(loan.id));
    if (!existing) {
      const createdAt = now.toISOString();
      const fineRatePerDay = Number(settings.fineRatePerDay ?? 5);
      const paymentDeadlineAt = new Date(now.getTime() + Number(settings.paymentDeadlineDays ?? 7) * dayMs).toISOString();
      const fine = await createRecord('fines.json', {
        loanId: loan.id,
        bookId: loan.bookId || '',
        title: loan.title || 'Unknown book',
        studentEmail,
        studentName: loan.studentName || loan.borrowerName || '',
        issueDate: loan.issueDate || '',
        dueDate: loan.dueDate,
        overdueDays,
        fineRatePerDay,
        amount: overdueDays * fineRatePerDay,
        reason: `Returned or outstanding ${overdueDays} day${overdueDays === 1 ? '' : 's'} past the due date`,
        createdAt,
        paymentDeadlineAt,
        paymentStatus: new Date(paymentDeadlineAt).getTime() < now.getTime() ? 'Overdue' : 'Pending',
        paymentHistory: [],
      });
      await createNotification(studentEmail, `fine-created:${loan.id}`, `Book overdue: ${fine.title}. Fine ₹${fine.amount} at ₹${fineRatePerDay} per day. Please return the book and clear the fine.`, 'FineCreated', { fineId: fine.id, loanId: loan.id });
      continue;
    }

    if (existing.paymentStatus === 'Paid') continue;
    const updates = {
      overdueDays,
      fineRatePerDay: Number(settings.fineRatePerDay ?? existing.fineRatePerDay ?? 5),
      amount: overdueDays * Number(settings.fineRatePerDay ?? existing.fineRatePerDay ?? 5),
      reason: `Returned or outstanding ${overdueDays} day${overdueDays === 1 ? '' : 's'} past the due date`,
    };
    const paymentIsLate = new Date(existing.paymentDeadlineAt).getTime() < now.getTime();
    if (existing.paymentStatus !== 'Submitted') updates.paymentStatus = paymentIsLate ? 'Overdue' : 'Pending';
    const updated = await updateRecord('fines.json', existing.id, updates);
    if (updated.paymentStatus === 'Overdue' && existing.paymentStatus !== 'Overdue') {
      await createNotification(studentEmail, `fine-overdue:${existing.id}`, `Fine payment is overdue for ${updated.title}`, 'FineOverdue', { fineId: existing.id });
    }
    if (loan.status === 'Active') {
      const reminderDate = now.toISOString().slice(0, 10);
      if (String(existing.createdAt || '').slice(0, 10) === reminderDate) {
        await createNotification(
          studentEmail,
          `fine-created:${loan.id}`,
          `Book overdue: ${updated.title}. Fine ₹${updated.amount} at ₹${updated.fineRatePerDay} per day. Please return the book and clear the fine.`,
          'FineCreated',
          { fineId: existing.id, loanId: loan.id },
        );
      } else {
        await createNotification(
          studentEmail,
          `overdue-reminder:${loan.id}:${reminderDate}`,
          `Overdue reminder: ${updated.title} is ${overdueDays} day${overdueDays === 1 ? '' : 's'} late. Current fine: ₹${updated.amount} (₹${updated.fineRatePerDay} per day). Please return the book.`,
          'OverdueReminder',
          { loanId: loan.id, reminderDate, overdueDays, amount: updated.amount },
        );
      }
    }
  }
  return readJsonCollection('fines.json');
}

export async function GET(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  const settings = await readSettings();
  const fines = await syncOverdueFines(settings);
  return Response.json({
    settings,
    fines: isStaff(user)
      ? fines
      : fines.filter((fine) => String(fine.studentEmail).toLowerCase() === user.email.toLowerCase()),
  });
}

export async function POST(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  const payload = await request.json();
  if (payload.action === 'configure') {
    if (!isStaff(user)) return forbiddenResponse();
    const fineRatePerDay = Number(payload.fineRatePerDay);
    const paymentDeadlineDays = Number(payload.paymentDeadlineDays);
    if (!Number.isFinite(fineRatePerDay) || fineRatePerDay <= 0 || !Number.isInteger(paymentDeadlineDays) || paymentDeadlineDays < 1 || paymentDeadlineDays > 90) {
      return Response.json({ error: 'Fine rate or payment deadline is invalid' }, { status: 400 });
    }
    const settings = { fineRatePerDay, paymentDeadlineDays };
    await writeJsonData('library-settings.json', settings);
    return Response.json({ settings });
  }
  if (String(user.role).toLowerCase() !== 'student') return forbiddenResponse();

  const fines = await readJsonCollection('fines.json');
  const fine = fines.find((item) => String(item.id) === String(payload.fineId));
  if (!fine || String(fine.studentEmail).toLowerCase() !== user.email.toLowerCase()) return Response.json({ error: 'Fine not found' }, { status: 404 });
  if (fine.paymentStatus === 'Paid') return Response.json({ error: 'This fine is already paid' }, { status: 409 });
  if (fine.paymentStatus === 'Submitted') {
    const staffUsers = (await readJsonCollection('users.json')).filter((item) => ['administrator', 'librarian'].includes(String(item.role).toLowerCase()));
    for (const staff of staffUsers) {
      await createNotification(staff.email, `fine-submitted:${fine.id}:${staff.id}`, `Fine payment submitted: ${fine.title}`, 'FinePaymentSubmitted', { fineId: fine.id, studentEmail: user.email });
    }
    return Response.json(fine);
  }

  const submittedAt = new Date().toISOString();
  const updated = await updateRecord('fines.json', fine.id, {
    paymentStatus: 'Submitted',
    paymentSubmittedAt: submittedAt,
    paymentHistory: [...(fine.paymentHistory || []), { status: 'Submitted', at: submittedAt, submittedBy: user.email }],
  });
  const adminsAndLibrarians = (await readJsonCollection('users.json')).filter((item) => ['administrator', 'librarian'].includes(String(item.role).toLowerCase()));
  for (const staff of adminsAndLibrarians) {
    await createNotification(staff.email, `fine-submitted:${fine.id}:${staff.id}`, `Fine payment submitted: ${fine.title}`, 'FinePaymentSubmitted', { fineId: fine.id, studentEmail: user.email });
  }
  return Response.json(updated);
}

export async function PUT(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (!isStaff(user)) return forbiddenResponse();
  const payload = await request.json();
  if (payload.action === 'configure') {
    const fineRatePerDay = Number(payload.fineRatePerDay);
    const paymentDeadlineDays = Number(payload.paymentDeadlineDays);
    if (!Number.isFinite(fineRatePerDay) || fineRatePerDay <= 0 || !Number.isInteger(paymentDeadlineDays) || paymentDeadlineDays < 1 || paymentDeadlineDays > 90) {
      return Response.json({ error: 'Fine rate or payment deadline is invalid' }, { status: 400 });
    }
    const settings = { fineRatePerDay, paymentDeadlineDays };
    await writeJsonData('library-settings.json', settings);
    return Response.json({ settings });
  }

  const fines = await readJsonCollection('fines.json');
  const fine = fines.find((item) => String(item.id) === String(payload.id));
  if (!fine) return Response.json({ error: 'Fine not found' }, { status: 404 });
  if (fine.paymentStatus === 'Paid') {
    await createNotification(fine.studentEmail, `fine-paid:${fine.id}`, `Fine paid: ${fine.title}`, 'FinePaid', { fineId: fine.id, paidAt: fine.paidAt });
    return Response.json(fine);
  }
  const paidAt = new Date().toISOString();
  const paymentHistory = [...(fine.paymentHistory || []), {
    status: 'Paid',
    at: paidAt,
    recordedBy: user.email,
    reference: String(payload.reference || '').trim(),
  }];
  const updated = await updateRecord('fines.json', fine.id, {
    paymentStatus: 'Paid',
    paidAt,
    paymentReference: String(payload.reference || '').trim(),
    paymentHistory,
  });
  await createNotification(fine.studentEmail, `fine-paid:${fine.id}`, `Fine paid: ${fine.title}`, 'FinePaid', { fineId: fine.id, paidAt });
  return Response.json(updated);
}