/* Chess: how the pieces move, and the first games' questions. */

import { describe, expect, it } from 'vitest';
import {
  BALL_STEPS, CAPTURE_STEPS, PAWN_STEPS, PIECE_STEPS, SETUP_STEPS, SQUARE_STEPS, VALUE, setupQuestion, squareQuestion, startBoard, allMoves, attacks, ballQuestion, captureQuestion, computerMove,
  fewestMoves, fewestToCollect, guarded, isDark, moves, passed, pawnStart, pieceQuestion, play, rankOf,
  squareAt, squareName, winner, type Board, type Colour, type Kind,
} from '../../src/content/chess';

const MANY = 300;
const alone = (kind: Kind, sq: string, colour: 'w' | 'b' = 'w'): Board => new Map([[squareAt(sq), { kind, colour }]]);
const names = (list: number[]): string[] => list.map(squareName).sort();

describe('the chess board', () => {
  it('names its squares the way they are written', () => {
    expect(squareName(0)).toBe('a1');
    expect(squareName(63)).toBe('h8');
    expect(squareName(squareAt('e4'))).toBe('e4');
    expect(isDark(squareAt('a1'))).toBe(true);
    expect(isDark(squareAt('h1'))).toBe(false);
  });
});

describe('how the pieces move', () => {
  it('rook: straight lines, fourteen squares from anywhere on an empty board', () => {
    for (const sq of ['a1', 'd4', 'h8']) expect(moves(squareAt(sq), alone('R', sq))).toHaveLength(14);
    expect(names(moves(squareAt('a1'), alone('R', 'a1')))).toContain('a8');
  });

  it('bishop: on the slant, and on its own colour', () => {
    expect(moves(squareAt('d4'), alone('B', 'd4'))).toHaveLength(13);
    expect(moves(squareAt('a1'), alone('B', 'a1'))).toHaveLength(7);
    for (const to of moves(squareAt('c1'), alone('B', 'c1'))) expect(isDark(to)).toBe(isDark(squareAt('c1')));
  });

  it('queen: both, so 27 from the middle', () => {
    expect(moves(squareAt('d4'), alone('Q', 'd4'))).toHaveLength(27);
  });

  it('king: one square any way', () => {
    expect(moves(squareAt('e4'), alone('K', 'e4'))).toHaveLength(8);
    expect(names(moves(squareAt('a1'), alone('K', 'a1')))).toEqual(['a2', 'b1', 'b2']);
  });

  it('knight: the L, over anything in the way', () => {
    expect(moves(squareAt('d4'), alone('N', 'd4'))).toHaveLength(8);
    expect(names(moves(squareAt('a1'), alone('N', 'a1')))).toEqual(['b3', 'c2']);
    const boxed: Board = alone('N', 'b1');
    for (const sq of ['a2', 'b2', 'c2', 'a1', 'c1']) boxed.set(squareAt(sq), { kind: 'P', colour: 'w' });
    expect(names(moves(squareAt('b1'), boxed))).toEqual(['a3', 'c3', 'd2']);
  });

  it('pawn: one forward, two from its own row, and takes on the slant', () => {
    expect(names(moves(squareAt('e2'), alone('P', 'e2')))).toEqual(['e3', 'e4']);
    expect(names(moves(squareAt('e3'), alone('P', 'e3')))).toEqual(['e4']);
    expect(names(moves(squareAt('e7'), alone('P', 'e7', 'b')))).toEqual(['e5', 'e6']);
    const take: Board = alone('P', 'e4');
    take.set(squareAt('d5'), { kind: 'N', colour: 'b' });
    take.set(squareAt('e5'), { kind: 'P', colour: 'b' });
    take.set(squareAt('f5'), { kind: 'P', colour: 'w' });
    expect(names(moves(squareAt('e4'), take))).toEqual(['d5']);
  });

  it('stops at its own pieces, and takes the other side’s', () => {
    const b: Board = alone('R', 'a1');
    b.set(squareAt('a4'), { kind: 'P', colour: 'w' });
    b.set(squareAt('d1'), { kind: 'P', colour: 'b' });
    expect(names(moves(squareAt('a1'), b))).toEqual(['a2', 'a3', 'b1', 'c1', 'd1']);
  });

  it('counts the fewest moves to a square, and to every ball', () => {
    expect(fewestMoves(squareAt('a1'), squareAt('h8'), alone('N', 'a1'))).toBe(6);
    expect(fewestMoves(squareAt('h3'), squareAt('h2'), alone('N', 'h3'))).toBe(3);
    expect(fewestMoves(squareAt('a1'), squareAt('h8'), alone('R', 'a1'))).toBe(2);
    expect(fewestMoves(squareAt('c1'), squareAt('c2'), alone('B', 'c1'))).toBe(Infinity);
    expect(fewestToCollect(squareAt('a1'), [squareAt('a8'), squareAt('h8')], alone('R', 'a1'))).toBe(2);
    expect(fewestToCollect(squareAt('a1'), [squareAt('h8'), squareAt('a8')], alone('R', 'a1'))).toBe(2);
  });
});

describe('Meet the Pieces', () => {
  it('starts with the rook and bishop, and keeps the knight until after the pawn', () => {
    expect(PIECE_STEPS.map((s) => s.kinds.join(''))).toEqual(['R', 'B', 'Q', 'K', 'P', 'N', 'RBQKN', 'RBQ']);
  });

  it('always puts the ball where the piece can go, and says which balls it can reach', () => {
    for (const step of PIECE_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = pieceQuestion(step);
        const can = moves(q.from, q.board);
        expect(q.balls.length).toBeGreaterThanOrEqual(1);
        for (const b of q.balls) expect(q.board.has(b)).toBe(false);
        expect(q.reach).toEqual(q.balls.filter((b) => can.includes(b)));
        if (step.task === 'reach') expect(q.reach).toEqual(q.balls);
        else {
          /* some it can reach and some it cannot, so it is a real question */
          expect(q.reach.length).toBeGreaterThanOrEqual(2);
          expect(q.balls.length - q.reach.length).toBeGreaterThanOrEqual(1);
        }
        if (step.task === 'blocked') expect([...q.board.values()].filter((m) => m.kind === 'P').length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe('Collect the Balls', () => {
  it('only asks what can be done, and knows the fewest moves', () => {
    for (const step of BALL_STEPS) {
      for (let i = 0; i < 60; i += 1) {
        const q = ballQuestion(step);
        expect(q.balls).toHaveLength(step.balls);
        expect(q.balls).not.toContain(q.from);
        expect(q.best).toBeGreaterThanOrEqual(step.balls);
        expect(q.best).toBeLessThanOrEqual(step.balls * 3);
        expect(q.best).toBe(fewestToCollect(q.from, q.balls, new Map([[q.from, { kind: step.kind, colour: 'w' }]])));
        if (step.kind === 'B') for (const b of q.balls) expect(isDark(b)).toBe(isDark(q.from));
        if (step.far) for (const b of q.balls) expect(fewestMoves(q.from, b, new Map([[q.from, { kind: step.kind, colour: 'w' }]]))).toBeGreaterThanOrEqual(step.far);
      }
    }
  });
});

describe('Capture!', () => {
  it('knows what attacks and what guards', () => {
    expect(names(attacks(squareAt('e4'), alone('P', 'e4')))).toEqual(['d5', 'f5']);
    expect(names(attacks(squareAt('e5'), alone('P', 'e5', 'b')))).toEqual(['d4', 'f4']);
    const b: Board = alone('R', 'a1');
    b.set(squareAt('a4'), { kind: 'P', colour: 'w' });
    /* the rook guards its own pawn, and sees no further */
    expect(names(attacks(squareAt('a1'), b))).toContain('a4');
    expect(names(attacks(squareAt('a1'), b))).not.toContain('a5');
    expect(guarded(squareAt('a4'), 'w', b)).toBe(true);
    expect(guarded(squareAt('a1'), 'w', b)).toBe(false);
    expect(VALUE.Q).toBe(9);
  });

  it('asks only what has one answer: one to take, the free one, the one worth more', () => {
    for (const step of CAPTURE_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = captureQuestion(step);
        const takes = moves(q.from, q.board).filter((sq) => q.board.get(sq)?.colour === 'b');
        expect(names(takes)).toEqual(names(q.takes));
        expect(q.takes).toContain(q.answer);
        expect(guarded(q.answer, 'b', q.board)).toBe(false);
        for (const m of q.board.values()) expect(m.kind === 'K' && m.colour === 'b').toBe(false);
        if (step.task === 'take') expect(q.takes).toHaveLength(1);
        else expect(q.takes).toHaveLength(2);
        if (step.task === 'free') {
          expect(guarded(q.trap!, 'b', q.board)).toBe(true);
          expect(q.board.get(q.guard!)).toEqual({ kind: 'P', colour: 'b' });
        }
        if (step.task === 'best') {
          const other = q.takes.find((t) => t !== q.answer)!;
          expect(VALUE[q.board.get(q.answer)!.kind]).toBeGreaterThan(VALUE[q.board.get(other)!.kind]);
        }
        /* a pawn never takes straight ahead */
        if (q.kind === 'P') expect(Math.abs((q.answer % 8) - (q.from % 8))).toBe(1);
      }
    }
  });
});

describe('Pawn Wars', () => {
  it('starts with every pawn on its own side\'s row', () => {
    const b = pawnStart(PAWN_STEPS[0]);
    expect([...b].map(([sq, m]) => `${m.colour}${squareName(sq)}`).sort()).toEqual(['bc7', 'bd7', 'be7', 'wc2', 'wd2', 'we2']);
    expect(allMoves(b, 'w')).toHaveLength(6);
    expect(winner(b, 'w')).toBeNull();
  });

  it('knows who has won', () => {
    const through: Board = new Map([[squareAt('d8'), { kind: 'P', colour: 'w' }], [squareAt('a7'), { kind: 'P', colour: 'b' }]]);
    expect(winner(through, 'b')).toBe('w');
    const none: Board = new Map([[squareAt('d4'), { kind: 'P', colour: 'w' }]]);
    expect(winner(none, 'b')).toBe('w');
    /* blocked head to head, and White to move: White cannot, so loses */
    const stuck: Board = new Map([[squareAt('d4'), { kind: 'P', colour: 'w' }], [squareAt('d5'), { kind: 'P', colour: 'b' }]]);
    expect(winner(stuck, 'w')).toBe('b');
  });

  it('sees a pawn nothing can stop', () => {
    const b: Board = new Map([[squareAt('a5'), { kind: 'P', colour: 'w' }], [squareAt('d7'), { kind: 'P', colour: 'b' }]]);
    expect(passed(squareAt('a5'), b)).toBe(true);
    expect(passed(squareAt('d7'), b)).toBe(true);
    b.set(squareAt('b7'), { kind: 'P', colour: 'b' });
    expect(passed(squareAt('a5'), b)).toBe(false);
  });

  it('the computer goes through when it can, and stops a pawn about to get through', () => {
    const win: Board = new Map([[squareAt('c2'), { kind: 'P', colour: 'b' }], [squareAt('h2'), { kind: 'P', colour: 'w' }]]);
    expect(computerMove(win, 0)).toEqual({ from: squareAt('c2'), to: squareAt('c1') });
    const stop: Board = new Map([[squareAt('e8'), { kind: 'P', colour: 'b' }], [squareAt('d7'), { kind: 'P', colour: 'w' }], [squareAt('a7'), { kind: 'P', colour: 'b' }]]);
    expect(computerMove(stop, 0)).toEqual({ from: squareAt('e8'), to: squareAt('d7') });
  });

  it('plays whole games to an end, every move a legal one', () => {
    let rand = 1;
    const r = (): number => { rand = (rand * 16807) % 2147483647; return rand / 2147483647; };
    for (const step of PAWN_STEPS) {
      for (let g = 0; g < 40; g += 1) {
        let b = pawnStart(step);
        let side: Colour = 'w';
        let turns = 0;
        while (!winner(b, side) && turns < 200) {
          const mv = side === 'w' ? allMoves(b, 'w')[Math.floor(r() * allMoves(b, 'w').length)] : computerMove(b, step.smart, r)!;
          expect(moves(mv.from, b)).toContain(mv.to);
          b = play(b, mv);
          side = side === 'w' ? 'b' : 'w';
          turns += 1;
        }
        expect(winner(b, side)).not.toBeNull();
        /* a pawn that reached the end is on the last row */
        for (const [sq, m] of b) expect(m.colour === 'w' ? rankOf(sq) <= 7 : rankOf(sq) >= 0).toBe(true);
      }
    }
  });

  it('the cleverer computer beats a player who moves at random', () => {
    let rand = 7;
    const r = (): number => { rand = (rand * 16807) % 2147483647; return rand / 2147483647; };
    let wins = 0;
    for (let g = 0; g < 60; g += 1) {
      let b = pawnStart(PAWN_STEPS[3]);
      let side: Colour = 'w';
      while (!winner(b, side)) {
        const mine = allMoves(b, 'w');
        b = play(b, side === 'w' ? mine[Math.floor(r() * mine.length)] : computerMove(b, 2, r)!);
        side = side === 'w' ? 'b' : 'w';
      }
      if (winner(b, side) === 'b') wins += 1;
    }
    expect(wins / 60).toBeGreaterThan(0.8);
  });
});

describe('Board Squares', () => {
  it('names a square, offers the letter or the number one out, and knows its colour', () => {
    for (const step of SQUARE_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = squareQuestion(step);
        if (step.task === 'colour') expect(q.answer).toBe(isDark(q.sq) ? 'Dark' : 'Light');
        else expect(q.answer).toBe(squareName(q.sq));
        if (step.task === 'name') {
          expect(new Set(q.options).size).toBe(4);
          expect(q.options).toContain(q.answer);
          for (const o of q.options) {
            const [df, dr] = [Math.abs(o.charCodeAt(0) - q.answer.charCodeAt(0)), Math.abs(Number(o[1]) - Number(q.answer[1]))];
            expect(df <= 1 && dr <= 1).toBe(true);
          }
        }
      }
    }
  });
});

describe('Set Up the Board', () => {
  it('sets out the pieces the way a game starts', () => {
    const b = startBoard();
    expect(b.size).toBe(32);
    expect(b.get(squareAt('d1'))).toEqual({ kind: 'Q', colour: 'w' });
    expect(b.get(squareAt('e8'))).toEqual({ kind: 'K', colour: 'b' });
    /* the queen on her own colour */
    expect(isDark(squareAt('d1'))).toBe(false);
    expect(isDark(squareAt('d8'))).toBe(true);
    expect(b.get(squareAt('h1'))?.kind).toBe('R');
    expect(b.get(squareAt('g8'))?.kind).toBe('N');
    expect([...b].filter(([sq, m]) => m.kind === 'P' && rankOf(sq) === 1).length).toBe(8);
  });

  it('takes one piece off, and its square is the answer', () => {
    for (const step of SETUP_STEPS) {
      for (let i = 0; i < 100; i += 1) {
        const q = setupQuestion(step);
        expect(q.board.size).toBe(31);
        expect(q.board.has(q.answer)).toBe(false);
        expect(startBoard().get(q.answer)).toEqual(q.man);
        expect(step.kinds).toContain(q.man.kind);
        expect(q.man.colour).toBe(step.colour);
      }
    }
  });
});
