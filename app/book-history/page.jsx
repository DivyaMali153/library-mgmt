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
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
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
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import HistoryIcon from '@mui/icons-material/History';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { useRole } from '../../components/RoleProvider';
import PageHeader from '../../components/PageHeader';

export default function BookHistoryPage() {
  const { role, user } = useRole();
  const isStaff = ['administrator', 'librarian'].includes(String(role || '').toLowerCase());

  const [loans, setLoans] = useState([]);
  const [requests, setRequests] = useState([]);
  const [fines, setFines] = useState([]);
  const [students, setStudents] = useState([]);
  const [books, setBooks] = useState([]);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [eventFilter, setEventFilter] = useState('All');

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Form states
  const [addForm, setAddForm] = useState({
    studentEmail: '',
    studentName: '',
    bookId: '',
    title: '',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    status: 'Active',
    returnDate: '',
    remarks: '',
  });

  const [editForm, setEditForm] = useState({
    id: '',
    rawId: '',
    source: 'loan',
    studentEmail: '',
    studentName: '',
    title: '',
    issueDate: '',
    dueDate: '',
    status: 'Active',
    returnDate: '',
    remarks: '',
  });

  const loadData = async () => {
    if (!user?.email) return;
    try {
      const [loansRes, requestsRes, finesRes] = await Promise.all([
        fetch('/api/loans'),
        fetch('/api/requests'),
        fetch('/api/fines'),
      ]);

      if (loansRes.ok) {
        const loansData = await loansRes.json();
        setLoans(Array.isArray(loansData) ? loansData : []);
      }
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setRequests(Array.isArray(requestsData) ? requestsData : []);
      }
      if (finesRes.ok) {
        const finesData = await finesRes.json();
        setFines(finesData.fines || []);
      }
    } catch {
      setError('Failed to refresh circulation history.');
    }
  };

  const loadHelpers = async () => {
    if (!isStaff) return;
    try {
      const [usersRes, booksRes] = await Promise.all([fetch('/api/users'), fetch('/api/books')]);
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
    loadData();
    loadHelpers();
    const interval = window.setInterval(loadData, 15000);
    return () => window.clearInterval(interval);
  }, [user?.email, isStaff]);

  // Combined History Model
  const history = useMemo(() => {
    const loanEvents = loans.map((loan) => {
      const fine = fines.find((item) => String(item.loanId) === String(loan.id));
      const overdue = loan.status === 'Active' && loan.dueDate && new Date(`${loan.dueDate}T23:59:59`) < new Date();
      return {
        id: `loan:${loan.id}`,
        rawId: loan.id,
        source: 'loan',
        student: loan.studentName || loan.borrowerName || loan.borrower || loan.studentEmail || '-',
        studentEmail: loan.studentEmail || loan.borrower || '',
        title: loan.title || 'Untitled Book',
        bookId: loan.bookId || '',
        event: 'Book Issue',
        eventAt: loan.issuedAt || loan.createdAt || loan.issueDate,
        issueDate: loan.issueDate || '',
        issuedAt: loan.issuedAt || '',
        dueDate: loan.dueDate || '',
        returnDate: loan.returnDate || '',
        returnedAt: loan.returnedAt || '',
        fine: fine?.amount || 0,
        fineStatus: fine?.paymentStatus || '',
        status: overdue ? 'Overdue' : loan.status === 'Active' ? 'Issued' : loan.status || 'Issued',
        remarks: loan.remarks || loan.librarianRemarks || '',
      };
    });

    const requestEvents = requests.map((request) => ({
      id: `request:${request.id}`,
      rawId: request.id,
      source: 'request',
      student: request.studentName || request.requestedBy || '-',
      studentEmail: request.requestedBy || '',
      title: request.title || 'Untitled Request',
      bookId: request.bookId || '',
      event: request.requestType === 'return' ? 'Return Request' : request.requestType === 'ebook' ? 'E-book Request' : 'Book Request',
      eventAt: request.createdAt,
      issueDate: request.issueDate || '',
      issuedAt: '',
      dueDate: request.dueDate || '',
      returnDate: request.returnDate || '',
      returnedAt: '',
      fine: 0,
      fineStatus: '',
      status: request.status || 'Pending',
      remarks: request.librarianRemarks || request.note || '',
    }));

    return [...loanEvents, ...requestEvents].sort(
      (left, right) => new Date(right.eventAt || 0).getTime() - new Date(left.eventAt || 0).getTime()
    );
  }, [loans, requests, fines]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: history.length,
      active: history.filter((h) => h.status === 'Issued' || h.status === 'Accepted').length,
      returned: history.filter((h) => h.status === 'Returned').length,
      overdue: history.filter((h) => h.status === 'Overdue').length,
    };
  }, [history]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history.filter((item) => {
      // Event filter
      if (eventFilter === 'Issue' && item.event !== 'Book Issue') return false;
      if (eventFilter === 'Request' && item.event !== 'Book Request') return false;
      if (eventFilter === 'Return' && item.event !== 'Return Request' && item.status !== 'Returned') return false;

      // Status filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Issued' && item.status !== 'Issued') return false;
        if (statusFilter === 'Returned' && item.status !== 'Returned') return false;
        if (statusFilter === 'Overdue' && item.status !== 'Overdue') return false;
        if (statusFilter === 'Pending' && item.status !== 'Pending') return false;
      }

      // Search query
      if (!q) return true;
      const haystack = [item.student, item.studentEmail, item.title, item.remarks, item.status, item.event]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [history, search, statusFilter, eventFilter]);

  // Handle Add Record (Staff)
  const handleAddRecord = async (e) => {
    e.preventDefault();
    setError('');
    if (!addForm.studentEmail || !addForm.title) {
      setError('Please provide student email and book title.');
      return;
    }

    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: addForm.studentEmail,
          studentName: addForm.studentName || addForm.studentEmail.split('@')[0],
          bookId: addForm.bookId,
          title: addForm.title,
          issueDate: addForm.issueDate,
          dueDate: addForm.dueDate,
          status: addForm.status,
          returnDate: addForm.status === 'Returned' ? (addForm.returnDate || addForm.issueDate) : '',
          remarks: addForm.remarks,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to add history record.');
        return;
      }

      setMessage(`History entry for "${addForm.title}" recorded successfully.`);
      setAddDialogOpen(false);
      setAddForm({
        studentEmail: '',
        studentName: '',
        bookId: '',
        title: '',
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        status: 'Active',
        returnDate: '',
        remarks: '',
      });
      loadData();
    } catch {
      setError('Error creating history record.');
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (item) => {
    setEditForm({
      id: item.id,
      rawId: item.rawId,
      source: item.source,
      studentEmail: item.studentEmail || '',
      studentName: item.student || '',
      title: item.title || '',
      issueDate: item.issueDate ? item.issueDate.slice(0, 10) : '',
      dueDate: item.dueDate ? item.dueDate.slice(0, 10) : '',
      status: item.status === 'Overdue' ? 'Active' : item.status === 'Issued' ? 'Active' : item.status,
      returnDate: item.returnDate ? item.returnDate.slice(0, 10) : '',
      remarks: item.remarks || '',
    });
    setEditDialogOpen(true);
  };

  // Handle Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = editForm.source === 'loan' ? '/api/loans' : '/api/requests';
      const bodyPayload = editForm.source === 'loan'
        ? {
            id: editForm.rawId,
            studentEmail: editForm.studentEmail,
            studentName: editForm.studentName,
            title: editForm.title,
            issueDate: editForm.issueDate,
            dueDate: editForm.dueDate,
            status: editForm.status === 'Active' || editForm.status === 'Issued' ? 'Active' : editForm.status,
            returnDate: editForm.status === 'Returned' ? editForm.returnDate || new Date().toISOString().slice(0, 10) : null,
            remarks: editForm.remarks,
          }
        : {
            id: editForm.rawId,
            action: 'edit',
            studentName: editForm.studentName,
            title: editForm.title,
            issueDate: editForm.issueDate,
            dueDate: editForm.dueDate,
            status: editForm.status,
            returnDate: editForm.status === 'Returned' ? editForm.returnDate || new Date().toISOString().slice(0, 10) : null,
            librarianRemarks: editForm.remarks,
          };

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to update record.');
        return;
      }

      setMessage(`History record for "${editForm.title}" updated successfully.`);
      setEditDialogOpen(false);
      loadData();
    } catch {
      setError('Error saving changes to record.');
    }
  };

  // Quick Action: Mark Returned
  const handleQuickReturn = async (item) => {
    setError('');
    const today = new Date().toISOString().slice(0, 10);
    try {
      const endpoint = item.source === 'loan' ? '/api/loans' : '/api/requests';
      const bodyPayload = item.source === 'loan'
        ? { id: item.rawId, status: 'Returned', returnDate: today }
        : { id: item.rawId, action: 'edit', status: 'Returned', returnDate: today };

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) {
        setError('Failed to mark book as returned.');
        return;
      }

      setMessage(`"${item.title}" successfully marked as returned on ${today}.`);
      loadData();
    } catch {
      setError('Error updating return status.');
    }
  };

  // Handle Delete
  const handleDeleteRecord = async (item) => {
    if (!confirm(`Are you sure you want to delete this history record for "${item.title}"?`)) return;
    setError('');
    try {
      const endpoint = item.source === 'loan' ? `/api/loans?id=${encodeURIComponent(item.rawId)}` : `/api/requests?id=${encodeURIComponent(item.rawId)}`;
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (!res.ok) {
        setError('Failed to delete history record.');
        return;
      }
      setMessage(`History entry for "${item.title}" was removed.`);
      loadData();
    } catch {
      setError('Error deleting record.');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredHistory.length === 0) return;
    const headers = ['Student Name', 'Student Email', 'Book Title', 'Event', 'Issue Date', 'Due Date', 'Return Date', 'Fine Amount', 'Status', 'Remarks'];
    const rows = filteredHistory.map((item) => [
      `"${item.student}"`,
      `"${item.studentEmail}"`,
      `"${item.title}"`,
      `"${item.event}"`,
      `"${item.issueDate || '-'}"`,
      `"${item.dueDate || '-'}"`,
      `"${item.returnDate || '-'}"`,
      `"${item.fine || 0}"`,
      `"${item.status}"`,
      `"${(item.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Pratap_College_Library_History_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        eyebrow="CIRCULATION"
        title={isStaff ? 'Student book history & circulation' : 'My book history'}
        description="Audit complete book requests, borrowing issues, due dates, returns, and associated fines."
        action={
          isStaff ? (
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<FileDownloadOutlinedIcon />}
                onClick={handleExportCSV}
                disabled={filteredHistory.length === 0}
              >
                Export CSV
              </Button>
              <Button
                variant="contained"
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => setAddDialogOpen(true)}
              >
                Add History Record
              </Button>
            </Stack>
          ) : (
            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={handleExportCSV}
              disabled={filteredHistory.length === 0}
            >
              Export My History
            </Button>
          )
        }
      />

      {error ? <Alert severity="error" onClose={() => setError('')}>{error}</Alert> : null}
      {message ? <Alert severity="success" onClose={() => setMessage('')}>{message}</Alert> : null}

      {/* KPI Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #0284c7' }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    TOTAL TRANSACTIONS
                  </Typography>
                  <Typography variant="h5" fontWeight={750} sx={{ mt: 0.5, color: '#0f2942' }}>
                    {stats.total}
                  </Typography>
                </Box>
                <Box sx={{ p: 1, bgcolor: '#e0f2fe', borderRadius: 2, color: '#0284c7' }}>
                  <HistoryIcon />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #059669' }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    CURRENTLY ISSUED
                  </Typography>
                  <Typography variant="h5" fontWeight={750} sx={{ mt: 0.5, color: '#059669' }}>
                    {stats.active}
                  </Typography>
                </Box>
                <Box sx={{ p: 1, bgcolor: '#d1fae5', borderRadius: 2, color: '#059669' }}>
                  <MenuBookIcon />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #7c3aed' }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    COMPLETED RETURNS
                  </Typography>
                  <Typography variant="h5" fontWeight={750} sx={{ mt: 0.5, color: '#7c3aed' }}>
                    {stats.returned}
                  </Typography>
                </Box>
                <Box sx={{ p: 1, bgcolor: '#ede9fe', borderRadius: 2, color: '#7c3aed' }}>
                  <AssignmentReturnIcon />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #dc2626' }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    OVERDUE RECORDS
                  </Typography>
                  <Typography variant="h5" fontWeight={750} sx={{ mt: 0.5, color: '#dc2626' }}>
                    {stats.overdue}
                  </Typography>
                </Box>
                <Box sx={{ p: 1, bgcolor: '#fee2e2', borderRadius: 2, color: '#dc2626' }}>
                  <WarningAmberOutlinedIcon />
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
              placeholder="Search by student, book, remarks, or status…"
              sx={{ width: { xs: '100%', md: 360 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <Stack direction="row" spacing={1} flexWrap="wrap">
              {['All', 'Issued', 'Returned', 'Pending', 'Overdue'].map((status) => (
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

      {/* History Data Table */}
      <Card>
        <CardContent sx={{ overflowX: 'auto', p: 0 }}>
          <Table size="small" sx={{ minWidth: 1050 }}>
            <TableHead>
              <TableRow>
                {isStaff ? <TableCell>Student</TableCell> : null}
                <TableCell>Book Title</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>Issue Date</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Return Date</TableCell>
                <TableCell>Fine</TableCell>
                <TableCell>Status</TableCell>
                {isStaff ? <TableCell>Remarks</TableCell> : null}
                {isStaff ? <TableCell align="right">Actions</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isStaff ? 10 : 7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No circulation history entries found matching your filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredHistory.map((item) => {
                  const isIssued = item.status === 'Issued';
                  const isReturned = item.status === 'Returned';
                  const isOverdue = item.status === 'Overdue';

                  return (
                    <TableRow key={item.id} hover>
                      {isStaff ? (
                        <TableCell>
                          <Typography variant="body2" fontWeight={650}>
                            {item.student}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.studentEmail}
                          </Typography>
                        </TableCell>
                      ) : null}

                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {item.title}
                        </Typography>
                        {isOverdue ? (
                          <Chip label="Overdue" size="small" color="error" sx={{ height: 18, fontSize: 10, mt: 0.3 }} />
                        ) : null}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={item.event}
                          variant="outlined"
                          color={item.event === 'Book Issue' ? 'primary' : item.event === 'Return Request' ? 'secondary' : 'default'}
                          sx={{ fontSize: '0.72rem' }}
                        />
                      </TableCell>

                      <TableCell>
                        {item.issueDate || '-'}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" color={isOverdue ? 'error.main' : 'text.primary'} fontWeight={isOverdue ? 700 : 400}>
                          {item.dueDate || '-'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {item.returnDate || '-'}
                      </TableCell>

                      <TableCell>
                        {item.fine > 0 ? (
                          <Typography variant="body2" fontWeight={700} color={item.fineStatus === 'Paid' ? '#059669' : '#dc2626'}>
                            ₹{item.fine} ({item.fineStatus || 'Pending'})
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={item.status}
                          color={
                            isReturned
                              ? 'success'
                              : isIssued
                              ? 'primary'
                              : isOverdue
                              ? 'error'
                              : item.status === 'Pending'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      </TableCell>

                      {isStaff ? (
                        <TableCell>
                          <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 140, display: 'inline-block' }} noWrap>
                            {item.remarks || '-'}
                          </Typography>
                        </TableCell>
                      ) : null}

                      {isStaff ? (
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                            {/* Quick Return button */}
                            {isIssued || isOverdue ? (
                              <Tooltip title="Mark returned today">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="success"
                                  onClick={() => handleQuickReturn(item)}
                                  startIcon={<CheckCircleOutlineIcon fontSize="small" />}
                                  sx={{ minHeight: 28, py: 0.2, px: 1, fontSize: '0.72rem' }}
                                >
                                  Return
                                </Button>
                              </Tooltip>
                            ) : null}

                            {/* Edit Button */}
                            <Tooltip title="Edit record details">
                              <IconButton size="small" color="primary" onClick={() => handleOpenEdit(item)}>
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            {/* Delete Button */}
                            <Tooltip title="Delete record">
                              <IconButton size="small" color="error" onClick={() => handleDeleteRecord(item)}>
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ================= ADD RECORD DIALOG ================= */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleAddRecord}>
          <DialogTitle sx={{ fontWeight: 700 }}>Add Book History Record</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Record a physical book borrowing transaction or log historical offline records.
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel id="add-student-select-label">Select Registered Student</InputLabel>
              <Select
                labelId="add-student-select-label"
                label="Select Registered Student"
                value={addForm.studentEmail}
                onChange={(e) => {
                  const selected = students.find((s) => s.email === e.target.value);
                  setAddForm((prev) => ({
                    ...prev,
                    studentEmail: e.target.value,
                    studentName: selected ? selected.name : prev.studentName,
                  }));
                }}
              >
                {students.map((s) => (
                  <MenuItem key={s.id} value={s.email}>
                    {s.name} ({s.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Student Email"
                  required
                  value={addForm.studentEmail}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, studentEmail: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Student Name"
                  value={addForm.studentName}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, studentName: e.target.value }))}
                />
              </Grid>
            </Grid>

            <FormControl fullWidth size="small">
              <InputLabel id="add-book-select-label">Select Book from Inventory</InputLabel>
              <Select
                labelId="add-book-select-label"
                label="Select Book from Inventory"
                value={addForm.bookId}
                onChange={(e) => {
                  const b = books.find((item) => String(item.id) === String(e.target.value));
                  setAddForm((prev) => ({
                    ...prev,
                    bookId: e.target.value,
                    title: b ? b.title : prev.title,
                  }));
                }}
              >
                {books.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.title} (Available: {b.availableCopies})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              size="small"
              label="Book Title"
              required
              value={addForm.title}
              onChange={(e) => setAddForm((prev) => ({ ...prev, title: e.target.value }))}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Issue Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={addForm.issueDate}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, issueDate: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Due Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={addForm.dueDate}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={addForm.status}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <MenuItem value="Active">Issued / Active</MenuItem>
                    <MenuItem value="Returned">Returned</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {addForm.status === 'Returned' ? (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Return Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={addForm.returnDate || addForm.issueDate}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, returnDate: e.target.value }))}
                  />
                </Grid>
              ) : null}
            </Grid>

            <TextField
              fullWidth
              size="small"
              label="Librarian Remarks / Notes"
              placeholder="e.g. Issued offline at library desk, Historical entry"
              value={addForm.remarks}
              onChange={(e) => setAddForm((prev) => ({ ...prev, remarks: e.target.value }))}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" type="submit">
              Save History Entry
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ================= EDIT RECORD DIALOG ================= */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveEdit}>
          <DialogTitle sx={{ fontWeight: 700 }}>Edit Book History Record</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Update details, dates, circulation status, or librarian remarks for this record.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Student Email"
                  required
                  value={editForm.studentEmail}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, studentEmail: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Student Name"
                  value={editForm.studentName}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, studentName: e.target.value }))}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              size="small"
              label="Book Title"
              required
              value={editForm.title}
              onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Issue Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={editForm.issueDate}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, issueDate: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Due Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={editForm.dueDate}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={editForm.status}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <MenuItem value="Active">Issued / Active</MenuItem>
                    <MenuItem value="Returned">Returned</MenuItem>
                    <MenuItem value="Pending">Pending Review</MenuItem>
                    <MenuItem value="Accepted">Accepted</MenuItem>
                    <MenuItem value="Rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {editForm.status === 'Returned' ? (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Return Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={editForm.returnDate}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, returnDate: e.target.value }))}
                  />
                </Grid>
              ) : null}
            </Grid>

            <TextField
              fullWidth
              size="small"
              label="Librarian Remarks / Notes"
              value={editForm.remarks}
              onChange={(e) => setEditForm((prev) => ({ ...prev, remarks: e.target.value }))}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" type="submit">
              Update History Record
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
