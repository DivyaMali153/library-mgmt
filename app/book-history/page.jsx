'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardContent, Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useRole } from '../../components/RoleProvider';

export default function BookHistoryPage() {
  const { user, role } = useRole();
  const [loans, setLoans] = useState([]);
  const isLibrarian = role?.toLowerCase() === 'librarian';

  useEffect(() => {
    const load = async () => {
      const url = isLibrarian ? '/api/loans' : `/api/loans?email=${encodeURIComponent(user?.email || '')}`;
      const res = await fetch(url);
      const data = await res.json();
      setLoans(data);
    };

    if (isLibrarian || user?.email) {
      load();
    }
  }, [user?.email, isLibrarian]);

  const history = useMemo(
    () =>
      [...loans].sort((a, b) => {
        const aDate = new Date(a.returnDate || a.issueDate || a.createdAt || 0).getTime();
        const bDate = new Date(b.returnDate || b.issueDate || b.createdAt || 0).getTime();
        return bDate - aDate;
      }),
    [loans],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" fontWeight={700}>{isLibrarian ? 'Student Loan History' : 'Borrowing History'}</Typography>
          <Typography color="text.secondary">
            {isLibrarian
              ? 'All student borrowing and return records from the library.'
              : 'Your issued and returned books with issue and return details.'}
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                {isLibrarian ? <TableCell>Student</TableCell> : null}
                <TableCell>Book Title</TableCell>
                <TableCell>Issue Date</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Return Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((loan) => (
                <TableRow key={loan.id}>
                  {isLibrarian ? <TableCell>{loan.borrowerName || loan.studentName || loan.borrower || '-'}</TableCell> : null}
                  <TableCell>{loan.title}</TableCell>
                  <TableCell>{loan.issueDate || '-'}</TableCell>
                  <TableCell>{loan.dueDate || '-'}</TableCell>
                  <TableCell>{loan.returnDate || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={loan.status || 'Returned'}
                      color={loan.status === 'Active' ? 'warning' : 'success'}
                      size="small"
                    />
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
