'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Stack, Typography, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useRole } from '../../components/RoleProvider';

export default function RequestsPage() {
  const { user, role } = useRole();
  const isLibrarian = role?.toLowerCase() === 'librarian';
  const [requests, setRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [activeRequestId, setActiveRequestId] = useState(null);

  const load = async () => {
    if (!user?.email) {
      setRequests([]);
      return;
    }
    const res = await fetch('/api/requests');
    setRequests(await res.json());
  };

  useEffect(() => { load(); }, [user?.email]);

  const updateStatus = async (id, nextStatus, remarks = '') => {
    const current = requests.find((req) => req.id === id);
    if (!current) return;
    await fetch('/api/requests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...current, status: nextStatus, librarianRemarks: remarks, handledAt: new Date().toISOString() }),
    });
    load();
  };

  const acceptBookRequest = async (request, remarks = '') => {
    const payload = {
      ...request,
      status: 'Accepted',
      librarianRemarks: remarks,
      handledAt: new Date().toISOString(),
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    };

    await fetch('/api/requests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    load();
  };

  const acceptReturnRequest = async (request, remarks = '') => {
    const response = await fetch('/api/loans');
    const loans = await response.json();
    const loan = loans.find((item) => String(item.id) === String(request.loanId || request.bookId || ''));

    if (loan) {
      await fetch('/api/loans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...loan,
          status: 'Returned',
          returnDate: new Date().toISOString().slice(0, 10),
          returnedAt: new Date().toISOString(),
        }),
      });
    }

    await fetch('/api/requests', {
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

    load();
  };

  const findBooksForRequest = async (request) => {
    setActiveRequestId(request.id);
    const res = await fetch('/api/books');
    const books = await res.json();
    const q = (request.title || '').toLowerCase();
    const matches = books.filter((b) => {
      return [b.title, b.author, b.isbn, b.subject].some((f) => (f || '').toLowerCase().includes(q));
    });
    setSearchResults(matches);
  };

  const issueBook = async (requestId, book) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;

    const loanRes = await fetch('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: book.id, title: book.title, borrower: req.requestedBy || req.studentName, issueDate: new Date().toISOString().slice(0, 10), dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), status: 'Active' }),
    });
    const loan = await loanRes.json();

    const updatedBook = {
      ...book,
      availableCopies: Math.max(0, (book.availableCopies || 0) - 1),
      status: Math.max(0, (book.availableCopies || 0) - 1) > 0 ? 'Available' : 'Not Available',
    };
    await fetch('/api/books', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedBook),
    });

    await fetch('/api/requests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, status: 'Issued', loanId: loan.id, handledAt: new Date().toISOString() }),
    });

    setActiveRequestId(null);
    setSearchResults([]);
    load();
  };

  const markNotAvailable = async (requestId) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;

    await fetch('/api/requests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, status: 'Not Available', handledAt: new Date().toISOString() }),
    });

    setActiveRequestId(null);
    setSearchResults([]);
    load();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" fontWeight={700}>Book requests</Typography>
          <Typography color="text.secondary">Review student book and e-book access requests.</Typography>
        </CardContent>
      </Card>

      {!isLibrarian ? (
        <Card>
          <CardContent>
            <Typography variant="body1">Access denied: Only librarians may manage requests.</Typography>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700}>All requests</Typography>
          <Table sx={{ mt: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Request Type</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Student</TableCell>
                <TableCell>Student ID</TableCell>
                <TableCell>Note</TableCell>
                <TableCell>Status</TableCell>
                {isLibrarian ? <TableCell>Action</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.requestType === 'return' ? 'Return Request' : request.requestType === 'ebook' ? 'E-book' : 'Physical Book'}</TableCell>
                  <TableCell>{request.title}</TableCell>
                  <TableCell>{request.studentName}</TableCell>
                  <TableCell>{request.studentId || '-'}</TableCell>
                  <TableCell>{request.note || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={request.status}
                      color={request.status === 'Issued' || request.status === 'Accepted' ? 'success' : request.status === 'Not Available' || request.status === 'Rejected' ? 'error' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  {isLibrarian ? (
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        {request.status === 'Pending' ? (
                          request.requestType === 'return' ? (
                            <>
                              <Button size="small" variant="contained" color="success" onClick={() => {
                                const remarks = window.prompt('Remarks (optional) for return approval:') || '';
                                acceptReturnRequest(request, remarks);
                              }}>Approve Return</Button>
                              <Button size="small" variant="outlined" color="error" onClick={() => {
                                const remarks = window.prompt('Remarks (optional) for return rejection:') || '';
                                updateStatus(request.id, 'Rejected', remarks);
                              }}>Reject</Button>
                            </>
                          ) : (
                            <>
                              <Button size="small" variant="contained" color="success" onClick={() => {
                                const remarks = window.prompt('Remarks (optional) for acceptance:') || '';
                                acceptBookRequest(request, remarks);
                              }}>Accept</Button>
                              <Button size="small" variant="outlined" color="error" onClick={() => {
                                const remarks = window.prompt('Remarks (optional) for rejection:') || '';
                                updateStatus(request.id, 'Rejected', remarks);
                              }}>Reject</Button>
                            </>
                          )
                        ) : null}
                        {request.requestType !== 'ebook' && request.requestType !== 'return' ? (
                          <Button size="small" variant="outlined" onClick={() => findBooksForRequest(request)} disabled={request.status !== 'Pending'}>Find & Issue</Button>
                        ) : null}
                        {request.requestType !== 'ebook' && request.requestType !== 'return' ? (
                          <Button size="small" variant="outlined" color="error" onClick={() => markNotAvailable(request.id)} disabled={request.status !== 'Pending'}>Mark Not Available</Button>
                        ) : null}
                      </Stack>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {activeRequestId ? (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700}>Search results</Typography>
            <Typography color="text.secondary">Select a matching book to issue to the student.</Typography>
            <Table sx={{ mt: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Author</TableCell>
                  <TableCell>Copies</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {searchResults.length === 0 ? (
                  <TableRow><TableCell colSpan={4}>No matches found</TableCell></TableRow>
                ) : searchResults.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.title}</TableCell>
                    <TableCell>{b.author}</TableCell>
                    <TableCell>{b.availableCopies}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="contained" disabled={(b.availableCopies || 0) <= 0} onClick={() => issueBook(activeRequestId, b)}>Issue</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button variant="text" onClick={() => { setActiveRequestId(null); setSearchResults([]); }}>Close</Button>
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </Box>
  );
}
