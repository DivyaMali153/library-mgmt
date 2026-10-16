'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { useRole } from './RoleProvider';

const demoAccounts = [
  { role: 'Student', email: 'student@pratap.com', password: 's' },
  { role: 'Librarian', email: 'librarian@pratap.com', password: 'librarian123' },
];

export default function AuthScreen() {
  const { login } = useRole();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [suggestionsAnchor, setSuggestionsAnchor] = useState(null);
  const [copyMessage, setCopyMessage] = useState('');

  const copyCredential = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} copied`);
    } catch {
      setCopyMessage('Clipboard access is unavailable');
    }
  };

  const useDemoAccount = (account) => {
    setForm({ email: account.email, password: account.password });
    setError('');
    setSuggestionsAnchor(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok || !result.user) {
        setError(result.error || 'Invalid email or password.');
        return;
      }

      login(result.user);
    } catch (err) {
      setError('Unable to sign in right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.05fr) minmax(420px, 0.95fr)' }, bgcolor: '#f6f8f5' }}>
      <Box
        component="section"
        aria-label="Pratap College Library"
        sx={{
          minHeight: { xs: 230, sm: 280, md: '100dvh' },
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          overflow: 'hidden',
          color: '#fff',
          backgroundColor: '#18392f',
          backgroundImage: 'linear-gradient(180deg, rgba(12, 34, 27, 0.12) 15%, rgba(12, 34, 27, 0.88) 100%), url("https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1800&q=85")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: 'loginImageReveal 700ms ease-out both',
          '@keyframes loginImageReveal': { from: { opacity: 0.65, transform: 'scale(1.015)' }, to: { opacity: 1, transform: 'scale(1)' } },
        }}
      >
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(16, 47, 37, 0.18), transparent 75%)' }} />
        <Box sx={{ position: 'relative', zIndex: 1, width: '100%', p: { xs: 2.5, sm: 4, md: 6, lg: 8 } }}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: { xs: 3, md: 6 } }}>
            <Box sx={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 1.5, bgcolor: 'rgba(233, 247, 237, 0.15)', border: '1px solid rgba(255,255,255,0.22)' }}>
              <AutoStoriesOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ letterSpacing: 0.8 }}>PRATAP COLLEGE</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.78)' }}>LIBRARY SERVICES</Typography>
            </Box>
          </Stack>
          <Typography variant="overline" sx={{ color: '#c5e4cf', fontWeight: 700, letterSpacing: 1.4 }}>A PLACE FOR DISCOVERY</Typography>
          <Typography variant="h3" fontWeight={700} sx={{ maxWidth: 560, fontSize: { xs: '1.7rem', sm: '2rem', md: '2.6rem' }, lineHeight: 1.12, mt: 0.75 }}>
            Your next chapter starts here.
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 1.25, maxWidth: 470, fontSize: { xs: 13, sm: 15 } }}>
            Pratap College Library, Amalner
          </Typography>
        </Box>
      </Box>

      <Box component="main" sx={{ minHeight: { md: '100dvh' }, display: 'grid', placeItems: 'center', p: { xs: 2.5, sm: 4, md: 6 }, bgcolor: '#f6f8f5' }}>
        <Box sx={{ width: '100%', maxWidth: 420, py: { xs: 1, md: 3 }, animation: 'loginFormEnter 420ms ease-out both', '@keyframes loginFormEnter': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
          <Typography variant="overline" color="primary.main" fontWeight={700} sx={{ letterSpacing: 1.2 }}>LIBRARY ACCOUNT</Typography>
          <Typography variant="h4" fontWeight={750} sx={{ mt: 0.5, fontSize: { xs: '1.75rem', sm: '2rem' } }}>Welcome back</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, mb: 3.5 }}>Sign in to continue to your library workspace.</Typography>

          <form onSubmit={submit}>
            <Stack spacing={2.25}>
              {error ? <Alert severity="error" onClose={() => setError('')}>{error}</Alert> : null}
              <TextField
                label="Email address"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                required
                fullWidth
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                fullWidth
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((visible) => !visible)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="button"
                variant="text"
                size="small"
                onClick={(event) => {
                  setCopyMessage('');
                  setSuggestionsAnchor(event.currentTarget);
                }}
                sx={{ alignSelf: 'flex-start', mt: -1, px: 0.5, minHeight: 32 }}
              >
                Demo accounts
              </Button>
              <Popover
                open={Boolean(suggestionsAnchor)}
                anchorEl={suggestionsAnchor}
                onClose={() => setSuggestionsAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{ paper: { sx: { width: 'min(360px, calc(100vw - 32px))', p: 1.5, mt: 0.5, border: '1px solid #e4ebe7', borderRadius: 2, boxShadow: '0 12px 32px rgba(20, 41, 35, 0.14)' } } }}
              >
                <Stack spacing={1}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ px: 0.5 }}>Choose a demo account</Typography>
                  {demoAccounts.map((account) => (
                    <Paper key={account.email} variant="outlined" sx={{ p: 1.25, borderRadius: 1.5, bgcolor: '#fbfcfb' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                        <Typography variant="body2" fontWeight={700}>{account.role}</Typography>
                        <Button size="small" variant="contained" onClick={() => useDemoAccount(account)} sx={{ minHeight: 32 }}>Use</Button>
                      </Stack>
                      <Stack spacing={0.5}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="caption" color="text.secondary">Login ID</Typography>
                            <Typography variant="body2" noWrap>{account.email}</Typography>
                          </Box>
                          <Tooltip title="Copy login ID">
                            <IconButton size="small" aria-label={`Copy ${account.role} login ID`} onClick={() => copyCredential(account.email, 'Login ID')}>
                              <ContentCopyOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Password</Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{account.password}</Typography>
                          </Box>
                          <Tooltip title="Copy password">
                            <IconButton size="small" aria-label={`Copy ${account.role} password`} onClick={() => copyCredential(account.password, 'Password')}>
                              <ContentCopyOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                  {copyMessage ? <Typography role="status" variant="caption" color="text.secondary" sx={{ px: 0.5 }}>{copyMessage}</Typography> : null}
                </Stack>
              </Popover>
              <Button
                type="submit"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardRoundedIcon />}
                disabled={loading}
                sx={{ minHeight: 50, mt: 0.5, justifyContent: 'space-between', px: 2.25 }}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </Stack>
          </form>

          <Paper variant="outlined" sx={{ mt: 3.5, p: 1.75, borderRadius: 2, bgcolor: '#fbfcfb', borderColor: '#e4ebe7' }}>
            <Typography variant="caption" color="text.secondary">
              Access is provided by your college library account. Contact library staff if you need help signing in.
            </Typography>
          </Paper>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, textAlign: 'center' }}>
            Pratap College · Amalner
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
