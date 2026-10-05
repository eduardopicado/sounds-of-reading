/* The maths: every question the maths games ask, and the levels they climb.
 *
 * Built from the NSW Mathematics K–10 syllabus (2022), Kindergarten (Early
 * Stage 1) to Year 2 (the end of Stage 1):
 *
 *   Off the Bench        part–whole: the pairs that make 5, 10 and 20, then
 *                        filling a stadium of 100 (Year 2)
 *   Scoreboard Sums      combining and separating quantities within 20, then
 *                        within 100 by tens and ones (Year 2)
 *   Number Line Penalty  where numbers sit, from 0–10 up to 0–120, then on to
 *                        0–1000 (Year 2)
 *   Flash Count          seeing how many at a glance (subitising), then rows
 *                        and columns, the start of multiplying (Year 2)
 *
 * The Year 2 steps sit at the top of each ladder, so he only meets them by
 * climbing there — or a grown-up starts him there in setup.
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
export function choices(answer: number, lo: number, hi: number, n = 4, unit = 1): number[] {
  const ones = shuffle([answer - unit, answer + unit]);
  const twos = shuffle([answer - 2 * unit, answer + 2 * unit]);
  /* counting in tens, the slip is a ten; otherwise ten is the slip on big numbers */
  const tens = unit === 1 && hi > 20 ? shuffle([answer - 10, answer + 10]) : [];
  /* a miscount first, then a tens slip on big numbers, then further off */
  const order = [ones[0], ...tens.slice(0, 1), ones[1], ...twos, ...tens.slice(1),
    ...[3, 4, 5].flatMap((k) => [answer - k * unit, answer + k * unit])];
  const out = [answer];
  for (const x of order) {
    if (out.length >= n) break;
    if (x >= lo && x <= hi && !out.includes(x)) out.push(x);
  }
  return out.sort((a, b) => a - b);
}

/* ── Off the Bench: how many more to make the team? ──────────────────── */

export interface BenchStep extends Step {
  target: 5 | 10 | 20 | 100;
  spots: boolean;
  /** the fans come in whole rows of ten (Year 2, the stadium) */
  tens?: boolean;
}

export const BENCH_STEPS: BenchStep[] = [
  { name: 'Make 5', target: 5, spots: true },
  { name: 'Make 10', target: 10, spots: true },
  { name: 'Make 10, no gaps shown', target: 10, spots: false },
  { name: 'Make 20', target: 20, spots: true },
  /* Year 2: a stadium of 100 seats in rows of ten */
  { name: 'Fill 100 in tens', target: 100, spots: true, tens: true },
  { name: 'Fill 100', target: 100, spots: true },
];

export interface BenchQuestion { target: number; on: number; need: number }

export function benchQuestion(step: BenchStep, last?: BenchQuestion): BenchQuestion {
  /* at least one on and one to come, and not the same as last time */
  const unit = step.tens ? 10 : 1;
  const slots = step.target / unit;
  let on = 1 + Math.floor(Math.random() * (slots - 1));
  if (last && last.target === step.target && last.on === on * unit) on = on === 1 ? 2 : on - 1;
  return { target: step.target, on: on * unit, need: step.target - on * unit };
}

/* ── Scoreboard Sums: goals added, and goals taken away ─────────────── */

export interface SumStep extends Step {
  /** the biggest number in the question or its answer */
  max: number;
  op: '+' | '-';
  /** some adding, some taking away */
  mix?: boolean;
  /** the balls on the scoreboard: all of them, only the ones being added
      (so he counts on from the first number), tens and ones (racks of ten
      balls and loose ones, for numbers to 100), or none */
  show: 'all' | 'second' | 'bundles' | 'none';
  /**
   * Year 2, within 100: whole tens only (30 + 20), tens and ones that never
   * cross a ten (34 + 25, 58 − 23), or ones that always do (38 + 25, 52 − 27).
   */
  hundred?: 'tens' | 'no-carry' | 'past';
}

export const SUM_STEPS: SumStep[] = [
  { name: 'Add to 5', max: 5, op: '+', show: 'all' },
  { name: 'Add to 10', max: 10, op: '+', show: 'all' },
  { name: 'Count on to 10', max: 10, op: '+', show: 'second' },
  { name: 'Take away in 10', max: 10, op: '-', show: 'all' },
  { name: 'Add to 20', max: 20, op: '+', show: 'second' },
  { name: 'Add and take away to 20', max: 20, op: '-', mix: true, show: 'none' },
  /* Year 2: within 100, by tens and ones */
  { name: 'Add tens', max: 100, op: '+', show: 'bundles', hundred: 'tens' },
  { name: 'Add tens and ones', max: 100, op: '+', show: 'bundles', hundred: 'no-carry' },
  { name: 'Take away tens and ones', max: 100, op: '-', show: 'bundles', hundred: 'no-carry' },
  { name: 'Add past a ten, to 100', max: 100, op: '+', show: 'none', hundred: 'past' },
  { name: 'Add and take away to 100', max: 100, op: '-', mix: true, show: 'none', hundred: 'past' },
];

export interface SumQuestion { a: number; b: number; op: '+' | '-'; answer: number }

const rand = (lo: number, hi: number): number => lo + Math.floor(Math.random() * (hi - lo + 1));

/** a sum within 100, for the Year 2 steps */
function hundredSum(kind: NonNullable<SumStep['hundred']>, op: '+' | '-'): { a: number; b: number } {
  if (kind === 'tens') {
    const a = rand(1, 8) * 10;
    return op === '+' ? { a, b: rand(1, 10 - a / 10) * 10 } : { a: a + 10, b: rand(1, a / 10) * 10 };
  }
  for (;;) {
    const a = rand(11, 99);
    const b = rand(11, 89);
    const carries = op === '+' ? (a % 10) + (b % 10) > 9 : (a % 10) < (b % 10);
    if (op === '+' ? a + b > 100 : b >= a) continue;
    if (b % 10 === 0 || a % 10 === 0) continue;
    /* a step about crossing a ten always crosses one */
    if (kind === 'no-carry' ? carries : !carries) continue;
    return { a, b };
  }
}

export function sumQuestion(step: SumStep, last?: SumQuestion): SumQuestion {
  for (let tries = 0; tries < 20; tries += 1) {
    const op = step.mix ? pick(['+', '-'] as const) : step.op;
    let a: number;
    let b: number;
    if (step.hundred) {
      ({ a, b } = hundredSum(step.hundred, op));
    } else if (op === '+') {
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
  ask: 'any' | 'tens' | 'hundreds';
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
  /* Year 2: on towards 1000 */
  { name: '0 to 200', lo: 0, hi: 200, tick: 10, labels: [0, 100, 200], ask: 'any', near: 8 },
  { name: '0 to 1000 in hundreds', lo: 0, hi: 1000, tick: 100, labels: [0, 500, 1000], ask: 'hundreds', near: 0 },
  { name: '0 to 1000', lo: 0, hi: 1000, tick: 100, labels: [0, 500, 1000], ask: 'tens', near: 40 },
];

export function lineQuestion(step: LineStep, last?: number): number {
  const pool = every(step.lo, step.hi, step.ask === 'hundreds' ? 100 : step.ask === 'tens' ? 10 : 1)
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
  /** dice spots, a ten frame, two dice side by side, or rows and columns
      (an array, Year 2) */
  look: 'dice' | 'frame' | 'two-dice' | 'array';
  /** how long it shows, in ms */
  ms: number;
}

export const FLASH_STEPS: FlashStep[] = [
  { name: 'Dice to 5', max: 5, look: 'dice', ms: 2000 },
  { name: 'Dice to 6, quicker', max: 6, look: 'dice', ms: 1400 },
  { name: 'Ten frame', max: 10, look: 'frame', ms: 2200 },
  { name: 'Ten frame, quicker', max: 10, look: 'frame', ms: 1500 },
  { name: 'Two dice', max: 12, look: 'two-dice', ms: 2400 },
  /* Year 2: rows and columns, seen as "3 rows of 4" rather than counted */
  { name: 'Rows of dots', max: 15, look: 'array', ms: 3000 },
  { name: 'Bigger rows of dots', max: 25, look: 'array', ms: 3000 },
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

export interface FlashQuestion {
  n: number;
  /** for two dice, each die; for an array, its rows and then its columns */
  parts: number[];
}

/** the smallest number a step can show */
export const flashLowest = (step: FlashStep): number =>
  step.look === 'array' ? 4 : step.look === 'two-dice' ? 2 : 1;

export function flashQuestion(step: FlashStep, last?: number): FlashQuestion {
  if (step.look === 'array') {
    /* at least two rows and two columns, at most five of each */
    for (;;) {
      const rows = rand(2, 5);
      const cols = rand(2, 5);
      const n = rows * cols;
      if (n <= step.max && n !== last) return { n, parts: [rows, cols] };
    }
  }
  const lo = flashLowest(step);
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

/* ── Team Buses: tens and ones, then hundreds ────────────────────────── */

export interface BusStep extends Step {
  /**
   * read: how many fans are there, in full buses and loose ones;
   * load: a crowd of fans, how many full buses and how many left over;
   * build: make the number from trains of 100, buses of 10 and fans;
   * another: the same number another way, when a bus breaks down
   * (3 tens and 4 is 2 tens and 14).
   */
  task: 'read' | 'load' | 'build' | 'another';
  lo: number;
  hi: number;
  /** trains of 100 as well as buses of 10 (Year 2) */
  trains: boolean;
}

export const BUS_STEPS: BusStep[] = [
  { name: 'A full bus and some more', task: 'read', lo: 11, hi: 19, trains: false },
  { name: 'Buses and fans to 50', task: 'read', lo: 20, hi: 50, trains: false },
  { name: 'Load the buses', task: 'load', lo: 21, hi: 99, trains: false },
  { name: 'Buses and fans to 120', task: 'read', lo: 51, hi: 120, trains: false },
  /* Year 2: hundreds, and numbers made more than one way */
  { name: 'Trains of 100', task: 'read', lo: 101, hi: 999, trains: true },
  { name: 'Build the crowd', task: 'build', lo: 101, hi: 999, trains: true },
  { name: 'A bus breaks down', task: 'another', lo: 21, hi: 99, trains: false },
];

export interface Places { hundreds: number; tens: number; ones: number }

/** a number as hundreds, tens and ones; without trains, 112 is 11 tens and 2 */
export function places(n: number, trains = true): Places {
  const hundreds = trains ? Math.floor(n / 100) : 0;
  return { hundreds, tens: Math.floor((n - hundreds * 100) / 10), ones: n % 10 };
}

export const valueOf = (p: Places): number => p.hundreds * 100 + p.tens * 10 + p.ones;

export function busQuestion(step: BusStep, last?: number): number {
  for (;;) {
    const n = rand(step.lo, step.hi);
    if (n === last) continue;
    /* a bus can only break down if there are two, and loose fans to join */
    if (step.task === 'another' && (n % 10 === 0 || n < 20)) continue;
    /* loading needs fans left over half the time at least; a whole number of
       buses is a fine question, but not every time */
    if (step.task === 'load' && n % 10 === 0 && Math.random() < 0.7) continue;
    return n;
  }
}

/**
 * Four numbers to choose from for a number read from tens and ones. The
 * wrong ones are the place-value slips: a ten (or a hundred) out, the tens
 * and ones digits swapped (16 for 61), and only then a miscount by one.
 */
export function placeChoices(n: number, top: number): number[] {
  const p = places(n);
  const swapped = p.hundreds * 100 + p.ones * 10 + p.tens;
  const slips = shuffle([n + 10, n - 10, swapped, ...(top > 200 ? [n + 100, n - 100] : [])]);
  const out = [n];
  for (const x of [...slips, ...shuffle([n + 1, n - 1]), n + 2, n - 2]) {
    if (out.length >= 4) break;
    if (x >= 1 && x <= top && !out.includes(x)) out.push(x);
  }
  return out.sort((a, b) => a - b);
}

/** for "a bus breaks down": the loose fans now, and the slips — forgetting
    the bus's ten, or counting them as one */
export function anotherChoices(ones: number): number[] {
  const answer = ones + 10;
  const out = [answer];
  for (const x of [ones, ones + 1, answer + 1, answer - 1, answer + 10]) {
    if (out.length >= 4) break;
    if (x >= 0 && !out.includes(x)) out.push(x);
  }
  return out.sort((a, b) => a - b);
}

/* ── Keepy-Uppy Count: counting on, back, and in steps ───────────────── */

export interface SkipStep extends Step {
  /** the step each bounce goes up (or down) by; one is picked per question */
  by: number[];
  /** where the counting starts: from 0 (and its multiples), any number, or
      an odd number (counting the odd numbers) */
  from: 'zero' | 'any' | 'odd';
  dir: 1 | -1;
  /** the biggest number said */
  max: number;
}

export const SKIP_STEPS: SkipStep[] = [
  { name: 'Count on in ones', by: [1], from: 'any', dir: 1, max: 30 },
  { name: 'Count back in ones', by: [1], from: 'any', dir: -1, max: 30 },
  { name: 'Count by 10s', by: [10], from: 'zero', dir: 1, max: 100 },
  { name: 'Count by 5s', by: [5], from: 'zero', dir: 1, max: 60 },
  { name: 'Count by 2s', by: [2], from: 'zero', dir: 1, max: 30 },
  /* Year 2: from any number, odd numbers, threes, and backwards in steps */
  { name: 'By 10s from any number', by: [10], from: 'any', dir: 1, max: 120 },
  { name: 'Odd numbers', by: [2], from: 'odd', dir: 1, max: 41 },
  { name: 'Count by 3s', by: [3], from: 'zero', dir: 1, max: 36 },
  { name: 'Back in 10s and 5s', by: [10, 5], from: 'any', dir: -1, max: 120 },
];

/** how many numbers each keepy-uppy shows */
export const BOUNCES = 6;

export interface SkipQuestion { seq: number[]; gap: number; by: number }

export function skipQuestion(step: SkipStep, last?: SkipQuestion): SkipQuestion {
  for (;;) {
    const by = pick(step.by);
    const span = by * (BOUNCES - 1);
    let first: number;
    if (step.from === 'zero') first = by * rand(0, Math.floor((step.max - span) / by));
    else if (step.from === 'odd') first = 2 * rand(0, Math.floor((step.max - span - 1) / 2)) + 1;
    else {
      first = rand(step.dir === 1 ? 1 : span + 1, step.dir === 1 ? step.max - span : step.max);
      /* "from any number" in tens means not from a ten, or it is just counting by 10s */
      if (by >= 5 && first % by === 0) continue;
    }
    const seq = Array.from({ length: BOUNCES }, (_, i) => first + step.dir * by * i);
    /* never the first two: he needs to hear the pattern before the gap */
    const gap = rand(2, BOUNCES - 1);
    if (last && last.seq[0] === seq[0] && last.by === by) continue;
    return { seq, gap, by };
  }
}

/** the gap's number and the slips: one off, and a step too far either way */
export function skipChoices(q: SkipQuestion): number[] {
  const answer = q.seq[q.gap];
  const out = [answer];
  for (const x of shuffle([answer + 1, answer - 1, answer + q.by, answer - q.by]).concat(answer + 2, answer - 2, answer + 2 * q.by)) {
    if (out.length >= 4) break;
    if (x >= 0 && !out.includes(x)) out.push(x);
  }
  return out.sort((a, b) => a - b);
}

/* ── Training Drills: equal groups, sharing, rows ────────────────────── */

export interface DrillStep extends Step {
  /**
   * groups: so many hoops with so many balls in each, how many balls;
   * share: so many balls shared fairly between the hoops, how many in each;
   * rows: cones set out in rows and columns, how many cones (an array);
   * make-rows: so many cones put out in rows of so many, how many rows.
   */
  task: 'groups' | 'share' | 'rows' | 'make-rows';
  /** how many groups (or rows), least and most */
  groups: [number, number];
  /** how many in each group (or row): one of these */
  each: number[];
  /** teams of players rather than hoops of balls */
  teams?: boolean;
}

export const DRILL_STEPS: DrillStep[] = [
  { name: 'Equal groups', task: 'groups', groups: [2, 4], each: [1, 2, 3, 4, 5] },
  { name: 'Share the balls', task: 'share', groups: [2, 4], each: [1, 2, 3, 4, 5] },
  /* Year 2: arrays, groups of 2, 5 and 10, and grouping as early division */
  { name: 'Rows of cones', task: 'rows', groups: [2, 5], each: [2, 3, 4, 5] },
  { name: 'Teams of 2, 5 and 10', task: 'groups', groups: [2, 6], each: [2, 5, 10], teams: true },
  { name: 'Cones into rows', task: 'make-rows', groups: [2, 5], each: [2, 3, 4, 5] },
];

export interface DrillQuestion { groups: number; each: number; total: number; answer: number }

export function drillQuestion(step: DrillStep, last?: DrillQuestion): DrillQuestion {
  for (;;) {
    const groups = rand(step.groups[0], step.groups[1]);
    const each = pick(step.each);
    /* one in each group is no question for sharing or grouping */
    if ((step.task === 'share' || step.task === 'make-rows') && each === 1) continue;
    if (last && last.groups === groups && last.each === each) continue;
    const total = groups * each;
    const answer = step.task === 'share' ? each : step.task === 'make-rows' ? groups : total;
    return { groups, each, total, answer };
  }
}

/** the answer and the slips: adding the two numbers instead of grouping,
    a group too many or too few, and one off */
export function drillChoices(step: DrillStep, q: DrillQuestion): number[] {
  const unit = step.task === 'share' || step.task === 'make-rows' ? 1 : q.each;
  /* the telling slip always: adding (3 hoops of 4 is 7), or giving the
     number of hoops (or the row length) as the answer */
  const telling = step.task === 'share' ? q.groups : step.task === 'make-rows' ? q.each : q.groups + q.each;
  const slips = step.task === 'share' || step.task === 'make-rows'
    ? [q.answer + 1, q.answer - 1, q.answer + 2]
    : [q.answer + unit, q.answer - unit, q.answer + 1, q.answer - 1];
  const out = [q.answer];
  for (const x of [telling, ...shuffle(slips), q.answer + 2 * unit, q.answer + 2, q.answer + 3]) {
    if (out.length >= 4) break;
    if (x >= 1 && !out.includes(x)) out.push(x);
  }
  return out.sort((a, b) => a - b);
}

/* ── Half-Time Oranges: halves, then quarters and eighths ────────────── */

export type Fraction = 2 | 4 | 8;

export const FRACTION_NAME: Record<Fraction, string> = { 2: 'half', 4: 'quarter', 8: 'eighth' };
export const FRACTION_PLURAL: Record<Fraction, string> = { 2: 'halves', 4: 'quarters', 8: 'eighths' };

export interface FractionStep extends Step {
  /**
   * fair: is this cut into halves (or quarters)? yes or no;
   * part-of: half (or a quarter, an eighth) of a group of bibs;
   * name: a piece of a cut orange, what is it called?
   */
  task: 'fair' | 'part-of' | 'name';
  parts: Fraction[];
}

export const FRACTION_STEPS: FractionStep[] = [
  { name: 'Halves or not?', task: 'fair', parts: [2] },
  { name: 'Half of the bibs', task: 'part-of', parts: [2] },
  /* Year 2: quarters and eighths, of a shape and of a group */
  { name: 'Halves, quarters, eighths', task: 'name', parts: [2, 4, 8] },
  { name: 'Quarters or not?', task: 'fair', parts: [4] },
  { name: 'A quarter of the bibs', task: 'part-of', parts: [4] },
  { name: 'Quarters and eighths of the bibs', task: 'part-of', parts: [4, 8] },
];

export interface FractionQuestion {
  /** an orange (a circle) or the pitch (a rectangle) */
  shape: 'orange' | 'pitch';
  parts: Fraction;
  /** for fair: are the pieces the same size? */
  fair: boolean;
  /** for part-of: how many bibs, and the answer */
  total: number;
  answer: number;
}

export function fractionQuestion(step: FractionStep, last?: FractionQuestion): FractionQuestion {
  for (;;) {
    const parts = pick(step.parts);
    const shape = pick(['orange', 'pitch'] as const);
    const fair = Math.random() < 0.5;
    /* bibs: an even number to 20 for halves, to 40 for quarters and eighths */
    const most = parts === 2 ? 10 : 5;
    const total = parts * rand(1, most);
    const answer = step.task === 'part-of' ? total / parts : parts;
    const q = { shape, parts, fair, total, answer };
    if (last && last.total === q.total && last.parts === q.parts && last.fair === q.fair && last.shape === q.shape) continue;
    return q;
  }
}

/* ── Jump Line: adding and taking away as jumps on a number line ─────── */

export interface JumpStep extends Step {
  op: '+' | '-';
  /** the line runs from 0 to this */
  top: 10 | 20 | 100;
  /** tens jumps as well as ones (Year 2) */
  tens: boolean;
  /** how the second number is made: a few ones, whole tens, or tens and ones */
  b: 'ones' | 'tens' | 'tens-ones';
}

export const JUMP_STEPS: JumpStep[] = [
  { name: 'Jump on to 10', op: '+', top: 10, tens: false, b: 'ones' },
  { name: 'Jump back in 10', op: '-', top: 10, tens: false, b: 'ones' },
  { name: 'Jump on to 20', op: '+', top: 20, tens: false, b: 'ones' },
  { name: 'Jump back in 20', op: '-', top: 20, tens: false, b: 'ones' },
  /* Year 2: within 100, jumping a ten at a time */
  { name: 'Jump on in tens', op: '+', top: 100, tens: true, b: 'tens' },
  { name: 'Tens and ones to 100', op: '+', top: 100, tens: true, b: 'tens-ones' },
  { name: 'Jump back in tens and ones', op: '-', top: 100, tens: true, b: 'tens-ones' },
];

export interface JumpQuestion { a: number; b: number; op: '+' | '-'; answer: number }

export function jumpQuestion(step: JumpStep, last?: JumpQuestion): JumpQuestion {
  for (;;) {
    let a: number;
    let b: number;
    if (step.b === 'ones') {
      /* to 10, at most 5 jumps; to 20, up to 9 */
      b = rand(step.top === 10 ? 1 : 2, step.top === 10 ? 5 : 9);
      a = step.op === '+' ? rand(step.top === 10 ? 0 : 5, step.top - b) : rand(Math.max(b + 1, step.top === 10 ? 2 : 10), step.top);
    } else if (step.b === 'tens') {
      b = 10 * rand(1, 4);
      a = rand(1, 99 - b);
      if (a % 10 === 0) continue;
    } else {
      b = rand(11, 39);
      if (b % 10 === 0) continue;
      a = step.op === '+' ? rand(11, 99 - b) : rand(b + 1, 99);
      if (a % 10 === 0) continue;
    }
    const answer = step.op === '+' ? a + b : a - b;
    if (answer < 0 || answer > step.top) continue;
    if (last && last.a === a && last.b === b) continue;
    return { a, b, op: step.op, answer };
  }
}

/** the jumps that get there the Year 2 way: the tens of b, then its ones */
export function jumpsFor(q: JumpQuestion, tens: boolean): number[] {
  const sign = q.op === '+' ? 1 : -1;
  const big = tens ? Math.floor(q.b / 10) : 0;
  const small = tens ? q.b % 10 : q.b;
  return [...Array.from({ length: big }, () => sign * 10), ...Array.from({ length: small }, () => sign)];
}

/* ── Match Clock: telling the time, days, months and seasons ─────────── */

export interface ClockStep extends Step {
  /**
   * read: what time does the clock say; set: put the hands on a time;
   * days / months: the day (or month) before or after; seasons: which
   * season a month is in, in Australia.
   */
  task: 'read' | 'set' | 'days' | 'months' | 'seasons';
  /** the minutes a time can have */
  minutes: (0 | 15 | 30 | 45)[];
}

export const CLOCK_STEPS: ClockStep[] = [
  { name: "O'clock", task: 'read', minutes: [0] },
  { name: 'Half past', task: 'read', minutes: [0, 30] },
  { name: 'Set the clock', task: 'set', minutes: [0, 30] },
  { name: 'Days of the week', task: 'days', minutes: [] },
  /* Year 2: quarter past and quarter to, months and seasons */
  { name: 'Quarter past, quarter to', task: 'read', minutes: [15, 45] },
  { name: 'Set quarter times', task: 'set', minutes: [0, 15, 30, 45] },
  { name: 'Months of the year', task: 'months', minutes: [] },
  { name: 'Seasons', task: 'seasons', minutes: [] },
];

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** the seasons in Australia, by month: summer is December to February */
export const SEASONS = ['Summer', 'Autumn', 'Winter', 'Spring'];
export const seasonOf = (month: number): string => SEASONS[Math.floor(((month + 1) % 12) / 3)];

/** a time in words, the way it is said: "half past 3", "quarter to 4" */
export function timeWords(h: number, m: number): string {
  const next = (h % 12) + 1;
  if (m === 0) return `${h} o'clock`;
  if (m === 15) return `quarter past ${h}`;
  if (m === 30) return `half past ${h}`;
  return `quarter to ${next}`;
}

export interface ClockQuestion {
  h: number;
  m: 0 | 15 | 30 | 45;
  /** for days and months: which one, and before or after */
  index: number;
  after: boolean;
  /** the answer as its button says it */
  answer: string;
  options: string[];
}

export function clockQuestion(step: ClockStep, last?: ClockQuestion): ClockQuestion {
  for (;;) {
    const h = rand(1, 12);
    const m = step.minutes.length ? pick(step.minutes) : 0;
    const after = Math.random() < 0.5;
    let index = 0;
    let answer: string;
    let options: string[];
    if (step.task === 'read' || step.task === 'set') {
      answer = timeWords(h, m);
      /* the slips: the hour on the wrong side (half past 4 for half past 3),
         and the other way of saying the minutes */
      const wrongHour = timeWords((h % 12) + 1, m);
      const before = timeWords(h === 1 ? 12 : h - 1, m);
      const otherMinutes = step.minutes.filter((x) => x !== m).map((x) => timeWords(h, x));
      /* and reading the minute hand as the hour: 12 o'clock for 3 o'clock */
      const swapped = `${m === 0 ? 12 : m / 5} o'clock`;
      options = [answer, ...shuffle([wrongHour, before, ...otherMinutes]).slice(0, 2), swapped];
    } else if (step.task === 'days') {
      index = rand(0, 6);
      answer = DAYS[(index + (after ? 1 : 6)) % 7];
      options = [answer, DAYS[(index + (after ? 6 : 1)) % 7], DAYS[index], DAYS[(index + (after ? 2 : 5)) % 7]];
    } else if (step.task === 'months') {
      index = rand(0, 11);
      answer = MONTHS[(index + (after ? 1 : 11)) % 12];
      options = [answer, MONTHS[(index + (after ? 11 : 1)) % 12], MONTHS[index], MONTHS[(index + (after ? 2 : 10)) % 12]];
    } else {
      index = rand(0, 11);
      answer = seasonOf(index);
      options = [...SEASONS];
    }
    const q: ClockQuestion = { h, m, index, after, answer, options: [...new Set(options)] };
    if (last && last.answer === q.answer && last.index === q.index) continue;
    /* the seasons keep their order round the year; everything else shuffles */
    return step.task === 'seasons' ? q : { ...q, options: shuffle(q.options) };
  }
}

/* ── Fan Survey: counting, tallies and graphs ────────────────────────── */

export interface SurveyStep extends Step {
  /**
   * count: fans waving flags, how many for one team;
   * tally: tally marks for each team, how many for one;
   * most: a picture graph, which team got the most;
   * column: a column graph, how many for one team;
   * more: a column graph, how many more for one team than another.
   */
  task: 'count' | 'tally' | 'most' | 'column' | 'more';
  /** how many teams were voted for */
  teams: number;
  /** the most votes a team can get */
  max: number;
}

export const SURVEY_STEPS: SurveyStep[] = [
  { name: 'Count the fans', task: 'count', teams: 3, max: 6 },
  { name: 'Tally marks', task: 'tally', teams: 3, max: 12 },
  { name: 'Picture graph', task: 'most', teams: 3, max: 8 },
  /* Year 2: column graphs, and comparing */
  { name: 'Column graph', task: 'column', teams: 4, max: 10 },
  { name: 'How many more?', task: 'more', teams: 4, max: 10 },
];

export interface SurveyQuestion {
  /** votes for each team, all different so there is one most */
  votes: number[];
  /** the team asked about */
  team: number;
  /** for "how many more": the team compared with, which got fewer */
  other: number;
  answer: number;
}

export function surveyQuestion(step: SurveyStep, last?: SurveyQuestion): SurveyQuestion {
  for (;;) {
    const votes = shuffle(Array.from({ length: step.max }, (_, i) => i + 1)).slice(0, step.teams);
    const team = rand(0, step.teams - 1);
    const most = votes.indexOf(Math.max(...votes));
    let other = team;
    let answer: number;
    if (step.task === 'most') answer = most;
    else if (step.task === 'more') {
      const fewer = votes.map((_, i) => i).filter((i) => votes[i] < votes[team]);
      if (!fewer.length) continue;
      other = pick(fewer);
      answer = votes[team] - votes[other];
    } else answer = votes[team];
    if (last && last.votes.join() === votes.join()) continue;
    return { votes, team, other, answer };
  }
}

/* ── Fact Family Formation: adding and taking away undo each other ──── */

export interface FactStep extends Step {
  /**
   * turnaround: 3 + 5 = 8, so 5 + 3 = ?;
   * take: 3 + 5 = 8, so 8 − 5 = ?;
   * any: one fact known, any other fact of the family asked;
   * missing: a number missing from the middle of a fact (? + 5 = 8).
   */
  kind: 'turnaround' | 'take' | 'any' | 'missing';
  max: 10 | 20 | 100;
  /** whole tens only (Year 2, to 100) */
  tens?: boolean;
}

export const FACT_STEPS: FactStep[] = [
  { name: 'Turnarounds', kind: 'turnaround', max: 10 },
  { name: 'Take it back', kind: 'take', max: 10 },
  { name: 'Families to 20', kind: 'any', max: 20 },
  /* Year 2: missing numbers, and families of tens to 100 */
  { name: 'Missing numbers', kind: 'missing', max: 20 },
  { name: 'Families of tens', kind: 'any', max: 100, tens: true },
  { name: 'Missing tens', kind: 'missing', max: 100, tens: true },
];

/** a fact as its three numbers: a + b = whole, or whole − a = b */
export interface Fact { op: '+' | '-'; x: number; y: number; z: number }

export interface FactQuestion {
  a: number;
  b: number;
  whole: number;
  /** the fact he is told, if any */
  known?: Fact;
  /** the fact he finishes, and which of its three places is the gap */
  asked: Fact;
  gap: 0 | 1 | 2;
  answer: number;
}

/** the four facts of a family */
export const family = (a: number, b: number): Fact[] => [
  { op: '+', x: a, y: b, z: a + b },
  { op: '+', x: b, y: a, z: a + b },
  { op: '-', x: a + b, y: a, z: b },
  { op: '-', x: a + b, y: b, z: a },
];

export const factText = (f: Fact, gap?: number): string =>
  [f.x, f.op === '+' ? '+' : '−', f.y, '=', f.z].map((v, i) => (i === [0, 2, 4][gap ?? -1] ? '?' : String(v))).join(' ');

export function factQuestion(step: FactStep, last?: FactQuestion): FactQuestion {
  for (;;) {
    const unit = step.tens ? 10 : 1;
    const whole = unit * rand(step.tens ? 3 : 3, step.max / unit);
    const a = unit * rand(1, whole / unit - 1);
    const b = whole - a;
    /* a double has only two facts, and a turnaround of it is no question */
    if (a === b) continue;
    const facts = family(a, b);
    let known: Fact | undefined = facts[0];
    let asked: Fact;
    let gap: 0 | 1 | 2 = 2;
    if (step.kind === 'turnaround') asked = facts[1];
    else if (step.kind === 'take') asked = pick([facts[2], facts[3]]);
    else if (step.kind === 'any') asked = pick(facts.slice(1));
    else {
      known = undefined;
      asked = pick(facts);
      gap = pick([0, 1] as const);
    }
    const answer = [asked.x, asked.y, asked.z][gap];
    if (last && last.whole === whole && last.a === a && last.answer === answer) continue;
    return { a, b, whole, known, asked, gap, answer };
  }
}
