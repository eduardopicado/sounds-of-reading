/* Word Search: the grids. Every one is checked the way a parent would check
 * a puzzle before handing it over, many times over with a seeded shuffle. */

import { describe, expect, it } from 'vitest';
import {
  MAX_SIZE, SEARCH_STEPS, THEMES, WAY, cellsOf, clean, findAll, lineCells, makeGrid, pickWords, wordAt,
  type Placed, type Way,
} from '../../src/content/word-search';
import { ALL_SIGHT_WORDS, BLOCKLIST } from '../../src/content/index';
import { NOT_BY_CHANCE } from '../../src/content/words';

/** the same "random" grids every run */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POOLS: [string, string[]][] = [
  ['tricky words', ALL_SIGHT_WORDS.map((w) => w.text)],
  ...THEMES.map((t): [string, string[]] => [t.name, t.words.map((w) => w.text)]),
];

describe('Word Search', () => {
  it('starts small and across, and keeps slants and backwards for Years 3–4', () => {
    expect(SEARCH_STEPS[0].ways).toEqual(['across']);
    expect(SEARCH_STEPS[1].ways).toEqual(['across', 'down']);
    for (const step of SEARCH_STEPS.slice(0, 3)) expect(step.ways.every((w) => w === 'across' || w === 'down')).toBe(true);
    expect(SEARCH_STEPS[3].ways).toContain('down-right');
    expect(SEARCH_STEPS[4].ways).toContain('back');
    expect(SEARCH_STEPS.at(-1)!.ways).toHaveLength(8);
    expect(MAX_SIZE).toBe(10);
    for (let i = 1; i < SEARCH_STEPS.length; i += 1) expect(SEARCH_STEPS[i].size).toBeGreaterThanOrEqual(SEARCH_STEPS[i - 1].size);
  });

  it('reads the themed lists from the content file, names keeping their capitals', () => {
    const countries = THEMES.find((t) => t.id === 'countries')!;
    expect(countries.words.find((w) => w.text === 'brazil')).toEqual({ text: 'brazil', shown: 'Brazil', picture: '🇧🇷' });
    for (const t of THEMES) for (const w of t.words) expect(w.text).toBe(w.shown.toLowerCase());
  });

  it('knows a straight line any of the eight ways, and nothing else', () => {
    expect(lineCells([0, 0], [3, 0])).toEqual([[0, 0], [1, 0], [2, 0], [3, 0]]);
    expect(lineCells([2, 2], [0, 0])).toEqual([[2, 2], [1, 1], [0, 0]]);
    expect(lineCells([0, 3], [3, 0])).toHaveLength(4);
    expect(lineCells([0, 0], [1, 2])).toBeNull();
  });

  it('picks words that fit, and never one inside another', () => {
    const rand = seeded(1);
    for (let i = 0; i < 200; i += 1) {
      const words = pickWords(['the', 'them', 'then', 'eht', 'and', 'went', 'with', 'a', 'I', 'into', 'have'], 6, 6, rand);
      for (const w of words) {
        expect(w.length).toBeGreaterThanOrEqual(3);
        for (const o of words) if (o !== w) expect(o.includes(w) || o.includes([...w].reverse().join(''))).toBe(false);
      }
    }
  });

  it('hides every word once, the ways the step allows, and nothing rude by chance', () => {
    const rand = seeded(7);
    for (const step of SEARCH_STEPS) {
      const used = new Set<Way>();
      for (const [name, pool] of POOLS) {
        for (let i = 0; i < 25; i += 1) {
          const words = pickWords(pool, step.count, step.size, rand);
          const grid = makeGrid(words, step, rand);
          expect(grid.placed.map((p) => p.text).sort(), name).toEqual([...words].sort());
          for (const p of grid.placed) {
            expect(step.ways).toContain(p.way);
            used.add(p.way);
            /* the letters along it spell it, and it is there once only */
            expect(cellsOf(p).map(([x, y]) => grid.letters[y][x]).join('')).toBe(p.text);
            expect(findAll(grid.letters, p.text)).toHaveLength(1);
            const [dx, dy] = WAY[p.way];
            expect(p.to).toEqual([p.from[0] + dx * (p.text.length - 1), p.from[1] + dy * (p.text.length - 1)]);
          }
          expect(clean(grid.letters, grid.placed)).toBe(true);
          expect(grid.letters.flat().every((ch) => /^[a-z]$/.test(ch))).toBe(true);
        }
      }
      /* every way the step names turns up */
      expect([...used].sort(), step.name).toEqual([...step.ways].sort());
    }
  });

  it('turns down a grid whose filler letters spell a blocked word', () => {
    const letters = [
      'xpoox'.split(''),
      'sweet'.split(''),
      'xxxxx'.split(''),
      'xxxxx'.split(''),
      'xxxxx'.split(''),
    ];
    const sweet: Placed = { text: 'sweet', from: [0, 1], to: [4, 1], way: 'across' };
    expect(BLOCKLIST).toContain('poo');
    expect(clean(letters, [sweet])).toBe(false);
    /* wee inside sweet is the word he is finding, not an accident */
    letters[0] = 'xxxxx'.split('');
    expect(clean(letters, [sweet])).toBe(true);
    /* and a word read backwards counts too */
    letters[2] = 'xkcoc'.split('');
    expect(NOT_BY_CHANCE).toContain('cock');
    expect(clean(letters, [sweet])).toBe(false);
  });

  it('turns down a grid where a hidden word turns up twice', () => {
    const letters = ['catxx', 'xxxxx', 'xxtac', 'xxxxx', 'xxxxx'].map((r) => r.split(''));
    const cat: Placed = { text: 'cat', from: [0, 0], to: [2, 0], way: 'across' };
    expect(clean(letters, [cat])).toBe(false);
  });

  it('finds a word from either end', () => {
    const grid = makeGrid(['dog', 'cat'], SEARCH_STEPS[0], seeded(3));
    for (const p of grid.placed) {
      expect(wordAt(grid, p.from, p.to)?.text).toBe(p.text);
      expect(wordAt(grid, p.to, p.from)?.text).toBe(p.text);
    }
    expect(wordAt(grid, [0, 0], [0, 0])).toBeUndefined();
  });
});
