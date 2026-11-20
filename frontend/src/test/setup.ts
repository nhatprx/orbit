import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/** Minimal in-memory Web Storage used when the runtime's own global is missing or incomplete. */
function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

// Node 25 ships an experimental global localStorage without the full API, which shadows jsdom's.
for (const name of ['localStorage', 'sessionStorage'] as const) {
  if (typeof globalThis[name]?.clear !== 'function') {
    Object.defineProperty(globalThis, name, { value: createMemoryStorage(), configurable: true });
  }
}

// Globals are off, so Testing Library cannot register its own cleanup.
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
