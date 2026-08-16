'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '../../components/RoleProvider';
import AuthScreen from '../../components/AuthScreen';

export default function LoginPage() {
  const { user, isReady } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (isReady && user) {
      router.replace('/');
    }
  }, [isReady, router, user]);

  if (!isReady) {
    return null;
  }

  return <AuthScreen />;
}
