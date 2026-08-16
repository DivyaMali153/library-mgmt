'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function PdfReader({ pdfUrl, title, author }) {
  const [pdfExists, setPdfExists] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let active = true;

    if (!pdfUrl) {
      setPdfExists(false);
      setIsChecking(false);
      return () => {
        active = false;
      };
    }

    const verifyPdf = async () => {
      try {
        const response = await fetch(pdfUrl, { method: 'HEAD' });
        if (!active) return;
        setPdfExists(response.ok);
      } catch {
        if (!active) return;
        setPdfExists(false);
      } finally {
        if (active) setIsChecking(false);
      }
    };

    verifyPdf();
    return () => {
      active = false;
    };
  }, [pdfUrl]);

  const handleFullscreen = async () => {
    const element = document.getElementById('ebook-pdf-frame');
    if (!element) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    if (element.requestFullscreen) {
      await element.requestFullscreen();
    }
  };

  if (isChecking) {
    return (
      <Card>
        <CardContent>
          <Typography>Checking PDF file…</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!pdfExists) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" color="error">PDF file not found. Please add the PDF file to public/ebooks/.</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="overline" color="text.secondary">Now reading</Typography>
            <Typography variant="h5" fontWeight={700}>{title}</Typography>
            {author ? <Typography color="text.secondary">{author}</Typography> : null}
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button component={Link} href="/ebooks" variant="outlined" startIcon={<ArrowBackIcon />}>
              Back
            </Button>
            <Button variant="outlined" size="small" onClick={() => setZoom((value) => Math.max(0.8, Number((value - 0.2).toFixed(2))))} startIcon={<ZoomOutIcon />}>
              Zoom out
            </Button>
            <Button variant="outlined" size="small" onClick={() => setZoom((value) => Math.min(2, Number((value + 0.2).toFixed(2))))} startIcon={<ZoomInIcon />}>
              Zoom in
            </Button>
            <Button variant="outlined" size="small" onClick={handleFullscreen} startIcon={<FullscreenIcon />}>
              Full screen
            </Button>
          </Stack>
        </Stack>

        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            backgroundColor: '#f5f7fb',
            overflow: 'hidden',
          }}
        >
          <iframe
            id="ebook-pdf-frame"
            src={pdfUrl}
            title={title}
            style={{
              width: '100%',
              minHeight: '800px',
              border: 'none',
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
