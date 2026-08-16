'use client';

import { useEffect, useState } from 'react';
import { useRole } from '../../components/RoleProvider';
import { Box, Card, CardContent, Stack, Typography, Table, TableBody, TableCell, TableHead, TableRow, Chip, TextField, Button, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState({ id: null, title: '', author: '', subject: '', availableCopies: 1, status: 'Available' });
  const { user, role } = useRole();
  const isStudent = role?.toLowerCase() === 'student';
  const isLibrarian = role?.toLowerCase() === 'librarian';

  const load = async () => {
    const res = await fetch('/api/books');
    setBooks(await res.json());
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    const method = form.id ? 'PUT' : 'POST';
    await fetch('/api/books', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setForm({ id: null, title: '', author: '', subject: '', availableCopies: 1, status: 'Available' });
    load();
  };

  const editBook = (book) => setForm(book);

  const deleteBook = async (id) => {
    await fetch(`/api/books?id=${id}`, { method: 'DELETE' });
    load();
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
    if (response.ok) {
      setRequestMessage('Request submitted successfully.');
    } else {
      setRequestMessage('Unable to submit request.');
    }
    load();
  };

  const filteredBooks = books.filter((book) => {
    const q = search.toLowerCase();
    return (
      book.title.toLowerCase().includes(q) ||
      book.author.toLowerCase().includes(q) ||
      (book.subject || '').toLowerCase().includes(q) ||
      (book.isbn || '').toLowerCase().includes(q)
    );
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" fontWeight={700}>Physical books</Typography>
          <Typography color="text.secondary">Search and request available titles.</Typography>
          <TextField
            fullWidth
            placeholder="Search books by title, author, ISBN, or category"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mt: 2 }}
            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
          />
          {isStudent ? (
            <Box sx={{ mt: 1 }}>
              <Typography color="text.secondary">
                Browse available books and click Request to submit a book request to the librarian. Your requests will appear in Requested Books.
              </Typography>
              {requestMessage ? <Typography color="success.main" sx={{ mt: 1 }}>{requestMessage}</Typography> : null}
            </Box>
          ) : (
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
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Table>
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
                      {isStudent ? (
                        <Button size="small" variant="contained" disabled={(book.availableCopies || 0) <= 0} onClick={() => requestBook(book)}>Request</Button>
                      ) : (
                        <>
                          <IconButton size="small" onClick={() => editBook(book)}><EditIcon fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => deleteBook(book.id)}><DeleteIcon fontSize="small" /></IconButton>
                        </>
                      )}
                    </Stack>
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
