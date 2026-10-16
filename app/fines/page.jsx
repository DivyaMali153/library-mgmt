'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useRole } from '../../components/RoleProvider';
import PageHeader from '../../components/PageHeader';

const formatDate = (value) => value ? new Date(value).toLocaleString() : '-';

export default function FinesPage() {
  const { role } = useRole();
  const isStaff = ['administrator', 'librarian'].includes(String(role || '').toLowerCase());
  const [fines, setFines] = useState([]);
  const [settings, setSettings] = useState({ fineRatePerDay: 5, paymentDeadlineDays: 7 });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const response = await fetch('/api/fines');
    if (!response.ok) {
      setError('Unable to load fines. Please sign in again.');
      return;
    }
    const data = await response.json();
    setFines(data.fines || []);
    setSettings(data.settings || settings);
  };

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const submitFine = async (fine) => {
    setError('');
    const response = await fetch('/api/fines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fineId: fine.id }),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error || 'Unable to submit payment.');
      return;
    }
    setMessage('Payment submitted for staff confirmation.');
    load();
  };

  const recordPayment = async (fine) => {
    const enteredReference = window.prompt('Payment reference (optional):');
    if (enteredReference === null || !window.confirm(`Record ₹${fine.amount} as paid for ${fine.title}?`)) return;
    const reference = enteredReference.trim();
    const response = await fetch('/api/fines', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fine.id, reference }),
    });
    if (!response.ok) {
      setError('Unable to record payment.');
      return;
    }
    setMessage(`Payment recorded for ${fine.title}.`);
    load();
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    const response = await fetch('/api/fines', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'configure', ...settings }),
    });
    if (!response.ok) {
      setError('Settings were not saved. Check the rate and deadline values.');
      return;
    }
    setMessage('Fine policy saved.');
    load();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader eyebrow="FINANCE" title={isStaff ? 'Fine collection' : 'My fines'} description="Overdue charges, payment deadlines, and payment history." />
      {error ? <Alert severity="error" onClose={() => setError('')}>{error}</Alert> : null}
      {message ? <Alert severity="success" onClose={() => setMessage('')}>{message}</Alert> : null}

      {isStaff ? (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700}>Fine policy</Typography>
            <Box component="form" onSubmit={saveSettings} sx={{ mt: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <TextField label="Fine per overdue day (₹)" type="number" inputProps={{ min: 1, step: 1 }} value={settings.fineRatePerDay} onChange={(event) => setSettings({ ...settings, fineRatePerDay: Number(event.target.value) })} />
                <TextField label="Payment deadline (days)" type="number" inputProps={{ min: 1, max: 90, step: 1 }} value={settings.paymentDeadlineDays} onChange={(event) => setSettings({ ...settings, paymentDeadlineDays: Number(event.target.value) })} />
                <Button variant="contained" type="submit">Save policy</Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1280 }}>
            <TableHead>
              <TableRow>
                {isStaff ? <TableCell>Student</TableCell> : null}
                <TableCell>Book</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Issue date</TableCell>
                <TableCell>Due date</TableCell>
                <TableCell>Overdue days</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Payment deadline</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Payment history</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fines.length === 0 ? (
                <TableRow><TableCell colSpan={isStaff ? 12 : 11} align="center" sx={{ py: 6 }}>No fines recorded.</TableCell></TableRow>
              ) : fines.map((fine) => (
                <TableRow key={fine.id}>
                  {isStaff ? <TableCell>{fine.studentName || fine.studentEmail}</TableCell> : null}
                  <TableCell>{fine.title}</TableCell>
                  <TableCell>{fine.reason}</TableCell>
                  <TableCell>{fine.issueDate || '-'}</TableCell>
                  <TableCell>{fine.dueDate || '-'}</TableCell>
                  <TableCell>{fine.overdueDays}</TableCell>
                  <TableCell>₹{fine.amount}</TableCell>
                  <TableCell>{formatDate(fine.createdAt)}</TableCell>
                  <TableCell>{formatDate(fine.paymentDeadlineAt)}</TableCell>
                  <TableCell><Chip size="small" label={fine.paymentStatus} color={fine.paymentStatus === 'Paid' ? 'success' : fine.paymentStatus === 'Overdue' ? 'error' : fine.paymentStatus === 'Submitted' ? 'info' : 'warning'} /></TableCell>
                  <TableCell sx={{ whiteSpace: 'pre-line' }}>{(fine.paymentHistory || []).map((entry) => `${entry.status}: ${formatDate(entry.at)}`).join('\n') || '-'}</TableCell>
                  <TableCell>
                    {isStaff && fine.paymentStatus !== 'Paid' ? <Button size="small" variant="contained" onClick={() => recordPayment(fine)}>Record payment</Button> : null}
                    {!isStaff && !['Paid', 'Submitted'].includes(fine.paymentStatus) ? <Button size="small" variant="contained" onClick={() => submitFine(fine)}>Submit fine</Button> : null}
                    {!isStaff && fine.paymentStatus === 'Submitted' ? 'Awaiting confirmation' : null}
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