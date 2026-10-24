/* Sight words, shared by the games that can switch to them: the sets for his
 * level, lookalikes, a board without twins, and letter tiles that never
 * spell a word that sounds the same.
 *
 *   npm run test:unit */

import { describe, expect, it } from 'vitest';
import { ALL_SIGHT_WORDS, REAL_WORDS, SIGHT_SETS, soundsAlike } from '../../src/content/index';
import {
  MAGNETS, buildable, lookalikes, sightBoard, sightSetsUpTo, sightTiles, sightWordsIn,
} from '../../src/content/sight';
import { contrast, PAPER } from '../../src/lib/colour';

const every = sightWordsIn(SIGHT_SETS);
const words = (...texts: string[]) => texts.map((t) => every.find((w) => w.text === t)!);

describe('sight words', () => {
  it('start from the school sets up to his level, and the extra set waits', () => {
    expect(sightSetsUpTo([1])).toEqual(['Level 1']);
    expect(sightSetsUpTo([4, 5])).toEqual(['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']);
    expect(sightSetsUpTo([])).not.toContain('More');
    expect(sightSetsUpTo([])).toHaveLength(8);
  });

  it('come once each, however many sets are picked', () => {
    const texts = every.map((w) => w.text);
    expect(new Set(texts).size).toBe(texts.length);
    expect(sightWordsIn(['Level 1']).every((w) => w.set === 'Level 1')).toBe(true);
  });

  it('know their lookalikes: there with their and these, could with would and should', () => {
    expect(lookalikes(words('there')[0], every, 3).map((w) => w.text)).toEqual(expect.arrayContaining(['their', 'these']));
    expect(lookalikes(words('could')[0], every, 2).map((w) => w.text).sort()).toEqual(['should', 'would']);
  });

  it('know which of them sound the same', () => {
    expect(soundsAlike('there', 'their')).toBe(true);
    expect(soundsAlike('to', 'two')).toBe(true);
    expect(soundsAlike('too', 'two')).toBe(true);
    expect(soundsAlike('no', 'know')).toBe(true);
    expect(soundsAlike('there', 'where')).toBe(false);
  });

  it('deal a board of different words, with no two that sound the same, unless asked', () => {
    for (let n = 0; n < 50; n += 1) {
      const board = sightBoard(every, 15);
      const texts = board.map((w) => w.text);
      expect(new Set(texts).size).toBe(15);
      for (const a of texts) for (const b of texts) expect(soundsAlike(a, b)).toBe(false);
    }
    /* Memory Match says nothing until a pair is made, so there and their may share a board */
    const both = Array.from({ length: 100 }, () => sightBoard(words('there', 'their', 'where'), 3, { twins: true }).length);
    expect(Math.min(...both)).toBe(3);
  });

  it('can be built from lower-case letters only when they are words of two letters or more', () => {
    expect(buildable(words('said')[0])).toBe(true);
    for (const t of ['I', 'a', 'Mr', 'Mrs']) expect(buildable(words(t)[0])).toBe(false);
    expect(every.filter(buildable).every((w) => w.text.length <= 7)).toBe(true);
  });

  it('are built from their letters and wrong ones, and the tiles never spell a word that sounds the same', () => {
    const others = [...every, ...REAL_WORDS];
    for (const w of every.filter(buildable)) {
      for (let n = 0; n < 8; n += 1) {
        const { answer, tiles } = sightTiles(w, 3, others);
        expect(answer.join('')).toBe(w.text);
        const extra = [...tiles];
        for (const ch of answer) extra.splice(extra.indexOf(ch), 1);
        expect(extra.length).toBeLessThanOrEqual(3);
        for (const ch of extra) expect(answer).not.toContain(ch);
        for (const twin of others.filter((o) => o.text !== w.text && o.text.length === w.text.length && soundsAlike(o.text, w.text))) {
          const bag = [...tiles];
          const spellsTwin = [...twin.text].every((ch) => { const i = bag.indexOf(ch); if (i < 0) return false; bag.splice(i, 1); return true; });
          expect(spellsTwin, `${w.text}: ${tiles.join(' ')} spells ${twin.text}`).toBe(false);
        }
      }
    }
  });

  it('offer the letter he would write by sound for the part that lies', () => {
    const said = words('said')[0];
    const seen = new Set<string>();
    for (let n = 0; n < 30; n += 1) for (const t of sightTiles(said, 3, every).tiles) seen.add(t);
    expect(seen.has('e')).toBe(true);
  });

  it('are magnets anyone can read: every colour AA on the paper tile', () => {
    for (const c of MAGNETS) expect(contrast(c, PAPER), c).toBeGreaterThanOrEqual(4.5);
  });

  it('come from the school list as it is written', () => {
    expect(ALL_SIGHT_WORDS.length).toBeGreaterThan(100);
  });
});
