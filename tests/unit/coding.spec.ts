/* Code the Striker: programs run square by square, and every puzzle can be
 * solved within its cards, with the cones really in the way where they
 * should be.
 *
 *   npm run test:unit */

import { describe, expect, it } from 'vitest';
import {
  CODE_STEPS, GOAL, SAYS, cardsOf, codeLines, conesInTheWay, makePuzzle, run, shortest, solves, steps, verdict,
  type Card, type Puzzle,
} from '../../src/content/coding';

const c = (dir: Card['dir'], times = 1): Card => ({ dir, times });
const field: Puzzle = { size: 6, start: { x: 0, y: 5 }, targets: [{ x: 2, y: 3 }], cones: [{ x: 1, y: 5 }], most: 8 };

/** a steady random number, so a failure can be found again */
function seeded(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) % 2 ** 31; return s / 2 ** 31; };
}

describe('running a program', () => {
  it('follows the cards a square at a time and stops on the ball', () => {
    const r = run(field, [c('up'), c('up'), c('right'), c('right')]);
    expect(r.stop).toBe('done');
    expect(r.path).toHaveLength(5);
  });

  it('says what went wrong: a cone, the edge, too short, too far', () => {
    expect(run(field, [c('right')]).stop).toBe('cone');
    expect(run(field, [c('right')]).bump).toEqual({ x: 1, y: 5 });
    expect(run(field, [c('down')]).stop).toBe('edge');
    expect(run(field, [c('up')]).stop).toBe('short');
    expect(run(field, [c('up'), c('up'), c('right'), c('right'), c('right')]).stop).toBe('past');
    expect(verdict(field, run(field, [c('right')]))).toBe(SAYS.cone);
  });

  it('takes repeat as that many squares', () => {
    expect(steps([c('up', 2), c('right', 2)])).toEqual(['up', 'up', 'right', 'right']);
    expect(run(field, [c('up', 2), c('right', 2)]).stop).toBe('done');
    expect(cardsOf(['up', 'up', 'right'], true)).toEqual([c('up', 2), c('right')]);
  });

  it('needs the ball before the goal', () => {
    const p: Puzzle = { size: 6, start: { x: 3, y: 4 }, targets: [{ x: 3, y: 2 }, GOAL], cones: [], most: 12 };
    expect(run(p, [c('up', 4)]).stop).toBe('done');
    expect(verdict(p, run(p, [c('up', 3)]))).toBe(SAYS.goalShort);
    const q: Puzzle = { ...p, start: { x: 3, y: 2 }, targets: [{ x: 1, y: 2 }, GOAL] };
    expect(run(q, [c('up', 2)]).stop).toBe('missed');
  });
});

describe('the puzzles', () => {
  it('can all be solved within their cards, a thousand of each', () => {
    const r = seeded(7);
    for (const step of CODE_STEPS) {
      for (let i = 0; i < 1000; i += 1) {
        const p = makePuzzle(step.task, r);
        const best = shortest(p, step.task === 'repeat');
        expect(best, `${step.task} ${JSON.stringify(p)}`).not.toBeNull();
        expect(solves(p, best!), `${step.task} ${JSON.stringify(p)}`).toBe(true);
        /* nothing stands on the player, the ball or another cone */
        const spots = [p.start, ...p.targets, ...p.cones].map((x) => `${x.x},${x.y}`);
        expect(new Set(spots).size).toBe(spots.length);
        if (step.task === 'line') expect(p.start.x === p.targets[0].x || p.start.y === p.targets[0].y).toBe(true);
        if (step.task === 'cones') expect(conesInTheWay(p)).toBe(true);
        if (step.task === 'bug') expect(solves(p, p.given!)).toBe(false);
        if (step.task === 'repeat') {
          expect(p.most).toBe(2);
          /* without repeat it cannot be done in two cards */
          expect(shortest(p, false)!.length).toBeGreaterThan(2);
        }
      }
    }
  });

  it('bug programs are the working one with a single card changed', () => {
    const r = seeded(3);
    for (let i = 0; i < 200; i += 1) {
      const p = makePuzzle('bug', r);
      const good = shortest(p)!;
      expect(p.given).toHaveLength(good.length);
      expect(p.given!.filter((g, j) => g.dir !== good[j].dir)).toHaveLength(1);
    }
  });

  it('has every line as a sentence for the recordings', () => {
    for (const l of codeLines()) expect(l, l).toMatch(/^[A-Z].*[.!]$/);
  });
});
