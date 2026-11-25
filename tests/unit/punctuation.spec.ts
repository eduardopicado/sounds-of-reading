/* Punctuation Ref: each question has one mistake and one right answer.
 *
 *   npm run test:unit */

import { describe, expect, it } from 'vitest';
import {
  PUNCTUATION_STEPS, SHORT_WORDS, needsCapital, punctuationLines, punctuationQuestion, wordsOf, wrongShort,
} from '../../src/content/punctuation';

function seeded(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) % 2 ** 31; return s / 2 ** 31; };
}

describe('Punctuation Ref', () => {
  it('knows which words need a capital: the first, I, names, Monday', () => {
    expect(needsCapital('Ben and I play in the park.')).toEqual([0, 2]);
    expect(needsCapital('I kick the ball to Jack.')).toEqual([0, 5]);
    expect(needsCapital('We play on Monday.')).toEqual([0, 3]);
  });

  it('takes out one capital: the word to tap is the only one wrong', () => {
    const r = seeded(4);
    for (let i = 0; i < 300; i += 1) {
      const q = punctuationQuestion('capitals', r);
      const shown = wordsOf(q.shown);
      const right = wordsOf(q.right);
      const differ = shown.flatMap((w, j) => (w !== right[j] ? [j] : []));
      expect(differ, q.shown).toEqual([Number(q.answer)]);
      expect(shown[Number(q.answer)][0]).toMatch(/[a-z]/);
    }
  });

  it('takes out the comma: the gap to tap is where it was', () => {
    const r = seeded(6);
    for (let i = 0; i < 100; i += 1) {
      const q = punctuationQuestion('commas', r);
      expect(q.shown).not.toContain(',');
      expect(wordsOf(q.right)[Number(q.answer)].endsWith(',')).toBe(true);
    }
  });

  it('asks full stop or question mark without shouts first, then with them', () => {
    const r = seeded(8);
    for (let i = 0; i < 200; i += 1) {
      const a = punctuationQuestion('stop-or-ask', r);
      expect(a.options).toEqual(['.', '?']);
      expect(a.right.endsWith(a.answer)).toBe(true);
      expect(a.shown).toBe(a.right.slice(0, -1));
      const b = punctuationQuestion('ends', r);
      expect(b.options).toEqual(['.', '?', '!']);
    }
  });

  it('puts the apostrophe where the letters were, with two wrong ways beside it', () => {
    expect(wrongShort("don't")).toEqual(["do'nt", 'dont']);
    expect(wrongShort("I'll")).toEqual(["Il'l", 'Ill']);
    for (const c of SHORT_WORDS) {
      const wrong = wrongShort(c.short);
      expect(new Set([c.short, ...wrong]).size, c.short).toBe(3);
    }
  });

  it('every question has its answer among different choices', () => {
    const r = seeded(12);
    for (const step of PUNCTUATION_STEPS) {
      for (let i = 0; i < 300; i += 1) {
        const q = punctuationQuestion(step.task, r);
        if (q.tap) continue;
        expect(q.options, q.ask).toContain(q.answer);
        expect(new Set(q.options).size, q.ask).toBe(q.options.length);
      }
    }
    const q = punctuationQuestion('whose', () => 0.1);
    expect(q.options).toContain(q.answer);
    expect(q.answer).toMatch(/'s$/);
  });

  it('which one is right: only one of the three is', () => {
    const r = seeded(14);
    for (let i = 0; i < 200; i += 1) {
      const q = punctuationQuestion('check', r);
      expect(q.options.filter((o) => o === q.right)).toHaveLength(1);
      expect(q.options.filter((o) => /^[a-z]/.test(o))).toHaveLength(1);
    }
  });

  it('has its fixed lines as sentences, for the recordings', () => {
    for (const l of punctuationLines()) expect(l, l).toMatch(/^[A-Z"].*[.!?]$/);
  });
});
