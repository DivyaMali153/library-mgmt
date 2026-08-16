'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useRole } from '../../components/RoleProvider';

export default function ProfilePage() {
  const { user, updateUser } = useRole();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', email: user.email || '', password: user.password || '' });
    }
  }, [user]);

  const saveProfile = async (event) => {
    event.preventDefault();
    const response = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, name: form.name, email: form.email, password: form.password, role: user.role }),
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
      <Card>
        <CardContent>
          <Typography variant="h5" fontWeight={700}>My Profile</Typography>
          <Typography color="text.secondary">View and update your profile details.</Typography>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <form onSubmit={saveProfile}>
            <Stack spacing={2}>
              {message ? <Typography color="success.main">{message}</Typography> : null}
              <TextField label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <TextField label="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <TextField label="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <Button type="submit" variant="contained">Save Changes</Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
