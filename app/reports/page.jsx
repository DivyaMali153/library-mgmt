'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardContent, Grid, Typography, Stack, Chip, Divider } from '@mui/material';

export default function ReportsPage() {
  const [books, setBooks] = useState([]);
  const [ebooks, setEbooks] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [loans, setLoans] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [booksRes, ebooksRes, borrowersRes, loansRes] = await Promise.all([
        fetch('/api/books'),
        fetch('/api/ebooks'),
        fetch('/api/borrowers'),
        fetch('/api/loans'),
      ]);
      setBooks(await booksRes.json());
      setEbooks(await ebooksRes.json());
      setBorrowers(await borrowersRes.json());
      setLoans(await loansRes.json());
    };
    load();
  }, []);

  const summary = useMemo(() => ({
    books: books.length,
    ebooks: ebooks.length,
    borrowers: borrowers.length,
    activeLoans: loans.filter((loan) => loan.status === 'Active').length,
    returnedLoans: loans.filter((loan) => loan.status === 'Returned').length,
  }), []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" fontWeight={700}>Library reports</Typography>
          <Typography color="text.secondary">Overview of collection size, participation, and circulation.</Typography>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}><Card variant="outlined"><CardContent><Typography variant="overline">Books</Typography><Typography variant="h4">{summary.books}</Typography></CardContent></Card></Grid>
            <Grid item xs={12} md={3}><Card variant="outlined"><CardContent><Typography variant="overline">E-books</Typography><Typography variant="h4">{summary.ebooks}</Typography></CardContent></Card></Grid>
            <Grid item xs={12} md={3}><Card variant="outlined"><CardContent><Typography variant="overline">Borrowers</Typography><Typography variant="h4">{summary.borrowers}</Typography></CardContent></Card></Grid>
            <Grid item xs={12} md={3}><Card variant="outlined"><CardContent><Typography variant="overline">Loans</Typography><Typography variant="h4">{summary.activeLoans}</Typography></CardContent></Card></Grid>
          </Grid>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700}>Current circulation</Typography>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            {loans.map((loan) => (
              <Box key={loan.id} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between">
                  <Box>
                    <Typography fontWeight={700}>{loan.title}</Typography>
                    <Typography color="text.secondary">Borrower: {loan.borrowerName}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Chip label={`Due ${loan.dueDate}`} size="small" />
                    <Chip label={loan.status} color={loan.status === 'Active' ? 'warning' : 'success'} size="small" />
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
