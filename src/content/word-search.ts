/* Word Search: the lists and the grids, from the content file.
 *
 * The themed lists live in words.ts (SEARCH_LISTS); his tricky words and this
 * week's sounds come from the lists the other games use. This makes the
 * grids: the words laid in the directions a step allows, and the gaps filled
 * with letters.
 *
 * A grid is checked before he sees it. Every line is read both ways, and
 *   - a blocked word (or one of NOT_BY_CHANCE) may only appear inside one of
 *     the hidden words, never made by the filler letters, and
 *   - each hidden word appears exactly once, so wherever he finds it, it is
 *     the one the game hid.
 * The words in a grid never sit inside one another (the and them), for the
 * same reason. */

import { BLOCKLIST, NOT_BY_CHANCE, SEARCH_LISTS } from './words';
import type { Step } from './maths';

/* ── the lists ─────────────────────────────────────────────────────────── */

export interface ThemeWord {
  /** as it is hidden: lower case */
  text: string;
  /** as it is written in the list: Brazil keeps its capital */
  shown: string;
  picture: string;
}

export interface Theme { id: string; name: string; picture: string; words: ThemeWord[] }

export const THEMES: Theme[] = SEARCH_LISTS.map(({ id, name, picture, words }) => ({
  id, name, picture,
  words: words.split('|').map((raw) => {
    const [shown, ...rest] = raw.trim().split(/\s+/);
    return { text: shown.toLowerCase(), shown, picture: rest.join(' ') };
  }),
}));

/* ── the steps ─────────────────────────────────────────────────────────── */

export type Way = 'across' | 'down' | 'down-right' | 'up-right' | 'back' | 'up' | 'down-left' | 'up-left';

/** one letter's move along each way: [across, down] */
export const WAY: Record<Way, [number, number]> = {
  across: [1, 0], down: [0, 1], 'down-right': [1, 1], 'up-right': [1, -1],
  back: [-1, 0], up: [0, -1], 'down-left': [-1, 1], 'up-left': [-1, -1],
};

export interface SearchStep extends Step {
  /** the grid is size by size */
  size: number;
  /** how many words are hidden */
  count: number;
  ways: Way[];
  /** where to look, as he is told it */
  told: string;
}

export const SEARCH_STEPS: SearchStep[] = [
  { name: 'Across, in a small grid', size: 6, count: 4, ways: ['across'],
    told: 'Every word goes across, from left to right.' },
  { name: 'Across and down', size: 7, count: 5, ways: ['across', 'down'],
    told: 'The words go across or down.' },
  { name: 'A bigger grid', size: 8, count: 6, ways: ['across', 'down'],
    told: 'The words go across or down.' },
  /* Years 3–4 */
  { name: 'Diagonals', size: 9, count: 7, ways: ['across', 'down', 'down-right', 'up-right'],
    told: 'The words go across, down, or on a slant.' },
  { name: 'Backwards too', size: 9, count: 7, ways: ['across', 'down', 'down-right', 'up-right', 'back', 'up'],
    told: 'The words go across, down, on a slant, and some go backwards.' },
  { name: 'Every way', size: 10, count: 8, ways: ['across', 'down', 'down-right', 'up-right', 'back', 'up', 'down-left', 'up-left'],
    told: 'The words go every way, even backwards on a slant.' },
];

/** the biggest grid, so the longest word any list may have */
export const MAX_SIZE = Math.max(...SEARCH_STEPS.map((s) => s.size));
/** a word of one or two letters turns up by chance all over a grid */
export const MIN_LENGTH = 3;

/* ── choosing the words ────────────────────────────────────────────────── */

type Rand = () => number;

function shuffled<T>(items: readonly T[], rand: Rand): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const reversed = (w: string): string => [...w].reverse().join('');

/** does one word hide inside the other, either way round? */
const nested = (a: string, b: string): boolean =>
  a.includes(b) || b.includes(a) || a.includes(reversed(b)) || b.includes(reversed(a));

/** words for a grid of this size: letters only, short enough to fit, long
    enough not to turn up by chance, and none inside another */
export function pickWords(pool: readonly string[], count: number, size: number, rand: Rand = Math.random): string[] {
  const out: string[] = [];
  for (const w of shuffled([...new Set(pool)], rand)) {
    if (out.length >= count) break;
    if (!/^[a-z]+$/.test(w) || w.length < MIN_LENGTH || w.length > size) continue;
    if (out.some((o) => nested(o, w))) continue;
    out.push(w);
  }
  return out;
}

/* ── the grid ──────────────────────────────────────────────────────────── */

export type Cell = [number, number];

export interface Placed { text: string; from: Cell; to: Cell; way: Way }

export interface Grid {
  size: number;
  /** letters[y][x] */
  letters: string[][];
  placed: Placed[];
}

/** the cells from one to another, if they are in a straight line any of the
    eight ways */
export function lineCells(from: Cell, to: Cell): Cell[] | null {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return null;
  const n = Math.max(Math.abs(dx), Math.abs(dy));
  const [sx, sy] = [Math.sign(dx), Math.sign(dy)];
  return Array.from({ length: n + 1 }, (_, i) => [from[0] + sx * i, from[1] + sy * i] as Cell);
}

export const cellsOf = (p: Placed): Cell[] => lineCells(p.from, p.to)!;

/** the hidden word with these two ends, whichever end he started from */
export function wordAt(grid: Grid, from: Cell, to: Cell): Placed | undefined {
  const same = (a: Cell, b: Cell): boolean => a[0] === b[0] && a[1] === b[1];
  return grid.placed.find((p) => (same(p.from, from) && same(p.to, to)) || (same(p.from, to) && same(p.to, from)));
}

/** every straight line through the grid, as cells, one way along it */
function lines(size: number): Cell[][] {
  const out: Cell[][] = [];
  const walk = (x: number, y: number, dx: number, dy: number): Cell[] => {
    const cells: Cell[] = [];
    for (; x >= 0 && y >= 0 && x < size && y < size; x += dx, y += dy) cells.push([x, y]);
    return cells;
  };
  for (let i = 0; i < size; i += 1) {
    out.push(walk(0, i, 1, 0), walk(i, 0, 0, 1));
  }
  for (let i = 0; i < size; i += 1) {
    out.push(walk(i, 0, 1, 1), walk(0, i + 1, 1, 1));
    out.push(walk(i, size - 1, 1, -1), walk(0, size - 2 - i, 1, -1));
  }
  return out.filter((l) => l.length >= MIN_LENGTH);
}

interface Reading { text: string; cells: Cell[] }

/** every line of the grid as it reads, both ways along it */
function readings(letters: string[][]): Reading[] {
  return lines(letters.length).flatMap((line) => {
    const text = line.map(([x, y]) => letters[y][x]).join('');
    return [{ text, cells: line }, { text: reversed(text), cells: [...line].reverse() }];
  });
}

/** where a word appears in the grid, read either way along any line: one
    set of cells per appearance (a palindrome read back is the same one) */
export function findAll(letters: string[][], word: string, read: Reading[] = readings(letters)): Cell[][] {
  const found = new Map<string, Cell[]>();
  for (const { text, cells } of read) {
    for (let at = text.indexOf(word); at >= 0; at = text.indexOf(word, at + 1)) {
      const hit = cells.slice(at, at + word.length);
      found.set(hit.map((c) => c.join()).sort().join(' '), hit);
    }
  }
  return [...found.values()];
}

const NEVER = [...BLOCKLIST, ...NOT_BY_CHANCE];

/** is the grid fit to show: nothing rude made by chance, each word once? */
export function clean(letters: string[][], placed: readonly Placed[]): boolean {
  const inside = (hit: Cell[]): boolean => placed.some((p) => {
    const keys = cellsOf(p).map((c) => c.join());
    const want = hit.map((c) => c.join());
    const run = keys.join(' ');
    return run.includes(want.join(' ')) || run.includes([...want].reverse().join(' '));
  });
  const read = readings(letters);
  for (const bad of NEVER) {
    if (!read.some((r) => r.text.includes(bad))) continue;
    if (findAll(letters, bad, read).some((hit) => !inside(hit))) return false;
  }
  return placed.every((p) => findAll(letters, p.text, read).length === 1);
}

/** letters for the gaps: mostly the words' own letters, so a gap does not
    give a word away, and some common ones */
const COMMON = 'aaeeiioouulnrstmdbcghkpw';

/**
 * Hide the words in a grid the step's size, laid the ways it allows, the
 * longest first. Each of the step's ways is tried first for a word in turn,
 * so a grid with as many words as ways uses them all when they fit.
 */
export function makeGrid(words: readonly string[], step: SearchStep, rand: Rand = Math.random): Grid {
  const { size } = step;
  const order = [...words].sort((a, b) => b.length - a.length);
  const fill = order.join('') + COMMON;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const cells: (string | null)[][] = Array.from({ length: size }, () => Array<string | null>(size).fill(null));
    const placed: Placed[] = [];
    const ways = shuffled(step.ways, rand);
    const ok = order.every((word, i) => {
      for (const way of [ways[i % ways.length], ...shuffled(ways, rand)]) {
        const [dx, dy] = WAY[way];
        const starts: Cell[] = [];
        for (let y = 0; y < size; y += 1) {
          for (let x = 0; x < size; x += 1) {
            const ex = x + dx * (word.length - 1);
            const ey = y + dy * (word.length - 1);
            if (ex >= 0 && ey >= 0 && ex < size && ey < size) starts.push([x, y]);
          }
        }
        for (const [x, y] of shuffled(starts, rand)) {
          const fits = [...word].every((ch, k) => {
            const at = cells[y + dy * k][x + dx * k];
            return at === null || at === ch;
          });
          if (!fits) continue;
          [...word].forEach((ch, k) => { cells[y + dy * k][x + dx * k] = ch; });
          placed.push({ text: word, from: [x, y], to: [x + dx * (word.length - 1), y + dy * (word.length - 1)], way });
          return true;
        }
      }
      return false;
    });
    if (!ok) continue;
    for (let tries = 0; tries < 20; tries += 1) {
      const letters = cells.map((row) => row.map((c) => c ?? fill[Math.floor(rand() * fill.length)]));
      if (clean(letters, placed)) return { size, letters, placed };
    }
  }
  throw new Error(`Word Search: no grid of ${size} for ${words.join(', ')}`);
}
