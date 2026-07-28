import { useStore } from './store.js';

const KEY = 'spacemap.saved.v1';

/** Load persisted saved-satellite ids into the store. Call once on boot. */
export function loadSavedFromStorage(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const arr = JSON.parse(raw) as unknown;
    if (Array.isArray(arr)) {
      const ids = arr.filter((x): x is number => typeof x === 'number');
      useStore.getState().loadSaved(ids);
    }
  } catch {
    /* ignore malformed storage */
  }
}

/** Subscribe to store changes and persist saved ids whenever they change. */
export function installSavedPersistence(): () => void {
  let last: Set<number> | null = null;
  return useStore.subscribe((s) => {
    if (s.savedIds !== last) {
      last = s.savedIds;
      try {
        localStorage.setItem(KEY, JSON.stringify([...s.savedIds]));
      } catch {
        /* quota errors are non-fatal */
      }
    }
  });
}
