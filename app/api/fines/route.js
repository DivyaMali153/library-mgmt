import { createRecord, deleteRecord, readJsonCollection, updateRecord, writeJsonData } from '../../../lib/jsonStore';
import { forbiddenResponse, getSessionUser, isStaff, unauthorizedResponse } from '../../../lib/serverAuth';
import { createStudentFineNotification, readSettings, syncOverdueFines } from '../../../lib/fineUtils';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  const settings = await readSettings();
  const allFines = await syncOverdueFines(settings);
  const fines = isStaff(user)
    ? allFines
    : allFines.filter((fine) => String(fine.studentEmail).toLowerCase() === user.email.toLowerCase());

  const stats = {
    totalCollected: fines.filter((f) => f.paymentStatus === 'Paid').reduce((sum, f) => sum + Number(f.amount || 0), 0),
    totalPending: fines.filter((f) => ['Pending', 'Submitted'].includes(f.paymentStatus)).reduce((sum, f) => sum + Number(f.amount || 0), 0),
    totalOverdue: fines.filter((f) => f.paymentStatus === 'Overdue').reduce((sum, f) => sum + Number(f.amount || 0), 0),
    totalCount: fines.length,
  };

  return Response.json({
    settings,
    fines,
    stats,
  });
}

export async function POST(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  const payload = await request.json();

  // 1. Configure policy
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

  // 2. Staff assesses / adds a fine directly
  if (isStaff(user) && (payload.action === 'create' || !payload.fineId)) {
    const studentEmail = String(payload.studentEmail || '').trim().toLowerCase();
    const amount = Number(payload.amount);
    const reason = String(payload.reason || '').trim();
    const title = String(payload.title || 'Library Fine').trim();

    if (!studentEmail || !amount || amount <= 0 || !reason) {
      return Response.json({ error: 'Student email, valid positive amount, and reason are required' }, { status: 400 });
    }

    const now = new Date();
    const settings = await readSettings();
    const deadlineDays = Number(payload.paymentDeadlineDays || settings.paymentDeadlineDays || 7);
    const paymentDeadlineAt = new Date(now.getTime() + deadlineDays * DAY_MS).toISOString();

    const isPaidNow = Boolean(payload.isCollectedNow || payload.paymentStatus === 'Paid');
    const paymentMethod = String(payload.paymentMethod || 'Cash').trim();
    const paymentReference = String(payload.paymentReference || '').trim();
    const paymentNotes = String(payload.paymentNotes || '').trim();

    const fineRecord = {
      loanId: payload.loanId || '',
      bookId: payload.bookId || '',
      title,
      studentEmail,
      studentName: String(payload.studentName || studentEmail.split('@')[0]).trim(),
      issueDate: payload.issueDate || now.toISOString().slice(0, 10),
      dueDate: payload.dueDate || '',
      overdueDays: Number(payload.overdueDays || 0),
      fineRatePerDay: Number(settings.fineRatePerDay || 5),
      amount,
      reason,
      createdAt: now.toISOString(),
      paymentDeadlineAt,
      paymentStatus: isPaidNow ? 'Paid' : 'Pending',
      paymentMethod: isPaidNow ? paymentMethod : '',
      paymentReference: isPaidNow ? paymentReference : '',
      paymentNotes: isPaidNow ? paymentNotes : '',
      paidAt: isPaidNow ? now.toISOString() : null,
      paymentHistory: isPaidNow
        ? [{ status: 'Paid', at: now.toISOString(), recordedBy: user.email, method: paymentMethod, reference: paymentReference, notes: paymentNotes }]
        : [],
    };

    const fine = await createRecord('fines.json', fineRecord);

    // Send fine notification directly to the student
    if (isPaidNow) {
      await createStudentFineNotification(
        studentEmail,
        `fine-assessed-paid:${fine.id}`,
        `Fine assessed and recorded as paid: "${fine.title}" (₹${fine.amount}) via ${paymentMethod}. Reason: ${fine.reason}.`,
        'FinePaid',
        { fineId: fine.id, amount: fine.amount, method: paymentMethod }
      );
    } else {
      const deadlineFormatted = new Date(paymentDeadlineAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      await createStudentFineNotification(
        studentEmail,
        `fine-assessed:${fine.id}`,
        `Fine assessed: "${fine.title}" (₹${fine.amount}). Reason: ${fine.reason}. Due date: ${deadlineFormatted}. Please clear your fine.`,
        'FineCreated',
        { fineId: fine.id, amount: fine.amount, deadline: paymentDeadlineAt }
      );
    }

    return Response.json(fine, { status: 201 });
  }

  // 3. Student submits payment for staff confirmation
  if (String(user.role).toLowerCase() !== 'student') return forbiddenResponse();

  const fines = await readJsonCollection('fines.json');
  const fine = fines.find((item) => String(item.id) === String(payload.fineId));
  if (!fine || String(fine.studentEmail).toLowerCase() !== user.email.toLowerCase()) {
    return Response.json({ error: 'Fine not found' }, { status: 404 });
  }
  if (fine.paymentStatus === 'Paid') {
    return Response.json({ error: 'This fine is already paid' }, { status: 409 });
  }

  const submittedAt = new Date().toISOString();
  const paymentMethod = String(payload.paymentMethod || 'Online').trim();
  const paymentReference = String(payload.reference || payload.paymentReference || '').trim();

  const updated = await updateRecord('fines.json', fine.id, {
    paymentStatus: 'Submitted',
    paymentSubmittedAt: submittedAt,
    paymentMethod,
    paymentReference,
    paymentHistory: [
      ...(fine.paymentHistory || []),
      { status: 'Submitted', at: submittedAt, submittedBy: user.email, method: paymentMethod, reference: paymentReference },
    ],
  });

  // 1) Send confirmation notification to the student
  const studentEmail = String(fine.studentEmail || user.email).toLowerCase();
  await createStudentFineNotification(
    studentEmail,
    `fine-submitted-student:${fine.id}:${Date.now()}`,
    `Payment submitted for "${fine.title}" (₹${fine.amount}) via ${paymentMethod}${paymentReference ? ' (Ref: ' + paymentReference + ')' : ''}. Awaiting staff confirmation.`,
    'FinePaymentSubmitted',
    { fineId: fine.id, amount: fine.amount, paymentMethod, paymentReference }
  );

  // 2) Notify librarians and administrators to review the submission
  const staffUsers = (await readJsonCollection('users.json')).filter((item) => ['administrator', 'librarian'].includes(String(item.role).toLowerCase()));
  for (const staff of staffUsers) {
    await createStudentFineNotification(
      staff.email,
      `fine-submitted:${fine.id}:${staff.id}:${Date.now()}`,
      `Fine payment submitted: "${fine.title}" (₹${fine.amount}) by ${user.name || user.email} via ${paymentMethod}.`,
      'FinePaymentPendingVerification',
      { fineId: fine.id, studentEmail: user.email, amount: fine.amount }
    );
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

  const studentEmail = String(fine.studentEmail || '').trim().toLowerCase();

  // Waive fine
  if (payload.action === 'waive') {
    const now = new Date().toISOString();
    const reason = String(payload.reason || 'Waived by library staff').trim();
    const updated = await updateRecord('fines.json', fine.id, {
      paymentStatus: 'Waived',
      waivedAt: now,
      waivedBy: user.email,
      waiveReason: reason,
      paymentHistory: [...(fine.paymentHistory || []), { status: 'Waived', at: now, recordedBy: user.email, reason }],
    });

    // Notify student about fine waiver
    await createStudentFineNotification(
      studentEmail,
      `fine-waived:${fine.id}`,
      `Fine waived: "${fine.title}" (₹${fine.amount}) has been waived by library staff. Reason: ${reason}.`,
      'FineWaived',
      { fineId: fine.id, amount: fine.amount, reason }
    );
    return Response.json(updated);
  }

  // If already paid
  if (fine.paymentStatus === 'Paid') {
    await createStudentFineNotification(
      studentEmail,
      `fine-paid:${fine.id}`,
      `Fine paid: "${fine.title}" (₹${fine.amount}) is already recorded as paid.`,
      'FinePaid',
      { fineId: fine.id, paidAt: fine.paidAt }
    );
    return Response.json(fine);
  }

  // Record / Collect payment
  const paidAt = new Date().toISOString();
  const paymentMethod = String(payload.paymentMethod || fine.paymentMethod || 'Cash').trim();
  const paymentReference = String(payload.reference || payload.paymentReference || '').trim();
  const paymentNotes = String(payload.notes || payload.paymentNotes || '').trim();

  const paymentHistory = [...(fine.paymentHistory || []), {
    status: 'Paid',
    at: paidAt,
    recordedBy: user.email,
    method: paymentMethod,
    reference: paymentReference,
    notes: paymentNotes,
  }];

  const updated = await updateRecord('fines.json', fine.id, {
    paymentStatus: 'Paid',
    paidAt,
    paymentMethod,
    paymentReference,
    paymentNotes,
    paymentHistory,
  });

  // Notify student about payment confirmation
  await createStudentFineNotification(
    studentEmail,
    `fine-paid:${fine.id}:${Date.now()}`,
    `Fine payment confirmed: "${fine.title}" (₹${fine.amount}) recorded via ${paymentMethod}${paymentReference ? ' (Receipt: ' + paymentReference + ')' : ''}. Your fine has been cleared.`,
    'FinePaid',
    { fineId: fine.id, amount: fine.amount, paidAt, paymentMethod }
  );

  return Response.json(updated);
}

export async function DELETE(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (!isStaff(user)) return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'Fine ID is required' }, { status: 400 });

  const fines = await readJsonCollection('fines.json');
  const fine = fines.find((item) => String(item.id) === String(id));
  if (fine && fine.paymentStatus !== 'Paid') {
    const studentEmail = String(fine.studentEmail || '').trim().toLowerCase();
    await createStudentFineNotification(
      studentEmail,
      `fine-cancelled:${fine.id}`,
      `Fine cancelled: "${fine.title}" (₹${fine.amount}) was removed by library staff.`,
      'FineCancelled',
      { fineId: fine.id, amount: fine.amount }
    );
  }

  const deleted = await deleteRecord('fines.json', id);
  return Response.json({ success: deleted });
}