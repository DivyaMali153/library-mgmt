'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardContent, Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useRole } from '../../components/RoleProvider';

export default function BookHistoryPage() {
  const { user } = useRole();
  const [loans, setLoans] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/loans?email=${encodeURIComponent(user?.email || '')}`);
      setLoans(await res.json());
    };
    load();
  }, [user]);

  const history = useMemo(() => loans.filter((loan) => loan.status === 'Returned'), [loans]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" fontWeight={700}>Borrowing History</Typography>
          <Typography color="text.secondary">Your previously returned books and transaction details.</Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Book Title</TableCell>
                <TableCell>Issue Date</TableCell>
                <TableCell>Return Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell>{loan.title}</TableCell>
                  <TableCell>{loan.issueDate || '-'}</TableCell>
                  <TableCell>{loan.returnDate || '-'}</TableCell>
                  <TableCell>
                    <Chip label="Returned" color="success" size="small" />
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
