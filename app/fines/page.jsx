'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useRole } from '../../components/RoleProvider';
import PageHeader from '../../components/PageHeader';

const formatDate = (value) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
};

const PAYMENT_METHODS = [
  'Cash',
  'UPI (GPay / PhonePe / Paytm)',
  'Card / POS',
  'Net Banking',
];

const FINE_REASONS = [
  'Late Return',
  'Damaged Book',
  'Lost Book',
  'Overdue Fee',
  'Library Membership Charge',
  'Other',
];

export default function FinesPage() {
  const { role, user } = useRole();
  const isStaff = ['administrator', 'librarian'].includes(String(role || '').toLowerCase());

  const [fines, setFines] = useState([]);
  const [stats, setStats] = useState({ totalCollected: 0, totalPending: 0, totalOverdue: 0, totalCount: 0 });
  const [settings, setSettings] = useState({ fineRatePerDay: 5, paymentDeadlineDays: 7 });
  const [students, setStudents] = useState([]);
  const [books, setBooks] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Dialog States
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [collectDialogOpen, setCollectDialogOpen] = useState(false);
  const [waiveDialogOpen, setWaiveDialogOpen] = useState(false);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [studentPayDialogOpen, setStudentPayDialogOpen] = useState(false);
  const [selectedFine, setSelectedFine] = useState(null);

  // Form states
  const [addForm, setAddForm] = useState({
    studentEmail: '',
    studentName: '',
    title: '',
    bookId: '',
    reason: 'Late Return',
    customReason: '',
    amount: '',
    paymentDeadlineDays: 7,
    isCollectedNow: false,
    paymentMethod: 'Cash',
    paymentReference: '',
    paymentNotes: '',
  });

  const [collectForm, setCollectForm] = useState({
    paymentMethod: 'Cash',
    paymentReference: '',
    notes: '',
  });

  const [waiveForm, setWaiveForm] = useState({
    reason: '',
  });

  const [studentPayForm, setStudentPayForm] = useState({
    paymentMethod: 'UPI (GPay / PhonePe / Paytm)',
    reference: '',
  });

  const load = async () => {
    try {
      const response = await fetch('/api/fines');
      if (!response.ok) {
        setError('Unable to load fines. Please sign in again.');
        return;
      }
      const data = await response.json();
      setFines(data.fines || []);
      setSettings(data.settings || { fineRatePerDay: 5, paymentDeadlineDays: 7 });
      setStats(data.stats || {
        totalCollected: (data.fines || []).filter((f) => f.paymentStatus === 'Paid').reduce((s, f) => s + Number(f.amount || 0), 0),
        totalPending: (data.fines || []).filter((f) => ['Pending', 'Submitted'].includes(f.paymentStatus)).reduce((s, f) => s + Number(f.amount || 0), 0),
        totalOverdue: (data.fines || []).filter((f) => f.paymentStatus === 'Overdue').reduce((s, f) => s + Number(f.amount || 0), 0),
        totalCount: (data.fines || []).length,
      });
    } catch {
      setError('Network error while loading fines.');
    }
  };

  const loadHelpers = async () => {
    if (!isStaff) return;
    try {
      const [usersRes, booksRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/books'),
      ]);
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setStudents((usersData || []).filter((u) => String(u.role).toLowerCase() === 'student'));
      }
      if (booksRes.ok) {
        const booksData = await booksRes.json();
        setBooks(booksData || []);
      }
    } catch {}
  };

  useEffect(() => {
    load();
    loadHelpers();
    const interval = window.setInterval(load, 15000);
    return () => window.clearInterval(interval);
  }, [isStaff]);

  // Handle Add Fine (Staff)
  const handleAddFine = async (e) => {
    e.preventDefault();
    setError('');
    const finalReason = addForm.reason === 'Other' ? addForm.customReason : addForm.reason;

    if (!addForm.studentEmail || !addForm.amount || Number(addForm.amount) <= 0 || !finalReason) {
      setError('Please fill in student email, valid positive amount, and reason.');
      return;
    }

    try {
      const res = await fetch('/api/fines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          studentEmail: addForm.studentEmail,
          studentName: addForm.studentName,
          title: addForm.title || 'Library Fine',
          bookId: addForm.bookId,
          reason: finalReason,
          amount: Number(addForm.amount),
          paymentDeadlineDays: Number(addForm.paymentDeadlineDays || settings.paymentDeadlineDays || 7),
          isCollectedNow: addForm.isCollectedNow,
          paymentMethod: addForm.paymentMethod,
          paymentReference: addForm.paymentReference,
          paymentNotes: addForm.paymentNotes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to assess fine.');
        return;
      }

      setMessage(`Fine of ₹${addForm.amount} assessed successfully${addForm.isCollectedNow ? ' and recorded as collected' : ''}.`);
      setAddDialogOpen(false);
      setAddForm({
        studentEmail: '',
        studentName: '',
        title: '',
        bookId: '',
        reason: 'Late Return',
        customReason: '',
        amount: '',
        paymentDeadlineDays: settings.paymentDeadlineDays || 7,
        isCollectedNow: false,
        paymentMethod: 'Cash',
        paymentReference: '',
        paymentNotes: '',
      });
      load();
    } catch {
      setError('Error assessing fine.');
    }
  };

  // Handle Record Payment (Staff)
  const handleCollectPayment = async (e) => {
    e.preventDefault();
    if (!selectedFine) return;
    setError('');

    try {
      const res = await fetch('/api/fines', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedFine.id,
          paymentMethod: collectForm.paymentMethod,
          reference: collectForm.paymentReference,
          notes: collectForm.notes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to record payment.');
        return;
      }

      setMessage(`Payment of ₹${selectedFine.amount} recorded for ${selectedFine.title} via ${collectForm.paymentMethod}.`);
      setCollectDialogOpen(false);
      setSelectedFine(null);
      setCollectForm({ paymentMethod: 'Cash', paymentReference: '', notes: '' });
      load();
    } catch {
      setError('Error recording payment.');
    }
  };

  // Handle Waive Fine (Staff)
  const handleWaiveFine = async (e) => {
    e.preventDefault();
    if (!selectedFine) return;
    setError('');

    try {
      const res = await fetch('/api/fines', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'waive',
          id: selectedFine.id,
          reason: waiveForm.reason || 'Staff waiver',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to waive fine.');
        return;
      }

      setMessage(`Fine of ₹${selectedFine.amount} for "${selectedFine.title}" was waived.`);
      setWaiveDialogOpen(false);
      setSelectedFine(null);
      setWaiveForm({ reason: '' });
      load();
    } catch {
      setError('Error waiving fine.');
    }
  };

  // Handle Delete Fine (Staff)
  const handleDeleteFine = async (fineId) => {
    if (!confirm('Are you sure you want to delete this fine record?')) return;
    try {
      const res = await fetch(`/api/fines?id=${encodeURIComponent(fineId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessage('Fine record deleted.');
        load();
      } else {
        setError('Failed to delete fine.');
      }
    } catch {
      setError('Error deleting fine.');
    }
  };

  // Handle Student Pay / Submit Payment
  const handleStudentPay = async (e) => {
    e.preventDefault();
    if (!selectedFine) return;
    setError('');

    try {
      const res = await fetch('/api/fines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fineId: selectedFine.id,
          paymentMethod: studentPayForm.paymentMethod,
          reference: studentPayForm.reference,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to submit payment.');
        return;
      }

      setMessage('Payment submitted successfully for staff confirmation.');
      setStudentPayDialogOpen(false);
      setSelectedFine(null);
      setStudentPayForm({ paymentMethod: 'UPI (GPay / PhonePe / Paytm)', reference: '' });
      load();
    } catch {
      setError('Error submitting payment.');
    }
  };

  // Save Policy
  const handleSavePolicy = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/fines', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'configure', ...settings }),
      });
      if (!res.ok) {
        setError('Settings were not saved. Check rate and deadline values.');
        return;
      }
      setMessage('Fine policy saved.');
      setPolicyDialogOpen(false);
      load();
    } catch {
      setError('Error saving fine policy.');
    }
  };

  // Filtered Fines
  const filteredFines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fines.filter((fine) => {
      const matchesStatus = statusFilter === 'All' ? true : fine.paymentStatus === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;

      const haystack = [
        fine.title,
        fine.studentName,
        fine.studentEmail,
        fine.reason,
        fine.paymentReference,
        fine.paymentMethod,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [fines, search, statusFilter]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        eyebrow="FINANCIAL MANAGEMENT"
        title={isStaff ? 'Fine collection' : 'My fines'}
        description="Track overdue penalties, assess manual charges, record payments, and view settlement receipts."
        action={
          isStaff ? (
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => setPolicyDialogOpen(true)}
              >
                Fine Policy
              </Button>
              <Button
                variant="contained"
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => setAddDialogOpen(true)}
              >
                Assess Fine
              </Button>
            </Stack>
          ) : null
        }
      />

      {error ? <Alert severity="error" onClose={() => setError('')}>{error}</Alert> : null}
      {message ? <Alert severity="success" onClose={() => setMessage('')}>{message}</Alert> : null}

      {/* KPI Stat Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #10b981' }}>
            <CardContent sx={{ p: 2.25 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    TOTAL COLLECTED
                  </Typography>
                  <Typography variant="h5" fontWeight={750} sx={{ mt: 0.5, color: '#047857' }}>
                    ₹{stats.totalCollected.toLocaleString('en-IN')}
                  </Typography>
                </Box>
                <Box sx={{ p: 1, bgcolor: '#d1fae5', borderRadius: 2, color: '#059669' }}>
                  <AccountBalanceWalletOutlinedIcon />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #f59e0b' }}>
            <CardContent sx={{ p: 2.25 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    PENDING / SUBMITTED
                  </Typography>
                  <Typography variant="h5" fontWeight={750} sx={{ mt: 0.5, color: '#b45309' }}>
                    ₹{stats.totalPending.toLocaleString('en-IN')}
                  </Typography>
                </Box>
                <Box sx={{ p: 1, bgcolor: '#fef3c7', borderRadius: 2, color: '#d97706' }}>
                  <PendingActionsOutlinedIcon />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #ef4444' }}>
            <CardContent sx={{ p: 2.25 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    OVERDUE FINES
                  </Typography>
                  <Typography variant="h5" fontWeight={750} sx={{ mt: 0.5, color: '#b91c1c' }}>
                    ₹{stats.totalOverdue.toLocaleString('en-IN')}
                  </Typography>
                </Box>
                <Box sx={{ p: 1, bgcolor: '#fee2e2', borderRadius: 2, color: '#dc2626' }}>
                  <WarningAmberOutlinedIcon />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #0f766e' }}>
            <CardContent sx={{ p: 2.25 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    TOTAL RECORDS
                  </Typography>
                  <Typography variant="h5" fontWeight={750} sx={{ mt: 0.5, color: '#0f766e' }}>
                    {stats.totalCount}
                  </Typography>
                </Box>
                <Box sx={{ p: 1, bgcolor: '#ccfbf1', borderRadius: 2, color: '#0d9488' }}>
                  <ReceiptLongOutlinedIcon />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
            <TextField
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student, book, reason, or reference…"
              sx={{ width: { xs: '100%', md: 380 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <Stack direction="row" spacing={1} flexWrap="wrap">
              {['All', 'Pending', 'Submitted', 'Paid', 'Overdue', 'Waived'].map((status) => (
                <Chip
                  key={status}
                  label={status}
                  clickable
                  color={statusFilter === status ? 'primary' : 'default'}
                  variant={statusFilter === status ? 'filled' : 'outlined'}
                  onClick={() => setStatusFilter(status)}
                  size="small"
                />
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Fines Table */}
      <Card>
        <CardContent sx={{ overflowX: 'auto', p: 0 }}>
          <Table size="small" sx={{ minWidth: 1050 }}>
            <TableHead>
              <TableRow>
                {isStaff ? <TableCell>Student</TableCell> : null}
                <TableCell>Book / Charge</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Date Assessed</TableCell>
                <TableCell>Deadline</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Payment Mode</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isStaff ? 9 : 8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No fine records found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFines.map((fine) => {
                  const isPaid = fine.paymentStatus === 'Paid';
                  const isWaived = fine.paymentStatus === 'Waived';
                  const isSubmitted = fine.paymentStatus === 'Submitted';

                  return (
                    <TableRow key={fine.id} hover>
                      {isStaff ? (
                        <TableCell>
                          <Typography variant="body2" fontWeight={650}>
                            {fine.studentName || fine.studentEmail}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {fine.studentEmail}
                          </Typography>
                        </TableCell>
                      ) : null}

                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {fine.title}
                        </Typography>
                        {fine.overdueDays > 0 ? (
                          <Typography variant="caption" color="text.secondary">
                            {fine.overdueDays} overdue day{fine.overdueDays > 1 ? 's' : ''}
                          </Typography>
                        ) : null}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={fine.reason || 'General'}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.72rem' }}
                        />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight={750} color={isPaid ? '#047857' : isWaived ? 'text.secondary' : '#b91c1c'}>
                          ₹{fine.amount}
                        </Typography>
                      </TableCell>

                      <TableCell>{formatDate(fine.createdAt || fine.issueDate)}</TableCell>

                      <TableCell>{formatDate(fine.paymentDeadlineAt)}</TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={fine.paymentStatus}
                          color={
                            isPaid
                              ? 'success'
                              : isWaived
                              ? 'default'
                              : fine.paymentStatus === 'Overdue'
                              ? 'error'
                              : isSubmitted
                              ? 'info'
                              : 'warning'
                          }
                        />
                      </TableCell>

                      <TableCell>
                        {fine.paymentMethod ? (
                          <Box>
                            <Typography variant="caption" fontWeight={600} display="block">
                              {fine.paymentMethod}
                            </Typography>
                            {fine.paymentReference ? (
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                Ref: {fine.paymentReference}
                              </Typography>
                            ) : null}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        )}
                      </TableCell>

                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                          {/* Staff: Collect Payment */}
                          {isStaff && !isPaid && !isWaived ? (
                            <Button
                              size="small"
                              variant="contained"
                              color={isSubmitted ? 'primary' : 'inherit'}
                              onClick={() => {
                                setSelectedFine(fine);
                                setCollectForm({
                                  paymentMethod: fine.paymentMethod || 'Cash',
                                  paymentReference: fine.paymentReference || '',
                                  notes: '',
                                });
                                setCollectDialogOpen(true);
                              }}
                              sx={{ minHeight: 30, py: 0.25, px: 1.5, fontSize: '0.75rem' }}
                            >
                              Collect
                            </Button>
                          ) : null}

                          {/* Staff: Waive */}
                          {isStaff && !isPaid && !isWaived ? (
                            <Button
                              size="small"
                              variant="text"
                              color="secondary"
                              onClick={() => {
                                setSelectedFine(fine);
                                setWaiveDialogOpen(true);
                              }}
                              sx={{ minHeight: 30, py: 0.25, px: 1, fontSize: '0.75rem' }}
                            >
                              Waive
                            </Button>
                          ) : null}

                          {/* Staff: Delete */}
                          {isStaff ? (
                            <Tooltip title="Delete record">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteFine(fine.id)}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : null}

                          {/* Student: Pay Fine */}
                          {!isStaff && !isPaid && !isSubmitted && !isWaived ? (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => {
                                setSelectedFine(fine);
                                setStudentPayDialogOpen(true);
                              }}
                              sx={{ minHeight: 30, py: 0.25, px: 1.5, fontSize: '0.75rem' }}
                            >
                              Pay fine
                            </Button>
                          ) : null}

                          {!isStaff && isSubmitted ? (
                            <Chip size="small" label="Awaiting approval" color="info" />
                          ) : null}

                          {!isStaff && isPaid ? (
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: '#047857' }}>
                              <CheckCircleOutlineIcon fontSize="small" />
                              <Typography variant="caption" fontWeight={600}>Settled</Typography>
                            </Stack>
                          ) : null}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DIALOG 1: Assess / Add Fine (Staff) */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Assess Library Fine</DialogTitle>
        <form onSubmit={handleAddFine}>
          <DialogContent>
            <Stack spacing={2.25} sx={{ mt: 0.5 }}>
              {/* Student selection */}
              <FormControl fullWidth size="small" required>
                <InputLabel>Select Student</InputLabel>
                <Select
                  label="Select Student"
                  value={addForm.studentEmail}
                  onChange={(e) => {
                    const sel = students.find((s) => s.email === e.target.value);
                    setAddForm({
                      ...addForm,
                      studentEmail: e.target.value,
                      studentName: sel?.name || e.target.value.split('@')[0],
                    });
                  }}
                >
                  {students.map((st) => (
                    <MenuItem key={st.id || st.email} value={st.email}>
                      {st.name} ({st.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Or manual email if student not in list */}
              <TextField
                size="small"
                label="Student Email (if not listed)"
                type="email"
                value={addForm.studentEmail}
                onChange={(e) => setAddForm({ ...addForm, studentEmail: e.target.value })}
                required
              />

              {/* Book selection (optional) */}
              <FormControl fullWidth size="small">
                <InputLabel>Associated Book (Optional)</InputLabel>
                <Select
                  label="Associated Book (Optional)"
                  value={addForm.bookId}
                  onChange={(e) => {
                    const bk = books.find((b) => b.id === e.target.value);
                    setAddForm({
                      ...addForm,
                      bookId: e.target.value,
                      title: bk ? bk.title : addForm.title,
                    });
                  }}
                >
                  <MenuItem value="">None / Manual Title</MenuItem>
                  {books.map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.title} ({b.author})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                size="small"
                label="Book / Charge Title"
                value={addForm.title}
                onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                placeholder="e.g. Clean Code, Damaged Book, Lost Item"
                required
              />

              {/* Reason */}
              <FormControl fullWidth size="small" required>
                <InputLabel>Fine Reason</InputLabel>
                <Select
                  label="Fine Reason"
                  value={addForm.reason}
                  onChange={(e) => setAddForm({ ...addForm, reason: e.target.value })}
                >
                  {FINE_REASONS.map((r) => (
                    <MenuItem key={r} value={r}>{r}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {addForm.reason === 'Other' ? (
                <TextField
                  size="small"
                  label="Specify Reason"
                  value={addForm.customReason}
                  onChange={(e) => setAddForm({ ...addForm, customReason: e.target.value })}
                  required
                />
              ) : null}

              {/* Amount */}
              <TextField
                size="small"
                label="Fine Amount (₹)"
                type="number"
                inputProps={{ min: 1, step: 1 }}
                value={addForm.amount}
                onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                required
              />

              {/* Deadline Days */}
              <TextField
                size="small"
                label="Payment Deadline (Days from today)"
                type="number"
                inputProps={{ min: 1, max: 90 }}
                value={addForm.paymentDeadlineDays}
                onChange={(e) => setAddForm({ ...addForm, paymentDeadlineDays: e.target.value })}
              />

              <Divider sx={{ my: 1 }} />

              {/* Collect Immediately toggle */}
              <FormControlLabel
                control={
                  <Switch
                    checked={addForm.isCollectedNow}
                    onChange={(e) => setAddForm({ ...addForm, isCollectedNow: e.target.checked })}
                    color="primary"
                  />
                }
                label="Collect fine payment immediately now (on the spot)"
              />

              {addForm.isCollectedNow ? (
                <Stack spacing={2} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Payment Mode</InputLabel>
                    <Select
                      label="Payment Mode"
                      value={addForm.paymentMethod}
                      onChange={(e) => setAddForm({ ...addForm, paymentMethod: e.target.value })}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <MenuItem key={m} value={m}>{m}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    size="small"
                    label="Transaction / Receipt Number (Optional)"
                    value={addForm.paymentReference}
                    onChange={(e) => setAddForm({ ...addForm, paymentReference: e.target.value })}
                    placeholder="e.g. REC-1049, UPI-89472"
                  />

                  <TextField
                    size="small"
                    label="Staff Remarks / Notes (Optional)"
                    value={addForm.paymentNotes}
                    onChange={(e) => setAddForm({ ...addForm, paymentNotes: e.target.value })}
                  />
                </Stack>
              ) : null}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {addForm.isCollectedNow ? 'Collect & Record' : 'Assess Fine'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* DIALOG 2: Collect / Record Payment (Staff) */}
      <Dialog open={collectDialogOpen} onClose={() => setCollectDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Record Fine Collection</DialogTitle>
        {selectedFine ? (
          <form onSubmit={handleCollectPayment}>
            <DialogContent>
              <Stack spacing={2.25} sx={{ mt: 0.5 }}>
                <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                  <Typography variant="body2" color="text.secondary">Student: <strong>{selectedFine.studentName || selectedFine.studentEmail}</strong></Typography>
                  <Typography variant="body2" color="text.secondary">Title: <strong>{selectedFine.title}</strong></Typography>
                  <Typography variant="h6" fontWeight={750} color="#047857" sx={{ mt: 1 }}>
                    Amount Due: ₹{selectedFine.amount}
                  </Typography>
                </Box>

                <FormControl fullWidth size="small" required>
                  <InputLabel>Payment Mode</InputLabel>
                  <Select
                    label="Payment Mode"
                    value={collectForm.paymentMethod}
                    onChange={(e) => setCollectForm({ ...collectForm, paymentMethod: e.target.value })}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <MenuItem key={m} value={m}>{m}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  label="Receipt / Reference Number"
                  value={collectForm.paymentReference}
                  onChange={(e) => setCollectForm({ ...collectForm, paymentReference: e.target.value })}
                  placeholder="e.g. CASH-01, UPI-928172"
                />

                <TextField
                  size="small"
                  label="Notes / Remarks"
                  value={collectForm.notes}
                  onChange={(e) => setCollectForm({ ...collectForm, notes: e.target.value })}
                  placeholder="Optional staff remarks"
                  multiline
                  rows={2}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={() => setCollectDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" color="success">
                Confirm & Record Payment
              </Button>
            </DialogActions>
          </form>
        ) : null}
      </Dialog>

      {/* DIALOG 3: Waive Fine (Staff) */}
      <Dialog open={waiveDialogOpen} onClose={() => setWaiveDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Waive Fine</DialogTitle>
        {selectedFine ? (
          <form onSubmit={handleWaiveFine}>
            <DialogContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Are you sure you want to waive the fine of <strong>₹{selectedFine.amount}</strong> for <strong>{selectedFine.studentName || selectedFine.studentEmail}</strong>?
              </Typography>
              <TextField
                fullWidth
                size="small"
                label="Reason for Waiver"
                value={waiveForm.reason}
                onChange={(e) => setWaiveForm({ reason: e.target.value })}
                placeholder="e.g. Medical emergency, First-time leniency, Library error"
                required
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setWaiveDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" color="secondary">
                Confirm Waiver
              </Button>
            </DialogActions>
          </form>
        ) : null}
      </Dialog>

      {/* DIALOG 4: Student Pay Fine Modal */}
      <Dialog open={studentPayDialogOpen} onClose={() => setStudentPayDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Settle Library Fine</DialogTitle>
        {selectedFine ? (
          <form onSubmit={handleStudentPay}>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 0.5 }}>
                <Box sx={{ p: 2, bgcolor: '#fef3c7', borderRadius: 2, border: '1px solid #fde68a' }}>
                  <Typography variant="body2" color="text.secondary">Charge: <strong>{selectedFine.title}</strong></Typography>
                  <Typography variant="h6" fontWeight={750} color="#b45309" sx={{ mt: 0.5 }}>
                    Payable Amount: ₹{selectedFine.amount}
                  </Typography>
                </Box>

                <FormControl fullWidth size="small" required>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    label="Payment Method"
                    value={studentPayForm.paymentMethod}
                    onChange={(e) => setStudentPayForm({ ...studentPayForm, paymentMethod: e.target.value })}
                  >
                    <MenuItem value="UPI (GPay / PhonePe / Paytm)">UPI (GPay / PhonePe / Paytm)</MenuItem>
                    <MenuItem value="Cash at Counter">Cash at Counter</MenuItem>
                    <MenuItem value="Online Banking / Card">Online Banking / Card</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  size="small"
                  label="Transaction ID / UTR / Reference"
                  value={studentPayForm.reference}
                  onChange={(e) => setStudentPayForm({ ...studentPayForm, reference: e.target.value })}
                  placeholder="Enter transaction reference"
                  helperText="Enter receipt / transaction reference for librarian verification"
                  required
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={() => setStudentPayDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained">
                Submit for Confirmation
              </Button>
            </DialogActions>
          </form>
        ) : null}
      </Dialog>

      {/* DIALOG 5: Fine Policy Configuration */}
      <Dialog open={policyDialogOpen} onClose={() => setPolicyDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Fine Policy Settings</DialogTitle>
        <form onSubmit={handleSavePolicy}>
          <DialogContent>
            <Stack spacing={2.25} sx={{ mt: 0.5 }}>
              <TextField
                size="small"
                label="Fine per Overdue Day (₹)"
                type="number"
                inputProps={{ min: 1, step: 1 }}
                value={settings.fineRatePerDay}
                onChange={(e) => setSettings({ ...settings, fineRatePerDay: Number(e.target.value) })}
                required
              />
              <TextField
                size="small"
                label="Payment Deadline (Days)"
                type="number"
                inputProps={{ min: 1, max: 90, step: 1 }}
                value={settings.paymentDeadlineDays}
                onChange={(e) => setSettings({ ...settings, paymentDeadlineDays: Number(e.target.value) })}
                helperText="Days students have to settle a fine after generation"
                required
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setPolicyDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              Save Policy
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}