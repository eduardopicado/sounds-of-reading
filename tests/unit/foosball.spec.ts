/* Foosball Words: the rods for every word the game can ask. */

import { describe, expect, it } from 'vitest';
import { CUTS, FOOS_STEPS, foosQuestion, foosWords, makeTable, sameSound, sillyOf, unfit, wordOf, wordsOn } from '../../src/content/foosball';
import { BLOCKLIST, SILLY_WORDS, soundsAlike } from '../../src/content/index';
import { NOT_BY_CHANCE } from '../../src/content/words';

/** the same "random" rods every run */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const combos = (rods: string[][]): string[] =>
  rods.reduce<string[]>((acc, rod) => acc.flatMap((a) => rod.map((p) => a + p)), ['']);

describe('Foosball Words', () => {
  it('climbs from three sounds to four, with more players on each rod', () => {
    expect(FOOS_STEPS.map((s) => [s.rods, s.players])).toEqual([[3, 3], [3, 4], [4, 3], [4, 4]]);
  });

  it('knows the spellings of one sound', () => {
    expect(sameSound('c', 'k')).toBe(true);
    expect(sameSound('ck', 'k')).toBe(true);
    expect(sameSound('ai', 'ay')).toBe(true);
    expect(sameSound('ee', 'ea')).toBe(true);
    expect(sameSound('ch', 'tch')).toBe(true);
    expect(sameSound('a', 'e')).toBe(false);
    expect(sameSound('sh', 'ch')).toBe(false);
  });

  it('names the real word a row of players spells', () => {
    expect(wordOf(['sh', 'i', 'p'])?.word.text).toBe('ship');
    expect(wordOf(['sh', 'i', 'p'])?.parts).toEqual(['sh', 'i', 'p']);
    expect(wordOf(['zz', 'u', 'q'])).toBeUndefined();
  });

  it('has words with pictures for every step at every level', () => {
    for (const step of FOOS_STEPS) {
      for (const levels of [[1, 2], [3], [4, 5], [6], [7, 8]]) {
        expect(foosWords(levels, step.rods).length, `${step.name} at ${levels.join(', ')}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it('puts every word on rods it can be built from, and nothing that sounds like it', () => {
    const rand = seeded(5);
    let full = 0;
    let all = 0;
    for (const step of FOOS_STEPS) {
      for (const target of foosWords([], step.rods)) {
        const q = foosQuestion(target, step, rand);
        expect(q.rods).toHaveLength(target.parts.length);
        q.rods.forEach((rod, i) => {
          expect(rod).toContain(target.parts[i]);
          expect(new Set(rod).size).toBe(rod.length);
          expect(rod.length).toBeLessThanOrEqual(step.players);
          expect(rod.length, `${target.word.text}: rod ${i + 1}`).toBeGreaterThanOrEqual(2);
          /* never two spellings of one sound on a rod */
          for (const a of rod) for (const b of rod) if (a !== b) expect(sameSound(a, b), `${target.word.text}: ${a} ${b}`).toBe(false);
          all += 1;
          if (rod.length === step.players) full += 1;
        });
        /* no setting of the rods spells a word that sounds like it */
        for (const text of combos(q.rods)) {
          if (text !== target.word.text) expect(soundsAlike(text, target.word.text), `${target.word.text}: ${text}`).toBe(false);
        }
        /* it starts away from the answer */
        const right = q.start.filter((s, i) => q.rods[i][s] === target.parts[i]).length;
        expect(right).toBeLessThanOrEqual(target.parts.length > 3 ? 1 : 0);
      }
    }
    /* almost every rod has its full team of players */
    expect(full / all).toBeGreaterThan(0.9);
  });

  it('never lets the rods spell a blocked word, or one inside letters that are not a word', () => {
    expect(unfit(['sh', 'i', 't'])).toBe(true);
    expect(unfit(['sh', 'i', 't', 's'])).toBe(true);
    /* a real word with one inside it is a real word */
    expect(unfit(['sh', 'e', 'll'])).toBe(false);
    expect(unfit(['sh', 'i', 'p'])).toBe(false);
    /* the word's own letters in their own places are no new word: b·t·i·tch on a table for stitch */
    expect(unfit(['b', 't', 'i', 'tch'], ['s', 't', 'i', 'tch'])).toBe(false);
    expect(unfit(['b', 't', 'i', 'tch'])).toBe(true);
    /* the mild words only on their own */
    expect(unfit(['w', 'ee', 't'])).toBe(false);
    expect(unfit(['p', 'oo'])).toBe(true);
    const never = [...BLOCKLIST, ...NOT_BY_CHANCE];
    const settingsOf = (rods: string[][]): string[][] =>
      rods.reduce<string[][]>((acc, rod) => acc.flatMap((a) => rod.map((p) => [...a, p])), [[]]);
    /* every word the game asks, at every step */
    const rand = seeded(100);
    for (const step of FOOS_STEPS) {
      for (const target of foosWords([], step.rods)) {
        const q = foosQuestion(target, step, rand);
        const bad = settingsOf(q.rods).filter((parts) => never.includes(parts.join('')) || unfit(parts, target.parts));
        expect(bad.map((parts) => parts.join('')), target.word.text).toEqual([]);
        q.rods.forEach((rod, i) => {
          expect(rod).toContain(target.parts[i]);
          expect(rod.length, `${target.word.text}: rod ${i + 1}`).toBeGreaterThanOrEqual(2);
        });
      }
    }
  });

  it('offers the sounds that make another real word first', () => {
    const ship = CUTS.find((c) => c.word.text === 'ship')!;
    const q = foosQuestion(ship, FOOS_STEPS[0], seeded(2));
    /* sh·i·p: chip, shop, shin are all in the word lists */
    const swaps = q.rods.flatMap((rod, i) => rod.filter((p) => p !== ship.parts[i])
      .map((p) => wordOf(ship.parts.map((x, j) => (j === i ? p : x)))?.word.text)).filter(Boolean);
    expect(swaps.length).toBeGreaterThanOrEqual(3);
  });

  it('make any word: finds every real word on the rods, and only those', () => {
    const ship = CUTS.find((c) => c.word.text === 'ship')!;
    const q = foosQuestion(ship, FOOS_STEPS[0], seeded(2));
    const words = wordsOn(q.rods);
    expect(words.map((c) => c.word.text)).toContain('ship');
    const texts = new Set(combos(q.rods));
    for (const c of words) {
      expect(texts.has(c.word.text), c.word.text).toBe(true);
      expect(wordOf(c.parts)?.word.text).toBe(c.word.text);
    }
    /* and every other setting is not a word on the list */
    for (const text of texts) if (!words.some((c) => c.word.text === text)) expect(CUTS.some((c) => c.word.text === text), text).toBe(false);
  });

  it('make any word: a table with plenty to find, at every step', () => {
    const rand = seeded(7);
    for (const step of FOOS_STEPS) {
      const sizes: number[] = [];
      for (let i = 0; i < 40; i += 1) {
        const { q, words } = makeTable(foosWords([], step.rods), step, rand);
        expect(words.map((c) => c.word.text)).toContain(q.target.word.text);
        sizes.push(words.length);
      }
      sizes.sort((a, b) => a - b);
      /* never fewer than three words, and usually many more */
      expect(sizes[0], step.name).toBeGreaterThanOrEqual(3);
      expect(sizes[sizes.length >> 1], step.name).toBeGreaterThanOrEqual(5);
    }
  });

  it('make any word: knows a made-up word from the lists', () => {
    const silly = SILLY_WORDS[0];
    expect(sillyOf([silly.text])?.text).toBe(silly.text);
    expect(sillyOf(['sh', 'i', 'p'])).toBeUndefined();
  });
});
