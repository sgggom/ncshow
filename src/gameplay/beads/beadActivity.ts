import type { BeadPatternData } from './beadProgress';

export const BEAD_ACTIVITY_SIZE = 5;
const KEY = 'number-connect.bead-activity.v1';
interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
const browserStorage: StorageLike = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};
export interface BeadActivity {
  completed: string[];
}

export const loadBeadActivity = (
  patterns: readonly BeadPatternData[],
  activePatternId: string,
  storage: StorageLike = browserStorage,
): BeadActivity => {
  try {
    const raw = storage.getItem(KEY);
    if (raw !== null) {
      const value = JSON.parse(raw) as BeadActivity;
      if (Array.isArray(value.completed)) {
        return { completed: [...new Set(value.completed)]
          .filter((id) => patterns.some((pattern) => pattern.id === id)).slice(0, BEAD_ACTIVITY_SIZE) };
      }
    }
  } catch { /* Recover from unavailable storage or an invalid save. */ }
  // Preserve the unfinished group of five when upgrading an existing save.
  const index = Math.max(0, patterns.findIndex((pattern) => pattern.id === activePatternId));
  return { completed: patterns.slice(index - index % BEAD_ACTIVITY_SIZE, index).map((pattern) => pattern.id) };
};

export const recordBeadActivityPattern = (activity: BeadActivity, patternId: string): BeadActivity => ({
  completed: [...new Set([...activity.completed, patternId])].slice(0, BEAD_ACTIVITY_SIZE),
});

export const saveBeadActivity = (activity: BeadActivity, storage: StorageLike = browserStorage): void => {
  try { storage.setItem(KEY, JSON.stringify(activity)); } catch { /* Persistence is optional. */ }
};
