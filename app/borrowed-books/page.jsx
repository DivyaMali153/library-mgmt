'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useRole } from '../../components/RoleProvider';
import PageHeader from '../../components/PageHeader';

export default function BorrowedBooksPage() {
  const { user } = useRole();
  const [loans, setLoans] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user?.email) {
        setLoans([]);
        return;
      }
      const res = await fetch(`/api/loans?email=${encodeURIComponent(user.email)}`);
      if (res.ok) setLoans(await res.json());
    };
    load();
    const interval = window.setInterval(load, 15000);
    return () => window.clearInterval(interval);
  }, [user?.email]);

  const activeLoans = useMemo(() => loans.filter((loan) => loan.status === 'Active'), [loans]);

  const renewLoan = async (loan) => {
    const newDue = new Date(loan.dueDate || Date.now());
    newDue.setDate(newDue.getDate() + 7);
    const updatedLoan = { ...loan, dueDate: newDue.toISOString().slice(0, 10) };
    await fetch('/api/loans', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedLoan),
    });
    setLoans((prev) => prev.map((item) => (item.id === loan.id ? updatedLoan : item)));
  };

  const requestReturn = async (loan) => {
    if (!user?.email) {
      setMessage('Please log in to request a return.');
      return;
    }

    const response = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'return',
        title: loan.title,
        bookId: loan.bookId || loan.id,
        loanId: loan.id,
        studentName: user.name || '',
        studentId: user.id || '',
        requestedBy: user.email,
        note: 'Return request from student',
      }),
    });

    if (response.ok) {
      setMessage('Return request sent to the librarian.');
    } else {
      setMessage('Unable to send the return request.');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader eyebrow="CIRCULATION" title="Borrowed books" description="Review active loans, due dates, and return requests." />
      {message ? <Alert severity={message.startsWith('Unable') || message.startsWith('Please') ? 'warning' : 'success'}>{message}</Alert> : null}

      <Card>
        <CardContent sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell>Book Title</TableCell>
                <TableCell>Issue Date</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Return Status</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeLoans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell>{loan.title}</TableCell>
                  <TableCell>{loan.issueDate || '-'}</TableCell>
                  <TableCell>{loan.dueDate || '-'}</TableCell>
                  <TableCell>
                    <Chip label={loan.status} color={loan.status === 'Active' ? 'warning' : 'success'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" disabled={!loan.dueDate} onClick={() => renewLoan(loan)}>Renew</Button>
                      <Button size="small" variant="contained" color="secondary" onClick={() => requestReturn(loan)}>Request Return</Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {activeLoans.length === 0 ? <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>You have no active borrowed books.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
