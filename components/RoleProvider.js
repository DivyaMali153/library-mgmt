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
  const [user, setUser] = useState(getInitialUser);
  const [role, setRole] = useState(getInitialRole);
  const [isReady, setIsReady] = useState(typeof window !== 'undefined');

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsReady(true);
      return;
    }

    const syncUser = () => {
      const storedUser = getStoredUser(window.localStorage) || getStoredUser(window.sessionStorage);
      if (storedUser) {
        setUser(storedUser);
        setRole(storedUser.role || 'Guest');
      } else {
        setUser(null);
        setRole('Guest');
      }
    };

    syncUser();
    setIsReady(true);

    const handleStorage = (event) => {
      if (event.key !== 'libraryUser') return;
      syncUser();
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
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
