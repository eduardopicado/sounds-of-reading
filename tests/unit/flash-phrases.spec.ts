/* Flash Phrases: the phrases for his levels, their lookalikes, and how long they show. */

import { describe, expect, it } from 'vitest';
import { ALL_FLASH_PHRASES } from '../../src/content/index';
import { FIRST_LOOK, PHRASE_STEPS, difference, lookalikePhrases, phraseMs, phrasePool } from '../../src/content/flash-phrases';

describe('Flash Phrases', () => {
  it('offers phrases at his levels and no higher, with the step’s number of words', () => {
    const two = PHRASE_STEPS[0];
    for (const p of phrasePool(two, [3])) {
      expect(p.level).toBeLessThanOrEqual(3);
      expect(p.text.split(' ').length).toBeGreaterThanOrEqual(two.words[0]);
      expect(p.text.split(' ').length).toBeLessThanOrEqual(two.words[1]);
    }
    /* no level chosen: level 1 */
    expect(phrasePool(two, []).every((p) => p.level === 1)).toBe(true);
    /* too few of that length at his level: any length rather than nothing */
    const long = PHRASE_STEPS.find((s) => s.words[0] === 5)!;
    expect(phrasePool(long, [1]).length).toBeGreaterThanOrEqual(3);
  });

  it('puts two lookalikes beside each phrase, each one word changed by one letter', () => {
    for (const p of ALL_FLASH_PHRASES) {
      const looks = lookalikePhrases(p, 2);
      expect(looks).toHaveLength(2);
      expect(new Set([p.text, ...looks]).size).toBe(3);
      for (const l of looks) {
        const d = difference(p.text, l)!;
        expect(d.right.length).toBe(d.wrong.length);
        expect(l.split(' ').filter((w, i) => w !== p.text.split(' ')[i])).toEqual([d.wrong]);
      }
    }
  });

  it('names the word he misread', () => {
    expect(difference('a big dog', 'a big dot')).toEqual({ right: 'dog', wrong: 'dot' });
    expect(difference('a big dog', 'a big dog')).toBeNull();
  });

  it('starts each step with a long look and closes in to the step’s own time', () => {
    const step = PHRASE_STEPS[0];
    expect(phraseMs(step, 0)).toBe(Math.round(step.ms * FIRST_LOOK));
    expect(phraseMs(step, 1)).toBeLessThan(phraseMs(step, 0));
    expect(phraseMs(step, 20)).toBe(step.ms);
    expect(phraseMs(step, 20, true)).toBe(Math.round(step.ms * 1.5));
    /* the last steps are quicker than the first */
    expect(PHRASE_STEPS.at(-1)!.ms).toBeLessThan(PHRASE_STEPS[0].ms);
  });
});
