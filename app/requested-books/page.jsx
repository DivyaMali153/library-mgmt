'use client';

import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useRole } from '../../components/RoleProvider';
import PageHeader from '../../components/PageHeader';

export default function RequestedBooksPage() {
  const { user } = useRole();
  const [requests, setRequests] = useState([]);

  const load = async () => {
    if (!user?.email) {
      setRequests([]);
      return;
    }
    const res = await fetch('/api/requests');
    if (res.ok) setRequests(await res.json());
  };

  useEffect(() => {
    if (!user?.email) return;
    load();
    const interval = window.setInterval(load, 15000);
    return () => window.clearInterval(interval);
  }, [user?.email]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader eyebrow="MY ACTIVITY" title="Book requests" description="Track submitted physical-book, e-book, and return requests." />

      <Card>
        <CardContent sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell>Book Title</TableCell>
                <TableCell>Author</TableCell>
                <TableCell>Requested On</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Librarian Remarks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.title}</TableCell>
                  <TableCell>{r.author || '-'}</TableCell>
                  <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip label={r.status} color={r.status === 'Issued' || r.status === 'Accepted' ? 'success' : r.status === 'Rejected' || r.status === 'Not Available' ? 'error' : 'warning'} size="small" />
                  </TableCell>
                  <TableCell>{r.librarianRemarks || '-'}</TableCell>
                </TableRow>
              ))}
              {requests.length === 0 ? <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>You have not submitted any requests yet.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
