'use client';

import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Stack, Typography, Table, TableBody, TableCell, TableHead, TableRow, Chip, Button, TextField, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export default function BorrowersPage() {
  const [borrowers, setBorrowers] = useState([]);
  const [form, setForm] = useState({ id: null, name: '', email: '', phone: '', membership: 'Active' });

  const load = async () => {
    const res = await fetch('/api/borrowers');
    setBorrowers(await res.json());
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    const method = form.id ? 'PUT' : 'POST';
    await fetch('/api/borrowers', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setForm({ id: null, name: '', email: '', phone: '', membership: 'Active' });
    load();
  };

  const editBorrower = (borrower) => setForm(borrower);

  const deleteBorrower = async (id) => {
    await fetch(`/api/borrowers?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" fontWeight={700}>Borrower management</Typography>
          <Typography color="text.secondary">Manage borrower profiles and memberships.</Typography>
          <form onSubmit={submit}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
              <TextField label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <TextField label="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <TextField label="Phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <TextField label="Membership" value={form.membership} onChange={(e) => setForm({ ...form, membership: e.target.value })} />
              <Button type="submit" variant="contained">{form.id ? 'Update Borrower' : 'Add Borrower'}</Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {borrowers.map((borrower) => (
                <TableRow key={borrower.id}>
                  <TableCell>{borrower.name}</TableCell>
                  <TableCell>{borrower.email}</TableCell>
                  <TableCell>{borrower.phone}</TableCell>
                  <TableCell><Chip label={borrower.membership} color="success" size="small" /></TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <IconButton size="small" onClick={() => editBorrower(borrower)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => deleteBorrower(borrower.id)}><DeleteIcon fontSize="small" /></IconButton>
                    </Stack>
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
