'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Card, CardContent, Chip, IconButton, InputAdornment, MenuItem, Paper, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import BlockIcon from '@mui/icons-material/Block';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useRole } from '../../components/RoleProvider';

export default function RequestsPage() {
  const { user, role } = useRole();
  const isLibrarian = ['librarian', 'administrator'].includes(role?.toLowerCase());
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [query, setQuery] = useState('');

  const load = async () => {
    if (!user?.email) {
      setRequests([]);
      return;
    }
    const res = await fetch('/api/requests');
    if (res.ok) setRequests(await res.json());
  };

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 15000);
    return () => window.clearInterval(interval);
  }, [user?.email]);

  const pendingCount = requests.filter((request) => request.status === 'Pending').length;
  const completedCount = requests.length - pendingCount;
  const visibleRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...requests]
      .filter((request) => {
        const requestType = request.requestType || 'physical';
        const matchesStatus = statusFilter === 'all'
          || (statusFilter === 'pending' && request.status === 'Pending')
          || (statusFilter === 'handled' && request.status !== 'Pending');
        const matchesType = typeFilter === 'all' || requestType === typeFilter;
        const searchable = [request.title, request.author, request.studentName, request.requestedBy, request.studentId, request.note]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return matchesStatus && matchesType && (!normalizedQuery || searchable.includes(normalizedQuery));
      })
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  }, [requests, statusFilter, typeFilter, query]);

  const updateStatus = async (id, nextStatus, remarks = '') => {
    const current = requests.find((req) => req.id === id);
    if (!current) return;
    const response = await fetch('/api/requests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...current, status: nextStatus, librarianRemarks: remarks, handledAt: new Date().toISOString() }),
    });
    if (!response.ok) {
      const result = await response.json();
      setError(result.error || 'Unable to update this request.');
      return;
    }
    setError('');
    load();
  };

  const acceptBookRequest = async (request, remarks = '') => {
    const nextStatus = request.requestType === 'physical' ? 'Issued' : 'Accepted';
    const response = await fetch('/api/requests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: request.id, status: nextStatus, librarianRemarks: remarks }),
    });
    if (!response.ok) {
      const result = await response.json();
      setError(result.error || 'Unable to approve this request.');
      return;
    }
    setError('');
    load();
  };

  const acceptReturnRequest = async (request, remarks = '') => {
    const response = await fetch('/api/requests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        status: 'Accepted',
        librarianRemarks: remarks,
        handledAt: new Date().toISOString(),
        returnDate: new Date().toISOString().slice(0, 10),
      }),
    });

    if (response.ok) load();
  };

  const markNotAvailable = async (requestId) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;

    const response = await fetch('/api/requests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, status: 'Not Available', handledAt: new Date().toISOString() }),
    });
    if (!response.ok) {
      const result = await response.json();
      setError(result.error || 'Unable to update this request.');
      return;
    }
    setError('');
    load();
  };

  const requestTypeLabel = (request) => request.requestType === 'return'
    ? 'Return'
    : request.requestType === 'ebook' ? 'E-book' : 'Physical';

  const requestTypeColor = (request) => request.requestType === 'return'
    ? 'warning'
    : request.requestType === 'ebook' ? 'info' : 'default';

  const statusColor = (status) => status === 'Issued' || status === 'Accepted'
    ? 'success'
    : status === 'Rejected' || status === 'Not Available' ? 'error' : 'warning';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {!isLibrarian ? (
        <Alert severity="error">Access denied: only library staff may manage requests.</Alert>
      ) : null}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="overline" color="primary.main" fontWeight={700} sx={{ letterSpacing: 1 }}>CIRCULATION</Typography>
          <Typography variant="h4" fontWeight={750} sx={{ fontSize: { xs: '1.55rem', sm: '1.85rem' }, lineHeight: 1.2 }}>Book requests</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Review student requests and process book returns.</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Paper variant="outlined" sx={{ px: 1.75, py: 1, minWidth: 94, borderRadius: 1.5, borderColor: '#e4ebe7' }}>
            <Typography variant="caption" color="text.secondary">Pending</Typography>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>{pendingCount}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ px: 1.75, py: 1, minWidth: 94, borderRadius: 1.5, borderColor: '#e4ebe7' }}>
            <Typography variant="caption" color="text.secondary">Handled</Typography>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>{completedCount}</Typography>
          </Paper>
        </Stack>
      </Box>

      {error ? <Alert severity="error" onClose={() => setError('')}>{error}</Alert> : null}

      <Card>
        <CardContent sx={{ p: { xs: 1.5, md: 2.5 } }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ lg: 'center' }} spacing={2}>
            <Tabs value={statusFilter} onChange={(event, value) => setStatusFilter(value)} aria-label="Filter requests by status" variant="scrollable" allowScrollButtonsMobile>
              <Tab value="all" label={`All ${requests.length}`} />
              <Tab value="pending" label={`Pending ${pendingCount}`} />
              <Tab value="handled" label={`Handled ${completedCount}`} />
            </Tabs>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ width: { xs: '100%', lg: 'auto' } }}>
              <TextField
                select
                size="small"
                label="Request type"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                sx={{ minWidth: { xs: '100%', sm: 150 } }}
              >
                <MenuItem value="all">All types</MenuItem>
                <MenuItem value="physical">Physical book</MenuItem>
                <MenuItem value="ebook">E-book</MenuItem>
                <MenuItem value="return">Return</MenuItem>
              </TextField>
              <TextField
                size="small"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title or student"
                aria-label="Search requests"
                sx={{ width: { xs: '100%', sm: 240 } }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment> }}
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 880 }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#f7faf8', color: '#5f716a', fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', whiteSpace: 'nowrap' } }}>
                <TableCell>Request</TableCell>
                <TableCell>Student</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Status</TableCell>
                {isLibrarian ? <TableCell align="right">Actions</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRequests.map((request) => (
                <TableRow key={request.id} hover sx={{ '& td': { borderColor: '#edf1ee', py: 1.5 } }}>
                  <TableCell sx={{ minWidth: 240 }}>
                    <Stack spacing={0.65} alignItems="flex-start">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={requestTypeLabel(request)} color={requestTypeColor(request)} variant="outlined" />
                        {request.author ? <Typography variant="caption" color="text.secondary">{request.author}</Typography> : null}
                      </Stack>
                      <Typography variant="body2" fontWeight={700}>{request.title || 'Untitled request'}</Typography>
                      {request.note || request.librarianRemarks ? <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 320 }}>{request.librarianRemarks ? `Staff note: ${request.librarianRemarks}` : request.note}</Typography> : null}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ minWidth: 180 }}>
                    <Typography variant="body2" fontWeight={600}>{request.studentName || 'Student'}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">{request.requestedBy || '-'}</Typography>
                    {request.studentId ? <Typography variant="caption" color="text.secondary">ID {request.studentId}</Typography> : null}
                  </TableCell>
                  <TableCell sx={{ minWidth: 150 }}>
                    <Typography variant="body2">{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '-'}</Typography>
                    <Typography variant="caption" color="text.secondary">{request.createdAt ? new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={request.status || 'Pending'} color={statusColor(request.status)} size="small" sx={{ fontWeight: 600 }} />
                  </TableCell>
                  {isLibrarian ? (
                    <TableCell align="right" sx={{ minWidth: 150 }}>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {request.status === 'Pending' ? (
                          request.requestType === 'return' ? (
                            <>
                              <Tooltip title="Approve return"><IconButton size="small" aria-label="Approve return" color="success" onClick={() => acceptReturnRequest(request)}><AssignmentReturnIcon fontSize="small" /></IconButton></Tooltip>
                              <Tooltip title="Reject return"><IconButton size="small" aria-label="Reject return" color="error" onClick={() => updateStatus(request.id, 'Rejected')}><CancelOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                            </>
                          ) : (
                            <>
                              <Tooltip title={request.requestType === 'physical' ? 'Approve and issue book' : 'Approve e-book access'}><IconButton size="small" aria-label={request.requestType === 'physical' ? 'Approve and issue book' : 'Approve e-book access'} color="success" onClick={() => acceptBookRequest(request)}><CheckCircleOutlineIcon fontSize="small" /></IconButton></Tooltip>
                              <Tooltip title="Reject request"><IconButton size="small" aria-label="Reject request" color="error" onClick={() => updateStatus(request.id, 'Rejected')}><CancelOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                              {request.requestType === 'physical' ? <Tooltip title="Mark unavailable"><IconButton size="small" aria-label="Mark unavailable" color="warning" onClick={() => markNotAvailable(request.id)}><BlockIcon fontSize="small" /></IconButton></Tooltip> : null}
                            </>
                          )
                        ) : request.requestType === 'physical' && request.status === 'Accepted' ? (
                          <Tooltip title="Issue approved book"><IconButton size="small" aria-label="Issue approved book" color="primary" onClick={() => updateStatus(request.id, 'Issued', request.librarianRemarks || '')}><MenuBookIcon fontSize="small" /></IconButton></Tooltip>
                        ) : <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', pr: 1 }}>No action</Typography>}
                      </Stack>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
              {visibleRequests.length === 0 ? (
                <TableRow><TableCell colSpan={isLibrarian ? 5 : 4} align="center" sx={{ py: 7 }}>
                  <MenuBookIcon sx={{ color: '#9aaba3', mb: 1 }} />
                  <Typography variant="body2" fontWeight={600}>{requests.length ? 'No requests match these filters' : 'No book requests yet'}</Typography>
                  <Typography variant="caption" color="text.secondary">Try another status, type, or search term.</Typography>
                </TableCell></TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Box>
      </Card>
    </Box>
  );
}
