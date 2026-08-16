'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import GroupIcon from '@mui/icons-material/Group';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useRole } from '../components/RoleProvider';

export default function HomePage() {
  const { role, user } = useRole();
  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const [booksRes, loansRes, requestsRes, usersRes, notificationsRes] = await Promise.all([
        fetch('/api/books'),
        fetch('/api/loans'),
        fetch('/api/requests'),
        fetch('/api/users'),
        fetch(`/api/notifications?email=${encodeURIComponent(user?.email || '')}`),
      ]);
      setBooks(await booksRes.json());
      setLoans(await loansRes.json());
      setRequests(await requestsRes.json());
      setUsers(await usersRes.json());
      setNotifications(await notificationsRes.json());
    };

    loadData();
  }, [user]);

  const studentLoans = useMemo(() => loans.filter((loan) => loan.requestedBy === user?.email || loan.borrower === user?.email), [loans, user]);
  const studentRequests = useMemo(() => requests.filter((request) => request.requestedBy === user?.email), [requests, user]);
  const submittedRequests = studentRequests.length;
  const rejectedRequests = studentRequests.filter((request) => request.status === 'Rejected').length;
  const pendingStudentRequests = studentRequests.filter((request) => request.status === 'Pending').length;
  const dueBooks = studentLoans.filter((loan) => loan.status === 'Active' && loan.dueDate && new Date(loan.dueDate) < new Date()).length;
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const totalBooks = books.length;
  const totalStudents = users.filter((u) => u.role === 'Student').length;
  const activeLoans = loans.filter((loan) => loan.status === 'Active').length;
  const pendingRequests = requests.filter((request) => request.status === 'Pending').length;
  const overdueBooks = loans.filter((loan) => loan.status === 'Active' && loan.dueDate && new Date(loan.dueDate) < new Date()).length;
  const totalFine = loans.reduce((sum, loan) => {
    if (loan.status === 'Active' && loan.dueDate) {
      const overdueDays = Math.max(0, Math.floor((new Date() - new Date(loan.dueDate)) / 86400000));
      return sum + overdueDays * 10;
    }
    return sum;
  }, 0);

  const searchResults = useMemo(() => {
    const q = query.toLowerCase();
    return books.filter((item) => {
      const haystack = `${item.title} ${item.author} ${item.isbn || ''} ${item.subject || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [books, query]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, pb: 4 }}>
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 4, background: 'linear-gradient(135deg, #0f766e, #2563eb)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="overline" color="white" sx={{ letterSpacing: 2, fontSize: { xs: '0.65rem', md: '0.72rem' } }}>
              Library Management System
            </Typography>
            <Typography variant="h4" fontWeight={700} color="white" sx={{ fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.4rem' } }}>
              Pratap College, Amalner
            </Typography>
            <Typography color="rgba(255,255,255,0.86)" sx={{ mt: 1, maxWidth: 700, fontSize: { xs: '0.92rem', md: '1rem' } }}>
              {role === 'Librarian'
                ? 'Manage books, students, requests, loans, and reports from a single dashboard.'
                : 'Search books, submit requests, track borrowed titles, and stay up to date with notifications.'}
            </Typography>
          </Box>
          <Box>
            <Chip label={`Signed in as ${role}`} color="secondary" sx={{ fontWeight: 700 }} />
          </Box>
        </Stack>
      </Paper>

      {role === 'Student' ? (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">Total Borrowed</Typography>
                <Typography variant="h4" fontWeight={700}>{studentLoans.filter((loan) => loan.status === 'Active').length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">Submitted Requests</Typography>
                <Typography variant="h4" fontWeight={700}>{submittedRequests}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">Pending Requests</Typography>
                <Typography variant="h4" fontWeight={700}>{pendingStudentRequests}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">Due Books</Typography>
                <Typography variant="h4" fontWeight={700}>{dueBooks}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">Total Books</Typography>
                <Typography variant="h4" fontWeight={700}>{totalBooks}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">Total Students</Typography>
                <Typography variant="h4" fontWeight={700}>{totalStudents}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">Borrowed Books</Typography>
                <Typography variant="h4" fontWeight={700}>{activeLoans}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">Pending Requests</Typography>
                <Typography variant="h4" fontWeight={700}>{pendingRequests}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">Overdue Books</Typography>
                <Typography variant="h4" fontWeight={700}>{overdueBooks}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">Fine Collection</Typography>
                <Typography variant="h4" fontWeight={700}>₹{totalFine}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Card>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h6" fontWeight={700}>Search books</Typography>
              <Typography color="text.secondary" sx={{ fontSize: { xs: '0.88rem', md: '1rem' } }}>Search by title, author, ISBN, or category.</Typography>
            </Box>
            <TextField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, author, ISBN, or category"
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
              sx={{ width: { xs: '100%', md: 420 } }}
            />
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">{searchResults.length} matching books</Typography>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            {searchResults.slice(0, 10).map((item) => (
              <Paper key={item.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={1}>
                  <Box>
                    <Typography fontWeight={700}>{item.title}</Typography>
                    <Typography color="text.secondary">{item.author} • {item.subject || 'General'}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                    <Chip label={item.availableCopies > 0 ? 'Available' : 'Not Available'} color={item.availableCopies > 0 ? 'success' : 'error'} size="small" />
                    <Chip label={item.isbn || 'No ISBN'} size="small" />
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
