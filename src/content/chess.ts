/* Chess: the pieces, how they move, and the first games' questions.
 *
 * Chess is taught to young children a piece at a time, on a board with
 * almost nothing else on it: where can the rook go? Then a target to reach,
 * then several, then something in the way. These are those first steps.
 * There is no check, no castling and no en passant here: a piece, the
 * squares it can reach, and the pieces that stop it.
 *
 * A square is a number from 0 (a1) to 63 (h8): the file (a–h) plus eight
 * times the rank (1–8) less one. White plays up the board. */

import type { Step } from './maths';

export type Kind = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
export type Colour = 'w' | 'b';
export interface Man { kind: Kind; colour: Colour }
/** what stands where; an empty square is not in it */
export type Board = Map<number, Man>;

export const FILES = 'abcdefgh';
export const fileOf = (sq: number): number => sq % 8;
export const rankOf = (sq: number): number => Math.floor(sq / 8);
export const at = (file: number, rank: number): number => rank * 8 + file;
export const onBoard = (file: number, rank: number): boolean => file >= 0 && file < 8 && rank >= 0 && rank < 8;
/** e4, as it is written and said */
export const squareName = (sq: number): string => `${FILES[fileOf(sq)]}${rankOf(sq) + 1}`;
export const squareAt = (name: string): number => at(FILES.indexOf(name[0]), Number(name[1]) - 1);
/** a1 is a dark square */
export const isDark = (sq: number): boolean => (fileOf(sq) + rankOf(sq)) % 2 === 0;

export interface PieceInfo { name: string; moves: string }

export const PIECES: Record<Kind, PieceInfo> = {
  R: { name: 'rook', moves: 'The rook goes in straight lines, up and down or across, as far as it likes.' },
  B: { name: 'bishop', moves: 'The bishop goes on the slant, as far as it likes, and always stays on its own colour.' },
  Q: { name: 'queen', moves: 'The queen goes in straight lines or on the slant, as far as she likes.' },
  K: { name: 'king', moves: 'The king goes one square, any way.' },
  N: { name: 'knight', moves: 'The knight jumps in an L: two squares one way, then one to the side. It jumps over anything in the way.' },
  P: { name: 'pawn', moves: 'The pawn goes forward one square, or two on its very first move. It takes on the slant.' },
};

const STRAIGHT: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const SLANT: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const JUMPS: [number, number][] = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

/**
 * The squares a piece can move to: empty ones, and ones with the other
 * side's pieces on (a capture). A piece of its own side stops it, and so
 * does an enemy, after it is taken.
 */
export function moves(from: number, board: Board): number[] {
  const man = board.get(from);
  if (!man) return [];
  const [f, r] = [fileOf(from), rankOf(from)];
  const out: number[] = [];
  const free = (sq: number): boolean => !board.has(sq);
  const enemy = (sq: number): boolean => !!board.get(sq) && board.get(sq)!.colour !== man.colour;
  const ride = (dirs: [number, number][], far: boolean): void => {
    for (const [df, dr] of dirs) {
      for (let k = 1; k <= (far ? 7 : 1); k += 1) {
        const [nf, nr] = [f + df * k, r + dr * k];
        if (!onBoard(nf, nr)) break;
        const sq = at(nf, nr);
        if (free(sq)) { out.push(sq); continue; }
        if (enemy(sq)) out.push(sq);
        break;
      }
    }
  };
  if (man.kind === 'R') ride(STRAIGHT, true);
  if (man.kind === 'B') ride(SLANT, true);
  if (man.kind === 'Q') ride([...STRAIGHT, ...SLANT], true);
  if (man.kind === 'K') ride([...STRAIGHT, ...SLANT], false);
  if (man.kind === 'N') {
    for (const [df, dr] of JUMPS) {
      const [nf, nr] = [f + df, r + dr];
      if (onBoard(nf, nr) && (free(at(nf, nr)) || enemy(at(nf, nr)))) out.push(at(nf, nr));
    }
  }
  if (man.kind === 'P') {
    const up = man.colour === 'w' ? 1 : -1;
    const home = man.colour === 'w' ? 1 : 6;
    if (onBoard(f, r + up) && free(at(f, r + up))) {
      out.push(at(f, r + up));
      if (r === home && free(at(f, r + 2 * up))) out.push(at(f, r + 2 * up));
    }
    for (const df of [-1, 1]) if (onBoard(f + df, r + up) && enemy(at(f + df, r + up))) out.push(at(f + df, r + up));
  }
  return out;
}

/** the fewest moves for a piece to get from one square to another, with
    the board as it is; Infinity when it never can */
export function fewestMoves(from: number, to: number, board: Board): number {
  const man = board.get(from);
  if (!man) return Infinity;
  const seen = new Map([[from, 0]]);
  const queue = [from];
  while (queue.length) {
    const sq = queue.shift()!;
    if (sq === to) return seen.get(sq)!;
    const here = new Map(board);
    here.delete(from);
    here.set(sq, man);
    for (const next of moves(sq, here)) {
      if (!seen.has(next)) { seen.set(next, seen.get(sq)! + 1); queue.push(next); }
    }
  }
  return Infinity;
}

/** the fewest moves to collect every ball, in the best order */
export function fewestToCollect(from: number, balls: number[], board: Board): number {
  if (!balls.length) return 0;
  let best = Infinity;
  for (const [i, ball] of balls.entries()) {
    const first = fewestMoves(from, ball, board);
    if (first === Infinity) continue;
    const moved = new Map(board);
    const man = moved.get(from)!;
    moved.delete(from);
    moved.set(ball, man);
    best = Math.min(best, first + fewestToCollect(ball, balls.filter((_, j) => j !== i), moved));
  }
  return best;
}

/* ── the questions ─────────────────────────────────────────────────────── */

export interface PieceStep extends Step {
  /**
   * reach: move the piece to the ball;
   * which: tap every ball it can reach in one move;
   * blocked: the same, with its own pawns in the way.
   */
  task: 'reach' | 'which' | 'blocked';
  kinds: Kind[];
}

export const PIECE_STEPS: PieceStep[] = [
  { name: 'The rook', task: 'reach', kinds: ['R'] },
  { name: 'The bishop', task: 'reach', kinds: ['B'] },
  { name: 'The queen', task: 'reach', kinds: ['Q'] },
  { name: 'The king', task: 'reach', kinds: ['K'] },
  { name: 'The pawn', task: 'reach', kinds: ['P'] },
  { name: 'The knight', task: 'reach', kinds: ['N'] },
  { name: 'Which balls can it reach?', task: 'which', kinds: ['R', 'B', 'Q', 'K', 'N'] },
  { name: 'Something in the way', task: 'blocked', kinds: ['R', 'B', 'Q'] },
];

export interface PieceQuestion {
  kind: Kind;
  from: number;
  board: Board;
  /** where the balls are, and which of them it can reach in one move */
  balls: number[];
  reach: number[];
}

type Rand = () => number;
const randInt = (lo: number, hi: number, rand: Rand): number => lo + Math.floor(rand() * (hi - lo + 1));
const pickOne = <T>(xs: readonly T[], rand: Rand): T => xs[Math.floor(rand() * xs.length)];
const shuffled = <T>(xs: readonly T[], rand: Rand): T[] => {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export function pieceQuestion(step: PieceStep, last?: PieceQuestion, rand: Rand = Math.random): PieceQuestion {
  for (;;) {
    const kind = pickOne(step.kinds, rand);
    /* a pawn starts on its own row half the time, so the double step comes up */
    const from = kind === 'P' ? at(randInt(0, 7, rand), rand() < 0.5 ? 1 : randInt(2, 5, rand)) : randInt(0, 63, rand);
    const board: Board = new Map([[from, { kind, colour: 'w' as Colour }]]);
    if (step.task === 'blocked') {
      /* two or three of his own pawns on its lines, a square or more away */
      const lines = moves(from, board).filter((sq) => Math.max(Math.abs(fileOf(sq) - fileOf(from)), Math.abs(rankOf(sq) - rankOf(from))) >= 2);
      for (const sq of shuffled(lines, rand).slice(0, randInt(2, 3, rand))) board.set(sq, { kind: 'P', colour: 'w' });
    }
    const can = moves(from, board);
    /* boxed in by its own pawns, it would have too little to choose from */
    if (step.task !== 'reach' && can.length < 3) continue;
    let balls: number[];
    if (step.task === 'reach') {
      balls = [pickOne(can, rand)];
    } else {
      /* some it can reach, and some it nearly can: one square off its lines,
         or behind its own pawn */
      const yes = shuffled(can, rand).slice(0, randInt(2, 3, rand));
      const empty = Array.from({ length: 64 }, (_, i) => i).filter((sq) => sq !== from && !board.has(sq) && !can.includes(sq));
      const near = empty.filter((sq) => can.some((c) => Math.max(Math.abs(fileOf(c) - fileOf(sq)), Math.abs(rankOf(c) - rankOf(sq))) === 1));
      const no = shuffled(near.length ? near : empty, rand).slice(0, 5 - yes.length);
      balls = shuffled([...yes, ...no], rand);
    }
    if (!balls.length) continue;
    const q = { kind, from, board, balls, reach: balls.filter((b) => can.includes(b)) };
    if (last && last.from === q.from && last.kind === q.kind) continue;
    return q;
  }
}

/* ── Collect the Balls ─────────────────────────────────────────────────── */

export interface BallStep extends Step {
  kind: Kind;
  balls: number;
  /** the knight's balls are at least this many jumps away */
  far?: number;
}

export const BALL_STEPS: BallStep[] = [
  { name: 'Rook, two balls', kind: 'R', balls: 2 },
  { name: 'Bishop, two balls', kind: 'B', balls: 2 },
  { name: 'Queen, three balls', kind: 'Q', balls: 3 },
  { name: 'King, three balls', kind: 'K', balls: 3 },
  { name: 'Knight, one ball', kind: 'N', balls: 1, far: 2 },
  { name: 'Knight, two balls', kind: 'N', balls: 2, far: 2 },
  { name: 'Queen, four balls', kind: 'Q', balls: 4 },
];

export interface BallQuestion {
  kind: Kind;
  from: number;
  balls: number[];
  /** the fewest moves that collect them all */
  best: number;
}

export function ballQuestion(step: BallStep, last?: BallQuestion, rand: Rand = Math.random): BallQuestion {
  for (;;) {
    const from = randInt(0, 63, rand);
    const board: Board = new Map([[from, { kind: step.kind, colour: 'w' as Colour }]]);
    /* a bishop only ever reaches its own colour */
    const options = Array.from({ length: 64 }, (_, i) => i)
      .filter((sq) => sq !== from && (step.kind !== 'B' || isDark(sq) === isDark(from)))
      .filter((sq) => fewestMoves(from, sq, board) >= (step.far ?? 1));
    const balls = shuffled(options, rand).slice(0, step.balls);
    if (balls.length < step.balls) continue;
    const best = fewestToCollect(from, balls, board);
    /* each ball should take a move of its own: no gift of three in a row
       on one line, and nothing too long for a first game */
    if (best === Infinity || best < step.balls || best > step.balls * 3) continue;
    if (last && last.from === from) continue;
    return { kind: step.kind, from, balls, best };
  }
}
