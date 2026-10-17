import { createRecord, readJsonCollection, readJsonData, updateRecord } from './jsonStore.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function readSettings() {
  const settings = await readJsonData('library-settings.json');
  return {
    fineRatePerDay: Number(settings?.fineRatePerDay ?? 5),
    paymentDeadlineDays: Number(settings?.paymentDeadlineDays ?? 7),
  };
}

/**
 * Creates a notification targeted specifically to a student (or staff member).
 * Enforces email normalization (trimmed, lowercased) and deduplication.
 */
export async function createStudentFineNotification(studentEmail, eventKey, title, type, data = {}) {
  const normalizedEmail = String(studentEmail || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  const notifications = await readJsonCollection('notifications.json');

  // Check if identical notification event already exists
  const alreadySent = notifications.some((item) => {
    if (eventKey && item.eventKey === eventKey) return true;
    if (String(item.userEmail || '').trim().toLowerCase() !== normalizedEmail) return false;
    if (item.type !== type) return false;
    if (!data || Object.keys(data).length === 0) return true;
    return Object.entries(data).every(([key, value]) => String(item.data?.[key]) === String(value));
  });

  if (alreadySent) return null;

  return await createRecord('notifications.json', {
    userEmail: normalizedEmail,
    eventKey,
    read: false,
    createdAt: new Date().toISOString(),
    title,
    type,
    data,
  });
}

/**
 * Synchronizes overdue loans with the fines collection.
 * Generates fines and dispatches fine notifications directly to the student.
 */
export async function syncOverdueFines(customSettings) {
  const settings = customSettings || await readSettings();
  const loans = await readJsonCollection('loans.json');
  const fines = await readJsonCollection('fines.json');
  const now = new Date();

  for (const loan of loans) {
    if (!loan.dueDate) continue;
    const dueAt = new Date(`${loan.dueDate}T00:00:00`);
    const endAt = loan.status === 'Returned' && loan.returnDate
      ? new Date(`${loan.returnDate}T00:00:00`)
      : now;
    const overdueDays = Math.max(0, Math.floor((endAt.getTime() - dueAt.getTime()) / DAY_MS));
    if (overdueDays < 1) continue;

    const studentEmail = String(loan.studentEmail || loan.borrower || loan.requestedBy || '').trim().toLowerCase();
    if (!studentEmail) continue;

    const existing = fines.find((fine) => String(fine.loanId) === String(loan.id));
    if (!existing) {
      const createdAt = now.toISOString();
      const fineRatePerDay = Number(settings.fineRatePerDay ?? 5);
      const paymentDeadlineAt = new Date(now.getTime() + Number(settings.paymentDeadlineDays ?? 7) * DAY_MS).toISOString();
      const amount = overdueDays * fineRatePerDay;

      const fine = await createRecord('fines.json', {
        loanId: loan.id,
        bookId: loan.bookId || '',
        title: loan.title || 'Unknown book',
        studentEmail,
        studentName: loan.studentName || loan.borrowerName || studentEmail.split('@')[0],
        issueDate: loan.issueDate || '',
        dueDate: loan.dueDate,
        overdueDays,
        fineRatePerDay,
        amount,
        reason: `Returned or outstanding ${overdueDays} day${overdueDays === 1 ? '' : 's'} past the due date`,
        createdAt,
        paymentDeadlineAt,
        paymentStatus: new Date(paymentDeadlineAt).getTime() < now.getTime() ? 'Overdue' : 'Pending',
        paymentHistory: [],
      });

      // Dispatch fine creation notification directly to the student
      await createStudentFineNotification(
        studentEmail,
        `fine-created:${loan.id}`,
        `Book overdue: "${fine.title}". Fine ₹${fine.amount} (₹${fineRatePerDay}/day for ${overdueDays} day${overdueDays === 1 ? '' : 's'}). Please return the book and clear your fine.`,
        'FineCreated',
        { fineId: fine.id, loanId: loan.id, amount: fine.amount, overdueDays }
      );
      continue;
    }

    if (existing.paymentStatus === 'Paid' || existing.paymentStatus === 'Waived') continue;

    const fineRate = Number(settings.fineRatePerDay ?? existing.fineRatePerDay ?? 5);
    const updates = {
      overdueDays,
      fineRatePerDay: fineRate,
      amount: overdueDays * fineRate,
      reason: `Returned or outstanding ${overdueDays} day${overdueDays === 1 ? '' : 's'} past the due date`,
    };

    const paymentIsLate = new Date(existing.paymentDeadlineAt).getTime() < now.getTime();
    if (existing.paymentStatus !== 'Submitted') {
      updates.paymentStatus = paymentIsLate ? 'Overdue' : 'Pending';
    }

    const updated = await updateRecord('fines.json', existing.id, updates);

    // Notify student if fine payment has now crossed its payment deadline
    if (updated.paymentStatus === 'Overdue' && existing.paymentStatus !== 'Overdue') {
      await createStudentFineNotification(
        studentEmail,
        `fine-overdue:${existing.id}`,
        `Payment overdue: Fine for "${updated.title}" (₹${updated.amount}) is past its deadline. Please clear it immediately.`,
        'FineOverdue',
        { fineId: existing.id, amount: updated.amount }
      );
    }

    // Reminders for unreturned overdue books
    if (loan.status === 'Active') {
      const reminderDate = now.toISOString().slice(0, 10);
      if (String(existing.createdAt || '').slice(0, 10) === reminderDate) {
        await createStudentFineNotification(
          studentEmail,
          `fine-created:${loan.id}`,
          `Book overdue: "${updated.title}". Fine ₹${updated.amount} at ₹${updated.fineRatePerDay}/day. Please return the book and clear your fine.`,
          'FineCreated',
          { fineId: existing.id, loanId: loan.id, amount: updated.amount }
        );
      } else {
        await createStudentFineNotification(
          studentEmail,
          `overdue-reminder:${loan.id}:${reminderDate}`,
          `Overdue reminder: "${updated.title}" is ${overdueDays} day${overdueDays === 1 ? '' : 's'} late. Current fine: ₹${updated.amount}. Please return the book to prevent further charges.`,
          'OverdueReminder',
          { loanId: loan.id, reminderDate, overdueDays, amount: updated.amount }
        );
      }
    }
  }

  return readJsonCollection('fines.json');
}
