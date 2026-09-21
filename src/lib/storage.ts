/* localStorage, assuming it will fail.
 *
 * Private windows, blocked site data and iOS quota errors all throw, and the
 * app has to work anyway — a child who cannot save a setting should still be
 * able to play. Every read falls back, every write is allowed to fail. */

const PREFIX = 'sor:';

export function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* nothing saved, nothing broken */
  }
}
