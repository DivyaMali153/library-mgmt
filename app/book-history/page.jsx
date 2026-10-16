'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Card, CardContent, Chip, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useRole } from '../../components/RoleProvider';
import PageHeader from '../../components/PageHeader';

export default function BookHistoryPage() {
  const { role, user } = useRole();
  const isStaff = ['administrator', 'librarian'].includes(String(role || '').toLowerCase());
  const [loans, setLoans] = useState([]);
  const [requests, setRequests] = useState([]);
  const [fines, setFines] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.email) return;
    const load = async () => {
      const responses = await Promise.all([fetch('/api/loans'), fetch('/api/requests'), fetch('/api/fines')]);
      if (responses.some((response) => !response.ok)) {
        setError('Unable to load your history. Please sign in again.');
        return;
      }
      const [loanRows, requestRows, fineResult] = await Promise.all(responses.map((response) => response.json()));
      setLoans(loanRows);
      setRequests(requestRows);
      setFines(fineResult.fines || []);
    };
    load();
    const interval = window.setInterval(load, 15000);
    return () => window.clearInterval(interval);
  }, [user?.email]);

  const history = useMemo(() => {
    const loanEvents = loans.map((loan) => {
      const fine = fines.find((item) => String(item.loanId) === String(loan.id));
      const overdue = loan.status === 'Active' && loan.dueDate && new Date(`${loan.dueDate}T23:59:59`) < new Date();
      return {
        id: `loan:${loan.id}`,
        student: loan.studentName || loan.borrowerName || loan.borrower || '-',
        title: loan.title,
        event: 'Loan',
        eventAt: loan.issuedAt || loan.createdAt || loan.issueDate,
        issueDate: loan.issueDate,
        issuedAt: loan.issuedAt,
        dueDate: loan.dueDate,
        returnDate: loan.returnDate,
        returnedAt: loan.returnedAt,
        fine: fine?.amount || 0,
        status: overdue ? 'Overdue' : loan.status === 'Active' ? 'Issued' : loan.status || 'Issued',
      };
    });
    const requestEvents = requests.map((request) => ({
      id: `request:${request.id}`,
      student: request.studentName || request.requestedBy || '-',
      title: request.title,
      event: request.requestType === 'return' ? 'Return request' : request.requestType === 'ebook' ? 'E-book request' : 'Book request',
      eventAt: request.createdAt,
      issueDate: request.issueDate,
      issuedAt: '',
      dueDate: request.dueDate,
      returnDate: request.returnDate,
      returnedAt: '',
      fine: 0,
      status: request.status,
    }));
    return [...loanEvents, ...requestEvents].sort((left, right) => new Date(right.eventAt || 0) - new Date(left.eventAt || 0));
  }, [loans, requests, fines]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader eyebrow="CIRCULATION" title={isStaff ? 'Student book history' : 'Book history'} description="Requests, issues, due dates, returns, and associated fines." />
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Card><CardContent sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 1000 }}>
          <TableHead><TableRow>
            {isStaff ? <TableCell>Student</TableCell> : null}
            <TableCell>Book</TableCell><TableCell>Event</TableCell><TableCell>Event date/time</TableCell><TableCell>Issue date/time</TableCell><TableCell>Due date</TableCell><TableCell>Return date/time</TableCell><TableCell>Fine</TableCell><TableCell>Status</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {history.length === 0 ? <TableRow><TableCell colSpan={isStaff ? 9 : 8} align="center">No book history found.</TableCell></TableRow> : history.map((item) => (
              <TableRow key={item.id}>
                {isStaff ? <TableCell>{item.student}</TableCell> : null}
                <TableCell>{item.title || '-'}</TableCell><TableCell>{item.event}</TableCell><TableCell>{item.eventAt ? new Date(item.eventAt).toLocaleString() : '-'}</TableCell>
                <TableCell>{item.issueDate || '-'}{item.issuedAt ? ` ${new Date(item.issuedAt).toLocaleTimeString()}` : ''}</TableCell>
                <TableCell>{item.dueDate || '-'}{item.dueAt ? ` ${new Date(item.dueAt).toLocaleTimeString()}` : ''}</TableCell>
                <TableCell>{item.returnDate || '-'}{item.returnedAt ? ` ${new Date(item.returnedAt).toLocaleTimeString()}` : ''}</TableCell>
                <TableCell>{item.fine ? `₹${item.fine}` : '-'}</TableCell>
                <TableCell><Chip size="small" label={item.status} color={item.status === 'Returned' || item.status === 'Accepted' || item.status === 'Issued' ? 'success' : item.status === 'Rejected' || item.status === 'Cancelled' ? 'error' : 'warning'} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </Box>
  );
}
