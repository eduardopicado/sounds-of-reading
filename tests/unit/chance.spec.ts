/* Pick a Bib: every question's answer worked out again from the bag, the
 * spinner or the picks.
 *
 *   npm run test:unit */

import { describe, expect, it } from 'vitest';
import { CHANCE_STEPS, chanceLines, chanceQuestion, total, type Colour } from '../../src/content/chance';

function seeded(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) % 2 ** 31; return s / 2 ** 31; };
}
const many = (task: string, n = 500) => {
  const r = seeded(task.length * 13 + 5);
  return Array.from({ length: n }, () => chanceQuestion(task as never, r));
};
const asked = (ask: string): Colour => /\b(yellow|blue|red|green)\b/.exec(ask)![1] as Colour;

describe('Pick a Bib', () => {
  it('always has the answer among different choices', () => {
    for (const step of CHANCE_STEPS) {
      for (const q of many(step.task)) {
        expect(q.options, q.ask).toContain(q.answer);
        expect(new Set(q.options).size).toBe(q.options.length);
        for (const o of q.options) expect(q.labels[o]).toBeTruthy();
      }
    }
  });

  it('possible when the colour is in the bag, impossible when not, certain when it is all there is', () => {
    for (const q of [...many('could'), ...many('will')]) {
      const c = asked(q.ask);
      const n = q.bag![c] ?? 0;
      const expected = n === 0 ? 'impossible' : n === total(q.bag!) && q.task === 'will' ? 'certain' : 'possible';
      expect(q.answer, JSON.stringify(q.bag)).toBe(expected);
    }
  });

  it('likely when it is most of the bag, unlikely when it is a small part, never half and half', () => {
    for (const q of many('likely')) {
      const c = asked(q.ask);
      const share = q.bag![c]! / total(q.bag!);
      expect(share === 0.5).toBe(false);
      expect(q.answer).toBe(share > 0.5 ? 'likely' : 'unlikely');
      expect(Math.max(share, 1 - share)).toBeGreaterThanOrEqual(0.75);
    }
  });

  it('the most and least likely are the colours with most and fewest, never a tie', () => {
    for (const q of many('more')) {
      const counts = q.options.map((c) => q.bag![c as Colour]!);
      expect(new Set(counts).size).toBe(counts.length);
      const best = q.ask.includes('most') ? Math.max(...counts) : Math.min(...counts);
      expect(q.bag![q.answer as Colour]).toBe(best);
    }
    for (const q of many('spinner')) {
      expect(q.spinner).toHaveLength(8);
      const count = (c: string) => q.spinner!.filter((x) => x === c).length;
      const counts = q.options.map(count);
      const best = q.ask.includes('most') ? Math.max(...counts) : Math.min(...counts);
      expect(count(q.answer)).toBe(best);
      expect(counts.filter((n) => n === best)).toHaveLength(1);
    }
  });

  it('ten picks: the answer is what came up most, from the bag, never a tie', () => {
    let surprises = 0;
    for (const q of many('picks')) {
      expect(q.picks).toHaveLength(10);
      for (const p of q.picks!) expect(q.bag![p]).toBeGreaterThan(0);
      const counts = q.options.map((c) => q.picks!.filter((p) => p === c).length);
      expect(counts[0]).not.toBe(counts[1]);
      expect(q.picks!.filter((p) => p === q.answer).length).toBe(Math.max(...counts));
      const most = q.options.reduce((a, b) => (q.bag![a as Colour]! > q.bag![b as Colour]! ? a : b));
      if (q.answer !== most) surprises += 1;
    }
    /* the colour there is less of comes up most now and then, and not often */
    expect(surprises).toBeGreaterThan(0);
    expect(surprises).toBeLessThan(150);
  });

  it('has its fixed lines as sentences, for the recordings', () => {
    for (const l of chanceLines()) expect(l, l).toMatch(/^[A-Z].*[.!?]$/);
  });
});
