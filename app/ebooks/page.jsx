'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import { useRole } from '../../components/RoleProvider';
import EbookList from '../../components/Ebook/EbookList';
import UploadEbookDialog from '../../components/Ebook/UploadEbookDialog';
import PageHeader from '../../components/PageHeader';

const emptyForm = { id: null, title: '', author: '', category: '', description: '' };

export default function EbooksPage() {
  const { role } = useRole();
  const isStaff = ['administrator', 'librarian'].includes(String(role || '').toLowerCase());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [ebooks, setEbooks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const response = await fetch('/api/ebooks');
    if (response.ok) setEbooks(await response.json());
  };

  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.id) return setError('Use Upload E-book to add a PDF-backed title.');
    const response = await fetch('/api/ebooks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || 'Unable to update e-book.');
      return;
    }
    setError('');
    setMessage('E-book details updated.');
    setForm(emptyForm);
    load();
  };

  const deleteEbook = async (id) => {
    const response = await fetch(`/api/ebooks?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) {
      const result = await response.json();
      setError(result.error || 'Unable to delete e-book.');
      return;
    }
    load();
  };

  if (!isStaff) return <EbookList />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        eyebrow="DIGITAL COLLECTION"
        title="E-book catalogue"
        description="Manage PDF titles and their catalogue metadata."
        action={<Button variant="contained" startIcon={<LibraryAddIcon />} onClick={() => setUploadOpen(true)}>Upload E-book</Button>}
      />
      <Card><CardContent>
        {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
        {message ? <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert> : null}
        {form.id ? <Box component="form" onSubmit={submit} sx={{ mt: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
            <TextField label="Title" required value={form.title || ''} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            <TextField label="Author" required value={form.author || ''} onChange={(event) => setForm({ ...form, author: event.target.value })} />
            <TextField label="Category" required value={form.category || form.subject || ''} onChange={(event) => setForm({ ...form, category: event.target.value })} />
            <TextField label="Description" value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} fullWidth />
            <Button type="submit" variant="contained">Save</Button>
            <Button onClick={() => setForm(emptyForm)}>Cancel</Button>
          </Stack>
        </Box> : null}
      </CardContent></Card>

      <Card><CardContent sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead><TableRow><TableCell>Title</TableCell><TableCell>Author</TableCell><TableCell>Category</TableCell><TableCell>PDF</TableCell><TableCell>Status</TableCell><TableCell>Actions</TableCell></TableRow></TableHead>
          <TableBody>
            {ebooks.map((ebook) => <TableRow key={ebook.id}>
              <TableCell>{ebook.title}</TableCell><TableCell>{ebook.author}</TableCell><TableCell>{ebook.category || ebook.subject || 'General'}</TableCell>
              <TableCell><a href={`/api/ebooks/${ebook.id}/file`} target="_blank" rel="noreferrer">Open PDF</a></TableCell><TableCell><Chip label={ebook.status || ebook.availability || 'Available'} color="info" size="small" /></TableCell>
              <TableCell><Stack direction="row"><IconButton size="small" aria-label="Edit e-book" onClick={() => { setError(''); setForm({ ...emptyForm, ...ebook, category: ebook.category || ebook.subject || '' }); }}><EditIcon fontSize="small" /></IconButton><IconButton size="small" color="error" aria-label="Delete e-book" onClick={() => deleteEbook(ebook.id)}><DeleteIcon fontSize="small" /></IconButton></Stack></TableCell>
            </TableRow>)}
            {ebooks.length === 0 ? <TableRow><TableCell colSpan={6} align="center">No e-books in the catalogue.</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </CardContent></Card>

      <EbookList showHeader={false} ebooks={ebooks} onRefresh={load} />
      <UploadEbookDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(newBook) => {
          load();
          setUploadOpen(false);
          setMessage(`E-book "${newBook?.title || ''}" uploaded successfully.`);
        }}
      />
    </Box>
  );
}
