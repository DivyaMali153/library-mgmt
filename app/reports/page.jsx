'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useRole } from '../../components/RoleProvider';
import PageHeader from '../../components/PageHeader';

const reportOptions = [
  ['loans', 'Book issues and returns'],
  ['requests', 'Book requests'],
  ['borrowers', 'Borrowers'],
  ['overdue', 'Overdue books'],
  ['fines', 'Fine collection'],
  ['ebooks', 'E-book catalogue'],
];

function reportDate(report, row) {
  if (report === 'requests') return row.createdAt;
  if (report === 'borrowers') return row.createdAt || row.registeredAt;
  if (report === 'fines') return row.createdAt;
  if (report === 'ebooks') return row.createdAt || row.addedAt;
  return report === 'overdue' ? row.dueDate : row.returnDate || row.issueDate || row.createdAt;
}

function reportStatus(report, row) {
  if (report === 'fines') return row.paymentStatus || '';
  if (report === 'overdue') return 'Overdue';
  if (report === 'borrowers') return row.membership || '';
  return row.status || '';
}

function columnsFor(report) {
  const fields = {
    loans: [['title', 'Book'], ['borrowerName', 'Student'], ['studentEmail', 'Email'], ['issueDate', 'Issue date'], ['issuedAt', 'Issued at'], ['dueDate', 'Due date'], ['dueAt', 'Due at'], ['returnDate', 'Return date'], ['returnedAt', 'Returned at'], ['status', 'Status']],
    requests: [['title', 'Book'], ['requestType', 'Type'], ['studentName', 'Student'], ['requestedBy', 'Email'], ['createdAt', 'Requested at'], ['status', 'Status'], ['librarianRemarks', 'Remarks']],
    borrowers: [['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['membership', 'Membership'], ['borrowedBooks', 'Currently borrowed'], ['requestHistory', 'Request history'], ['loanHistory', 'Loan history'], ['outstandingFines', 'Outstanding fines']],
    overdue: [['title', 'Book'], ['borrowerName', 'Student'], ['studentEmail', 'Email'], ['issueDate', 'Issue date'], ['dueDate', 'Due date'], ['overdueDays', 'Overdue days'], ['amount', 'Fine amount'], ['status', 'Status']],
    fines: [['title', 'Book'], ['studentName', 'Student'], ['studentEmail', 'Email'], ['reason', 'Reason'], ['amount', 'Amount'], ['issueDate', 'Issue date'], ['dueDate', 'Due date'], ['overdueDays', 'Overdue days'], ['createdAt', 'Created at'], ['paymentDeadlineAt', 'Payment deadline'], ['paymentStatus', 'Payment status'], ['paidAt', 'Paid at']],
    ebooks: [['title', 'Title'], ['author', 'Author'], ['category', 'Category'], ['description', 'Description'], ['pdfUrl', 'PDF'], ['status', 'Status']],
  };
  return fields[report] || [];
}

function printableValue(value) {
  if (Array.isArray(value)) return value.map((item) => typeof item === 'object' ? `${item.title || ''} (${item.status || ''})` : item).join('; ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return value ?? '';
}

export default function ReportsPage() {
  const { role } = useRole();
  const isStaff = ['administrator', 'librarian'].includes(String(role || '').toLowerCase());
  const [data, setData] = useState({ loans: [], requests: [], borrowers: [], fines: [], fineRatePerDay: 5, ebooks: [] });
  const [report, setReport] = useState('loans');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('All');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isStaff) return;
    const load = async () => {
      const finesResponse = await fetch('/api/fines');
      if (!finesResponse.ok) {
        setError('Fine records could not be loaded. Check staff access and try again.');
        return;
      }
      const fineResult = await finesResponse.json();
      const endpoints = [
        ['loans', '/api/loans'],
        ['requests', '/api/requests'],
        ['borrowers', '/api/borrowers'],
        ['ebooks', '/api/ebooks'],
      ];
      const responses = await Promise.all(endpoints.map(([, url]) => fetch(url)));
      const failed = responses.find((response) => !response.ok);
      if (failed) {
        setError('Some report records could not be loaded. Check staff access and try again.');
        return;
      }
      const values = await Promise.all(responses.map((response) => response.json()));
      setData({
        loans: values[0],
        requests: values[1],
        borrowers: values[2],
        fines: fineResult.fines || [],
        fineRatePerDay: Number(fineResult.settings?.fineRatePerDay || 5),
        ebooks: values[3],
      });
    };
    load();
  }, [isStaff]);

  const sourceRows = useMemo(() => {
    if (report === 'overdue') {
      const today = new Date();
      return data.loans.filter((loan) => loan.status === 'Active' && loan.dueDate && new Date(`${loan.dueDate}T00:00:00`) < today)
        .map((loan) => {
          const fine = data.fines.find((item) => String(item.loanId) === String(loan.id));
          const overdueDays = Math.max(0, Math.floor((today.getTime() - new Date(`${loan.dueDate}T00:00:00`).getTime()) / 86400000));
          return { ...loan, overdueDays, amount: fine?.amount || overdueDays * data.fineRatePerDay, status: 'Overdue' };
        });
    }
    return data[report] || [];
  }, [data, report]);

  const rows = useMemo(() => sourceRows.filter((row) => {
    const rawDate = reportDate(report, row);
    if ((startDate || endDate) && !rawDate) return false;
    const date = rawDate ? new Date(rawDate) : null;
    if (startDate && date < new Date(`${startDate}T00:00:00`)) return false;
    if (endDate && date > new Date(`${endDate}T23:59:59.999`)) return false;
    return status === 'All' || reportStatus(report, row) === status;
  }), [sourceRows, report, startDate, endDate, status]);

  const columns = columnsFor(report);
  const statuses = [...new Set(sourceRows.map((row) => reportStatus(report, row)).filter(Boolean))];

  const exportCsv = () => {
    const csv = [columns.map(([, label]) => label), ...rows.map((row) => columns.map(([field]) => printableValue(row[field])))].map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isStaff) return <Alert severity="error">Access denied: reports are available to library staff.</Alert>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader eyebrow="ANALYTICS" title="Library reports" description="Generate reports from current library records." />
      <Card>
        <CardContent>
          {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
            <TextField select label="Report" value={report} onChange={(event) => { setReport(event.target.value); setStatus('All'); }} sx={{ minWidth: 220 }}>
              {reportOptions.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </TextField>
            <TextField type="date" label="From" value={startDate} onChange={(event) => setStartDate(event.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField type="date" label="To" value={endDate} onChange={(event) => setEndDate(event.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField select label="Status" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value="All">All statuses</MenuItem>
              {statuses.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
            </TextField>
            <Button variant="outlined" onClick={exportCsv} disabled={rows.length === 0}>Export CSV</Button>
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{rows.length} matching record{rows.length === 1 ? '' : 's'}</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 760 }}>
              <TableHead><TableRow>{columns.map(([, label]) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
              <TableBody>
                {rows.length === 0 ? <TableRow><TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>No records match these filters.</TableCell></TableRow> : rows.map((row) => (
                  <TableRow key={row.id}>{columns.map(([field]) => <TableCell key={field} sx={{ verticalAlign: 'top', whiteSpace: 'pre-line' }}>{String(printableValue(row[field]) || '-')}</TableCell>)}</TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
