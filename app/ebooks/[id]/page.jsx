'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Alert, CircularProgress } from '@mui/material';
import { useRole } from '../../../components/RoleProvider';
import EbookDetails from '../../../components/Ebook/EbookDetails';

export default function EbookDetailPage() {
  const params = useParams();
  const { role, user, isReady } = useRole();
  const [ebook, setEbook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canRead, setCanRead] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    let active = true;
    const load = async () => {
      const response = await fetch('/api/ebooks');
      if (response.ok) {
        const ebooks = await response.json();
        const found = ebooks.find((item) => String(item.id) === String(params.id)) || null;
        if (active) setEbook(found);
        const staff = ['administrator', 'librarian'].includes(String(role || '').toLowerCase());
        if (staff) {
          if (active) setCanRead(true);
        } else if (role === 'Student' && found) {
          const requestsResponse = await fetch('/api/requests');
          const requests = requestsResponse.ok ? await requestsResponse.json() : [];
          const approved = requests.some((item) => item.requestType === 'ebook'
            && String(item.ebookId) === String(found.id)
            && ['Accepted', 'Issued'].includes(item.status));
          if (active) setCanRead(approved);
        } else if (active) {
          setCanRead(false);
        }
      }
      if (active) setLoading(false);
    };
    load();
    const interval = window.setInterval(load, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [params.id, isReady, role, user?.email]);

  if (loading) return <CircularProgress />;
  if (!ebook) return <Alert severity="info">This e-book is no longer in the catalogue.</Alert>;
  if (!user) return <Alert severity="warning">Sign in to view e-book details.</Alert>;
  return <EbookDetails ebook={ebook} canRead={canRead} />;
}
