'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, IconButton, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PageHeader from '../../components/PageHeader';

const initialForm = { id: null, name: '', email: '', phone: '', membership: 'Active' };

export default function BorrowersPage() {
  const [borrowers, setBorrowers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState('');
  const [membershipFilter, setMembershipFilter] = useState('All');
  const [error, setError] = useState('');

  const load = async () => {
    const response = await fetch('/api/borrowers');
    if (!response.ok) {
      setError('Borrower records are available to library staff.');
      return;
    }
    setBorrowers(await response.json());
  };

  useEffect(() => { load(); }, []);

  const visibleBorrowers = useMemo(() => borrowers.filter((borrower) => {
    const query = search.trim().toLowerCase();
    const searchable = `${borrower.name || ''} ${borrower.email || ''} ${borrower.phone || ''} ${(borrower.borrowedBooks || []).join(' ')}`.toLowerCase();
    return (!query || searchable.includes(query)) && (membershipFilter === 'All' || borrower.membership === membershipFilter);
  }), [borrowers, search, membershipFilter]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const response = await fetch('/api/borrowers', {
      method: form.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!response.ok) {
      const result = await response.json();
      setError(result.error || 'Unable to save borrower.');
      return;
    }
    setForm(initialForm);
    load();
  };

  const deleteBorrower = async (id) => {
    const response = await fetch(`/api/borrowers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) {
      const result = await response.json();
      setError(result.error || 'Unable to remove borrower.');
      return;
    }
    load();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader eyebrow="PEOPLE" title="Borrowers" description="Student profiles joined with live loan, request, and fine activity." />
      <Card>
        <CardContent>
          {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
          <Box component="form" onSubmit={submit}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
              <TextField label="Name" required value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              <TextField label="Email" type="email" required value={form.email || ''} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              <TextField label="Phone" value={form.phone || ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              <TextField select label="Membership" value={form.membership || 'Active'} onChange={(event) => setForm({ ...form, membership: event.target.value })} sx={{ minWidth: 130 }}>
                <MenuItem value="Active">Active</MenuItem><MenuItem value="Inactive">Inactive</MenuItem>
              </TextField>
              <Button type="submit" variant="contained">{form.id ? 'Update Borrower' : 'Add Borrower'}</Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ overflowX: 'auto' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField label="Search borrowers" value={search} onChange={(event) => setSearch(event.target.value)} fullWidth />
            <TextField select label="Membership" value={membershipFilter} onChange={(event) => setMembershipFilter(event.target.value)} sx={{ minWidth: 180 }}>
              <MenuItem value="All">All memberships</MenuItem><MenuItem value="Active">Active</MenuItem><MenuItem value="Inactive">Inactive</MenuItem>
            </TextField>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>{visibleBorrowers.length} of {borrowers.length} borrowers</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 1200 }}>
              <TableHead><TableRow>
                <TableCell>Borrower</TableCell><TableCell>Contact</TableCell><TableCell>Membership</TableCell><TableCell>Currently borrowed</TableCell><TableCell>Loan history</TableCell><TableCell>Request history</TableCell><TableCell>Outstanding fines</TableCell><TableCell>Actions</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {visibleBorrowers.length === 0 ? <TableRow><TableCell colSpan={8} align="center">No borrower records found.</TableCell></TableRow> : visibleBorrowers.map((borrower) => (
                  <TableRow key={borrower.id}>
                    <TableCell>{borrower.name}<Typography variant="caption" display="block" color="text.secondary">{borrower.id}</Typography></TableCell>
                    <TableCell>{borrower.email}<Typography variant="caption" display="block" color="text.secondary">{borrower.phone || 'No phone'}</Typography></TableCell>
                    <TableCell><Chip label={borrower.membership || 'Active'} size="small" color={borrower.membership === 'Inactive' ? 'default' : 'success'} /></TableCell>
                    <TableCell>{(borrower.borrowedBooks || []).join(', ') || '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'pre-line' }}>{(borrower.loanHistory || []).map((loan) => `${loan.title}: ${loan.issueDate || '-'} to ${loan.dueDate || '-'}; returned ${loan.returnDate || 'not returned'} (${loan.status})`).join('\n') || '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'pre-line' }}>{(borrower.requestHistory || []).map((request) => `${request.title}: ${request.status} (${request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '-'})`).join('\n') || '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'pre-line' }}>₹{borrower.outstandingFines || 0}<Typography variant="caption" display="block" sx={{ whiteSpace: 'pre-line' }}>{(borrower.fines || []).map((fine) => `${fine.title}: ₹${fine.amount} ${fine.paymentStatus}`).join('\n')}</Typography></TableCell>
                    <TableCell><Stack direction="row"><IconButton size="small" aria-label="Edit borrower" onClick={() => setForm({ ...borrower })}><EditIcon fontSize="small" /></IconButton>{borrower.role !== 'Student' ? <IconButton size="small" color="error" aria-label="Delete borrower" onClick={() => deleteBorrower(borrower.id)}><DeleteIcon fontSize="small" /></IconButton> : null}</Stack></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
