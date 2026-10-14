/* Saved values: read back only as what they are, and never a crash.
 *
 *   npm run test:unit */

import { afterEach, describe, expect, it, vi } from 'vitest';

function storageWith(items: Record<string, string>) {
  return {
    getItem: (k: string) => items[k] ?? null,
    setItem: (k: string, v: string) => { items[k] = v; },
  };
}

async function load(items: Record<string, string>) {
  vi.resetModules();
  vi.stubGlobal('window', { localStorage: storageWith(items) });
  return import('../../src/lib/storage');
}

describe('reading a saved value', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('gives back what was saved', async () => {
    const { read } = await load({ 'sor:a': '{"stars":3}', 'sor:b': '[1,2]', 'sor:c': '7', 'sor:d': '"pt"', 'sor:e': 'false' });
    expect(read('a', {})).toEqual({ stars: 3 });
    expect(read('b', [])).toEqual([1, 2]);
    expect(read('c', 0)).toBe(7);
    expect(read('d', 'en')).toBe('pt');
    expect(read('e', true)).toBe(false);
  });

  it('falls back when it is a different kind of thing, rather than handing a game a null', async () => {
    const { read } = await load({ 'sor:a': 'null', 'sor:b': '{"0":1}', 'sor:c': '"seven"', 'sor:d': '[1]', 'sor:e': '{broken' });
    expect(read('a', { stars: 0 })).toEqual({ stars: 0 });
    expect(read('b', [])).toEqual([]);
    expect(read('c', 0)).toBe(0);
    expect(read('d', {})).toEqual({});
    expect(read('e', 'x')).toBe('x');
  });

  it('takes anything when the fallback is null, for a caller that checks it itself', async () => {
    const { read } = await load({ 'sor:a': '[1]' });
    expect(read<unknown>('a', null)).toEqual([1]);
    expect(read<unknown>('missing', null)).toBeNull();
  });

  it('survives a browser that will not let it near storage', async () => {
    vi.resetModules();
    vi.stubGlobal('window', { get localStorage(): Storage { throw new Error('blocked'); } });
    const { read, write } = await import('../../src/lib/storage');
    expect(read('a', 5)).toBe(5);
    expect(() => write('a', 1)).not.toThrow();
  });
});
