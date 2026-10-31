/* The maths: every question the maths games ask, and the levels they climb.
 *
 * Built from the NSW Mathematics K–10 syllabus (2022), Kindergarten (Early
 * Stage 1) to Year 2 (the end of Stage 1):
 *
 *   Off the Bench        part–whole: the pairs that make 5, 10 and 20, then
 *                        filling a stadium of 100 (Year 2), then one of 1000,
 *                        ten stands of 100 (Years 3–4)
 *   Scoreboard Sums      combining and separating quantities within 20, then
 *                        within 100 by tens and ones (Year 2)
 *   Number Line Penalty  where numbers sit, from 0–10 up to 0–120, then on to
 *                        0–1000 (Year 2), then 0–10 000, rounding to the
 *                        nearest ten and hundred, and tenths (Years 3–4)
 *   Flash Count          seeing how many at a glance (subitising), then rows
 *                        and columns, the start of multiplying (Year 2), then
 *                        arrays that are times-table facts to 12 × 12 (Years 3–4)
 *   Ice Cream Van        Australian coins: worth more, paying, counting, then
 *                        mixed coins, the exact price and change (Year 2)
 *
 * The Year 2 steps sit at the top of each ladder, so he only meets them by
 * climbing there — or a grown-up starts him there in setup.
 *
 * Times Table Sprint goes further, into Years 3 and 4 (Stage 2): the times
 * tables to 12 × 12, by heart, and the same facts as division.
 *
 * Each game has a short ladder of steps. A round starts on the step he
 * reached last time and moves up after three right in a row, down after two
 * wrong, so the questions stay just hard enough. Everything here is plain
 * functions with no screen, so the unit tests can check every step. */

import { pick, shuffle } from '../lib/random';

export interface Step { name: string }

/** a number as it is written: below zero with a true minus sign, −3 */
export const signed = (n: number): string => (n < 0 ? `−${-n}` : String(n));
/** and as it is said: negative 3 */
export const spokenNumber = (n: number): string => (n < 0 ? `negative ${-n}` : String(n));

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
  target: 5 | 10 | 20 | 100 | 1000;
  spots: boolean;
  /** the fans come in whole rows of ten (Year 2, the stadium) */
  tens?: boolean;
  /** in the stadium of 1000, the fans come in whole stands of 100, whole
      rows of 10, or one by one (Years 3–4) */
  unit?: 1 | 10 | 100;
}

export const BENCH_STEPS: BenchStep[] = [
  { name: 'Make 5', target: 5, spots: true },
  { name: 'Make 10', target: 10, spots: true },
  { name: 'Make 10, no gaps shown', target: 10, spots: false },
  { name: 'Make 20', target: 20, spots: true },
  /* Year 2: a stadium of 100 seats in rows of ten */
  { name: 'Fill 100 in tens', target: 100, spots: true, tens: true },
  { name: 'Fill 100', target: 100, spots: true },
  /* Years 3–4: a stadium of 1000, ten stands of 100 seats */
  { name: 'Fill 1000 in hundreds', target: 1000, spots: true, unit: 100 },
  { name: 'Fill 1000 in tens', target: 1000, spots: true, unit: 10 },
  { name: 'Fill 1000', target: 1000, spots: true, unit: 1 },
];

export interface BenchQuestion { target: number; on: number; need: number }

export function benchQuestion(step: BenchStep, last?: BenchQuestion): BenchQuestion {
  if (step.target === 1000) {
    /* whole stands, whole rows that leave a stand part full, or any number
       that leaves a row part full: each step needs the one before it */
    const unit = step.unit ?? 1;
    for (;;) {
      const on = unit * rand(1, 1000 / unit - 1);
      if (unit === 10 && on % 100 === 0) continue;
      if (unit === 1 && on % 10 === 0) continue;
      if (last && last.on === on) continue;
      return { target: 1000, on, need: 1000 - on };
    }
  }
  /* at least one on and one to come, and not the same as last time */
  const unit = step.tens ? 10 : 1;
  const slots = step.target / unit;
  let on = 1 + Math.floor(Math.random() * (slots - 1));
  if (last && last.target === step.target && last.on === on * unit) on = on === 1 ? 2 : on - 1;
  return { target: step.target, on: on * unit, need: step.target - on * unit };
}

/**
 * How many more fill a stadium of 1000, counted the way it is done in your
 * head: fill up the row of ten, then the stand of a hundred, then count the
 * empty stands. 637 needs 3 to make 640, 60 to make 700, and 300: 363.
 */
export function toThousand(on: number): { ones: number; tens: number; hundreds: number; text: string } {
  const ones = (10 - (on % 10)) % 10;
  const tens = (100 - ((on + ones) % 100)) % 100;
  const hundreds = 1000 - on - ones - tens;
  const steps: string[] = [];
  if (ones) steps.push(`Fill up the row: ${ones} more makes ${on + ones}.`);
  if (tens) {
    const rows = tens / 10;
    steps.push(`Fill up the stand: ${rows} more ${rows === 1 ? 'row of 10 makes' : 'rows of 10 make'} ${on + ones + tens}.`);
  }
  const stands = hundreds / 100;
  if (hundreds) steps.push(`${steps.length ? 'Then ' : ''}${stands} more ${stands === 1 ? 'stand of 100 makes' : 'stands of 100 make'} 1000.`);
  const parts = [ones, tens, hundreds].filter(Boolean);
  if (parts.length > 1) steps.push(`${parts.join(' and ')} make ${1000 - on}.`);
  return { ones, tens, hundreds, text: steps.join(' ') };
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
      balls and loose ones, for numbers to 100), hundreds, tens and ones
      (crates of a hundred too, to 1000), or none */
  show: 'all' | 'second' | 'bundles' | 'blocks' | 'none';
  /**
   * Year 2, within 100: whole tens only (30 + 20), tens and ones that never
   * cross a ten (34 + 25, 58 − 23), or ones that always do (38 + 25, 52 − 27).
   */
  hundred?: 'tens' | 'no-carry' | 'past';
  /**
   * Years 3–4, the crowd at the ground, within 1000 and then 10 000: whole
   * hundreds added to or taken from a number of tens (340 + 200), or to
   * 10 000 two numbers of hundreds (3400 + 2500); numbers that never cross a
   * ten or a hundred (345 + 232, 785 − 342); or ones that do (368 + 257).
   */
  big?: 'round' | 'no-carry' | 'carry';
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
  /* Years 3–4: the crowd at the ground, to 1000 and then 10 000, in his head */
  { name: 'Add and take away hundreds', max: 1000, op: '-', mix: true, show: 'blocks', big: 'round' },
  { name: 'Add to 1000', max: 1000, op: '+', show: 'blocks', big: 'no-carry' },
  { name: 'Take away to 1000', max: 1000, op: '-', show: 'blocks', big: 'no-carry' },
  { name: 'Add past a ten or a hundred', max: 1000, op: '+', show: 'none', big: 'carry' },
  { name: 'Take away past a ten or a hundred', max: 1000, op: '-', show: 'none', big: 'carry' },
  { name: 'Thousands and hundreds, to 10 000', max: 10000, op: '-', mix: true, show: 'none', big: 'round' },
  { name: 'Add and take away to 10 000', max: 10000, op: '-', mix: true, show: 'none', big: 'carry' },
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

/** a number's digits, ones first, to this many places */
const digitsOf = (n: number, places: number): number[] =>
  Array.from({ length: places }, (_, i) => Math.floor(n / 10 ** i) % 10);

/** does working it out cross a ten, a hundred or a thousand: a column of
    digits that adds to more than 9, or takes a bigger digit from a smaller one */
export function crosses(a: number, b: number, op: '+' | '-'): boolean {
  const [da, db] = [digitsOf(a, 4), digitsOf(b, 4)];
  return da.some((d, i) => (op === '+' ? d + db[i] > 9 : d < db[i]));
}

/** a sum to 1000 or 10 000, for the Years 3–4 steps */
function bigSum(kind: NonNullable<SumStep['big']>, op: '+' | '-', max: number): { a: number; b: number } {
  const places = max === 1000 ? 3 : 4;
  const lo = 10 ** (places - 1);
  for (;;) {
    let a: number;
    let b: number;
    if (kind === 'round') {
      /* to 1000: tens and whole hundreds (340 + 200); to 10 000: hundreds (3400 + 2500) */
      const unit = places === 3 ? 10 : 100;
      a = rand(lo / unit + 1, max / unit - 1) * unit;
      b = places === 3 ? rand(1, 8) * 100 : rand(lo / 100 + 1, max / 100 - 10) * 100;
    } else {
      a = rand(lo + 1, max - 1);
      b = rand(lo + 1, max - lo);
      /* a digit of nothing in the second number leaves a step out */
      if (digitsOf(b, places).includes(0)) continue;
    }
    if (op === '+' ? a + b >= max : b >= a) continue;
    if (op === '-' && a - b < (kind === 'round' ? 10 : lo / 10)) continue;
    if (kind !== 'round' && crosses(a, b, op) !== (kind === 'carry')) continue;
    return { a, b };
  }
}

export function sumQuestion(step: SumStep, last?: SumQuestion): SumQuestion {
  for (let tries = 0; tries < 20; tries += 1) {
    const op = step.mix ? pick(['+', '-'] as const) : step.op;
    let a: number;
    let b: number;
    if (step.big) {
      ({ a, b } = bigSum(step.big, op, step.max));
    } else if (step.hundred) {
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

/**
 * The way to work it out in his head: the second number split into its
 * thousands, hundreds, tens and ones, and taken one at a time. 368 and 200
 * is 568, and 50 more is 618, and 7 more is 625.
 */
export function sumWhy(q: SumQuestion): string {
  const n = (v: number): string => lineText(v);
  const parts = digitsOf(q.b, 4).map((d, i) => d * 10 ** i).filter(Boolean).reverse();
  if (parts.length < 2) return q.op === '+' ? `${n(q.a)} and ${n(q.b)} make ${n(q.answer)}.` : `${n(q.a)} take away ${n(q.b)} is ${n(q.answer)}.`;
  let at = q.a;
  return `${parts.map((p, i) => {
    at = q.op === '+' ? at + p : at - p;
    if (i === 0) return `${n(q.a)} ${q.op === '+' ? 'and' : 'take away'} ${n(p)} is ${n(at)}`;
    return q.op === '+' ? `and ${n(p)} more is ${n(at)}` : `take away ${n(p)} more is ${n(at)}`;
  }).join(', ')}.`;
}

/**
 * The answer and three wrong ones, for the Years 3–4 sums: the slip of
 * working each column on its own (forgetting to carry, or taking the smaller
 * digit from the bigger), then a ten or a hundred out, then one.
 */
export function bigSumChoices(q: SumQuestion, max: number): number[] {
  const [da, db] = [digitsOf(q.a, 4), digitsOf(q.b, 4)];
  const columns = da.reduce((sum, d, i) => sum + (q.op === '+' ? (d + db[i]) % 10 : Math.abs(d - db[i])) * 10 ** i, 0);
  /* whole hundreds have only hundred-sized slips */
  const unit = q.a % 100 === 0 && q.b % 100 === 0 ? 100 : q.b % 100 === 0 && q.a % 10 === 0 ? 10 : 1;
  const near = [100, -100, 10, -10, 1000, -1000, 1, -1, 200, -200].filter((d) => Math.abs(d) >= unit);
  const out = [q.answer];
  /* and further off, for an answer near the bottom or the top */
  const far = [3, 4, 5, 6].flatMap((k) => [k, -k]).map((k) => k * Math.max(unit, 10) * (unit === 100 ? 1 : 10));
  for (const x of [columns, ...shuffle(near.slice(0, 4)).map((d) => q.answer + d), ...[...near.slice(4), ...far].map((d) => q.answer + d)]) {
    if (out.length >= 4) break;
    if (x > 0 && x < max && !out.includes(x)) out.push(x);
  }
  return shuffle(out);
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
  ask: 'any' | 'tens' | 'hundreds' | 'thousands';
  /** how far off still counts, for lines too long to have a tick for each number */
  near: number;
  /** tenths: the line counts in tenths, so its numbers are written over this
      (lo 0 and hi 10 with per 10 is the line from 0 to 1) */
  per?: number;
  /** rounding: the line is one ten (or hundred) long, the number is marked
      on it, and he kicks to the end it is nearer */
  round?: 10 | 100;
  /** the line goes on past zero, and what is asked is always below it */
  below?: boolean;
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
  /* Years 3–4: to 10 000, rounding, and tenths */
  { name: '0 to 10 000 in thousands', lo: 0, hi: 10000, tick: 1000, labels: [0, 5000, 10000], ask: 'thousands', near: 0 },
  { name: '0 to 10 000', lo: 0, hi: 10000, tick: 1000, labels: [0, 5000, 10000], ask: 'hundreds', near: 400 },
  { name: 'Nearest ten', lo: 0, hi: 100, tick: 1, labels: [0, 100], ask: 'any', near: 0, round: 10 },
  { name: 'Nearest hundred', lo: 0, hi: 1000, tick: 10, labels: [0, 1000], ask: 'any', near: 0, round: 100 },
  { name: '0 to 1 in tenths', lo: 0, hi: 10, tick: 1, labels: [0, 5, 10], ask: 'any', near: 0, per: 10 },
  { name: '0 to 2 in tenths', lo: 0, hi: 20, tick: 1, labels: [0, 10, 20], ask: 'any', near: 0, per: 10 },
  /* below zero: negative numbers, which NSW leaves to Stage 3 (Year 6) but
     he already understands, so they sit at the very top */
  { name: '−10 to 10', lo: -10, hi: 10, tick: 1, labels: [-10, -5, 0, 5, 10], ask: 'any', near: 0, below: true },
  { name: '−20 to 20', lo: -20, hi: 20, tick: 1, labels: [-20, -10, 0, 10, 20], ask: 'any', near: 1, below: true },
];

/** a number as it is written on the line: 7 tenths is 0.7, and 10 000 has a space */
export function lineText(v: number, per = 1): string {
  if (v < 0) return `−${lineText(-v, per)}`;
  if (per !== 1) return String(Math.round((v / per) * 1000) / 1000);
  return v >= 10000 ? `${Math.floor(v / 1000)} ${String(v % 1000).padStart(3, '0')}` : String(v);
}

export function lineQuestion(step: LineStep, last?: number): number {
  const by = step.ask === 'thousands' ? 1000 : step.ask === 'hundreds' ? 100 : step.ask === 'tens' ? 10 : 1;
  const pool = every(step.lo, step.hi, by)
    /* a number written under the line is no question at all */
    .filter((n) => !step.labels.includes(n) && n !== last && (!step.below || n < 0));
  return pick(pool.length ? pool : every(step.lo, step.hi, step.tick));
}

/** the number a tap stands for: the nearest tick where there is one per number */
export function valueAt(step: LineStep, fraction: number): number {
  const raw = step.lo + Math.min(1, Math.max(0, fraction)) * (step.hi - step.lo);
  return step.near ? Math.round(raw) : Math.round(raw / step.tick) * step.tick;
}

export const onTarget = (step: LineStep, asked: number, tapped: number): boolean =>
  Math.abs(asked - tapped) <= step.near;

/** a rounding question: the stretch of line it is on, the number, and the end it rounds to */
export interface RoundQuestion { lo: number; hi: number; tick: number; n: number; answer: number }

/**
 * A number to round, never one exactly halfway (45 is a rule to learn, not
 * a distance to see) and never one that is already a ten or a hundred.
 */
export function roundQuestion(step: LineStep, last?: number): RoundQuestion {
  const r = step.round ?? 10;
  for (;;) {
    /* 11 to 99 for tens, 101 to 999 for hundreds */
    const n = rand(r + 1, r * 10 - 1);
    if (n % r === 0 || n % r === r / 2 || n === last) continue;
    /* the hundreds want a ones digit too, so it is never a whole ten */
    if (r === 100 && n % 10 === 0) continue;
    const lo = Math.floor(n / r) * r;
    return { lo, hi: lo + r, tick: r / 10, n, answer: n - lo < r / 2 ? lo : lo + r };
  }
}

/** a kick on a rounding question scores on the half of the line nearer the answer */
export const roundOnTarget = (q: RoundQuestion, tapped: number): boolean =>
  Math.abs(tapped - q.answer) < Math.abs(tapped - (q.answer === q.lo ? q.hi : q.lo));

/** why: how far it is from each end */
export function roundWhy(q: RoundQuestion): string {
  /* the nearer end first: that is the one he is looking for */
  const other = q.answer === q.lo ? q.hi : q.lo;
  return `${q.n} is ${Math.abs(q.n - q.answer)} from ${q.answer} and ${Math.abs(q.n - other)} from ${other}, so it is nearer ${q.answer}.`;
}

/* ── Flash Count: how many did you see? ──────────────────────────────── */

export interface FlashStep extends Step {
  max: number;
  /** dice spots, a ten frame, two dice side by side, rows and columns (an
      array, Year 2), or an array that is a times-table fact (Years 3–4) */
  look: 'dice' | 'frame' | 'two-dice' | 'array' | 'facts';
  /** how long it shows, in ms */
  ms: number;
  /** for a times-table array: the dots in a row, and the most rows */
  tables?: number[];
  rowsTo?: number;
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
  /* Years 3–4: arrays that are times-table facts, drawn in blocks of five so
     7 rows reads as 5 and 2 more, the way a ten frame is read */
  { name: 'Rows of 2, 5 and 10', max: 100, look: 'facts', ms: 4000, tables: [2, 5, 10], rowsTo: 10 },
  { name: 'Rows of 3 and 4', max: 48, look: 'facts', ms: 4000, tables: [3, 4], rowsTo: 12 },
  { name: 'Rows of 6, 7, 8 and 9', max: 108, look: 'facts', ms: 4500, tables: [6, 7, 8, 9], rowsTo: 12 },
  { name: 'Any rows, to 12 × 12', max: 144, look: 'facts', ms: 5000, tables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], rowsTo: 12 },
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
  step.look === 'array' || step.look === 'facts' ? 4 : step.look === 'two-dice' ? 2 : 1;

export function flashQuestion(step: FlashStep, last?: number): FlashQuestion {
  if (step.look === 'facts') {
    /* a times-table fact: rows of one of the step's tables, two rows or more */
    for (;;) {
      const cols = pick(step.tables ?? [2]);
      const rows = rand(2, step.rowsTo ?? 10);
      const n = rows * cols;
      if (n !== last) return { n, parts: [rows, cols] };
    }
  }
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

/**
 * The numbers to choose from for a times-table array: the answer and the
 * slips a child makes with one, a row too few or too many, or a column, so
 * telling them apart means knowing the fact rather than guessing near it.
 */
export function factChoices(rows: number, cols: number): number[] {
  const answer = rows * cols;
  const near = [...shuffle([(rows - 1) * cols, (rows + 1) * cols]), ...shuffle([rows * (cols - 1), rows * (cols + 1)]),
    (rows - 2) * cols, (rows + 2) * cols];
  const out = [answer];
  for (const x of near) if (out.length < 4 && x > 0 && !out.includes(x)) out.push(x);
  return out.sort((a, b) => a - b);
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
   * (3 tens and 4 is 2 tens and 14);
   * regroup: the same again with bigger numbers (Years 3–4): with no trains,
   * how many buses carry 350 (35); with no plane, how many trains carry
   * 1250 (12, and 5 buses).
   */
  task: 'read' | 'load' | 'build' | 'another' | 'regroup';
  lo: number;
  hi: number;
  /** trains of 100 as well as buses of 10 (Year 2) */
  trains: boolean;
  /** planes of 1000 as well (Years 3–4) */
  planes?: boolean;
  /** regroup: everyone goes by bus (10) or by train (100) */
  unit?: 10 | 100;
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
  /* Years 3–4: planes of 1000, and a number made more than one way */
  { name: 'Planes of 1000', task: 'read', lo: 1001, hi: 9999, trains: true, planes: true },
  { name: 'Build the crowd to 10 000', task: 'build', lo: 1001, hi: 9999, trains: true, planes: true },
  /* small enough to see every bus (up to 29) and train (up to 19) */
  { name: 'No trains: everyone by bus', task: 'regroup', lo: 110, hi: 290, trains: true, unit: 10 },
  { name: 'No plane: everyone by train', task: 'regroup', lo: 1100, hi: 1990, trains: true, planes: true, unit: 100 },
];

export interface Places { thousands?: number; hundreds: number; tens: number; ones: number }

/** a number as hundreds, tens and ones; without trains, 112 is 11 tens and 2;
    with planes, thousands too */
export function places(n: number, trains = true, planes = false): Places {
  const thousands = planes ? Math.floor(n / 1000) : 0;
  const hundreds = trains ? Math.floor((n - thousands * 1000) / 100) : 0;
  const p: Places = { hundreds, tens: Math.floor((n - thousands * 1000 - hundreds * 100) / 10), ones: n % 10 };
  return planes ? { thousands, ...p } : p;
}

export const valueOf = (p: Places): number => (p.thousands ?? 0) * 1000 + p.hundreds * 100 + p.tens * 10 + p.ones;

/**
 * The choices for "how many buses (or trains)": the answer, then the slip of
 * reading only one digit (5 buses for 350, 2 trains for 1250), then one or
 * ten out.
 */
export function regroupChoices(n: number, unit: 10 | 100): number[] {
  const answer = Math.floor(n / unit);
  const out = [answer];
  for (const x of [answer % 10, answer + 1, answer - 1, answer + 10, answer - 10, answer + 2]) {
    if (out.length >= 4) break;
    if (x >= 1 && !out.includes(x)) out.push(x);
  }
  return out.sort((a, b) => a - b);
}

export function busQuestion(step: BusStep, last?: number): number {
  for (;;) {
    const n = rand(step.lo, step.hi);
    if (n === last) continue;
    /* a bus can only break down if there are two, and loose fans to join */
    if (step.task === 'another' && (n % 10 === 0 || n < 20)) continue;
    /* loading needs fans left over half the time at least; a whole number of
       buses is a fine question, but not every time */
    if (step.task === 'load' && n % 10 === 0 && Math.random() < 0.7) continue;
    /* regrouping: a whole number of buses, with some in each place, so the
       digit alone is the wrong answer: 350, 1250 */
    if (step.task === 'regroup') {
      if (n % 10 !== 0 || Math.floor(n / 10) % 10 === 0 || Math.floor(n / 100) % 10 === 0) continue;
    }
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
  const slips = shuffle([n + 10, n - 10, swapped, ...(top > 200 ? [n + 100, n - 100] : []), ...(top > 2000 ? [n + 1000, n - 1000] : [])]);
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
  /** where the counting starts: from 0 (and its multiples), any number, an
      odd number (counting the odd numbers), or either side of zero so the
      count goes past it (negative numbers) */
  from: 'zero' | 'any' | 'odd' | 'past-zero';
  dir: 1 | -1;
  /** the biggest number said */
  max: number;
  /** a times table (Years 3–4): never past 12 of the step, and the gap
      comes with its fact, 28 is 4 × 7 */
  facts?: boolean;
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
  /* Years 3–4: the counting side of the times tables, up and then back */
  { name: 'Count by 4s', by: [4], from: 'zero', dir: 1, max: 48, facts: true },
  { name: 'Count by 6s and 8s', by: [6, 8], from: 'zero', dir: 1, max: 96, facts: true },
  { name: 'Count by 7s and 9s', by: [7, 9], from: 'zero', dir: 1, max: 108, facts: true },
  { name: 'Back down a times table', by: [3, 4, 6, 7, 8, 9], from: 'zero', dir: -1, max: 108, facts: true },
  /* past zero: negative numbers, which NSW leaves to Stage 3 (Year 6) but he
     already understands, so they sit at the very top. The gap is always
     below zero */
  { name: 'Back past zero', by: [1, 2, 5, 10], from: 'past-zero', dir: -1, max: 50 },
  { name: 'Up from below zero', by: [1, 2, 5, 10], from: 'past-zero', dir: 1, max: 50 },
];

/** how many numbers each keepy-uppy shows */
export const BOUNCES = 6;

export interface SkipQuestion { seq: number[]; gap: number; by: number }

export function skipQuestion(step: SkipStep, last?: SkipQuestion): SkipQuestion {
  for (;;) {
    const by = pick(step.by);
    const span = by * (BOUNCES - 1);
    let first: number;
    if (step.from === 'past-zero') {
      /* zero is one of the touches; going down it comes early so the gap
         can fall after it, going up it comes late so the gap is before it */
      const zero = step.dir === -1 ? rand(1, 3) : rand(3, BOUNCES - 2);
      /* `|| 0` so zero is never −0 */
      const seq = Array.from({ length: BOUNCES }, (_, i) => by * (i - zero) * step.dir || 0);
      const below = seq.flatMap((n, i) => (n < 0 && i >= 2 ? [i] : []));
      const gap = pick(below);
      if (last && last.seq[0] === seq[0] && last.by === by) continue;
      return { seq, gap, by };
    }
    if (step.from === 'zero') {
      /* along the multiples of the step: up from one, or back down to one */
      const top = Math.floor((step.facts ? Math.min(step.max, 12 * by) : step.max) / by);
      first = by * (step.dir === 1 ? rand(0, top - (BOUNCES - 1)) : rand(BOUNCES - 1, top));
    } else if (step.from === 'odd') first = 2 * rand(0, Math.floor((step.max - span - 1) / 2)) + 1;
    else {
      first = rand(step.dir === 1 ? 1 : span + 1, step.dir === 1 ? step.max - span : step.max);
      /* "from any number" in tens means not from a ten, or it is just counting by 10s */
      if (by >= 5 && first % by === 0) continue;
    }
    const seq = Array.from({ length: BOUNCES }, (_, i) => first + step.dir * by * i);
    /* never the first two: he needs to hear the pattern before the gap */
    const gap = rand(2, BOUNCES - 1);
    /* a times table's gap is never 0: "0 × 7" is no fact to learn here */
    if (step.facts && seq[gap] === 0) continue;
    if (last && last.seq[0] === seq[0] && last.by === by) continue;
    return { seq, gap, by };
  }
}

/** the times-table fact for the gap: 28 is 4 × 7 */
export function skipFact(q: SkipQuestion): string {
  const n = q.seq[q.gap];
  return `${n / q.by} × ${q.by} = ${n}`;
}

/** the gap's number and the slips: one off, and a step too far either way */
export function skipChoices(q: SkipQuestion): number[] {
  const answer = q.seq[q.gap];
  const out = [answer];
  for (const x of shuffle([answer + 1, answer - 1, answer + q.by, answer - q.by]).concat(answer + 2, answer - 2, answer + 2 * q.by)) {
    if (out.length >= 4) break;
    /* below zero only where the count goes there */
    if ((x >= 0 || q.seq.some((n) => n < 0)) && !out.includes(x)) out.push(x);
  }
  return out.sort((a, b) => a - b);
}

/** where a number below zero is: −3 is 3 below zero */
export const belowZero = (n: number): string => `${signed(n)} is ${-n} below zero.`;

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
  /** teams of players rather than hoops of balls (with make-rows: a crowd
      of players put into teams) */
  teams?: boolean;
  /** Years 3–4: a miss is worked out from facts he knows (drillWorkOut) */
  workOut?: boolean;
}

export const DRILL_STEPS: DrillStep[] = [
  { name: 'Equal groups', task: 'groups', groups: [2, 4], each: [1, 2, 3, 4, 5] },
  { name: 'Share the balls', task: 'share', groups: [2, 4], each: [1, 2, 3, 4, 5] },
  /* Year 2: arrays, groups of 2, 5 and 10, and grouping as early division */
  { name: 'Rows of cones', task: 'rows', groups: [2, 5], each: [2, 3, 4, 5] },
  { name: 'Teams of 2, 5 and 10', task: 'groups', groups: [2, 6], each: [2, 5, 10], teams: true },
  { name: 'Cones into rows', task: 'make-rows', groups: [2, 5], each: [2, 3, 4, 5] },
  /* Years 3–4: equal groups for the rest of the times tables, worked out
     from facts he knows rather than remembered (Times Table Sprint is for
     remembering them); a football team is 11, with a sub 12 */
  { name: 'Teams of 3 and 4', task: 'groups', groups: [3, 10], each: [3, 4], teams: true, workOut: true },
  { name: 'Teams of 6, 7, 8 and 9', task: 'groups', groups: [3, 10], each: [6, 7, 8, 9], teams: true, workOut: true },
  { name: 'Teams of 11 and 12', task: 'groups', groups: [2, 10], each: [11, 12], teams: true, workOut: true },
  { name: 'Players into teams', task: 'make-rows', groups: [3, 9], each: [3, 4, 6, 7, 8, 9], teams: true, workOut: true },
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

const teams = (n: number): string => `${n} ${n === 1 ? 'team' : 'teams'}`;

/**
 * Years 3–4: how to work out so many teams from facts he knows, said after
 * a wrong answer. Up to 5 teams he counts on in the table; 6 to 9 teams are
 * 5 teams and the rest; 10 teams are that many tens. `split` is how many
 * teams make the first part, 0 when there is none: the game marks them.
 */
export function drillWorkOut(step: DrillStep, q: DrillQuestion): { text: string; split: number } {
  const [n, e, total] = [q.groups, q.each, q.total];
  const counted = Array.from({ length: n }, (_, i) => (i + 1) * e).join(', ');
  if (step.task === 'make-rows') {
    if (n <= 5) return { text: `Count in ${e}s to ${total}: ${counted}. That is ${teams(n)}.`, split: 0 };
    const rest = total - 5 * e;
    return { text: `5 teams of ${e} use ${5 * e} players, and the ${rest} left make ${teams(n - 5)} more: ${teams(n)}.`, split: 5 };
  }
  if (n === 10) return { text: `10 teams of ${e} is ${e} tens: ${total}.`, split: 0 };
  if (n <= 5) return { text: `Count in ${e}s: ${counted}.`, split: 0 };
  return { text: `That is 5 teams and ${n - 5} more: ${5 * e} and ${(n - 5) * e} make ${total}.`, split: 5 };
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

export type Fraction = 2 | 3 | 4 | 5 | 8;

export const FRACTION_NAME: Record<Fraction, string> = { 2: 'half', 3: 'third', 4: 'quarter', 5: 'fifth', 8: 'eighth' };
export const FRACTION_PLURAL: Record<Fraction, string> = { 2: 'halves', 3: 'thirds', 4: 'quarters', 5: 'fifths', 8: 'eighths' };

/** "1 half", "2 quarters", "3 fifths" */
export const fractionWords = (k: number, parts: Fraction): string => `${k} ${k === 1 ? FRACTION_NAME[parts] : FRACTION_PLURAL[parts]}`;

/** "a half", "an eighth" */
export const aFraction = (parts: Fraction): string => `${parts === 8 ? 'an' : 'a'} ${FRACTION_NAME[parts]}`;

export interface FractionStep extends Step {
  /**
   * fair: is this cut into halves (or quarters)? yes or no;
   * part-of: half (or a quarter, an eighth) of a group of bibs;
   * name: a piece of a cut orange, what is it called?
   * many: two thirds, three quarters of a squad;
   * equal: is the same amount shaded — 2 quarters and 1 half?
   */
  task: 'fair' | 'part-of' | 'name' | 'many' | 'equal';
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
  /* Years 3–4: thirds and fifths, more than one piece, and the same amount */
  { name: 'Thirds and fifths', task: 'name', parts: [3, 5] },
  { name: 'A third or a fifth of the squad', task: 'part-of', parts: [3, 5] },
  { name: 'Two thirds, three quarters', task: 'many', parts: [3, 4, 5] },
  { name: 'The same amount', task: 'equal', parts: [2, 4, 8] },
];

/** the pieces a "what is it called" step offers */
export const NAMES_OFFERED = (step: FractionStep): Fraction[] =>
  step.parts.some((p) => p === 3 || p === 5) ? [2, 3, 4, 5, 8] : [2, 4, 8];

/** pairs of fractions to compare for "the same amount": [k, parts] each */
const SAME: [[number, Fraction], [number, Fraction]][] = [
  [[1, 2], [2, 4]], [[1, 2], [4, 8]], [[1, 4], [2, 8]], [[3, 4], [6, 8]],
];
const NOT_SAME: [[number, Fraction], [number, Fraction]][] = [
  [[1, 2], [3, 4]], [[1, 2], [3, 8]], [[1, 4], [3, 8]], [[1, 4], [1, 8]], [[3, 4], [5, 8]], [[1, 2], [1, 4]],
];

export interface FractionQuestion {
  /** an orange (a circle) or the pitch (a rectangle) */
  shape: 'orange' | 'pitch';
  parts: Fraction;
  /** for fair: are the pieces the same size? */
  fair: boolean;
  /** for part-of and many: how many bibs, and the answer */
  total: number;
  answer: number;
  /** many: how many of the pieces; equal: the first shape's shaded pieces */
  k: number;
  /** equal: the second shape, and whether the same amount is shaded */
  other?: { k: number; parts: Fraction };
  same?: boolean;
  /** many: the answers a child gives by mistake, one share and the rest */
  options?: number[];
}

export function fractionQuestion(step: FractionStep, last?: FractionQuestion): FractionQuestion {
  for (;;) {
    let parts = pick(step.parts);
    const shape = pick(['orange', 'pitch'] as const);
    const fair = Math.random() < 0.5;
    /* bibs: an even number to 20 for halves, to 40 for quarters and eighths,
       a squad of up to 15 or 25 in thirds and fifths */
    const most = parts === 2 ? 10 : 5;
    let total = parts * rand(step.task === 'many' ? 2 : 1, most);
    let answer = step.task === 'part-of' ? total / parts : parts;
    let k = 1;
    let other: FractionQuestion['other'];
    let same: boolean | undefined;
    let options: number[] | undefined;
    if (step.task === 'many') {
      k = rand(2, parts - 1);
      answer = (total / parts) * k;
      options = [...new Set([answer, total / parts, total - answer, answer + total / parts, answer - 1, answer + 1])]
        .filter((x) => x > 0 && x <= total).slice(0, 4);
    }
    if (step.task === 'equal') {
      same = Math.random() < 0.5;
      const [[k1, p1], [k2, p2]] = pick(same ? SAME : NOT_SAME);
      [k, parts] = [k1, p1];
      other = { k: k2, parts: p2 };
      total = 0;
      answer = 0;
    }
    const q: FractionQuestion = { shape, parts, fair, total, answer, k, other, same, options };
    if (last && last.total === q.total && last.parts === q.parts && last.fair === q.fair && last.shape === q.shape && last.k === q.k
      && last.other?.k === q.other?.k) continue;
    return q;
  }
}

/* ── Jump Line: adding and taking away as jumps on a number line ─────── */

export interface JumpStep extends Step {
  op: '+' | '-';
  /** the line runs from 0 to this */
  top: 10 | 20 | 100 | 1000 | 10000;
  /** tens jumps as well as ones (Year 2) */
  tens: boolean;
  /** the jumps he has, biggest first, when they are not ten and one: a
      hundred and ten on the line to 1000, a thousand and a hundred to 10 000 */
  sizes?: number[];
  /**
   * how the second number is made: a few ones, whole tens, or tens and ones;
   * to 1000, whole hundreds or hundreds and tens; to 10 000, thousands and
   * hundreds
   */
  b: 'ones' | 'tens' | 'tens-ones' | 'hundreds' | 'hundreds-tens' | 'thousands';
  /** jump to the next ten (or hundred) first, then the rest: 38 + 25 is
      38 → 40 → 63 (Years 3–4) */
  bridge?: 10 | 100;
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
  /* Years 3–4: to 1000 in hundreds, to the next ten or hundred first, then to 10 000 */
  { name: 'Jump on in hundreds', op: '+', top: 1000, tens: true, sizes: [100, 10], b: 'hundreds' },
  { name: 'Hundreds and tens to 1000', op: '+', top: 1000, tens: true, sizes: [100, 10], b: 'hundreds-tens' },
  { name: 'Jump back in hundreds and tens', op: '-', top: 1000, tens: true, sizes: [100, 10], b: 'hundreds-tens' },
  { name: 'To the next ten first', op: '+', top: 100, tens: true, b: 'tens-ones', bridge: 10 },
  { name: 'Back to the ten first', op: '-', top: 100, tens: true, b: 'tens-ones', bridge: 10 },
  { name: 'To the next hundred first', op: '+', top: 1000, tens: true, sizes: [100, 10], b: 'hundreds-tens', bridge: 100 },
  { name: 'Jump on in thousands to 10 000', op: '+', top: 10000, tens: true, sizes: [1000, 100], b: 'thousands' },
];

/** the jumps a step gives him, biggest first */
export const sizesOf = (step: JumpStep): number[] => step.sizes ?? (step.tens ? [10, 1] : [1]);

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
    } else if (step.b === 'tens-ones') {
      b = rand(11, 39);
      if (b % 10 === 0) continue;
      a = step.op === '+' ? rand(11, 99 - b) : rand(b + 1, 99);
      if (a % 10 === 0) continue;
    } else if (step.b === 'hundreds') {
      b = 100 * rand(1, 5);
      a = 10 * rand(1, 99);
      if (a % 100 === 0) continue;
    } else if (step.b === 'hundreds-tens') {
      /* no more than four of each jump */
      b = 100 * rand(1, 4) + 10 * rand(1, 4);
      a = step.op === '+' ? rand(11, 999) : rand(b + 10, 999);
      if (step.bridge) a -= a % 10;
      if (a % 100 === 0) continue;
    } else {
      b = 1000 * rand(1, 4) + 100 * rand(1, 4);
      a = 100 * rand(1, 99);
      if (a % 1000 === 0) continue;
    }
    const answer = step.op === '+' ? a + b : a - b;
    if (answer < 0 || answer > step.top) continue;
    if (step.bridge) {
      const to = step.op === '+' ? step.bridge - (a % step.bridge) : a % step.bridge;
      /* the second number goes past the ten (or hundred), with something of
         its own place left after it: that is what makes the jump worth making */
      if (b % step.bridge <= to) continue;
      /* and the first jump is a short one, shorter than the other part of the
         ten, which is the slip offered beside it: 38 → 40 (not 8), 63 → 60
         (not 7). A jump of 5 (or 50) would be its own slip. */
      if (to >= step.bridge / 2) continue;
    }
    if (last && last.a === a && last.b === b) continue;
    return { a, b, op: step.op, answer };
  }
}

/** how far the first jump goes, to the next ten or hundred (or back to it) */
export const bridgeOf = (q: JumpQuestion, bridge: number): number =>
  q.op === '+' ? bridge - (q.a % bridge) : q.a % bridge;

/**
 * The jumps that get there: the biggest jumps of the second number first,
 * then the smaller ones (38 + 25 is two tens and five ones). With a bridge,
 * the first jump is to the next ten or hundred, and the rest after it
 * (38 → 40, then 23 more).
 */
export function jumpsFor(q: JumpQuestion, sizes: boolean | readonly number[], bridge?: number): number[] {
  const sign = q.op === '+' ? 1 : -1;
  const list = typeof sizes === 'boolean' ? (sizes ? [10, 1] : [1]) : sizes;
  const out: number[] = [];
  let left = q.b;
  if (bridge) { const first = bridgeOf(q, bridge); out.push(sign * first); left -= first; }
  for (const size of list) {
    while (left >= size) { out.push(sign * size); left -= size; }
  }
  return out;
}

/** a jump's size as it is said: a jump of ten, of a hundred */
export const jumpWord = (size: number): string =>
  size === 1000 ? 'a thousand' : size === 100 ? 'a hundred' : size === 10 ? 'ten' : 'one';

/* ── Match Clock: telling the time, days, months and seasons ─────────── */

export interface ClockStep extends Step {
  /**
   * read: what time does the clock say; set: put the hands on a time;
   * days / months: the day (or month) before or after; seasons: which
   * season a month is in, in Australia;
   * digital: read the clock to the minute, written 3:47;
   * ampm: is a match-day time am or pm;
   * elapsed: how long from now until kick-off;
   * twentyfour: what a 24-hour time on a ticket is in am and pm.
   */
  task: 'read' | 'set' | 'days' | 'months' | 'seasons' | 'digital' | 'ampm' | 'elapsed' | 'twentyfour';
  /** the minutes a time can have */
  minutes: number[];
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
  /* Years 3–4: to five minutes, then the minute; am and pm; how long; the
     24-hour clock */
  { name: 'Five minutes', task: 'read', minutes: [5, 10, 20, 25, 35, 40, 50, 55] },
  { name: 'To the minute', task: 'digital', minutes: [] },
  { name: 'am or pm', task: 'ampm', minutes: [] },
  { name: 'How long until kick-off?', task: 'elapsed', minutes: [] },
  { name: '24-hour time', task: 'twentyfour', minutes: [] },
];

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** the seasons in Australia, by month: summer is December to February */
export const SEASONS = ['Summer', 'Autumn', 'Winter', 'Spring'];
export const seasonOf = (month: number): string => SEASONS[Math.floor(((month + 1) % 12) / 3)];

/** the hour as the clock face numbers it: 0 and 12 are both 12 */
export const clockHour = (h: number): number => ((h % 12) + 12) % 12 || 12;

/**
 * A time in words, the way it is said in Australia: "3 o'clock", "quarter
 * past 3", "25 past 3", "half past 3", "20 to 4", "quarter to 4". The hour
 * can be given 0 to 23; 0 and 12 are both 12.
 */
export function timeWords(h: number, m: number): string {
  const hour = clockHour(h);
  const next = clockHour(h + 1);
  if (m === 0) return `${hour} o'clock`;
  if (m === 15) return `quarter past ${hour}`;
  if (m === 30) return `half past ${hour}`;
  if (m === 45) return `quarter to ${next}`;
  if (m < 30) return `${m} past ${hour}`;
  return `${60 - m} to ${next}`;
}

/** a time as a digital clock writes it: 3:07 */
export const digital = (h: number, m: number): string => `${clockHour(h)}:${String(m).padStart(2, '0')}`;

/** a time on the 24-hour clock: 19:30, 09:05 */
export const time24 = (h: number, m: number): string => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

/** a length of time: "35 minutes", "1 hour 5 minutes", "2 hours" */
export function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = h ? `${h} ${h === 1 ? 'hour' : 'hours'}` : '';
  const mins = m ? `${m} ${m === 1 ? 'minute' : 'minutes'}` : '';
  return [hours, mins].filter(Boolean).join(' ') || '0 minutes';
}

/** match-day times, to say whether each is am or pm */
export const MATCH_DAY: { what: string; picture: string; h: number; m: number; when: string }[] = [
  { what: 'Morning training', picture: '🏃', h: 6, m: 30, when: 'in the morning' },
  { what: 'Breakfast before the match', picture: '🥣', h: 7, m: 30, when: 'in the morning' },
  { what: 'The bus to the away game', picture: '🚌', h: 9, m: 15, when: 'in the morning' },
  { what: 'The junior game', picture: '⚽', h: 10, m: 0, when: 'in the morning' },
  { what: 'Lunch with the team', picture: '🥪', h: 12, m: 30, when: 'just after midday' },
  { what: 'Kick-off', picture: '⚽', h: 15, m: 0, when: 'in the afternoon' },
  { what: 'The night match', picture: '🌙', h: 19, m: 45, when: 'in the evening' },
  { what: 'Bedtime after the match', picture: '🛏️', h: 20, m: 0, when: 'at night' },
];

/** am or pm, written after the time: 7:30 am, 12:30 pm */
export const ampm = (h: number, m: number): string => `${digital(h, m)} ${h >= 12 ? 'pm' : 'am'}`;

/**
 * How long from one time to another, counted up the way it is done in his
 * head: to the next hour, then whole hours, then the minutes left. "From
 * 2:40, 20 minutes makes 3 o'clock, then 15 minutes makes 3:15. 20 and 15
 * make 35 minutes."
 */
export function countOn(from: number, to: number): { jumps: number[]; text: string } {
  const jumps: number[] = [];
  const said: string[] = [];
  let at = from;
  const say = (t: number): string => (t % 60 ? digital(Math.floor(t / 60), t % 60) : timeWords(Math.floor(t / 60), 0));
  for (const next of [Math.ceil(at / 60) * 60, Math.floor(to / 60) * 60, to]) {
    if (next <= at || next > to) continue;
    jumps.push(next - at);
    said.push(`${duration(next - at)} makes ${say(next)}`);
    at = next;
  }
  const sum = jumps.length > 1 ? ` ${jumps.map(duration).join(' and ')} make ${duration(to - from)}.` : '';
  return { jumps, text: `From ${digital(Math.floor(from / 60), from % 60)}, ${said.join(', then ')}.${sum}` };
}

export interface ClockQuestion {
  h: number;
  m: number;
  /** elapsed: kick-off, in minutes after midnight, and now */
  from: number;
  to: number;
  /** ampm: what happens then */
  event: string;
  picture: string;
  /** for days and months: which one, and before or after */
  index: number;
  after: boolean;
  /** the answer as its button says it */
  answer: string;
  options: string[];
}

export function clockQuestion(step: ClockStep, last?: ClockQuestion): ClockQuestion {
  for (;;) {
    let h = rand(1, 12);
    let m = step.minutes.length ? pick(step.minutes) : 0;
    const after = Math.random() < 0.5;
    let index = 0;
    let from = 0;
    let to = 0;
    let event = '';
    let picture = '';
    let answer: string;
    let options: string[];
    if (step.task === 'read' && step.minutes.some((x) => x % 15)) {
      /* five minutes: the hour on the wrong side of it, past for to, and the
         number the long hand points at read as the minutes */
      answer = timeWords(h, m);
      const pointsAt = m / 5;
      options = [answer, m < 30 ? timeWords(h + 1, m) : `${60 - m} to ${clockHour(h)}`, timeWords(h, 60 - m),
        m < 30 ? `${pointsAt} past ${h}` : `${pointsAt} to ${clockHour(h + 1)}`];
    } else if (step.task === 'read' || step.task === 'set') {
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
    } else if (step.task === 'digital') {
      /* to the minute, never on a five: the slips are the hour after (the
         short hand is nearly there), counting back from the five instead of
         on, and the hands read the wrong way round */
      do m = rand(1, 59); while (m % 5 === 0);
      answer = digital(h, m);
      const five = m - (m % 5);
      options = [answer, digital(h + 1, m), digital(h, five - (m % 5) + (five ? 0 : 60)), digital(Math.round(m / 5) || 12, (h % 12) * 5)];
    } else if (step.task === 'ampm') {
      const e = pick(MATCH_DAY);
      [h, m, event, picture] = [e.h, e.m, e.what, e.picture];
      answer = ampm(h, m);
      options = [`${digital(h, m)} am`, `${digital(h, m)} pm`];
    } else if (step.task === 'elapsed') {
      /* now, on a five, and kick-off up to two hours later on a quarter */
      to = 60 * rand(10, 19) + pick([0, 15, 30, 45]);
      from = to - 5 * rand(2, 24);
      [h, m] = [Math.floor(from / 60), from % 60];
      const length = to - from;
      answer = duration(length);
      /* the slip: taking the times away as if an hour were 100 minutes */
      const hundred = (Math.floor(to / 60) * 100 + (to % 60)) - (Math.floor(from / 60) * 100 + (from % 60));
      options = [answer, duration(hundred), duration(length + 10), duration(Math.max(5, length - 10)), duration(length + 60)];
      options = [answer, ...[...new Set(options.slice(1))].filter((o) => o !== answer).slice(0, 3)];
    } else if (step.task === 'twentyfour') {
      /* an afternoon or evening kick-off on the ticket */
      h = rand(13, 22);
      m = pick([0, 15, 30, 45]);
      answer = ampm(h, m);
      /* the slips: the same digits in the morning, and taking away 10 */
      options = [answer, `${digital(h, m)} am`, `${h - 10}:${String(m).padStart(2, '0')} pm`];
    } else {
      index = rand(0, 11);
      answer = seasonOf(index);
      options = [...SEASONS];
    }
    const q: ClockQuestion = { h, m, from, to, event, picture, index, after, answer, options: [...new Set(options)] };
    if (last && last.answer === q.answer && last.index === q.index) continue;
    /* the seasons keep their order round the year, am comes before pm;
       everything else shuffles */
    return step.task === 'seasons' || step.task === 'ampm' ? q : { ...q, options: shuffle(q.options) };
  }
}

/* ── Fan Survey: counting, tallies and graphs ────────────────────────── */

export interface SurveyStep extends Step {
  /**
   * count: fans waving flags, how many for one team;
   * tally: tally marks for each team, how many for one;
   * most: a picture graph, which team got the most;
   * column: a column graph, how many for one team;
   * more: a column graph, how many more for one team than another;
   * key: a picture graph where each picture is several fans (Years 3–4);
   * scale: a column graph whose scale is numbered every 10 with a line
   * every 5, so a column can stop on a line with no number;
   * table: tallies in a table, the number for one team to fill in;
   * total: a table of numbers, how many altogether.
   */
  task: 'count' | 'tally' | 'most' | 'column' | 'more' | 'key' | 'scale' | 'table' | 'total';
  /** how many teams were voted for */
  teams: number;
  /** the most votes a team can get */
  max: number;
  /** key: how many fans one picture stands for; scale: the gap between its lines */
  key?: number;
}

export const SURVEY_STEPS: SurveyStep[] = [
  { name: 'Count the fans', task: 'count', teams: 3, max: 6 },
  { name: 'Tally marks', task: 'tally', teams: 3, max: 12 },
  { name: 'Picture graph', task: 'most', teams: 3, max: 8 },
  /* Year 2: column graphs, and comparing */
  { name: 'Column graph', task: 'column', teams: 4, max: 10 },
  { name: 'How many more?', task: 'more', teams: 4, max: 10 },
  /* Years 3–4: one picture for many fans, a scale to read, and tables */
  { name: 'Each picture is 2 fans', task: 'key', teams: 4, max: 20, key: 2 },
  { name: 'Each picture is 5 fans', task: 'key', teams: 4, max: 40, key: 5 },
  { name: 'Each picture is 10 fans', task: 'key', teams: 4, max: 90, key: 10 },
  { name: 'Read the scale', task: 'scale', teams: 4, max: 50, key: 5 },
  { name: 'Tallies into a table', task: 'table', teams: 4, max: 30 },
  { name: 'How many altogether?', task: 'total', teams: 4, max: 30 },
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
    /* with a key, every team's votes are whole pictures; tables have bigger, busier numbers */
    const by = step.key ?? 1;
    const least = step.task === 'table' ? 3 : step.task === 'total' ? 2 : 1;
    const pool = Array.from({ length: step.max / by }, (_, i) => (i + 1) * by).filter((v) => v >= least);
    const votes = shuffle(pool).slice(0, step.teams);
    const team = rand(0, step.teams - 1);
    const most = votes.indexOf(Math.max(...votes));
    let other = team;
    let answer: number;
    /* reading the scale is about the lines with no number: 35, between 30 and 40 */
    if (step.task === 'scale' && votes[team] % 10 === 0) continue;
    /* a table of tallies needs a gate of five to count in the one asked */
    if (step.task === 'table' && votes[team] < 6) continue;
    if (step.task === 'most') answer = most;
    else if (step.task === 'total') answer = votes.reduce((a, b) => a + b, 0);
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

/**
 * The wrong choices for the Years 3–4 survey steps, the slips made reading
 * them: counting the pictures and not the fans (4 for 20, when each is 5);
 * reading a line with no number as the next number up or down, or counting
 * the lines (7 for 35); counting a gate of five as one mark, or forgetting
 * its crossing stroke; leaving a row out of the total.
 */
export function surveyChoices(step: SurveyStep, q: SurveyQuestion): number[] {
  const a = q.answer;
  const key = step.key ?? 1;
  const slips: number[] = [];
  if (step.task === 'key') slips.push(a / key, a + key, a - key, a + 2 * key);
  if (step.task === 'scale') slips.push(a - 5, a + 5, a / 5, a + 10);
  if (step.task === 'table') {
    const gates = Math.floor(a / 5);
    slips.push(gates + (a % 5), gates * 4 + (a % 5), a + 1, a - 1, a + 5);
  }
  if (step.task === 'total') slips.push(a - Math.min(...q.votes), a + 10, a - 10, a + 1, a - 1);
  const out = [a];
  for (const x of slips) {
    if (out.length >= 4) break;
    if (x >= 1 && Number.isInteger(x) && !out.includes(x)) out.push(x);
  }
  for (let d = 1; out.length < 4; d += 1) if (!out.includes(a + d)) out.push(a + d);
  return out.sort((x, y) => x - y);
}

/** counting in a step: "5, 10, 15, 20" */
export const countIn = (by: number, times: number): string =>
  Array.from({ length: times }, (_, i) => String((i + 1) * by)).join(', ');

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

/* ── Kit and Ball Shapes: 2D shapes, 3D objects, symmetry ────────────── */

export interface Shape2D { name: string; sides: number }

/** the flat shapes, with the sides (and so corners) each has; a circle has none */
export const SHAPES_2D: Shape2D[] = [
  { name: 'circle', sides: 0 },
  { name: 'triangle', sides: 3 },
  { name: 'square', sides: 4 },
  { name: 'rectangle', sides: 4 },
  { name: 'pentagon', sides: 5 },
  { name: 'hexagon', sides: 6 },
];

/** the solid objects, each as something from the pitch */
export const SHAPES_3D = ['sphere', 'cube', 'cylinder', 'cone', 'rectangular prism'] as const;
export type Shape3D = typeof SHAPES_3D[number];

export interface ShapeStep extends Step {
  /**
   * name: what is this flat shape called;
   * sides: how many sides (or corners) has it;
   * which: which shape has this many sides;
   * solid: what is this object called;
   * symmetry: is this shirt the same on both sides of the line?
   */
  task: 'name' | 'sides' | 'which' | 'solid' | 'symmetry';
  /** the flat shapes this step uses */
  shapes: string[];
}

export const SHAPE_STEPS: ShapeStep[] = [
  { name: 'Name the shape', task: 'name', shapes: ['circle', 'triangle', 'square', 'rectangle'] },
  { name: 'Sides and corners', task: 'sides', shapes: ['triangle', 'square', 'rectangle', 'pentagon', 'hexagon'] },
  { name: 'Which shape?', task: 'which', shapes: ['triangle', 'square', 'pentagon', 'hexagon'] },
  { name: 'Balls, cones and cans', task: 'solid', shapes: [] },
  /* Year 2: more shapes, and symmetry */
  { name: 'More shapes', task: 'name', shapes: SHAPES_2D.map((s) => s.name) },
  { name: 'Same on both sides?', task: 'symmetry', shapes: [] },
];

export interface ShapeQuestion {
  shape: string;
  /** for sides: ask about sides or corners */
  corners: boolean;
  /** for symmetry: is the design the same both sides */
  same: boolean;
  /** the answer as its button says it */
  answer: string;
  options: string[];
}

export const sidesOf = (name: string): number => SHAPES_2D.find((s) => s.name === name)?.sides ?? 0;

export function shapeQuestion(step: ShapeStep, last?: ShapeQuestion): ShapeQuestion {
  for (;;) {
    let shape = step.shapes.length ? pick(step.shapes) : pick([...SHAPES_3D]);
    const corners = Math.random() < 0.5;
    const same = Math.random() < 0.5;
    let answer: string;
    let options: string[];
    if (step.task === 'name') {
      answer = shape;
      options = [shape, ...shuffle(step.shapes.filter((s) => s !== shape)).slice(0, 3)];
    } else if (step.task === 'sides') {
      answer = String(sidesOf(shape));
      options = ['3', '4', '5', '6'];
    } else if (step.task === 'which') {
      answer = shape;
      options = [...step.shapes];
    } else if (step.task === 'solid') {
      answer = shape;
      options = [shape, ...shuffle(SHAPES_3D.filter((s) => s !== shape)).slice(0, 3)];
    } else {
      shape = 'shirt';
      answer = same ? 'Yes' : 'No';
      options = ['Yes', 'No'];
    }
    const q = { shape, corners, same, answer, options: step.task === 'symmetry' || step.task === 'sides' ? options : shuffle(options) };
    if (last && last.shape === q.shape && last.answer === q.answer && step.task !== 'symmetry') continue;
    return q;
  }
}

/* ── Coach's Whiteboard: position, directions and turns ──────────────── */

export type Dir = 'up' | 'right' | 'down' | 'left';
export const DIRS: Dir[] = ['up', 'right', 'down', 'left'];

/** the points of the compass, clockwise from north; on the whiteboard, as on
    a map, north is up */
export type Compass = 'north' | 'north-east' | 'east' | 'south-east' | 'south' | 'south-west' | 'west' | 'north-west';
export const COMPASS: Compass[] = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
/** the four main points, by the way they face on the board */
export const NORTH_OF: Record<Dir, Compass> = { up: 'north', right: 'east', down: 'south', left: 'west' };

/** one square's move in each direction: [across, down] */
export const STEP_OF: Record<Dir | Compass, [number, number]> = {
  up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0],
  north: [0, -1], 'north-east': [1, -1], east: [1, 0], 'south-east': [1, 1],
  south: [0, 1], 'south-west': [-1, 1], west: [-1, 0], 'north-west': [-1, -1],
};

export interface BoardStep extends Step {
  /**
   * side: is the ball to the left or the right of the keeper;
   * move / moves: follow one move (or two) on the grid and tap where he lands;
   * turn: a quarter or half turn, which way is he facing now;
   * transform: was the shape flipped, slid or turned?
   * gridref: find C3 on a grid with letters across and numbers down, or say
   *   which square the ball is on;
   * compass: follow moves given as compass points;
   * angle: is the corner a right angle, or smaller, or bigger?
   */
  task: 'side' | 'move' | 'moves' | 'turn' | 'transform' | 'gridref' | 'compass' | 'angle';
  /** compass: north, south, east and west, or the points in between */
  points?: 4 | 8;
  /** turn: faces north, east, south or west, and turns three quarters too */
  compass?: boolean;
}

export const BOARD_STEPS: BoardStep[] = [
  { name: 'Left or right?', task: 'side' },
  { name: 'One move', task: 'move' },
  { name: 'Two moves', task: 'moves' },
  /* Year 2: turns, and flips, slides and turns of a shape */
  { name: 'Quarter and half turns', task: 'turn' },
  { name: 'Flip, slide or turn?', task: 'transform' },
  /* Years 3–4: grid references, the compass, right angles */
  { name: 'Grid references', task: 'gridref' },
  { name: 'North, south, east and west', task: 'compass', points: 4 },
  { name: 'Right angles', task: 'angle' },
  { name: 'Three-quarter turns', task: 'turn', compass: true },
  { name: 'North-east and the points between', task: 'compass', points: 8 },
];

/** the grid on the whiteboard: GRID by GRID squares */
export const GRID = 5;

export interface Move { dir: Dir | Compass; n: number }

export type Turn = 'quarter-clockwise' | 'quarter-anticlockwise' | 'half'
  | 'three-quarter-clockwise' | 'three-quarter-anticlockwise';

/** angles drawn for "is it a right angle?": never so close to one that it
    takes a protractor to tell */
export const ANGLES = { smaller: [30, 45, 60], bigger: [120, 135, 150] };

export interface BoardQuestion {
  /** side: where the keeper and the ball are, along a row of GRID spots */
  keeper: number;
  ball: number;
  /** move(s), compass: where he starts, the moves, where he ends; gridref:
      the square asked about is the end */
  start: [number, number];
  moves: Move[];
  end: [number, number];
  /** turn: which way he faces, the turn, and which way he faces after */
  facing: Dir;
  turn: Turn;
  /** transform: what was done to the shape */
  done: 'flip' | 'slide' | 'turn';
  /** gridref: tap the square named, or name the square the ball is on, in turn */
  way: 'tap' | 'name';
  /** gridref, name: the four squares offered */
  refs: string[];
  /** angle: how wide, in degrees, and how far round it is drawn */
  angle: number;
  tilt: number;
  answer: string;
}

/** quarter turns clockwise in each turn */
const QUARTERS: Record<Turn, number> = {
  'quarter-clockwise': 1, 'quarter-anticlockwise': 3, half: 2,
  'three-quarter-clockwise': 3, 'three-quarter-anticlockwise': 1,
};

export const turned = (d: Dir, turn: Turn): Dir => DIRS[(DIRS.indexOf(d) + QUARTERS[turn]) % 4];

/** the way he faces after each quarter of the turn, in order: a half turn
    goes round clockwise */
export function turnPath(d: Dir, turn: Turn): Dir[] {
  const back = turn.endsWith('-anticlockwise');
  const count = turn === 'half' ? 2 : turn.startsWith('three-quarter') ? 3 : 1;
  return Array.from({ length: count }, (_, i) => DIRS[(DIRS.indexOf(d) + (back ? 3 : 1) * (i + 1)) % 4]);
}

export const TURN_NAME: Record<Turn, string> = {
  'quarter-clockwise': 'a quarter turn clockwise', 'quarter-anticlockwise': 'a quarter turn anticlockwise',
  half: 'a half turn', 'three-quarter-clockwise': 'a three-quarter turn clockwise',
  'three-quarter-anticlockwise': 'a three-quarter turn anticlockwise',
};

/** a turn counted out in quarters, in compass points: "From north, a
    three-quarter turn clockwise is 3 quarter turns: east, south, west. He
    faces west." A quarter turn just "goes to east". */
export function turnWhy(d: Dir, turn: Turn): string {
  const path = turnPath(d, turn).map((x) => NORTH_OF[x]);
  const from = `From ${NORTH_OF[d]}, ${TURN_NAME[turn]}`;
  if (path.length === 1) return `${from} goes to ${path[0]}.`;
  return `${from} is ${path.length} quarter turns: ${path.join(', ')}. He faces ${path[path.length - 1]}.`;
}

/** a square's grid reference: letters across, numbers down, A1 at the top left */
export const gridRef = ([x, y]: [number, number]): string => `${'ABCDE'[x]}${y + 1}`;

/** the square a grid reference names */
export function refSquare(ref: string): [number, number] {
  return ['ABCDE'.indexOf(ref[0]), Number(ref.slice(1)) - 1];
}

/** three wrong squares to offer beside the right one: the letter or the number
    one out, and both */
function nearRefs(at: [number, number]): string[] {
  const near: [number, number][] = [];
  for (const [dx, dy] of shuffle([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]] as [number, number][])) {
    const x = at[0] + dx;
    const y = at[1] + dy;
    if (x >= 0 && x < GRID && y >= 0 && y < GRID) near.push([x, y]);
  }
  /* one with the letter wrong, one with the number wrong, and one more */
  const letter = near.find(([, y]) => y === at[1])!;
  const number = near.find(([x]) => x === at[0])!;
  const more = near.find((p) => p !== letter && p !== number)!;
  return shuffle([at, letter, number, more].map(gridRef));
}

export function boardQuestion(step: BoardStep, last?: BoardQuestion): BoardQuestion {
  for (;;) {
    const keeper = rand(1, GRID - 2);
    let ball = rand(0, GRID - 1);
    if (ball === keeper) ball = keeper + pick([-1, 1]);
    const start: [number, number] = [rand(0, GRID - 1), rand(0, GRID - 1)];
    const moves: Move[] = [];
    let end: [number, number] = [...start];
    if (step.task === 'move' || step.task === 'moves' || step.task === 'compass') {
      const lines: (Dir | Compass)[][] = step.task === 'compass' && step.points === 8
        ? [['north-east', 'south-east', 'south-west', 'north-west']]
        : step.task === 'compass' ? [['west', 'east'], ['north', 'south']] : [['left', 'right'], ['up', 'down']];
      const axes = shuffle(lines).slice(0, step.task === 'move' || step.points === 8 ? 1 : 2);
      for (const axis of axes) {
        const dir = pick(axis);
        const [dx, dy] = STEP_OF[dir];
        const roomX = dx > 0 ? GRID - 1 - end[0] : dx < 0 ? end[0] : GRID;
        const roomY = dy > 0 ? GRID - 1 - end[1] : dy < 0 ? end[1] : GRID;
        const room = Math.min(roomX, roomY);
        if (!room) continue;
        const n = rand(1, Math.min(3, room));
        moves.push({ dir, n });
        end = [end[0] + dx * n, end[1] + dy * n];
      }
      if (moves.length !== axes.length) continue;
    }
    if (step.task === 'gridref') end = [rand(0, GRID - 1), rand(0, GRID - 1)];
    /* find a square, then name one, in turn */
    const way: BoardQuestion['way'] = last?.way === 'tap' ? 'name' : 'tap';
    const refs = step.task === 'gridref' && way === 'name' ? nearRefs(end) : [];
    const facing = pick(DIRS);
    const turn: Turn = pick(step.compass
      ? ['quarter-clockwise', 'quarter-anticlockwise', 'half', 'three-quarter-clockwise', 'three-quarter-anticlockwise']
      : ['quarter-clockwise', 'quarter-anticlockwise', 'half']);
    const done = pick(['flip', 'slide', 'turn'] as const);
    /* a right angle a third of the time */
    const angle = pick([90, 90, 90, ...ANGLES.smaller, ...ANGLES.bigger]);
    const tilt = 15 * rand(0, 23);
    const answer = step.task === 'side' ? (ball < keeper ? 'left' : 'right')
      : step.task === 'turn' ? turned(facing, turn)
        : step.task === 'transform' ? done
          : step.task === 'angle' ? (angle < 90 ? 'smaller' : angle > 90 ? 'bigger' : 'right')
            : step.task === 'gridref' && way === 'name' ? gridRef(end)
              : `${end[0]},${end[1]}`;
    const q = { keeper, ball, start, moves, end, facing, turn, done, way, refs, angle, tilt, answer };
    if (last && last.answer === answer && last.start.join() === start.join()) continue;
    if (last && step.task === 'gridref' && last.end.join() === end.join()) continue;
    return q;
  }
}

/** a move as it is said: "2 squares up", "1 square north-east" */
export const moveWords = (m: Move): string => `${m.n} ${m.n === 1 ? 'square' : 'squares'} ${m.dir}`;

const WAY_ON_BOARD: Record<Compass, string> = {
  north: 'up', south: 'down', east: 'to the right', west: 'to the left',
  'north-east': 'up and to the right', 'south-east': 'down and to the right',
  'south-west': 'down and to the left', 'north-west': 'up and to the left',
};

/** which way each compass point in the moves goes on the board: "North is up
    and west is to the left." or "North-east is between north and east: up
    and to the right." */
export function compassHelp(moves: Move[]): string {
  const dirs = [...new Set(moves.map((m) => m.dir))] as Compass[];
  const cap = (t: string): string => t[0].toUpperCase() + t.slice(1);
  if (dirs.some((d) => d.includes('-'))) {
    return dirs.map((d) => `${cap(d)} is between ${d.split('-').join(' and ')}: ${WAY_ON_BOARD[d]}.`).join(' ');
  }
  return `${cap(dirs.map((d) => `${d} is ${WAY_ON_BOARD[d]}`).join(' and '))}.`;
}

/* ── Ice Cream Van: Australian coins ─────────────────────────────────── */

/* Money with the coins in his pocket. Kindergarten and Year 1 compare coins
 * (the $2 is smaller than the 5c and worth forty of them — size is not
 * value), pay with one coin, and count a handful of the same coin. Year 2
 * counts mixed coins, picks coins that make a price exactly, and works out
 * the change.
 *
 * Years 3 and 4 read and write dollars and cents ($3.05 is not $3.50), pay
 * prices to the 5 cents, tell which of two prices is cheaper, add two
 * prices, and count up the change from a $5, $10 or $20 note, the way a
 * shopkeeper does.
 *
 * Everything is in cents so there is no rounding; money() writes it the way
 * a price tag does: 50c, $2, $3.50. */

export interface Coin {
  cents: number;
  /** diameter in millimetres, the real coin's, so sizes compare truly */
  mm: number;
  gold: boolean;
  /** the 50c has twelve sides */
  sides?: number;
}

export const COINS: Coin[] = [
  { cents: 5, mm: 19.4, gold: false },
  { cents: 10, mm: 23.6, gold: false },
  { cents: 20, mm: 28.5, gold: false },
  { cents: 50, mm: 31.5, gold: false, sides: 12 },
  { cents: 100, mm: 25, gold: true },
  { cents: 200, mm: 20.5, gold: true },
];

export const coinOf = (cents: number): Coin => COINS.find((c) => c.cents === cents)!;

/** how a price tag writes it */
export const money = (cents: number): string =>
  cents < 100 ? `${cents}c` : cents % 100 ? `$${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}` : `$${cents / 100}`;

/** how it is said */
export const moneyWords = (cents: number): string => {
  const d = Math.floor(cents / 100);
  const c = cents % 100;
  const dollars = d ? `${d} ${d === 1 ? 'dollar' : 'dollars'}` : '';
  const pence = c ? `${c} cents` : '';
  return [dollars, pence].filter(Boolean).join(' ') || '0 cents';
};

export interface Treat { id: string; picture: string; name: string }

export const TREATS: Treat[] = [
  { id: 'cone', picture: '🍦', name: 'a soft serve' },
  { id: 'sundae', picture: '🍨', name: 'a sundae' },
  { id: 'slushie', picture: '🍧', name: 'a slushie' },
  { id: 'cookie', picture: '🍪', name: 'a cookie' },
  { id: 'juice', picture: '🧃', name: 'a juice' },
];

export interface KioskStep extends Step {
  /**
   * more: which coin is worth more;
   * one: which one coin pays the price exactly;
   * count: how much is a handful of the same coin;
   * mixed: how much is a handful of different coins;
   * pay: tap coins that make the price exactly;
   * change: pay with a note, how much change;
   * read: which price tag says "3 dollars and 45 cents";
   * cheaper: which of two treats costs less;
   * total: how much for two treats together
   */
  task: 'more' | 'one' | 'count' | 'mixed' | 'pay' | 'change' | 'read' | 'cheaper' | 'total';
  /** Years 3–4: prices to the 5 cents (but $3.45 against $3.54 to say which
      is cheaper), and change from a $20 note too */
  fives?: boolean;
}

export const KIOSK_STEPS: KioskStep[] = [
  { name: 'Which coin is worth more?', task: 'more' },
  { name: 'Pay with one coin', task: 'one' },
  { name: 'Count the coins', task: 'count' },
  /* Year 2 */
  { name: 'Count mixed coins', task: 'mixed' },
  { name: 'Pay the exact price', task: 'pay' },
  { name: 'How much change?', task: 'change' },
  /* Years 3–4 */
  { name: 'Dollars and cents', task: 'read', fives: true },
  { name: 'Pay to the 5 cents', task: 'pay', fives: true },
  { name: 'Which is cheaper?', task: 'cheaper', fives: true },
  { name: 'Two treats', task: 'total', fives: true },
  { name: 'Change from $5, $10 and $20', task: 'change', fives: true },
];

export interface KioskQuestion {
  task: KioskStep['task'];
  treat: Treat;
  /** the price, in cents */
  price: number;
  /** the coins shown: to compare, to count, or in his purse to pay with */
  coins: number[];
  /** for change: the note he pays with, in cents */
  paid?: number;
  /** cheaper, total: a second treat and its price */
  other?: Treat;
  otherPrice?: number;
  /** cents; for more, the coin worth more */
  answer: number;
  options: number[];
}

/** a handful of coins that adds up to `cents`, biggest first, using only
    these coins */
function makeUp(cents: number, from: number[]): number[] {
  const out: number[] = [];
  let left = cents;
  for (const c of [...from].sort((a, b) => b - a)) {
    while (left >= c) { out.push(c); left -= c; }
  }
  return left ? [] : out;
}

/** three wrong amounts beside the right one, each a slip a child makes */
function moneyChoices(answer: number, step: number): number[] {
  const out = new Set([answer]);
  for (const d of shuffle([step, -step, 2 * step, -2 * step, 100, -100, 50, -50])) {
    if (out.size >= 4) break;
    if (answer + d > 0) out.add(answer + d);
  }
  return [...out].sort((a, b) => a - b);
}

export function kioskQuestion(step: KioskStep, last?: KioskQuestion): KioskQuestion {
  for (;;) {
    const treat = pick(TREATS);
    let q: KioskQuestion;
    if (step.task === 'more') {
      /* half the time the pair where the smaller coin is worth more */
      const tricky = Math.random() < 0.5;
      const pairs = COINS.flatMap((a) => COINS.filter((b) => b.cents > a.cents).map((b) => [a, b] as const))
        .filter(([a, b]) => (b.mm < a.mm) === tricky);
      const [a, b] = pick(pairs);
      q = { task: 'more', treat, price: 0, coins: shuffle([a.cents, b.cents]), answer: b.cents, options: [] };
    } else if (step.task === 'one') {
      const price = pick(COINS).cents;
      q = { task: 'one', treat, price, coins: shuffle(COINS.map((c) => c.cents)).slice(0, 4), answer: price, options: [] };
      if (!q.coins.includes(price)) q.coins[0] = price;
      q.coins = shuffle(q.coins);
    } else if (step.task === 'count') {
      const coin = pick([10, 20, 50, 100, 200]);
      const n = rand(2, coin >= 100 ? 5 : 6);
      const answer = coin * n;
      q = { task: 'count', treat, price: answer, coins: Array(n).fill(coin), answer, options: moneyChoices(answer, coin) };
    } else if (step.task === 'mixed') {
      const coins = shuffle(COINS.map((c) => c.cents)).slice(0, rand(3, 4)).sort((a, b) => b - a);
      if (Math.random() < 0.5) coins.splice(1, 0, coins[0]);
      const answer = coins.reduce((s, c) => s + c, 0);
      q = { task: 'mixed', treat, price: answer, coins, answer, options: moneyChoices(answer, pick([10, 50])) };
    } else if (step.task === 'pay') {
      /* a price in tens of cents up to $5 (to the 5 cents, Years 3–4), and a
         purse that can make it */
      const price = step.fives ? 10 * rand(20, 59) + pick([5, 5, 0]) : rand(5, 50) * 10;
      const exact = makeUp(price, step.fives ? [200, 100, 50, 20, 10, 5] : [200, 100, 50, 20, 10]);
      const extra = shuffle([200, 100, 50, 20, 10, 5]).slice(0, 2);
      const coins = [...exact, ...extra].sort((a, b) => b - a);
      q = { task: 'pay', treat, price, coins, answer: price, options: [] };
    } else if (step.task === 'read') {
      const price = 100 * rand(1, 9) + pick([5, 5, 10 * rand(1, 9), 5 * rand(1, 19)]);
      q = { task: 'read', treat, price, coins: [], answer: price, options: priceSlips(price) };
    } else if (step.task === 'cheaper') {
      const [a, b] = cheaperPair();
      const other = pick(TREATS.filter((t) => t !== treat));
      q = { task: 'cheaper', treat, price: a, other, otherPrice: b, coins: [], answer: Math.min(a, b), options: [] };
    } else if (step.task === 'total') {
      const a = 100 * rand(1, 4) + 5 * rand(1, 19);
      const b = 100 * rand(1, 4) + 5 * rand(1, 19);
      const other = pick(TREATS.filter((t) => t !== treat));
      const answer = a + b;
      /* the slip to catch: the cents make more than a dollar, and it is lost */
      const lost = (a % 100) + (b % 100) >= 100 ? answer - 100 : answer + 100;
      q = { task: 'total', treat, price: a, other, otherPrice: b, coins: [], answer, options: withSlip(answer, lost, 10) };
    } else if (step.fives) {
      const paid = pick([500, 1000, 2000]);
      const price = paid / 2 + 5 * rand(1, paid / 10 - 1);
      const answer = paid - price;
      /* the slip: forgetting that the cents took a dollar */
      q = { task: 'change', treat, price, coins: [], paid, answer, options: withSlip(answer, answer + 100, 10) };
    } else {
      const paid = pick([500, 1000]);
      const price = rand(paid === 500 ? 3 : 10, paid === 500 ? 9 : 19) * 50;
      const answer = paid - price;
      q = { task: 'change', treat, price, coins: [], paid, answer, options: moneyChoices(answer, 50) };
    }
    if (last && last.answer === q.answer && last.task === q.task) continue;
    /* a price like $5.05 has fewer slips than four tags need */
    if (q.task === 'read' && q.options.length < 4) continue;
    return q;
  }
}

/** the right amount, the slip a child makes, and two more near it */
function withSlip(answer: number, slip: number, step: number): number[] {
  const out = new Set([answer, slip]);
  for (const x of moneyChoices(answer, step)) if (out.size < 4) out.add(x);
  return [...out].sort((a, b) => a - b);
}

/** price tags for "3 dollars and 45 cents": the right one, and the ones a
    child writes by mistake — $3.54, $45.03, $345, and the lost or added nought
    ($3.50 for 3 dollars and 5 cents, $3.04 for 3 dollars and 40 cents) */
function priceSlips(price: number): number[] {
  const d = Math.floor(price / 100);
  const c = price % 100;
  const nought = c < 10 ? d * 100 + c * 10 : c % 10 === 0 ? d * 100 + c / 10 : -1;
  const swapped = c >= 10 && c % 10 ? d * 100 + (c % 10) * 10 + Math.floor(c / 10) : -1;
  const slips = [nought, swapped, c * 100 + d, price * 100].filter((x) => x > 0 && x !== price);
  return shuffle([price, ...[...new Set(slips)].slice(0, 3)]);
}

/** a price said with its "and": 3 dollars and 45 cents */
export const priceWords = (cents: number): string =>
  moneyWords(cents).replace(/(dollars?) (\d)/, '$1 and $2');

/** how dollars and cents are written */
export function priceWhy(price: number): string {
  const c = price % 100;
  const rule = c < 10
    ? `${c} cents is written .0${c}, with a nought: there are always two digits after the point.`
    : 'The dollars go before the point and the cents after it.';
  return `${priceWords(price)} is ${money(price)}. ${rule}`;
}

/** two prices that need reading carefully to say which is less: the cents
    swapped round, $3.05 against $3.50, or fewer dollars but more cents */
function cheaperPair(): [number, number] {
  const d = rand(1, 8);
  const kind = pick(['swap', 'nought', 'dollar'] as const);
  let pair: [number, number];
  if (kind === 'swap') {
    const [x, y] = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    pair = [d * 100 + x * 10 + y, d * 100 + y * 10 + x];
  } else if (kind === 'nought') {
    const x = rand(1, 9);
    pair = [d * 100 + x, d * 100 + x * 10];
  } else {
    pair = [d * 100 + 5 * rand(12, 19), (d + 1) * 100 + 5 * rand(1, 8)];
  }
  return shuffle(pair) as [number, number];
}

/** why one price is less: dollars first, then cents */
export function cheaperWhy(a: number, b: number): string {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  const d = Math.floor(lo / 100);
  if (d === Math.floor(hi / 100)) {
    return `Both are ${d} ${d === 1 ? 'dollar' : 'dollars'}, and ${lo % 100} cents is less than ${hi % 100} cents, so ${money(lo)} is cheaper.`;
  }
  return `${money(lo)} is less than ${money((d + 1) * 100)}, and ${money(hi)} is more, so ${money(lo)} is cheaper.`;
}

/** adding two prices: dollars, then cents, then both together */
export function totalWhy(a: number, b: number): string {
  const dollars = Math.floor(a / 100) * 100 + Math.floor(b / 100) * 100;
  const cents = (a % 100) + (b % 100);
  return `Dollars: ${money(Math.floor(a / 100) * 100)} + ${money(Math.floor(b / 100) * 100)} = ${money(dollars)}. `
    + `Cents: ${money(a % 100)} + ${money(b % 100)} = ${money(cents)}. Together: ${money(a + b)}.`;
}

/** the change, counted up from the price the way a shopkeeper does: to the
    next ten cents, to the next dollar, then to the note */
export function countUp(price: number, paid: number): { jumps: number[]; text: string } {
  const jumps: number[] = [];
  const said: string[] = [];
  let at = price;
  for (const to of [Math.ceil(at / 10) * 10, Math.ceil(at / 100) * 100, paid]) {
    if (to <= at) continue;
    jumps.push(to - at);
    said.push(`${money(to - at)} makes ${money(to)}`);
    at = to;
  }
  const list = said.length > 1 ? `${said.slice(0, -1).join(', ')}, and ${said[said.length - 1]}` : said[0];
  const sum = jumps.length > 1 ? `${jumps.map(money).join(' + ')} = ${money(paid - price)}` : money(paid - price);
  return { jumps, text: `Count up from ${money(price)}: ${list}. The change is ${sum}.` };
}

/** do these coins make the price exactly? */
export const pays = (coins: number[], price: number): boolean => coins.reduce((s, c) => s + c, 0) === price;

/* ── Short Hand, Long Hand: the clock's two scales ───────────────────── */

/* The clock has two scales on one face: hours 1 to 12, and minutes 0 to 59
 * around the outside. A six-year-old reads the long hand against the hour
 * numbers, so 3:25 comes out as "3:5". Everything here keeps the two apart:
 * hours are red and minutes are blue, the minutes have their own ring of
 * numbers (0, 5, 10 ... 55), and the hour is the "zone" the short hand is in,
 * not the number it is nearest — at 3:50 it is nearly 4, but it is still 3.
 *
 * The hands are geared, as on a real clock: the long hand going past the top
 * moves the hour on (or back). An hour here is 0 to 11, where 0 is 12. */

export interface HandsStep extends Step {
  /** the minutes a time can have at this level */
  minutes: 'oclock' | 'half' | 'quarters' | 'fives' | 'any';
  /** the time in words, minutes past and to the hour (Years 3–4): set from
      the words, and read as words */
  words?: boolean;
}

/** the levels, the same for setting the clock and for reading it */
export const HANDS_STEPS: HandsStep[] = [
  { name: "o'clock", minutes: 'oclock' },
  { name: 'half past', minutes: 'half' },
  { name: 'quarters', minutes: 'quarters' },
  { name: 'fives', minutes: 'fives' },
  { name: 'any minute', minutes: 'any' },
  /* Years 3–4: minutes past and to the hour */
  { name: 'past and to', minutes: 'fives', words: true },
  { name: 'past and to, every minute', minutes: 'any', words: true },
];

export interface ClockTime { h: number; m: number }

/** the same time, read off a clock face */
export const sameTime = (a: ClockTime, b: ClockTime): boolean => clockHour(a.h) === clockHour(b.h) && a.m === b.m;

/** a time to set or read at this level, never the one just asked */
export function handsTarget(step: HandsStep, last?: ClockTime): ClockTime {
  /* half past comes up twice as often as o'clock at the half past level */
  const from: Record<HandsStep['minutes'], number[] | null> = {
    oclock: [0], half: [0, 30, 30], quarters: [0, 15, 30, 45], fives: null, any: null,
  };
  for (;;) {
    const list = from[step.minutes];
    const m = list ? pick(list) : step.minutes === 'fives' ? rand(0, 11) * 5 : rand(0, 59);
    /* past and to: o'clock and half past are neither */
    if (step.words && (m === 0 || m === 30)) continue;
    const t = { h: rand(0, 11), m };
    if (!last || !sameTime(t, last)) return t;
  }
}

/** which side of the clock the long hand is on: past the hour (the right
    half, counting on from the top), or to the next (the left half, counting
    back to the top) */
export const pastOrTo = (m: number): 'past' | 'to' => (m <= 30 ? 'past' : 'to');

/** "1 minute", "20 minutes" */
const minutesOf = (n: number): string => `${n} ${n === 1 ? 'minute' : 'minutes'}`;
/** a time in words at the start of a sentence: "Quarter to 5" */
const saidFirst = (h: number, m: number): string => {
  const words = timeWords(h, m);
  return words[0].toUpperCase() + words.slice(1);
};
/** counting in fives up to n, and the little steps after: "5, 10, 15", 2 */
const fivesTo = (n: number): { fives: string; extra: number } => {
  const base = Math.floor(n / 5) * 5;
  return { fives: Array.from({ length: base / 5 }, (_, i) => (i + 1) * 5).join(', '), extra: n - base };
};

/**
 * Years 3–4: three ways of saying the time, one right. The wrong two are
 * the mistakes children make with past and to: a "to" time named after the
 * hour the short hand has passed (3:40 as 20 to 3), past and to swapped
 * (3:40 as 20 past 3), and a "past" time given the next hour (3:20 as 20
 * past 4). Each comes with the time it really says, so none is the same
 * time as the right one.
 */
export function wordsChoices(t: ClockTime): { words: string; time: ClockTime; ok?: true }[] {
  const at = (h: number, m: number) => ({ words: timeWords(h, m), time: { h: ((h % 12) + 12) % 12, m } });
  const wrong = pastOrTo(t.m) === 'to'
    ? [at(t.h - 1, t.m), at(t.h, 60 - t.m)]
    : [at(t.h - 1, 60 - t.m), at(t.h + 1, t.m)];
  return shuffle([...wrong, { ...at(t.h, t.m), ok: true as const }]);
}

/** why the time is said the way it is: which side the long hand is on, and
    which hour that makes it */
export function pastToExplained(t: ClockTime): string {
  const hour = clockHour(t.h);
  const next = clockHour(t.h + 1);
  if (pastOrTo(t.m) === 'to') {
    return `The long hand is on the to side, ${minutesOf(60 - t.m)} before the top. The short hand is heading for the ${next}. So it is ${timeWords(t.h, t.m)}.`;
  }
  return `The long hand is on the past side, ${minutesOf(t.m)} after the top. The short hand has gone past the ${hour}. So it is ${timeWords(t.h, t.m)}.`;
}

/** where to start when setting a time in words: the o'clock it is past, or
    the o'clock it is to, and which way the long hand goes from there */
export function pastToStart(t: ClockTime): string {
  const words = saidFirst(t.h, t.m);
  if (pastOrTo(t.m) === 'to') {
    const next = clockHour(t.h + 1);
    return `${words} is ${minutesOf(60 - t.m)} before ${next} o'clock. Make ${next} o'clock, then take the long hand back ${minutesOf(60 - t.m)}.`;
  }
  const hour = clockHour(t.h);
  return `${words} is ${minutesOf(t.m)} after ${hour} o'clock. Make ${hour} o'clock, then move the long hand on ${minutesOf(t.m)}.`;
}

/** what is wrong when a time in words is set: the hour, or the minutes */
export function pastToHint(want: ClockTime, what: 'hour' | 'minutes'): string {
  const hour = clockHour(want.h);
  const next = clockHour(want.h + 1);
  const to = pastOrTo(want.m) === 'to';
  const n = to ? 60 - want.m : want.m;
  if (what === 'hour') {
    return to
      ? `${saidFirst(want.h, want.m)} is before ${next} o'clock, so the short hand has not reached the ${next} yet. It goes in the ${hour} zone, just before the ${next}. Make ${next} o'clock, then take the long hand back.`
      : `${saidFirst(want.h, want.m)}: the short hand has gone past the ${hour}. Put it in the ${hour} zone: past the ${hour}, before the ${next}.`;
  }
  const { fives, extra } = fivesTo(n);
  const count = fives
    ? `${to ? 'Count back' : 'Count on'} from the top in fives: ${fives}.${extra ? ` Then ${extra} little ${extra === 1 ? 'step' : 'steps'} more.` : ''}`
    : `Go ${extra} little ${extra === 1 ? 'step' : 'steps'} ${to ? 'back from' : 'on from'} the top.`;
  return to
    ? `"To" means before the top. ${count} The long hand goes on the to side.`
    : `"Past" means after the top. ${count} The long hand goes on the past side.`;
}

/** the long hand moved to minute n, which may be past the top either way:
    the short hand follows, as on a real clock */
export function moveMinute(t: ClockTime, n: number): ClockTime {
  const m = ((n % 60) + 60) % 60;
  let h = t.h;
  if (t.m - m > 30) h = (h + 1) % 12;
  else if (m - t.m > 30) h = (h + 11) % 12;
  return { h, m };
}

/**
 * Three times to choose from when reading the clock: the right one and two
 * of the mistakes children make. The hands swapped; the red number the long
 * hand points at read as the minutes (3:25 read as 3:05); and the hour one
 * on, because the short hand looks nearly there. A random time only fills a
 * gap if two of those are the same.
 */
export function handsChoices(t: ClockTime, step: HandsStep): (ClockTime & { ok?: true })[] {
  const out: ClockTime[] = [];
  const add = (c: ClockTime): void => {
    if (out.length < 2 && !sameTime(c, t) && !out.some((o) => sameTime(o, c))) out.push(c);
  };
  add({ h: Math.floor(t.m / 5) || 12, m: (t.h % 12) * 5 });
  if (t.m >= 5) add({ h: t.h, m: Math.floor(t.m / 5) });
  add({ h: t.h + 1, m: t.m });
  while (out.length < 2) add({ h: rand(0, 11), m: step.minutes === 'any' ? rand(0, 59) : rand(0, 11) * 5 });
  return shuffle([...out, { h: t.h, m: t.m, ok: true as const }]);
}

/** where to look when the long hand is wrong */
export function minuteHint(m: number): string {
  const base = Math.floor(m / 5) * 5;
  const extra = m - base;
  const steps = (n: number): string => `${n} little ${n === 1 ? 'step' : 'steps'}`;
  if (m === 0) return 'The long hand has to point straight up, at the top. That is 0 minutes.';
  if (extra === 0) return `Move the long hand. Count in fives until you say ${m}. It will point at the red ${base / 5}.`;
  return `Move the long hand. Count in fives to ${base}, then go ${steps(extra)} more.`;
}

/** what the short hand is saying, for the Play screen */
export function hourExplained(t: ClockTime): string {
  const hour = clockHour(t.h);
  const next = clockHour(t.h + 1);
  if (t.m === 0) return `The short hand points right at the ${hour}. So the hour is ${hour}.`;
  const zone = `The short hand is in the ${hour} zone. It went past the ${hour} and has not reached the ${next} yet. So the hour is ${hour}.`;
  return t.m >= 40 ? `${zone} It looks close to the ${next}, but it is still ${hour} until the long hand gets back to the top.` : zone;
}

/** what the long hand is saying: the words, the fives to count, the little
    steps after them, and the total */
export function minuteExplained(m: number): { text: string; fives: number[]; extra: number; total: string } {
  const base = Math.floor(m / 5) * 5;
  const extra = m - base;
  const steps = (n: number): string => `${n} little ${n === 1 ? 'step' : 'steps'}`;
  if (m === 0) return { text: 'The long hand points straight up. That means 0 minutes. A brand new hour starts here!', fives: [], extra: 0, total: '' };
  const fives = Array.from({ length: base / 5 }, (_, i) => (i + 1) * 5);
  const total = `${m} ${m === 1 ? 'minute' : 'minutes'}`;
  if (base === 0) return { text: `The long hand is ${steps(extra)} past the top.`, fives, extra, total };
  if (extra === 0) {
    return { text: `The long hand points at the red ${base / 5}, but the long hand does not use red numbers. It counts in fives:`, fives, extra, total };
  }
  return { text: `The long hand is ${steps(extra)} past the red ${base / 5}. Count in fives, then add the little steps:`, fives, extra, total };
}

/* ── Times Table Sprint: the times tables to 12 × 12 (Stage 2) ────────────
 *
 * Years 3 and 4 (NSW Stage 2) recall the multiplication facts. Knowing them
 * by heart is a different job from working them out, so this is quick-fire:
 * he types the answer, and only a quick one counts. A table at a time, in
 * the order schools teach them — the easy patterns first (×2, ×10, ×5),
 * then ×3 and ×4, then the hard middle — with the tables before it coming
 * back as review, then all of them mixed, then the same facts the other way
 * round as division. Each fact is remembered on its own (see timesQuestion),
 * so the ones he is slow on come back more often than the ones he knows. */

export interface TimesStep extends Step {
  /** the tables this step practises */
  tables: number[];
  /** tables from earlier steps, mixed in to keep them fresh */
  review: number[];
  /** the facts the other way round: 42 ÷ 6 */
  divide?: boolean;
}

const TIMES_ORDER = [[2, 10], [5], [3], [4], [6], [8], [7], [9], [11], [12]];
const ALL_TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const TIMES_STEPS: TimesStep[] = [
  ...TIMES_ORDER.map((tables, i): TimesStep => ({
    name: tables.map((t) => `× ${t}`).join(' and '),
    tables,
    review: TIMES_ORDER.slice(0, i).flat(),
  })),
  { name: 'Every table to 12 × 12', tables: ALL_TABLES, review: [] },
  { name: 'The other way round: ÷', tables: ALL_TABLES, review: [], divide: true },
];

/** the biggest number a table goes up to: 12 × 12 */
export const TIMES_TOP = 12;
/** how often a question comes from the review tables */
export const REVIEW_SHARE = 0.25;
/** a fact is known once it sits in this box: answered quickly twice */
export const KNOWN_BOX = 2;
const TOP_BOX = 4;

export interface TimesQuestion {
  /** shown left to right: a × b = answer, or a ÷ b = answer */
  a: number;
  b: number;
  op: '×' | '÷';
  answer: number;
  /** the table it belongs to, and how many of it: 7 × 6 in the ×6 table is 7 lots of 6 */
  table: number;
  lots: number;
  /** the same fact whichever way round it is shown */
  fact: string;
}

/** 6 × 7 and 7 × 6 are one fact to learn; division facts are kept apart */
export const factKey = (x: number, y: number, divide = false): string =>
  `${divide ? '÷' : '×'}${Math.min(x, y)}-${Math.max(x, y)}`;

/** every fact a step practises */
export function timesFacts(tables: number[], divide = false): string[] {
  const out = new Set<string>();
  for (const t of tables) for (let k = 1; k <= TIMES_TOP; k += 1) out.add(factKey(t, k, divide));
  return [...out];
}

/** where a fact moves after an answer: up a box when quick and right, back
    to the start when wrong, and where it was when right but slow */
export function nextBox(box: number, right: boolean, quick: boolean): number {
  if (!right) return 0;
  return quick ? Math.min(TOP_BOX, box + 1) : box;
}

/** has he got every fact of this step by heart? */
export function knowsStep(step: TimesStep, boxes: Readonly<Record<string, number>>): boolean {
  return timesFacts(step.tables, step.divide).every((f) => (boxes[f] ?? 0) >= KNOWN_BOX);
}

/** how much more often a fact comes up for each box it is in */
const WEIGHT = [8, 5, 3, 2, 1];

/**
 * The next question. Facts he has not got yet are picked more often than
 * the ones he has, and none of the last few comes straight back. A quarter
 * of the time it is a review of an earlier table.
 */
export function timesQuestion(
  step: TimesStep, boxes: Readonly<Record<string, number>>, recent: readonly string[] = [], random: () => number = Math.random,
): TimesQuestion {
  const reviewing = step.review.length > 0 && random() < REVIEW_SHARE;
  const tables = reviewing ? step.review : step.tables;
  const all: { table: number; lots: number; fact: string }[] = [];
  for (const table of tables) {
    for (let lots = 1; lots <= TIMES_TOP; lots += 1) all.push({ table, lots, fact: factKey(table, lots, step.divide) });
  }
  const fresh = all.filter((c) => !recent.includes(c.fact));
  const pool = fresh.length ? fresh : all;
  const weights = pool.map((c) => WEIGHT[Math.min(TOP_BOX, boxes[c.fact] ?? 0)]);
  let r = random() * weights.reduce((s, w) => s + w, 0);
  let chosen = pool[pool.length - 1];
  for (const [i, c] of pool.entries()) {
    r -= weights[i];
    if (r < 0) { chosen = c; break; }
  }
  const { table, lots, fact } = chosen;
  if (step.divide) return { a: table * lots, b: table, op: '÷', answer: lots, table, lots, fact };
  /* either way round: 7 × 6 and 6 × 7 are the same fact */
  const flip = random() < 0.5;
  return { a: flip ? table : lots, b: flip ? lots : table, op: '×', answer: table * lots, table, lots, fact };
}

/** the question the same fact asks when it comes back later in the round */
export function askAgain(q: TimesQuestion, random: () => number = Math.random): TimesQuestion {
  if (q.op === '÷') return q;
  const flip = random() < 0.5;
  return { ...q, a: flip ? q.table : q.lots, b: flip ? q.lots : q.table };
}

/**
 * How to get there from facts he knows, for a wrong answer: 7 lots of 6 is
 * 5 lots and 2 more lots; 12 lots is 10 lots and 2 more; up to 5 lots, or
 * any lots of 10, he counts on in the table. `parts` are the two blocks of
 * rows drawn on the array (the second is 0 when there is no split).
 */
export function timesHelp(q: TimesQuestion, unit: 'lots' | 'rows' = 'lots'): { text: string; parts: [number, number] } {
  const { table: t, lots: k } = q;
  const one = unit === 'rows' ? 'row' : 'lot';
  const fact = q.op === '÷'
    ? `${q.a} ÷ ${t} = ${k}, because ${k} × ${t} = ${q.a}.`
    : `${q.a} × ${q.b} = ${q.answer}.`;
  let how: string;
  let parts: [number, number] = [k, 0];
  if (t === 10) {
    how = `${k} ${k === 1 ? one : unit} of 10 is ${k} tens: ${k * 10}.`;
  } else if (k <= 5 || k === 10) {
    const counted = Array.from({ length: k }, (_, i) => (i + 1) * t);
    how = k === 1 ? `1 ${one} of ${t} is just ${t}.` : `Count in ${t}s: ${counted.join(', ')}.`;
  } else {
    const first = k < 10 ? 5 : 10;
    const rest = k - first;
    parts = [first, rest];
    how = `${k} ${unit} of ${t} is ${first} ${unit} and ${rest} more: ${first * t} and ${rest * t} make ${k * t}.`;
  }
  return { text: `${fact} ${how}`, parts };
}

/** how long an answer may take and still count as quick, by the grown-up's pace */
export type SprintPace = 'relaxed' | 'steady' | 'quick';
export const SPRINT_MS: Record<SprintPace, number> = { relaxed: 12000, steady: 8000, quick: 5000 };

/* ── Foosball Line-Up: the players on a real table's rods ────────────── */

/** a team on a real foosball table, from its own goal: a goalie, a defence
    of 2, a midfield of 5 and an attack of 3, 11 players like a real side */
export type LineupKind = 'goalie' | 'defence' | 'midfield' | 'attack';
export const LINEUP: { kind: LineupKind; players: number }[] = [
  { kind: 'goalie', players: 1 }, { kind: 'defence', players: 2 }, { kind: 'midfield', players: 5 }, { kind: 'attack', players: 3 },
];
export const LINEUP_TEAM = 11;
/** what a rod's players are called */
export const LINEUP_PEOPLE: Record<LineupKind, [string, string]> = {
  goalie: ['goalie', 'goalies'], defence: ['defender', 'defenders'], midfield: ['midfielder', 'midfielders'], attack: ['attacker', 'attackers'],
};
const lineupPlayers = (kind: LineupKind): number => LINEUP.find((r) => r.kind === kind)!.players;

/**
 * The eight rods across the table, from his goal on the left to theirs on
 * the right, as on every real table: each side's rods in between the
 * other's, so his attack faces their defence.
 */
export const LINEUP_TABLE: { kind: LineupKind; ours: boolean }[] = [
  { kind: 'goalie', ours: true }, { kind: 'defence', ours: true }, { kind: 'attack', ours: false }, { kind: 'midfield', ours: true },
  { kind: 'midfield', ours: false }, { kind: 'attack', ours: true }, { kind: 'defence', ours: false }, { kind: 'goalie', ours: false },
];

export interface LineupStep extends Step {
  /**
   * rod: count the players on the rod that glows;
   * two: the players on two of his rods together;
   * hiding: his team of 11 with one rod under a towel, how many are hiding;
   * spares: spare rods of the same kind in the club's cupboard (equal groups);
   * tournament: so many tables, how many of one kind of player on them all.
   */
  task: 'rod' | 'two' | 'hiding' | 'spares' | 'tournament';
}

export const LINEUP_STEPS: LineupStep[] = [
  { name: 'Count a rod', task: 'rod' },
  { name: 'Two rods together', task: 'two' },
  { name: 'Who is hiding?', task: 'hiding' },
  /* Year 2: equal groups, rods of 2, 3 and 5 */
  { name: 'Spare rods', task: 'spares' },
  /* Years 3–4: two teams to a table, and a tournament of tables */
  { name: 'A tournament', task: 'tournament' },
];

export interface LineupQuestion {
  task: LineupStep['task'];
  /** the rods that glow, by their place across the table (LINEUP_TABLE) */
  lit: number[];
  /** the rod under the towel, for hiding */
  hidden?: number;
  /** spares: how many rods, and of which kind */
  rods?: number;
  /** tournament: how many tables, and which players are counted ('all' for every one) */
  tables?: number;
  kind?: LineupKind | 'all';
  answer: number;
}

const ourRods = (): number[] => LINEUP_TABLE.flatMap((r, i) => (r.ours ? [i] : []));

export function lineupQuestion(step: LineupStep, last?: LineupQuestion): LineupQuestion {
  for (;;) {
    const q = makeLineup(step);
    if (!last || JSON.stringify(q) !== JSON.stringify(last)) return q;
  }
}

function makeLineup(step: LineupStep): LineupQuestion {
  const players = (i: number): number => lineupPlayers(LINEUP_TABLE[i].kind);
  switch (step.task) {
    case 'rod': {
      const at = rand(0, LINEUP_TABLE.length - 1);
      return { task: 'rod', lit: [at], answer: players(at) };
    }
    case 'two': {
      const [a, b] = shuffle(ourRods()).slice(0, 2).sort((x, y) => x - y);
      return { task: 'two', lit: [a, b], answer: players(a) + players(b) };
    }
    case 'hiding': {
      const hidden = pick(ourRods());
      return { task: 'hiding', lit: ourRods(), hidden, answer: players(hidden) };
    }
    case 'spares': {
      const kind = pick<LineupKind>(['defence', 'attack', 'midfield']);
      const rods = rand(2, 5);
      return { task: 'spares', lit: [], rods, kind, answer: rods * lineupPlayers(kind) };
    }
    case 'tournament': {
      const kind = pick<LineupKind | 'all'>(['goalie', 'defence', 'midfield', 'attack', 'all']);
      const tables = rand(2, 6);
      const lit = LINEUP_TABLE.flatMap((r, i) => (kind === 'all' || r.kind === kind ? [i] : []));
      return { task: 'tournament', lit, tables, kind, answer: tables * lineupPerTable(kind) };
    }
  }
}

/** how many of these players one table has: both teams' */
export const lineupPerTable = (kind: LineupKind | 'all'): number => 2 * (kind === 'all' ? LINEUP_TEAM : lineupPlayers(kind));

/** the answer and three slips: one off, a rod off, and the telling one for each task */
export function lineupChoices(q: LineupQuestion): number[] {
  const unit = q.task === 'spares' ? lineupPlayers(q.kind as LineupKind)
    : q.task === 'tournament' ? lineupPerTable(q.kind!) : 1;
  /* hiding: the whole team, or the players he can see; spares: adding the two
     numbers; tournament: only one team counted at each table */
  const telling = q.task === 'hiding' ? [LINEUP_TEAM, LINEUP_TEAM - q.answer]
    : q.task === 'spares' ? [q.rods! + unit]
      : q.task === 'tournament' ? [q.answer / 2] : [];
  const out = [q.answer];
  for (const x of [...telling, ...shuffle([q.answer + unit, q.answer - unit, q.answer + 1, q.answer - 1]), q.answer + 2, q.answer + 2 * unit, q.answer + 3]) {
    if (out.length >= 4) break;
    if (x >= 1 && Number.isInteger(x) && !out.includes(x)) out.push(x);
  }
  return out.sort((a, b) => a - b);
}

/** what he is asked */
export function lineupAsk(q: LineupQuestion): string {
  switch (q.task) {
    case 'rod': return 'How many players are on the glowing rod?';
    case 'two': return 'How many players are on the two glowing rods together?';
    case 'hiding': return `Your team has ${LINEUP_TEAM} players. Some are hiding under the towel. How many?`;
    case 'spares': {
      const n = lineupPlayers(q.kind as LineupKind);
      return `The club has ${q.rods} spare ${q.kind} rods, with ${n} players on each. How many players?`;
    }
    case 'tournament': {
      const who = q.kind === 'all' ? 'players' : LINEUP_PEOPLE[q.kind as LineupKind][1];
      return `A tournament on ${q.tables} tables. How many ${who} on all the tables?`;
    }
  }
}

/**
 * The way to work it out, said after every answer (the working out is the
 * lesson): counting the rod, counting on from the bigger rod, the team made
 * up to 11, counting in the rod's players, and for a tournament one table
 * first, then the tables (22 is 20 and 2).
 */
export function lineupWhy(q: LineupQuestion): string {
  const players = (i: number): number => lineupPlayers(LINEUP_TABLE[i].kind);
  const count = (n: number, by = 1): string => Array.from({ length: n }, (_, i) => (i + 1) * by).join(', ');
  switch (q.task) {
    case 'rod': return q.answer === 1 ? 'Just 1: the goalie.' : `Count them: ${count(q.answer)}. ${q.answer} players.`;
    case 'two': {
      const [big, small] = q.lit.map(players).sort((a, b) => b - a);
      const on = Array.from({ length: small }, (_, i) => big + i + 1).join(', ');
      return `Start at ${big} and count on ${small}: ${on}. ${big} and ${small} make ${q.answer}.`;
    }
    case 'hiding': {
      const seen = q.lit.filter((i) => i !== q.hidden).map(players);
      const sum = seen.reduce((a, b) => a + b, 0);
      return `You can see ${seen.slice(0, -1).join(', ')} and ${seen.at(-1)}: ${sum}. ${sum} and ${q.answer} more make ${LINEUP_TEAM}, so ${q.answer} ${q.answer === 1 ? 'is' : 'are'} hiding.`;
    }
    case 'spares': {
      const n = lineupPlayers(q.kind as LineupKind);
      return `Count in ${n}s: ${count(q.rods!, n)}. ${q.rods} rods of ${n} make ${q.answer}.`;
    }
    case 'tournament': {
      const t = q.tables!;
      const per = lineupPerTable(q.kind!);
      const table = q.kind === 'all'
        ? `Each table has 2 teams of ${LINEUP_TEAM}: ${per} players.`
        : `Each table has 2 ${q.kind} rods of ${lineupPlayers(q.kind as LineupKind)}: ${per} ${LINEUP_PEOPLE[q.kind as LineupKind][per === 1 ? 0 : 1]}.`;
      /* 22 is 20 and 2 */
      const [tens, ones] = [per - (per % 10), per % 10];
      const tables = per > 10
        ? `${t} tables of ${per} is ${t} lots of ${tens} and ${t} lots of ${ones}: ${t * tens} and ${t * ones} make ${q.answer}.`
        : `${t} tables of ${per} make ${q.answer}.`;
      return `${table} ${tables}`;
    }
  }
}
