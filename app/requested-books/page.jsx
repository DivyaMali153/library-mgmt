'use client';

import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useRole } from '../../components/RoleProvider';

export default function RequestedBooksPage() {
  const { user } = useRole();
  const [requests, setRequests] = useState([]);

  const load = async () => {
    if (!user?.email) {
      setRequests([]);
      return;
    }
    const res = await fetch(`/api/requests?email=${encodeURIComponent(user.email)}`);
    setRequests(await res.json());
  };

  useEffect(() => { load(); }, [user?.email]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" fontWeight={700}>Requested Books</Typography>
          <Typography color="text.secondary">Your submitted book requests and their current status.</Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table>
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
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
