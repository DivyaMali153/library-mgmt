const STORAGE_KEY = 'libraryUser';

function getStorages() {
  if (typeof window === 'undefined') return [];

  const unique = new Map();
  [window.localStorage, window.sessionStorage].forEach((storage) => {
    if (storage) unique.set(storage, storage);
  });

  return [...unique.values()];
}

export function getStoredUser(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  const storages = storage ? [storage] : getStorages();

  for (const currentStorage of storages) {
    if (!currentStorage) continue;

    const stored = currentStorage.getItem(STORAGE_KEY);
    if (!stored) continue;

    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object' && parsed.email) {
        return parsed;
      }
    } catch {
      currentStorage.removeItem(STORAGE_KEY);
    }
  }

  return null;
}

export function isAuthenticated(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  return Boolean(getStoredUser(storage));
}

export function setStoredUser(user, storage = typeof window !== 'undefined' ? window.localStorage : null) {
  if (!user) return;

  const storages = storage ? [storage] : getStorages();
  storages.forEach((currentStorage) => {
    if (!currentStorage) return;
    currentStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  });
}

export function clearStoredUser(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  const storages = storage ? [storage] : getStorages();
  storages.forEach((currentStorage) => {
    if (!currentStorage) return;
    currentStorage.removeItem(STORAGE_KEY);
  });
}

export function loginUser(user, storage = typeof window !== 'undefined' ? window.localStorage : null) {
  setStoredUser(user, storage);
  return user;
}

export function logoutUser(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  clearStoredUser(storage);
  return true;
}
