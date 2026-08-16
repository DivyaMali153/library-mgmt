'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useRole } from './RoleProvider';

export default function AuthScreen() {
  const { login } = useRole();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/users');
      const users = await response.json();
      const matched = users.find((user) => user.email === form.email && user.password === form.password);

      if (!matched) {
        setError('Invalid email or password. Try student@pratap.com / student123 or librarian@pratap.com / librarian123.');
        setLoading(false);
        return;
      }

      login(matched);
    } catch (err) {
      setError('Unable to sign in right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, sm: 3 }, background: 'linear-gradient(180deg, #f4f7fb 0%, #eaf4ff 100%)' }}>
      <Paper elevation={6} sx={{ width: '100%', maxWidth: 480, borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(15,118,110,0.08)' }}>
        <Box sx={{ p: { xs: 3, sm: 4 }, background: 'linear-gradient(135deg, #0f766e, #2563eb)', color: 'white' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }}>
              <LockOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.4rem', sm: '1.8rem' } }}>Pratap College Library</Typography>
              <Typography variant="body2" color="rgba(255,255,255,0.85)" sx={{ mt: 0.5 }}>Sign in to search books, request loans, and manage library work</Typography>
            </Box>
          </Stack>
        </Box>
        <Card elevation={0} sx={{ borderRadius: 0 }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
            <form onSubmit={submit}>
              <Stack spacing={2}>
                {error ? <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert> : null}
                <TextField label="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth />
                <TextField label="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} fullWidth />
                <Button type="submit" variant="contained" disabled={loading} size="large" sx={{ borderRadius: 2, py: 1.25 }}>{loading ? 'Signing in…' : 'Log in'}</Button>
              </Stack>
            </form>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, lineHeight: 1.6 }}>
              Demo accounts: student@pratap.com / student123, librarian@pratap.com / librarian123
            </Typography>
          </CardContent>
        </Card>
      </Paper>
    </Box>
  );
}
