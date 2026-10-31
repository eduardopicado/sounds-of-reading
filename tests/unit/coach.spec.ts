/* The coach: what it remembers, which sounds it calls hard, and when it
 * moves the week up a level.
 *
 *   npm run test:unit */

import { afterEach, describe, expect, it, vi } from 'vitest';

function fakeStorage(seed: Record<string, unknown>) {
  const items = new Map(Object.entries(seed).map(([k, v]) => [`sor:${k}`, JSON.stringify(v)]));
  return {
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => { items.set(k, v); },
    saved: (k: string) => JSON.parse(items.get(`sor:${k}`) ?? 'null'),
  };
}

let storage: ReturnType<typeof fakeStorage>;

async function load(seed: Record<string, unknown> = {}) {
  vi.resetModules();
  storage = fakeStorage(seed);
  vi.stubGlobal('window', { localStorage: storage });
  const coach = await import('../../src/lib/coach');
  const settings = await import('../../src/lib/settings');
  return { ...coach, ...settings };
}

const word = (sound: string, level: number) => ({ sound, level } as { sound: string; level: 1 });

describe('the coach', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('remembers the last twelve answers for a sound and twenty-five for a level', async () => {
    const { mark } = await load();
    for (let i = 0; i < 30; i += 1) mark(word('ai', 4), i % 2 === 0);
    const rec = storage.saved('coach');
    expect(rec.sounds.ai).toHaveLength(12);
    expect(rec.levels['4']).toHaveLength(25);
  });

  it('judges a sound only after six answers, then hard below three in four, going well from nine in ten', async () => {
    const { mark, weakSounds, strongSounds } = await load();
    for (let i = 0; i < 5; i += 1) mark(word('ai', 4), false);
    expect(weakSounds()).toEqual([]);
    mark(word('ai', 4), false);
    expect(weakSounds()).toEqual(['ai']);
    for (let i = 0; i < 10; i += 1) mark(word('ee', 4), true);
    expect(strongSounds()).toEqual(['ee']);
  });

  it('moves the week up once the top level is mastered, and can put it back', async () => {
    const { mark, maybeLevelUp, unseenMove, undoMove, settings } = await load({ settings: { levels: [4, 5], sounds: ['ai'] } });
    for (let i = 0; i < 25; i += 1) mark(word('ai', 5), i >= 2);
    const move = maybeLevelUp();
    expect(move).toMatchObject({ from: [4, 5], to: [5, 6], fromSounds: ['ai'] });
    expect(settings().levels).toEqual([5, 6]);
    expect(settings().sounds).toEqual([]);
    expect(unseenMove()).not.toBeNull();

    undoMove();
    expect(settings().levels).toEqual([4, 5]);
    expect(settings().sounds).toEqual(['ai']);
    /* and it has to be earned again */
    expect(maybeLevelUp()).toBeNull();
  });

  it('moves on from the school\'s level 8 to 9, and stops at the top level', async () => {
    const eight = await load({ settings: { levels: [8] } });
    for (let i = 0; i < 25; i += 1) eight.mark(word('aw', 8), true);
    expect(eight.maybeLevelUp()).toMatchObject({ from: [8], to: [8, 9] });

    const nine = await load({ settings: { levels: [9, 10] } });
    for (let i = 0; i < 25; i += 1) nine.mark(word('kn', 10), true);
    expect(nine.maybeLevelUp()).toBeNull();
    expect(nine.settings().levels).toEqual([9, 10]);
  });

  it('does not move while the top level has three slips in its last twenty-five, or when switched off', async () => {
    const shaky = await load({ settings: { levels: [5] } });
    for (let i = 0; i < 25; i += 1) shaky.mark(word('ai', 5), i >= 3);
    expect(shaky.maybeLevelUp()).toBeNull();

    const off = await load({ settings: { levels: [5], coach: false } });
    for (let i = 0; i < 25; i += 1) off.mark(word('ai', 5), true);
    expect(off.maybeLevelUp()).toBeNull();
  });

  it('reads a damaged record as an empty one rather than failing', async () => {
    const { weakSounds, unseenMove, mark } = await load({ coach: { sounds: ['x'], levels: { 4: 7 }, moved: { from: 'x' } } });
    expect(weakSounds()).toEqual([]);
    expect(unseenMove()).toBeNull();
    expect(() => mark(word('ai', 4), true)).not.toThrow();
  });
});
