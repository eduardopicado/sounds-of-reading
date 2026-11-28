/* Word Positions, Opposites and Same, Story Order: one right answer each,
 * and no wrong choice that is secretly right.
 *
 *   npm run test:unit */

import { describe, expect, it } from 'vitest';
import {
  COMPOUNDS, PICTURE_SETS, SENTENCE_SETS, STORY_ASKS, STORY_STEPS, TAGGED, WORDS_STEPS, WORD_STEPS,
  englishLines, oppositesOf, sameAs, storyQuestion, wordQuestion, wordsQuestion,
} from '../../src/content/english';
import { ALL_STORIES } from '../../src/content/index';

function seeded(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) % 2 ** 31; return s / 2 ** 31; };
}
const many = <T>(make: (r: () => number) => T, n = 400): T[] => {
  const r = seeded(n + 3);
  return Array.from({ length: n }, () => make(r));
};

describe('Word Positions', () => {
  it('asks for a kind the sentence has just one of, and the answer is that word', () => {
    for (const step of WORD_STEPS) {
      for (const q of many((r) => wordQuestion(step.task, r))) {
        expect(q.answer.length).toBeGreaterThan(0);
        for (const i of q.answer) expect(q.sentence.kinds[i], q.sentence.words.join(' ')).toBe(q.kind);
        if (step.task === 'every') {
          expect(q.answer).toEqual(q.sentence.kinds.flatMap((k, i) => (k === 'n' ? [i] : [])));
          expect(q.answer.length).toBeGreaterThanOrEqual(2);
        } else if (step.task !== 'position') {
          expect(q.sentence.kinds.filter((k) => k === q.kind)).toHaveLength(1);
        }
      }
    }
  });

  it('has enough sentences with one naming word, and with more than one', () => {
    const naming = TAGGED.map((t) => t.kinds.filter((k) => k === 'n').length);
    expect(naming.filter((n) => n === 1).length).toBeGreaterThanOrEqual(8);
    expect(naming.filter((n) => n >= 2).length).toBeGreaterThanOrEqual(8);
  });
});

describe('Opposites and Same', () => {
  it('never offers a wrong choice that is also right, or the word itself', () => {
    for (const step of WORDS_STEPS) {
      for (const q of many((r) => wordsQuestion(step.task, r))) {
        expect(q.options, q.ask).toContain(q.answer);
        expect(new Set(q.options).size).toBe(q.options.length);
        if (step.task === 'opposite' || step.task === 'same') {
          const word = q.shown!;
          for (const o of q.options.filter((x) => x !== q.answer)) {
            expect(o).not.toBe(word);
            expect(oppositesOf(word), `${word}: ${o}`).not.toContain(o);
            expect(sameAs(word), `${word}: ${o}`).not.toContain(o);
            expect(sameAs(q.answer), `${q.answer}: ${o}`).not.toContain(o);
          }
        }
        if (step.task === 'join') {
          const front = q.shown!.replace(' + ?', '');
          for (const o of q.options.filter((x) => x !== q.answer)) expect(COMPOUNDS.some((c) => c.a === front && c.b === o), `${front}${o}`).toBe(false);
        }
        if (step.task === 'split') {
          const right = q.options.filter((o) => o.replace(' + ', '') === q.shown);
          expect(right).toEqual([q.answer]);
        }
      }
    }
  });
});

describe('Story Order', () => {
  it('has pictures and stories to put in order, and a question for stories that exist', () => {
    expect(PICTURE_SETS.length).toBeGreaterThanOrEqual(8);
    for (const set of PICTURE_SETS) expect(set.length).toBeGreaterThanOrEqual(3);
    expect(SENTENCE_SETS.filter((s) => s.length === 3).length).toBeGreaterThanOrEqual(6);
    expect(SENTENCE_SETS.filter((s) => s.length === 4).length).toBeGreaterThanOrEqual(5);
    for (const a of STORY_ASKS) {
      expect(ALL_STORIES.some((s) => s.title === a.title)).toBe(true);
      expect(new Set(a.options).size).toBe(3);
    }
  });

  it('offers what comes next from other sets, never the right one twice', () => {
    for (const step of STORY_STEPS) {
      for (const q of many((r) => storyQuestion(step.task, r))) {
        if (q.options) {
          expect(q.options).toContain(q.answer);
          expect(new Set(q.options).size).toBe(q.options.length);
        }
        if (q.order) expect(new Set(q.order).size).toBe(q.order.length);
      }
    }
  });

  it('has its fixed lines as sentences, for the recordings', () => {
    for (const l of englishLines()) expect(l, l).toMatch(/^[A-Z"].*[.!?]$/);
  });
});
