'use client';

import Link from 'next/link';
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import PdfReader from './PdfReader';

export default function EbookDetails({ ebook }) {
  if (!ebook) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700}>E-book not found</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            The requested book could not be found in the library catalog.
          </Typography>
          <Button component={Link} href="/ebooks" variant="contained" sx={{ mt: 2 }}>
            Back to E-books
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
        <Box>
          <Typography variant="overline" color="text.secondary">E-book details</Typography>
          <Typography variant="h4" fontWeight={700}>{ebook.title}</Typography>
        </Box>
        <Button component={Link} href="/ebooks" variant="outlined">
          Back to E-book list
        </Button>
      </Stack>

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', md: 'stretch' }}>
            <Box
              component="img"
              src={ebook.coverImage}
              alt={ebook.title}
              sx={{ width: { xs: '100%', md: 220 }, borderRadius: 3, objectFit: 'cover', boxShadow: 3 }}
            />
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
                <Chip label={ebook.category || 'General'} color="primary" />
                <Chip
                  label={ebook.availability === 'Available' ? 'Available' : 'Unavailable'}
                  color={ebook.availability === 'Available' ? 'success' : 'default'}
                />
              </Stack>
              <Typography variant="h6" fontWeight={700}>{ebook.author}</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {ebook.description}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2"><strong>PDF:</strong> {ebook.pdfUrl}</Typography>
                <Typography variant="body2"><strong>Status:</strong> {ebook.status || ebook.availability}</Typography>
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <PdfReader pdfUrl={ebook.pdfUrl} title={ebook.title} author={ebook.author} />
    </Box>
  );
}
