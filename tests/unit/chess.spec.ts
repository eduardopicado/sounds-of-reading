/* Chess: how the pieces move, and the first games' questions. */

import { describe, expect, it } from 'vitest';
import {
  BALL_STEPS, PIECE_STEPS, ballQuestion, fewestMoves, fewestToCollect, isDark, moves, pieceQuestion,
  squareAt, squareName, type Board, type Kind,
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
