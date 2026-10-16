'use client';

import { useEffect, useState } from 'react';
import { useRole } from '../../components/RoleProvider';
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PageHeader from '../../components/PageHeader';

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState({ id: null, title: '', author: '', subject: '', availableCopies: 1, status: 'Available' });
  const { user, role } = useRole();
  const isStudent = role?.toLowerCase() === 'student';
  const isStaff = ['librarian', 'administrator'].includes(role?.toLowerCase());
  const [selectedBook, setSelectedBook] = useState(null);

  const load = async () => {
    const res = await fetch('/api/books');
    if (res.ok) setBooks(await res.json());
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    const method = form.id ? 'PUT' : 'POST';
    const response = await fetch('/api/books', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!response.ok) return;
    setForm({ id: null, title: '', author: '', subject: '', availableCopies: 1, status: 'Available' });
    load();
  };

  const editBook = (book) => setForm(book);

  const deleteBook = async (id) => {
    const response = await fetch(`/api/books?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (response.ok) load();
  };

  const [search, setSearch] = useState('');

  const [requestMessage, setRequestMessage] = useState('');

  const requestBook = async (book) => {
    if (!user) return setRequestMessage('Please log in to request books.');
    if (!isStudent) return setRequestMessage('Only students can request books.');
    const response = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'physical',
        title: book.title,
        author: book.author,
        bookId: book.id,
        studentName: user.name || '',
        studentId: user.id || '',
        requestedBy: user.email || '',
        note: 'Request from catalog',
      }),
    });
    const result = await response.json();
    if (response.ok) setRequestMessage('Request submitted successfully.');
    else setRequestMessage(result.error || 'Unable to submit request.');
    load();
  };

  const [categoryFilter, setCategoryFilter] = useState('All');
  const categories = [...new Set(books.map((book) => book.subject || book.category).filter(Boolean))];
  const filteredBooks = books.filter((book) => {
    const q = search.trim().toLowerCase();
    return (
      (!q || `${book.title || ''} ${book.author || ''} ${book.isbn || ''} ${book.subject || book.category || ''}`.toLowerCase().includes(q)) &&
      (categoryFilter === 'All' || (book.subject || book.category) === categoryFilter)
    );
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader eyebrow="CATALOGUE" title="Book catalogue" description="Search available physical titles and submit a request." />
      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search title, author, ISBN, or category"
              aria-label="Search books"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
            />
            <TextField select size="small" label="Category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} sx={{ minWidth: { xs: '100%', md: 210 } }}>
              <MenuItem value="All">All categories</MenuItem>
              {categories.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
            </TextField>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25 }}>{filteredBooks.length} of {books.length} titles</Typography>
          {isStudent ? (
            <Box sx={{ mt: 1 }}>
              {requestMessage ? <Alert severity={requestMessage.startsWith('Request submitted') ? 'success' : 'info'} sx={{ mt: 1 }}>{requestMessage}</Alert> : null}
            </Box>
          ) : isStaff ? (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" fontWeight={700}>Library management</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Add or edit books available for student requests.
              </Typography>
              <form onSubmit={submit}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  <TextField label="Author" required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
                  <TextField label="Subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                  <TextField label="Copies" type="number" required value={form.availableCopies} onChange={(e) => setForm({ ...form, availableCopies: Number(e.target.value) })} />
                  <Button type="submit" variant="contained">{form.id ? 'Update Book' : 'Add Book'}</Button>
                </Stack>
              </form>
            </Box>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Author</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Copies</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBooks.map((book) => (
                <TableRow key={book.id}>
                  <TableCell>{book.title}</TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>{book.subject}</TableCell>
                  <TableCell>{book.availableCopies}</TableCell>
                  <TableCell><Chip label={book.availableCopies > 0 ? 'Available' : 'Not Available'} color={book.availableCopies > 0 ? 'success' : 'error'} size="small" /></TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" onClick={() => setSelectedBook(book)}>Details</Button>
                      {isStudent ? (
                        <Button size="small" variant="contained" disabled={(book.availableCopies || 0) <= 0} onClick={() => requestBook(book)}>Request</Button>
                      ) : isStaff ? (
                        <>
                          <IconButton size="small" onClick={() => editBook(book)}><EditIcon fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => deleteBook(book.id)}><DeleteIcon fontSize="small" /></IconButton>
                        </>
                      ) : null}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {filteredBooks.length === 0 ? <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}>No books match your search and category filters.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={Boolean(selectedBook)} onClose={() => setSelectedBook(null)} fullWidth maxWidth="sm">
        <DialogTitle>{selectedBook?.title}</DialogTitle>
        <DialogContent>
          <Typography><strong>Author:</strong> {selectedBook?.author || '-'}</Typography>
          <Typography><strong>Category:</strong> {selectedBook?.subject || selectedBook?.category || 'General'}</Typography>
          <Typography><strong>ISBN:</strong> {selectedBook?.isbn || '-'}</Typography>
          <Typography><strong>Availability:</strong> {selectedBook?.availableCopies || 0} copies</Typography>
          {selectedBook?.description ? <Typography sx={{ mt: 1 }}>{selectedBook.description}</Typography> : null}
        </DialogContent>
        <DialogActions><Button onClick={() => setSelectedBook(null)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
