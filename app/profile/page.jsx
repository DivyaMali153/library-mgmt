'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useRole } from '../../components/RoleProvider';
import PageHeader from '../../components/PageHeader';

export default function ProfilePage() {
  const { user, updateUser } = useRole();
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
    }
  }, [user]);

  const saveProfile = async (event) => {
    event.preventDefault();
    const response = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, name: form.name, phone: form.phone }),
    });
    if (response.ok) {
      const updated = await response.json();
      updateUser(updated);
      setMessage('Profile updated successfully');
    } else {
      setMessage('Failed to update profile');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader eyebrow="ACCOUNT" title="My profile" description="Manage the personal details associated with your library account." />
      <Card sx={{ maxWidth: 760, width: '100%' }}>
        <CardContent>
          <form onSubmit={saveProfile}>
            <Stack spacing={2}>
              {message ? <Alert severity={message.startsWith('Failed') ? 'error' : 'success'}>{message}</Alert> : null}
              <TextField label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <TextField label="Email" value={form.email} InputProps={{ readOnly: true }} />
              <TextField label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Typography color="text.secondary">Role: {user?.role || 'Guest'}</Typography>
              <Button type="submit" variant="contained">Save Changes</Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
