'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useRole } from '../../components/RoleProvider';

export default function BorrowedBooksPage() {
  const { user } = useRole();
  const [loans, setLoans] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/loans?email=${encodeURIComponent(user?.email || '')}`);
      setLoans(await res.json());
    };
    load();
  }, [user]);

  const activeLoans = useMemo(() => loans.filter((loan) => loan.status === 'Active'), [loans]);

  const renewLoan = async (loan) => {
    const newDue = new Date(loan.dueDate);
    newDue.setDate(newDue.getDate() + 7);
    await fetch('/api/loans', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...loan, dueDate: newDue.toISOString().slice(0, 10) }),
    });
    setLoans((prev) => prev.map((item) => (item.id === loan.id ? { ...item, dueDate: newDue.toISOString().slice(0, 10) } : item)));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" fontWeight={700}>Currently Borrowed Books</Typography>
          <Typography color="text.secondary">View active loans and renew eligible books.</Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table>
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
                    <Button size="small" variant="outlined" disabled={!loan.dueDate} onClick={() => renewLoan(loan)}>Renew</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
