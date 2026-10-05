/* The maths: every question the maths games ask, and the levels they climb.
 *
 * Built from the NSW Mathematics K–10 syllabus (2022), Kindergarten (Early
 * Stage 1) to Year 1 (Stage 1, Part A):
 *
 *   Off the Bench        part–whole: the pairs that make 5, 10 and 20
 *   Scoreboard Sums      combining and separating quantities within 20
 *   Number Line Penalty  where numbers sit, from 0–10 up to 0–120
 *   Flash Count          seeing how many at a glance (subitising)
 *
 * Each game has a short ladder of steps. A round starts on the step he
 * reached last time and moves up after three right in a row, down after two
 * wrong, so the questions stay just hard enough. Everything here is plain
 * functions with no screen, so the unit tests can check every step. */

import { pick, shuffle } from '../lib/random';

export interface Step { name: string }

/* ── climbing the ladder ─────────────────────────────────────────────── */

/** up after this many right in a row */
export const UP_AFTER = 3;
/** down after this many wrong in a row */
export const DOWN_AFTER = 2;

export interface Climb { step: number; right: number; wrong: number }

/** where he goes next on a ladder of `steps` after one answer */
export function climb(c: Climb, ok: boolean, steps: number): Climb {
  if (ok) {
    const right = c.right + 1;
    if (right >= UP_AFTER && c.step < steps - 1) return { step: c.step + 1, right: 0, wrong: 0 };
    return { step: c.step, right, wrong: 0 };
  }
  const wrong = c.wrong + 1;
  if (wrong >= DOWN_AFTER && c.step > 0) return { step: c.step - 1, right: 0, wrong: 0 };
  return { step: c.step, right: 0, wrong };
}

/**
 * The answer and three wrong ones to choose from. The wrong ones are the
 * mistakes children make: one more or one less (a miscount), two away, and on
 * bigger numbers ten away (a tens slip). Never outside [lo, hi].
 */
export function choices(answer: number, lo: number, hi: number, n = 4): number[] {
  const ones = shuffle([answer - 1, answer + 1]);
  const twos = shuffle([answer - 2, answer + 2]);
  const tens = hi > 20 ? shuffle([answer - 10, answer + 10]) : [];
  /* a miscount first, then a tens slip on big numbers, then further off */
  const order = [ones[0], ...tens.slice(0, 1), ones[1], ...twos, ...tens.slice(1),
    answer - 3, answer + 3, answer - 4, answer + 4, answer - 5, answer + 5];
  const out = [answer];
  for (const x of order) {
    if (out.length >= n) break;
    if (x >= lo && x <= hi && !out.includes(x)) out.push(x);
  }
  return out.sort((a, b) => a - b);
}

/* ── Off the Bench: how many more to make the team? ──────────────────── */

export interface BenchStep extends Step { target: 5 | 10 | 20; spots: boolean }

export const BENCH_STEPS: BenchStep[] = [
  { name: 'Make 5', target: 5, spots: true },
  { name: 'Make 10', target: 10, spots: true },
  { name: 'Make 10, no gaps shown', target: 10, spots: false },
  { name: 'Make 20', target: 20, spots: true },
];

export interface BenchQuestion { target: number; on: number; need: number }

export function benchQuestion(step: BenchStep, last?: BenchQuestion): BenchQuestion {
  /* at least one on and one to come, and not the same as last time */
  let on = 1 + Math.floor(Math.random() * (step.target - 1));
  if (last && last.target === step.target && last.on === on) on = on === 1 ? 2 : on - 1;
  return { target: step.target, on, need: step.target - on };
}

/* ── Scoreboard Sums: goals added, and goals taken away ─────────────── */

export interface SumStep extends Step {
  /** the biggest number in the question or its answer */
  max: number;
  op: '+' | '-';
  /** the balls on the scoreboard: all of them, only the ones being added
      (so he counts on from the first number), or none */
  show: 'all' | 'second' | 'none';
}

export const SUM_STEPS: SumStep[] = [
  { name: 'Add to 5', max: 5, op: '+', show: 'all' },
  { name: 'Add to 10', max: 10, op: '+', show: 'all' },
  { name: 'Count on to 10', max: 10, op: '+', show: 'second' },
  { name: 'Take away in 10', max: 10, op: '-', show: 'all' },
  { name: 'Add to 20', max: 20, op: '+', show: 'second' },
  { name: 'Add and take away to 20', max: 20, op: '-', show: 'none' },
];

export interface SumQuestion { a: number; b: number; op: '+' | '-'; answer: number }

export function sumQuestion(step: SumStep, last?: SumQuestion): SumQuestion {
  for (let tries = 0; tries < 20; tries += 1) {
    /* the top step mixes adding and taking away */
    const op = step.op === '-' && step.max === 20 ? pick(['+', '-'] as const) : step.op;
    let a: number;
    let b: number;
    if (op === '+') {
      const total = 2 + Math.floor(Math.random() * (step.max - 1));
      a = 1 + Math.floor(Math.random() * (total - 1));
      b = total - a;
      /* past 10, keep the second number small enough to count on */
      if (step.max === 20 && b > 9) continue;
    } else {
      a = 2 + Math.floor(Math.random() * (step.max - 1));
      b = 1 + Math.floor(Math.random() * (a - 1));
    }
    const q: SumQuestion = { a, b, op, answer: op === '+' ? a + b : a - b };
    if (!last || last.a !== q.a || last.b !== q.b || last.op !== q.op) return q;
  }
  return { a: 1, b: 1, op: '+', answer: 2 };
}

/* ── Number Line Penalty: where does the number go? ─────────────────── */

export interface LineStep extends Step {
  lo: number;
  hi: number;
  /** a tick every this many */
  tick: number;
  /** the numbers written under the line */
  labels: number[];
  /** the numbers that can be asked */
  ask: 'any' | 'tens';
  /** how far off still counts, for lines too long to have a tick for each number */
  near: number;
}

const every = (lo: number, hi: number, by: number): number[] => {
  const out: number[] = [];
  for (let x = lo; x <= hi; x += by) out.push(x);
  return out;
};

export const LINE_STEPS: LineStep[] = [
  { name: '0 to 10', lo: 0, hi: 10, tick: 1, labels: every(0, 10, 1), ask: 'any', near: 0 },
  { name: '0 to 10, fewer numbers', lo: 0, hi: 10, tick: 1, labels: [0, 5, 10], ask: 'any', near: 0 },
  { name: '0 to 20', lo: 0, hi: 20, tick: 1, labels: [0, 10, 20], ask: 'any', near: 0 },
  { name: '0 to 100 in tens', lo: 0, hi: 100, tick: 10, labels: [0, 50, 100], ask: 'tens', near: 0 },
  { name: '0 to 100', lo: 0, hi: 100, tick: 10, labels: [0, 50, 100], ask: 'any', near: 4 },
  { name: '0 to 120', lo: 0, hi: 120, tick: 10, labels: [0, 50, 100, 120], ask: 'any', near: 5 },
];

export function lineQuestion(step: LineStep, last?: number): number {
  const pool = (step.ask === 'tens' ? every(step.lo, step.hi, 10) : every(step.lo, step.hi, 1))
    /* a number written under the line is no question at all */
    .filter((n) => !step.labels.includes(n) && n !== last);
  return pick(pool.length ? pool : every(step.lo, step.hi, step.tick));
}

/** the number a tap stands for: the nearest tick where there is one per number */
export function valueAt(step: LineStep, fraction: number): number {
  const raw = step.lo + Math.min(1, Math.max(0, fraction)) * (step.hi - step.lo);
  return step.near ? Math.round(raw) : Math.round(raw / step.tick) * step.tick;
}

export const onTarget = (step: LineStep, asked: number, tapped: number): boolean =>
  Math.abs(asked - tapped) <= step.near;

/* ── Flash Count: how many did you see? ──────────────────────────────── */

export interface FlashStep extends Step {
  max: number;
  /** dice spots, a ten frame, or two dice side by side */
  look: 'dice' | 'frame' | 'two-dice';
  /** how long it shows, in ms */
  ms: number;
}

export const FLASH_STEPS: FlashStep[] = [
  { name: 'Dice to 5', max: 5, look: 'dice', ms: 2000 },
  { name: 'Dice to 6, quicker', max: 6, look: 'dice', ms: 1400 },
  { name: 'Ten frame', max: 10, look: 'frame', ms: 2200 },
  { name: 'Ten frame, quicker', max: 10, look: 'frame', ms: 1500 },
  { name: 'Two dice', max: 12, look: 'two-dice', ms: 2400 },
];

/** the grown-up's choice of pace for Flash Count */
export type FlashSpeed = 'slow' | 'normal' | 'quick';
const SPEED: Record<FlashSpeed, number> = { slow: 1.6, normal: 1, quick: 0.7 };

/** how much longer the first look at a step is than its usual time */
export const FIRST_LOOK = 1.5;
/** how much shorter each right answer in a row makes the next look */
export const QUICKER_BY = 0.15;

/**
 * How long the dots stay up, in ms.
 *
 * Not one fixed flash: each step starts with a long look and closes in, 15%
 * shorter for every right answer in a row, down to the step's own time. A
 * miss gives the long look back. On top of that sits the grown-up's speed
 * choice, and a longer look for a device set to reduce motion.
 */
export function flashMs(step: FlashStep, rightInARow: number, speed: FlashSpeed = 'normal', reduced = false): number {
  const lead = Math.max(1, FIRST_LOOK - QUICKER_BY * rightInARow);
  return Math.round(step.ms * lead * SPEED[speed] * (reduced ? 1.5 : 1));
}

export interface FlashQuestion { n: number; /** for two dice, each die */ parts: number[] }

export function flashQuestion(step: FlashStep, last?: number): FlashQuestion {
  const lo = step.look === 'two-dice' ? 2 : 1;
  let n = lo + Math.floor(Math.random() * (step.max - lo + 1));
  if (n === last) n = n === lo ? n + 1 : n - 1;
  if (step.look !== 'two-dice') return { n, parts: [n] };
  /* two dice that add to n, each 1 to 6 */
  const first = Math.max(1, n - 6) + Math.floor(Math.random() * (Math.min(6, n - 1) - Math.max(1, n - 6) + 1));
  return { n, parts: [first, n - first] };
}

/** where the spots go on a die, in a 3 × 3 grid read left to right, top down */
export const DICE: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};
