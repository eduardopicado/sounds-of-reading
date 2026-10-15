/* House rules from CLAUDE.md that can be checked by reading the code.
 *
 *   npm run test:unit */

import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const GAMES = new URL('../../src/games/', import.meta.url);
const files = readdirSync(GAMES).filter((f) => f.endsWith('.ts'));
const source = (f: string): string => readFileSync(new URL(f, GAMES), 'utf8');

describe('a game', () => {
  it('schedules through its lifetime, never a bare timer that outlives it', () => {
    /* the home screen's hold-to-open button stops its own timer when it is left */
    const allowed = new Set(['home.ts']);
    const bare = files.filter((f) => !allowed.has(f) && /\bset(Timeout|Interval)\(/.test(source(f)));
    expect(bare, 'use lifetime().later instead (src/lib/life.ts)').toEqual([]);
  });

  it('never reaches for localStorage or the speech engine itself', () => {
    const direct = files.filter((f) => /\blocalStorage\b|\bspeechSynthesis\b|new SpeechSynthesisUtterance/.test(
      /* the voices screen describes the engine in its comments */
      source(f).replace(/\/\*[\s\S]*?\*\//g, '')));
    expect(direct, 'use src/lib/storage.ts and src/lib/speech.ts, which guard every call').toEqual([]);
  });
});
