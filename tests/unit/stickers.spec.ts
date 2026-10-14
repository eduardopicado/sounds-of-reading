/* The sticker book, the record of what he has played, and the coach's
 * picks that are made from them.
 *
 *   npm run test:unit */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** localStorage, as a plain map */
function fakeStorage(seed: Record<string, unknown> = {}) {
  const items = new Map(Object.entries(seed).map(([k, v]) => [`sor:${k}`, JSON.stringify(v)]));
  return {
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => { items.set(k, v); },
    raw: (k: string) => items.get(`sor:${k}`),
  };
}

let storage: ReturnType<typeof fakeStorage>;

async function load(seed: Record<string, unknown> = {}) {
  vi.resetModules();
  storage = fakeStorage(seed);
  vi.stubGlobal('window', { localStorage: storage });
  const stickers = await import('../../src/lib/stickers');
  const played = await import('../../src/lib/played');
  return { ...stickers, ...played };
}

describe('the sticker book', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('reads an old maths sticker, saved with the game in `sound`, as the game\'s', async () => {
    const { stickers } = await load({ stickers: [{ sound: 'flash-count', face: '⚡', at: 5 }, { sound: 'ai', face: '🌈', at: 6 }] });
    expect(stickers()).toEqual([{ game: 'flash-count', face: '⚡', at: 5 }, { sound: 'ai', face: '🌈', at: 6 }]);
  });

  it('drops what is not a sticker rather than breaking the home screen', async () => {
    const { stickers } = await load({ stickers: [null, 3, { face: '⭐' }, { sound: 'ai', face: '🌈', at: 1 }] });
    expect(stickers()).toEqual([{ sound: 'ai', face: '🌈', at: 1 }]);
    const broken = await load({ stickers: { not: 'a list' } });
    expect(broken.stickers()).toEqual([]);
    /* and winning one still works */
    expect(broken.award(['ai'])?.sound).toBe('ai');
  });

  it('gives a game its own sticker, kept apart from the sounds', async () => {
    const { awardFace, stickers } = await load();
    awardFace('trace-it', '✏️');
    expect(stickers()).toEqual([{ game: 'trace-it', face: '✏️', at: expect.any(Number) }]);
  });

  it('keeps the last sixty', async () => {
    const { award, stickers } = await load();
    for (let i = 0; i < 70; i += 1) award(['ai']);
    expect(stickers()).toHaveLength(60);
  });
});

describe('what he has played', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('starts from the stickers the games gave, before there was a record', async () => {
    const { played } = await load({ stickers: [{ sound: 'flash-count', face: '⚡', at: 5 }, { sound: 'flash-count', face: '⚡', at: 9 }, { sound: 'ai', face: '🌈', at: 7 }] });
    expect(played()).toEqual({ 'flash-count': 9 });
  });

  it('remembers a finished round whatever the score, and outlasts the sticker book', async () => {
    const { award, markPlayed, played } = await load();
    markPlayed('weigh-in');
    /* sixty reading stickers later, the sticker book has forgotten it */
    for (let i = 0; i < 60; i += 1) award(['ai']);
    expect(Object.keys(played())).toEqual(['weigh-in']);
  });
});

describe("the coach's picks", () => {
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  const numberGames = async () => {
    const { TILES } = await import('../../src/games/home');
    return TILES.filter((t) => t.section === 'maths' || t.section === 'bjj').map((t) => t.path);
  };

  it('offers a maths or jiu-jitsu game not tried yet', async () => {
    await load();
    const all = await numberGames();
    const last = Object.fromEntries(all.slice(1).map((id, i) => [id, i + 1]));
    storage.setItem('sor:played', JSON.stringify(last));
    const { coachPicks } = await import('../../src/games/home');
    const [, maths] = coachPicks(1);
    expect(maths).toMatchObject({ why: 'Not tried yet', tile: { path: all[0] } });
  });

  it('once every one has been played, the one played longest ago', async () => {
    await load();
    const all = await numberGames();
    const last = Object.fromEntries(all.map((id, i) => [id, 100 + i]));
    last[all[5]] = 1;
    storage.setItem('sor:played', JSON.stringify(last));
    const { coachPicks } = await import('../../src/games/home');
    const [, maths] = coachPicks(1);
    expect(maths).toMatchObject({ why: 'Not played for a while', tile: { path: all[5] } });
  });
});
