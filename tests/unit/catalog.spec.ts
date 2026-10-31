/* The list of games: every one has what the app needs from it.
 *
 *   npm run test:unit */

import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GAMES, SECTIONS } from '../../src/games/catalog';

describe('the games', () => {
  it('each have their own address', () => {
    expect(new Set(GAMES.map((g) => g.path)).size).toBe(GAMES.length);
  });

  it('each sit in a section of the home screen, with a name and a picture', () => {
    const sections = new Set(SECTIONS.map((s) => s.id));
    for (const g of GAMES) {
      expect(sections.has(g.section), g.path).toBe(true);
      expect(g.name.trim(), g.path).not.toBe('');
      expect(g.emoji.trim(), g.path).not.toBe('');
      expect(g.what.trim(), g.path).not.toBe('');
    }
  });

  it('every maths, geography and jiu-jitsu game has the steps it climbs, for the progress card', () => {
    for (const g of GAMES.filter((x) => x.section === 'maths' || x.section === 'geography' || x.section === 'bjj')) {
      expect(g.ladder?.length, g.path).toBeGreaterThan(1);
    }
  });

  it('every game file is in the list, so none is left out of the home screen', () => {
    /* the files in src/games that are not a game */
    const parts = new Set(['home', 'grown-ups', 'voices', 'catalog', 'maths-kit', 'bjj-kit', 'bjj-art', 'chess-kit', 'narration', 'teams', 'world-kit', 'lang-kit']);
    const files = readdirSync(new URL('../../src/games', import.meta.url))
      .map((f) => f.replace(/\.ts$/, ''))
      .filter((f) => !parts.has(f));
    /* what the list loads, read from its source: one import per game */
    const source = readFileSync(new URL('../../src/games/catalog.ts', import.meta.url), 'utf8');
    const loaded = [...source.matchAll(/import\('\.\/([\w-]+)'\)/g)].map((m) => m[1]);
    expect(loaded).toHaveLength(GAMES.length);
    expect(new Set(loaded)).toEqual(new Set(files));
  });
});
