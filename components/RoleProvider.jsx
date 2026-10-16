'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearStoredUser, getStoredUser, setStoredUser } from '../lib/auth';

const RoleContext = createContext();

function getInitialUser() {
  if (typeof window === 'undefined') {
    return null;
  }

  return getStoredUser(window.localStorage) || getStoredUser(window.sessionStorage);
}

function getInitialRole() {
  const storedUser = getInitialUser();
  return storedUser?.role || 'Guest';
}

export function RoleProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('Guest');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsReady(true);
      return;
    }

    let active = true;
    const syncUser = async () => {
      try {
        const response = await fetch('/api/auth', { cache: 'no-store' });
        const result = response.ok ? await response.json() : null;
        if (!active) return;
        if (result?.user) {
          setUser(result.user);
          setRole(result.user.role || 'Guest');
        } else {
          clearStoredUser();
          setUser(null);
          setRole('Guest');
        }
      } catch {
        if (active) {
          setUser(null);
          setRole('Guest');
        }
      } finally {
        if (active) setIsReady(true);
      }
    };

    syncUser();

    const handleStorage = (event) => {
      if (event.key !== 'libraryUser') return;
      syncUser();
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      active = false;
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const login = (nextUser) => {
    setUser(nextUser);
    setRole(nextUser.role || 'Guest');
    setStoredUser(nextUser, typeof window !== 'undefined' ? window.localStorage : null);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('libraryUser', JSON.stringify(nextUser));
    }
  };

  const logout = () => {
    setUser(null);
    setRole('Guest');
    clearStoredUser(typeof window !== 'undefined' ? window.localStorage : null);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('libraryUser');
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    setRole(updatedUser.role || 'Guest');
    setStoredUser(updatedUser, typeof window !== 'undefined' ? window.localStorage : null);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('libraryUser', JSON.stringify(updatedUser));
    }
  };

  const value = useMemo(() => ({ role, setRole, user, login, logout, updateUser, isReady }), [role, user, isReady]);

  if (!isReady) {
    return null;
  }

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}
