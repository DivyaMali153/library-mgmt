'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useRole } from './RoleProvider';
import AuthScreen from './AuthScreen';
import { RoleShell } from './RoleShell';

const studentAllowedPaths = ['/', '/books', '/book-history', '/ebooks', '/login', '/requested-books', '/borrowed-books'];
const librarianAllowedPaths = ['/', '/books', '/ebooks', '/requests', '/borrowers', '/reports', '/profile', '/book-history', '/requested-books', '/borrowed-books', '/login'];

export default function AppContent({ children }) {
  const { user, isReady } = useRole();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isReady && user && pathname === '/login') {
      router.replace('/');
    }
  }, [isReady, pathname, router, user]);

  if (!isReady) {
    return null;
  }

  if (!user) {
    if (pathname === '/login') {
      return children;
    }
    return <AuthScreen />;
  }

  if (pathname === '/login') {
    return null;
  }

  if (user.role === 'Student' && !studentAllowedPaths.some((path) => pathname === path || pathname.startsWith(path + '/'))) {
    return <RoleShell><div style={{ padding: 24 }}>Access denied: This page is not available for student users.</div></RoleShell>;
  }

  if (user.role === 'Librarian' && !librarianAllowedPaths.some((path) => pathname === path || pathname.startsWith(path + '/'))) {
    return <RoleShell><div style={{ padding: 24 }}>Access denied: This page is not available for librarian users.</div></RoleShell>;
  }

  return <RoleShell>{children}</RoleShell>;
}
