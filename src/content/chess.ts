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

/* ── what attacks what ─────────────────────────────────────────────────── */

/**
 * The squares a piece attacks: where it could take something. Unlike its
 * moves, a pawn attacks only on the slant, whatever is there, and a piece
 * attacks a square its own side stands on too — that is guarding it.
 */
export function attacks(from: number, board: Board): number[] {
  const man = board.get(from);
  if (!man) return [];
  const [f, r] = [fileOf(from), rankOf(from)];
  if (man.kind === 'P') {
    const up = man.colour === 'w' ? 1 : -1;
    return [-1, 1].filter((df) => onBoard(f + df, r + up)).map((df) => at(f + df, r + up));
  }
  /* the same lines as its moves, with every piece in the way counted as the other side's */
  const flipped: Board = new Map([...board].map(([sq, m]) => [sq, sq === from ? m : { ...m, colour: man.colour === 'w' ? 'b' : 'w' }]));
  return moves(from, flipped);
}

/** is anything of this colour guarding the square? */
export const guarded = (sq: number, by: Colour, board: Board): boolean =>
  [...board].some(([from, m]) => m.colour === by && from !== sq && attacks(from, board).includes(sq));

/** what a piece is worth, as children are taught: a pawn 1, a knight or a bishop 3, a rook 5, a queen 9 */
export const VALUE: Record<Kind, number> = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };

/* ── Capture! ──────────────────────────────────────────────────────────── */

export interface CaptureStep extends Step {
  /**
   * take: one of the black pieces can be taken, tap it;
   * free: two can, but one is guarded — take the free one;
   * best: two can, both free — take the one worth more.
   */
  task: 'take' | 'free' | 'best';
  kinds: Kind[];
}

export const CAPTURE_STEPS: CaptureStep[] = [
  { name: 'Take a piece', task: 'take', kinds: ['R', 'B', 'Q'] },
  { name: 'Knights, kings and pawns take too', task: 'take', kinds: ['N', 'K', 'P'] },
  { name: 'Take the free one', task: 'free', kinds: ['R', 'B', 'Q', 'N'] },
  { name: 'Take the one worth more', task: 'best', kinds: ['R', 'B', 'Q', 'N'] },
];

export interface CaptureQuestion {
  kind: Kind;
  from: number;
  board: Board;
  /** the black pieces he could take */
  takes: number[];
  answer: number;
  /** free: the piece he should not take, and what guards it */
  trap?: number;
  guard?: number;
}

const TARGETS: Kind[] = ['P', 'N', 'B', 'R', 'Q'];

export function captureQuestion(step: CaptureStep, last?: CaptureQuestion, rand: Rand = Math.random): CaptureQuestion {
  for (;;) {
    const kind = pickOne(step.kinds, rand);
    const from = kind === 'P' ? at(randInt(0, 7, rand), randInt(1, 5, rand)) : randInt(0, 63, rand);
    const board: Board = new Map([[from, { kind, colour: 'w' as Colour }]]);
    const reach = shuffled(moves(from, board), rand);
    const black = (sq: number, k: Kind = pickOne(TARGETS, rand)): void => { board.set(sq, { kind: k, colour: 'b' }); };
    let answer = -1;
    let trap: number | undefined;
    let guard: number | undefined;
    if (step.task === 'take') {
      /* a pawn takes on the slant, and only there */
      const spots = kind === 'P' ? attacks(from, board) : reach;
      if (!spots.length) continue;
      answer = spots[0];
      black(answer);
      /* two more it cannot take: off its lines, or a pawn straight ahead */
      const off = shuffled(Array.from({ length: 64 }, (_, i) => i).filter((sq) => !board.has(sq) && !moves(from, board).includes(sq)), rand);
      for (const sq of off.slice(0, 2)) black(sq);
    } else {
      if (reach.length < 2) continue;
      const [a, b] = reach;
      if (step.task === 'best') {
        const [ka, kb] = shuffled(TARGETS, rand);
        if (VALUE[ka] === VALUE[kb]) continue;
        black(a, ka);
        black(b, kb);
        answer = VALUE[ka] > VALUE[kb] ? a : b;
      } else {
        const [ka, kb] = [pickOne(TARGETS, rand), pickOne(TARGETS, rand)];
        black(a, ka);
        black(b, kb);
        /* a black pawn guarding the first: diagonally in front of it, as Black sees it */
        const spots = [-1, 1].map((df) => [fileOf(a) + df, rankOf(a) + 1]).filter(([f, r]) => onBoard(f, r)).map(([f, r]) => at(f, r))
          .filter((sq) => !board.has(sq));
        if (!spots.length) continue;
        guard = pickOne(spots, rand);
        board.set(guard, { kind: 'P', colour: 'b' });
        trap = a;
        answer = b;
      }
    }
    const takes = moves(from, board).filter((sq) => board.get(sq)?.colour === 'b');
    /* exactly the pieces meant can be taken; the answer is free, the trap guarded */
    if (step.task === 'take' && (takes.length !== 1 || takes[0] !== answer)) continue;
    if (step.task !== 'take' && takes.length !== 2) continue;
    /* the guard may stand in the way: the two must still be the ones he can take */
    if (!takes.includes(answer) || (trap !== undefined && !takes.includes(trap))) continue;
    if (guarded(answer, 'b', board)) continue;
    if (trap !== undefined && !guarded(trap, 'b', board)) continue;
    if (step.task === 'best' && [...board.values()].filter((m) => m.colour === 'b').length !== 2) continue;
    if (last && last.from === from) continue;
    return { kind, from, board, takes, answer, trap, guard };
  }
}

/* ── Pawn Wars ─────────────────────────────────────────────────────────── */

/* Pawns only, his against the computer's: the first pawn to the far end
 * wins, and so does taking every pawn the other side has, or leaving it
 * with no move. No en passant: it is the first real game, not the rules
 * exam. */

export interface PawnStep extends Step {
  /** the files the pawns start on */
  files: number[];
  /** how hard the computer tries: 0 takes what it sees, 1 also keeps its
      pawns out of trouble, 2 also pushes the pawns nobody can stop */
  smart: 0 | 1 | 2;
}

export const PAWN_STEPS: PawnStep[] = [
  { name: 'Three pawns each', files: [2, 3, 4], smart: 0 },
  { name: 'Five pawns each', files: [1, 2, 3, 4, 5], smart: 1 },
  { name: 'All eight pawns', files: [0, 1, 2, 3, 4, 5, 6, 7], smart: 1 },
  { name: 'A cleverer opponent', files: [0, 1, 2, 3, 4, 5, 6, 7], smart: 2 },
];

export interface Move { from: number; to: number }

export function pawnStart(step: PawnStep): Board {
  const board: Board = new Map();
  for (const f of step.files) {
    board.set(at(f, 1), { kind: 'P', colour: 'w' });
    board.set(at(f, 6), { kind: 'P', colour: 'b' });
  }
  return board;
}

/** every move a side has */
export const allMoves = (board: Board, colour: Colour): Move[] =>
  [...board].filter(([, m]) => m.colour === colour).flatMap(([from]) => moves(from, board).map((to) => ({ from, to })));

export function play(board: Board, move: Move): Board {
  const next = new Map(board);
  next.set(move.to, next.get(move.from)!);
  next.delete(move.from);
  return next;
}

/** who has won, with this side to move next; null while it goes on */
export function winner(board: Board, toMove: Colour): Colour | null {
  for (const [sq, m] of board) {
    if (m.colour === 'w' && rankOf(sq) === 7) return 'w';
    if (m.colour === 'b' && rankOf(sq) === 0) return 'b';
  }
  const has = (c: Colour): boolean => [...board.values()].some((m) => m.colour === c);
  if (!has('w')) return 'b';
  if (!has('b')) return 'w';
  if (!allMoves(board, toMove).length) return toMove === 'w' ? 'b' : 'w';
  return null;
}

/** a pawn no pawn of the other side can stop or take on its way */
export function passed(sq: number, board: Board): boolean {
  const m = board.get(sq);
  if (!m) return false;
  const up = m.colour === 'w' ? 1 : -1;
  for (let r = rankOf(sq) + up; r >= 0 && r < 8; r += up) {
    for (const df of [-1, 0, 1]) {
      const other = board.get(at(fileOf(sq) + df, r));
      if (onBoard(fileOf(sq) + df, r) && other && other.colour !== m.colour) return false;
    }
  }
  return true;
}

/** the computer's move for Black */
export function computerMove(board: Board, smart: PawnStep['smart'], rand: Rand = Math.random): Move | null {
  const options = allMoves(board, 'b');
  if (!options.length) return null;
  const score = (mv: Move): number => {
    const after = play(board, mv);
    if (rankOf(mv.to) === 0) return 1000;
    let s = rand() * 3;
    const took = board.get(mv.to)?.colour === 'w';
    if (took) s += 20;
    /* stop a white pawn about to get through */
    if (took && rankOf(mv.to) >= 5) s += 40;
    if (smart >= 1) {
      const danger = guarded(mv.to, 'w', after);
      const cover = guarded(mv.to, 'b', after);
      if (danger) s -= cover ? 6 : 15;
      s += (6 - rankOf(mv.to)) * 1.5;
    }
    if (smart >= 2 && passed(mv.to, after)) s += 12;
    return s;
  };
  return options.map((mv) => ({ mv, s: score(mv) })).sort((a, b) => b.s - a.s)[0].mv;
}

/* ── Board Squares ─────────────────────────────────────────────────────── */

/* Every square has a name: its letter along the bottom, then its number up
 * the side — e4, like a grid reference on Coach's Whiteboard. Chess books,
 * coaches and clocks all use it, so it is worth knowing by heart. */

export interface SquareStep extends Step {
  /**
   * find: tap the square named; name: which square is the ball on;
   * blind: find it with no letters or numbers round the board;
   * colour: is the square light or dark?
   */
  task: 'find' | 'name' | 'blind' | 'colour';
}

export const SQUARE_STEPS: SquareStep[] = [
  { name: 'Find the square', task: 'find' },
  { name: 'Name the square', task: 'name' },
  { name: 'No letters or numbers', task: 'blind' },
  { name: 'Light or dark?', task: 'colour' },
];

export interface SquareQuestion { sq: number; answer: string; options: string[] }

export function squareQuestion(step: SquareStep, last?: SquareQuestion, rand: Rand = Math.random): SquareQuestion {
  for (;;) {
    const sq = randInt(0, 63, rand);
    if (last && last.sq === sq) continue;
    if (step.task === 'colour') return { sq, answer: isDark(sq) ? 'Dark' : 'Light', options: ['Light', 'Dark'] };
    if (step.task !== 'name') return { sq, answer: squareName(sq), options: [] };
    /* the slips: the letter one out, the number one out, and both */
    const [f, r] = [fileOf(sq), rankOf(sq)];
    const df = f < 7 ? 1 : -1;
    const dr = r < 7 ? 1 : -1;
    const options = shuffled([sq, at(f + df, r), at(f, r + dr), at(f + df, r + dr)].map(squareName), rand);
    return { sq, answer: squareName(sq), options };
  }
}

/* ── Set Up the Board ──────────────────────────────────────────────────── */

const BACK: Kind[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];

/** every piece on its starting square */
export function startBoard(): Board {
  const board: Board = new Map();
  BACK.forEach((kind, f) => {
    board.set(at(f, 0), { kind, colour: 'w' });
    board.set(at(f, 1), { kind: 'P', colour: 'w' });
    board.set(at(f, 6), { kind: 'P', colour: 'b' });
    board.set(at(f, 7), { kind, colour: 'b' });
  });
  return board;
}

export interface SetupStep extends Step { kinds: Kind[]; colour: Colour }

export const SETUP_STEPS: SetupStep[] = [
  { name: 'Rooks, knights and bishops', kinds: ['R', 'N', 'B'], colour: 'w' },
  { name: 'The queen and the king', kinds: ['Q', 'K'], colour: 'w' },
  { name: 'The pawns', kinds: ['P'], colour: 'w' },
  { name: "Black's pieces", kinds: ['R', 'N', 'B', 'Q', 'K', 'P'], colour: 'b' },
];

/** where each piece goes, as he is told it */
export const HOME_RULE: Record<Kind, string> = {
  R: 'The rooks go in the corners.',
  N: 'The knights go next to the rooks.',
  B: 'The bishops go next to the knights.',
  Q: 'The queen goes on her own colour: the white queen on the light square, the black queen on the dark one.',
  K: 'The king goes next to his queen, in the last square of the row left for him.',
  P: 'The pawns stand in a row in front of the other pieces.',
};

export interface SetupQuestion { man: Man; board: Board; answer: number }

export function setupQuestion(step: SetupStep, last?: SetupQuestion, rand: Rand = Math.random): SetupQuestion {
  for (;;) {
    const kind = pickOne(step.kinds, rand);
    const start = startBoard();
    const homes = [...start].filter(([, m]) => m.kind === kind && m.colour === step.colour).map(([sq]) => sq);
    const answer = pickOne(homes, rand);
    if (last && last.answer === answer) continue;
    start.delete(answer);
    return { man: { kind, colour: step.colour }, board: start, answer };
  }
}
