/* Measure the Pitch: length, then area and capacity, at football training
 * (NSW Mathematics K–10, Stage 1: measuring and comparing with uniform
 * informal units, then metres and centimetres; area by covering with
 * squares; capacity by filling with cups).
 *
 * The things are training kit: the bench, the goal, a skipping rope, the
 * long jump mat. Each question is made at random and checked here: the
 * boots end to end cover the thing exactly, the ruler's reading is the
 * difference of its ends, a shape's squares are counted from its cells. */

import type { Step } from './maths';

export type Task = 'compare' | 'boots' | 'gaps' | 'ruler' | 'offset' | 'units' | 'area' | 'capacity';
export interface MeasureStep extends Step { task: Task }

export const MEASURE_STEPS: MeasureStep[] = [
  { name: 'Longer or shorter?', task: 'compare' },
  { name: 'How many boots long?', task: 'boots' },
  { name: 'Measured the right way?', task: 'gaps' },
  { name: 'Centimetres on a ruler', task: 'ruler' },
  { name: 'When the ruler does not start at 0', task: 'offset' },
  { name: 'Metres or centimetres?', task: 'units' },
  { name: 'Squares on the mat (area)', task: 'area' },
  { name: 'Cups in the bottle (capacity)', task: 'capacity' },
];

/** a thing to measure, with a colour to draw it in */
export interface Kit { id: string; name: string; colour: string }
export const KIT: Kit[] = [
  { id: 'bench', name: 'the bench', colour: '#B5895A' },
  { id: 'rope', name: 'the skipping rope', colour: '#E4572E' },
  { id: 'goal', name: 'the goal', colour: '#F4F1EA' },
  { id: 'hurdle', name: 'the hurdle', colour: '#F3B229' },
  { id: 'mat', name: 'the mat', colour: '#4A7FA8' },
  { id: 'banner', name: 'the banner', colour: '#7A5BA8' },
];
const kitById = (id: string): Kit => KIT.find((k) => k.id === id)!;
export const kitName = (id: string): string => kitById(id).name;

/** things measured in metres, and in centimetres, with a sensible size */
export interface Sized { name: string; size: number; unit: 'm' | 'cm'; what: 'long' | 'wide' | 'tall' }
export const SIZED: Sized[] = [
  { name: 'a football pitch', size: 100, unit: 'm', what: 'long' },
  { name: 'a goal', size: 7, unit: 'm', what: 'wide' },
  { name: 'a school bus', size: 12, unit: 'm', what: 'long' },
  { name: 'a swimming pool', size: 25, unit: 'm', what: 'long' },
  { name: 'a pencil', size: 15, unit: 'cm', what: 'long' },
  { name: 'a football boot', size: 20, unit: 'cm', what: 'long' },
  { name: 'a drink bottle', size: 25, unit: 'cm', what: 'tall' },
  { name: 'a shin pad', size: 18, unit: 'cm', what: 'long' },
];

/* ── the questions ──────────────────────────────────────────────────── */

export interface Bar { kit: string; from: number; length: number }

export interface MeasureQuestion {
  task: Task;
  ask: string;
  /** the answer keys on the buttons, and what each says */
  options: string[];
  labels?: Record<string, string>;
  answer: string;
  why: string;
  /** what is drawn */
  bars?: Bar[];
  /** boots end to end under a bar: one row, or two (the right way and the wrong way) */
  rows?: { name: string; at: number[] }[];
  /** a ruler from 0 to this many centimetres */
  ruler?: number;
  /** the squares a shape covers on the mat, [column, row] */
  cells?: [number, number][];
  /** a bottle that holds this many cups, and how many are poured so far */
  cups?: number;
}

type Rand = () => number;
const int = (r: Rand, n: number): number => Math.floor(r() * n);
const between = (r: Rand, a: number, b: number): number => a + int(r, b - a + 1);
const shuffle = <T>(list: readonly T[], r: Rand): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) { const j = int(r, i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};
const two = <T>(list: readonly T[], r: Rand): [T, T] => { const s = shuffle(list, r); return [s[0], s[1]]; };
const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);

/** the answer and two others near it, all at least `least` */
export function near(answer: number, r: Rand, least = 1, spread = 3): string[] {
  const set = new Set([answer]);
  while (set.size < 3) {
    const n = answer + (r() < 0.5 ? -1 : 1) * between(r, 1, spread);
    if (n >= least) set.add(n);
  }
  return shuffle([...set], r).map(String);
}

function compare(r: Rand): MeasureQuestion {
  const [a, b] = two(KIT, r);
  const la = between(r, 3, 9);
  let lb = between(r, 3, 9);
  while (lb === la) lb = between(r, 3, 9);
  const longer = r() < 0.6;
  const pick = (longer ? la > lb : la < lb) ? a : b;
  return {
    task: 'compare', ask: `Which is ${longer ? 'longer' : 'shorter'}?`, options: [a.id, b.id],
    labels: { [a.id]: cap(a.name), [b.id]: cap(b.name) }, answer: pick.id,
    why: `${cap(pick.name)} is ${longer ? 'longer' : 'shorter'}. They start at the same line, so look at where each one ends.`,
    bars: [{ kit: a.id, from: 0, length: la }, { kit: b.id, from: 0, length: lb }],
  };
}

function boots(r: Rand): MeasureQuestion {
  const k = KIT[int(r, KIT.length)];
  const n = between(r, 3, 9);
  return {
    task: 'boots', ask: `How many boots long is ${k.name}?`, options: near(n, r, 2), answer: String(n),
    why: `Count the boots, end to end: ${k.name} is ${n} boots long.`,
    bars: [{ kit: k.id, from: 0, length: n }], rows: [{ name: 'boots', at: Array.from({ length: n }, (_, i) => i) }],
  };
}

/** two teams measure the same thing: one end to end, one with gaps (or overlaps) */
function gaps(r: Rand): MeasureQuestion {
  const k = KIT[int(r, KIT.length)];
  const n = between(r, 4, 8);
  const right = Array.from({ length: n }, (_, i) => i);
  /* gaps: fewer boots spread out over the same length; overlaps: more, bunched */
  const spaced = r() < 0.5;
  const m = spaced ? n - between(r, 1, 2) : n + between(r, 1, 2);
  const wrong = Array.from({ length: m }, (_, i) => (i * (n - 1)) / (m - 1));
  const blueRight = r() < 0.5;
  return {
    task: 'gaps', ask: `Two teams measured ${k.name} in boots. Which team did it the right way?`,
    options: ['blue', 'red'], labels: { blue: 'Blue team', red: 'Red team' }, answer: blueRight ? 'blue' : 'red',
    why: `The boots must touch end to end, with no gaps and no overlaps. ${blueRight ? 'Blue' : 'Red'} did it that way: ${n} boots.`,
    bars: [{ kit: k.id, from: 0, length: n }],
    rows: blueRight ? [{ name: 'blue', at: right }, { name: 'red', at: wrong }] : [{ name: 'blue', at: wrong }, { name: 'red', at: right }],
  };
}

function ruler(r: Rand, offset: boolean): MeasureQuestion {
  const k = KIT[int(r, KIT.length)];
  const length = between(r, offset ? 3 : 2, offset ? 10 : 14);
  const from = offset ? between(r, 1, 15 - length) : 0;
  const to = from + length;
  return {
    task: offset ? 'offset' : 'ruler', ask: `How many centimetres long is ${k.name}?`, options: offset ? shuffle([...new Set([length, to, from === 1 ? length - 1 : length + 1])].map(String), r) : near(length, r, 1),
    answer: String(length),
    why: offset
      ? `It starts at ${from} and ends at ${to}, not at 0. Count the centimetres from ${from} to ${to}: ${length}.`
      : `It starts at 0 and ends at ${length}: ${length} centimetres.`,
    bars: [{ kit: k.id, from, length }], ruler: 15,
  };
}

function units(r: Rand): MeasureQuestion {
  const s = SIZED[int(r, SIZED.length)];
  if (r() < 0.5) {
    return {
      task: 'units', ask: `Would you measure ${s.name} in metres or centimetres?`, options: ['m', 'cm'],
      labels: { m: 'Metres', cm: 'Centimetres' }, answer: s.unit,
      why: s.unit === 'm' ? `${cap(s.name)} is big: metres. A metre is 100 centimetres, about one big step.` : `${cap(s.name)} is small: centimetres. A centimetre is about as wide as your finger.`,
    };
  }
  /* about how big: the right size in the right unit, beside the wrong unit and ten times too big */
  const say = (n: number, u: string): string => `${n} ${u === 'm' ? 'metres' : 'centimetres'}`;
  const other = s.unit === 'm' ? 'cm' : 'm';
  const opts = [`${s.size}${s.unit}`, `${s.size}${other}`, `${s.size * 10}${s.unit}`];
  const labels = Object.fromEntries(opts.map((o) => [o, say(Number(o.replace(/\D+$/, '')), o.replace(/^\d+/, ''))]));
  return {
    task: 'units', ask: `About how ${s.what} is ${s.name}?`, options: shuffle(opts, r), labels, answer: opts[0],
    why: `${cap(s.name)} is about ${say(s.size, s.unit)} ${s.what}.`,
  };
}

/** a rectangle, or an L of two, on the mat; how many squares it covers */
export function area(r: Rand = Math.random): MeasureQuestion {
  const cols = between(r, 2, 5);
  const rows = between(r, 2, 4);
  const cells: [number, number][] = [];
  for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1) cells.push([x, y]);
  const ell = r() < 0.4;
  if (ell) {
    const extra = between(r, 1, 3);
    for (let y = rows; y < rows + extra; y += 1) cells.push([0, y]);
  }
  const n = cells.length;
  return {
    task: 'area', ask: 'How many squares does the shape cover?', options: near(n, r, 2), answer: String(n), cells,
    why: ell
      ? `${rows} rows of ${cols} is ${rows * cols}, and ${n - rows * cols} more: ${n} squares.`
      : `${rows} rows of ${cols} squares: ${n} squares.`,
  };
}

function capacity(r: Rand): MeasureQuestion {
  const n = between(r, 3, 8);
  return {
    task: 'capacity', ask: 'How many cups of water fill the bottle?', options: near(n, r, 2), answer: String(n), cups: n,
    why: `Each line up the bottle is one more cup. Count the lines to the top: it holds ${n} cups.`,
  };
}

export function measureQuestion(task: Task, r: Rand = Math.random): MeasureQuestion {
  switch (task) {
    case 'compare': return compare(r);
    case 'boots': return boots(r);
    case 'gaps': return gaps(r);
    case 'ruler': return ruler(r, false);
    case 'offset': return ruler(r, true);
    case 'units': return units(r);
    case 'area': return area(r);
    default: return capacity(r);
  }
}

export const CHEER = 'Good measuring!';

/** the lines that are always the same, for the recordings */
export function measureLines(): string[] {
  const out = [CHEER, 'Which is longer?', 'Which is shorter?', 'How many squares does the shape cover?', 'How many cups of water fill the bottle?'];
  for (const k of KIT) out.push(`How many boots long is ${k.name}?`, `How many centimetres long is ${k.name}?`, `Two teams measured ${k.name} in boots. Which team did it the right way?`);
  for (const s of SIZED) {
    out.push(`Would you measure ${s.name} in metres or centimetres?`, `About how ${s.what} is ${s.name}?`,
      `${cap(s.name)} is about ${s.size} ${s.unit === 'm' ? 'metres' : 'centimetres'} ${s.what}.`,
      s.unit === 'm' ? `${cap(s.name)} is big: metres. A metre is 100 centimetres, about one big step.` : `${cap(s.name)} is small: centimetres. A centimetre is about as wide as your finger.`);
  }
  return out;
}
