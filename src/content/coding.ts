/* Code the Striker: a first taste of programming (NSW Science and Technology
 * K–6, Stage 1: "create a sequential algorithm that controls a digital
 * device").
 *
 * The pitch is a grid. He lines up arrow cards — the program — and presses
 * Go; only then does the player move, one square per card, and the program
 * works if it takes him to the ball (and, on the later steps, on into the
 * goal) without bumping a cone or running off the pitch. If it does not, he
 * sees where it went wrong, fixes it, and goes again: that is debugging.
 *
 * Repeat (one card that goes three squares) is past Stage 1, so it is the
 * top step, for after the rest.
 *
 * Every puzzle is made at random and checked here: it can be solved, within
 * the cards it allows, and on the cone step the cones are really in the way. */

import type { Step } from './maths';

export type Dir = 'up' | 'down' | 'left' | 'right';
export const DIRS: Dir[] = ['up', 'right', 'down', 'left'];
export const ARROW: Record<Dir, string> = { up: '↑', right: '→', down: '↓', left: '←' };
const MOVE: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/** a square: column across from the left, row down from the top */
export interface Cell { x: number; y: number }
export const same = (a: Cell, b: Cell): boolean => a.x === b.x && a.y === b.y;
const key = (c: Cell): string => `${c.x},${c.y}`;

/** one card of the program: an arrow, and how many squares it goes (repeat) */
export interface Card { dir: Dir; times: number }

export interface Puzzle {
  /** squares across and down */
  size: number;
  start: Cell;
  /** where he must get to, in order: the ball, then (on the later steps) the goal */
  targets: Cell[];
  cones: Cell[];
  /** the program on the bug step, which has one mistake in it */
  given?: Card[];
  /** the most cards he may use */
  most: number;
}

export type Task = 'line' | 'corner' | 'cones' | 'bug' | 'goal' | 'repeat';
export interface CodeStep extends Step { task: Task }

export const CODE_STEPS: CodeStep[] = [
  { name: 'Straight to the ball', task: 'line' },
  { name: 'Round the corner', task: 'corner' },
  { name: 'Round the cones', task: 'cones' },
  { name: 'Find the bug', task: 'bug' },
  { name: 'Ball, then goal', task: 'goal' },
  { name: 'Repeat (Years 3–4)', task: 'repeat' },
];

export const SIZE = 6;

/* ── running a program ─────────────────────────────────────────────── */

export type Stop = 'done' | 'cone' | 'edge' | 'short' | 'missed' | 'past';

export interface Run {
  /** every square he stands on, the start first */
  path: Cell[];
  /** the square he would have moved into, where he bumped a cone or the edge */
  bump?: Cell;
  /** how it ended: done, or what went wrong */
  stop: Stop;
  /** how many of the targets he reached, in order */
  reached: number;
}

/** the cards as single squares: → ×3 is → → → */
export const steps = (cards: Card[]): Dir[] => cards.flatMap((c) => Array<Dir>(c.times).fill(c.dir));

/** move the player through the program, square by square */
export function run(p: Puzzle, cards: Card[]): Run {
  const cones = new Set(p.cones.map(key));
  let at = p.start;
  const path = [at];
  let reached = 0;
  for (const d of steps(cards)) {
    const [dx, dy] = MOVE[d];
    const next = { x: at.x + dx, y: at.y + dy };
    if (next.x < 0 || next.y < 0 || next.x >= p.size || next.y >= p.size) return { path, bump: next, stop: 'edge', reached };
    if (cones.has(key(next))) return { path, bump: next, stop: 'cone', reached };
    at = next;
    path.push(at);
    if (reached < p.targets.length && same(at, p.targets[reached])) reached += 1;
  }
  const last = p.targets.length;
  if (reached === last && same(at, p.targets[last - 1])) return { path, stop: 'done', reached };
  /* reached them all but walked on: he must stop on the last one */
  if (reached === last) return { path, stop: 'past', reached };
  /* the goal before the ball, or nowhere near: a target is still to get */
  const missed = p.targets.slice(reached).some((t) => path.some((c) => same(c, t)));
  return { path, stop: missed ? 'missed' : 'short', reached };
}

export const solves = (p: Puzzle, cards: Card[]): boolean => cards.length <= p.most && run(p, cards).stop === 'done';

/* ── the shortest way, for checking puzzles and for the hint ───────── */

/** the fewest squares from one cell to another, round the cones; null if there is no way */
function walk(p: Puzzle, from: Cell, to: Cell, avoid: Cell[]): Dir[] | null {
  const blocked = new Set([...p.cones, ...avoid].map(key));
  const back = new Map<string, [string, Dir] | null>([[key(from), null]]);
  const queue = [from];
  while (queue.length) {
    const at = queue.shift()!;
    if (same(at, to)) {
      const out: Dir[] = [];
      for (let k = key(at); back.get(k);) { const [prev, d] = back.get(k)!; out.unshift(d); k = prev; }
      return out;
    }
    for (const d of DIRS) {
      const [dx, dy] = MOVE[d];
      const next = { x: at.x + dx, y: at.y + dy };
      const k = key(next);
      if (next.x < 0 || next.y < 0 || next.x >= p.size || next.y >= p.size || blocked.has(k) || back.has(k)) continue;
      back.set(k, [key(at), d]);
      queue.push(next);
    }
  }
  return null;
}

/** squares in a row the same way, made into one card each (with repeat) or left as single cards */
export function cardsOf(dirs: Dir[], repeat: boolean): Card[] {
  if (!repeat) return dirs.map((dir) => ({ dir, times: 1 }));
  const out: Card[] = [];
  for (const dir of dirs) {
    const last = out.at(-1);
    if (last && last.dir === dir && last.times < MOST_TIMES) last.times += 1;
    else out.push({ dir, times: 1 });
  }
  return out;
}
export const MOST_TIMES = 4;

/** a shortest program for the puzzle: through each target in order (not stepping
    on a later one early), straight lines where the cones allow; null if there is none */
export function shortest(p: Puzzle, repeat = false): Card[] | null {
  let at = p.start;
  const all: Dir[] = [];
  for (let i = 0; i < p.targets.length; i += 1) {
    const later = p.targets.slice(i + 1);
    const leg = straightest(p, at, p.targets[i], later);
    if (!leg) return null;
    all.push(...leg);
    at = p.targets[i];
  }
  return cardsOf(all, repeat);
}

/** of the two L-shaped ways, one that is clear, else the walk round the cones */
function straightest(p: Puzzle, from: Cell, to: Cell, avoid: Cell[]): Dir[] | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const across: Dir[] = Array<Dir>(Math.abs(dx)).fill(dx > 0 ? 'right' : 'left');
  const down: Dir[] = Array<Dir>(Math.abs(dy)).fill(dy > 0 ? 'down' : 'up');
  const blocked = [...p.cones, ...avoid];
  for (const way of [[...across, ...down], [...down, ...across]]) {
    const trial: Puzzle = { ...p, start: from, targets: [to], cones: blocked };
    if (run(trial, cardsOf(way, false)).stop === 'done') return way;
  }
  return walk(p, from, to, avoid);
}

/* ── making puzzles ────────────────────────────────────────────────── */

type Rand = () => number;
const int = (r: Rand, n: number): number => Math.floor(r() * n);
const cell = (r: Rand, size = SIZE): Cell => ({ x: int(r, size), y: int(r, size) });
const dist = (a: Cell, b: Cell): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** the goal: the middle of the top line of the pitch */
export const GOAL: Cell = { x: Math.floor(SIZE / 2), y: 0 };

/** a puzzle for this step, solvable within its cards */
export function makePuzzle(task: Task, r: Rand = Math.random): Puzzle {
  for (let tries = 0; tries < 500; tries += 1) {
    const p = attempt(task, r);
    if (p) return p;
  }
  throw new Error(`no ${task} puzzle`);
}

function attempt(task: Task, r: Rand): Puzzle | null {
  const start = cell(r);
  const ball = cell(r);
  if (same(start, ball)) return null;
  const lined = start.x === ball.x || start.y === ball.y;
  if (task === 'line') {
    if (!lined || dist(start, ball) < 2 || dist(start, ball) > 4) return null;
    return { size: SIZE, start, targets: [ball], cones: [], most: 6 };
  }
  if (task === 'corner') {
    if (lined || dist(start, ball) < 3 || dist(start, ball) > 6) return null;
    return { size: SIZE, start, targets: [ball], cones: [], most: 8 };
  }
  if (task === 'cones' || task === 'bug') {
    if (lined || dist(start, ball) < 3 || dist(start, ball) > 6) return null;
    const cones: Cell[] = [];
    const want = task === 'cones' ? 2 + int(r, 3) : 1 + int(r, 2);
    while (cones.length < want) {
      const c = cell(r);
      if (same(c, start) || same(c, ball) || cones.some((x) => same(x, c))) continue;
      cones.push(c);
    }
    const p: Puzzle = { size: SIZE, start, targets: [ball], cones, most: 10 };
    const best = shortest(p);
    if (!best || best.length > 8) return null;
    if (task === 'cones' && !conesInTheWay(p)) return null;
    if (task === 'bug') {
      const given = withBug(p, best, r);
      return given ? { ...p, given } : null;
    }
    return p;
  }
  if (task === 'goal') {
    /* the ball somewhere below the goal, the player further down */
    if (same(ball, GOAL) || same(start, GOAL) || ball.y < 1 || start.y < 2 || dist(ball, GOAL) < 2) return null;
    const p: Puzzle = { size: SIZE, start, targets: [ball, GOAL], cones: [], most: 12 };
    const best = shortest(p);
    if (!best || best.length > 10 || dist(start, ball) < 2) return null;
    return p;
  }
  /* repeat: long straight runs, and fewer cards than squares */
  if (lined || Math.abs(start.x - ball.x) < 3 || Math.abs(start.y - ball.y) < 3) return null;
  const p: Puzzle = { size: SIZE, start, targets: [ball], cones: [], most: 2 };
  return shortest(p, true)!.length <= 2 ? p : null;
}

/** do the cones matter? Neither L-shaped way is clear */
export function conesInTheWay(p: Puzzle): boolean {
  const from = p.start;
  const to = p.targets[0];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const across: Dir[] = Array<Dir>(Math.abs(dx)).fill(dx > 0 ? 'right' : 'left');
  const down: Dir[] = Array<Dir>(Math.abs(dy)).fill(dy > 0 ? 'down' : 'up');
  return [[...across, ...down], [...down, ...across]].every((w) => run(p, cardsOf(w, false)).stop !== 'done');
}

/** the working program with one card wrong, so that it fails */
function withBug(p: Puzzle, good: Card[], r: Rand): Card[] | null {
  for (let tries = 0; tries < 30; tries += 1) {
    const i = int(r, good.length);
    const turned = DIRS.filter((d) => d !== good[i].dir)[int(r, 3)];
    const bad = good.map((c, j) => (j === i ? { dir: turned, times: 1 } : { ...c }));
    if (!solves(p, bad)) return bad;
  }
  return null;
}

/* ── what it says ──────────────────────────────────────────────────── */

export const ASK: Record<Task, string> = {
  line: 'Make a program to get the player to the ball. Then press Go!',
  corner: 'Get the player to the ball. You will need to turn a corner!',
  cones: 'Get to the ball, but do not bump into the cones!',
  bug: 'This program has a bug. Fix it, then press Go!',
  goal: 'Get the ball, then take it into the goal!',
  repeat: 'Use repeat to make one card go further. You can only use 2 cards!',
};

export const SAYS = {
  done: 'Got it! The program worked.',
  goal: 'Goal! The program worked.',
  cone: 'Bump! The player hit a cone. Fix the program and try again.',
  edge: 'Oops, off the pitch! Fix the program and try again.',
  short: 'The player stopped before the ball. Add some more cards.',
  missed: 'The player missed the ball on the way. Fix the program and try again.',
  past: 'The player went past it. The player has to stop on the ball. Try again.',
  goalShort: 'The player has the ball, but he stopped before the goal. Add some more cards.',
  goalPast: 'The player went past the goal. The player has to stop in it. Try again.',
  empty: 'Put some arrow cards in the program first.',
  tooMany: 'Too many cards! Use repeat to make them shorter.',
  shown: 'Here is a program that works. Watch!',
} as const;

/** what to say when a program has run */
export function verdict(p: Puzzle, r: Run): string {
  const toGoal = p.targets.length > 1;
  if (r.stop === 'done') return toGoal ? SAYS.goal : SAYS.done;
  if (toGoal && r.reached >= 1 && r.stop === 'short') return SAYS.goalShort;
  if (toGoal && r.stop === 'past') return SAYS.goalPast;
  return SAYS[r.stop];
}

export const CHEER = 'Good coding!';

/** every line the game says, for the recordings */
export const codeLines = (): string[] => [...Object.values(ASK), ...Object.values(SAYS), CHEER];
