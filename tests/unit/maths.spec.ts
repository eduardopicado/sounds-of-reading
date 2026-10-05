/* The maths content: every question every step can ask, and the ladder. */

import { describe, expect, it } from 'vitest';
import {
  BENCH_STEPS, DICE, FLASH_STEPS, LINE_STEPS, SUM_STEPS, benchQuestion, choices, climb,
  flashQuestion, lineQuestion, onTarget, sumQuestion, valueAt,
} from '../../src/content/maths';

const MANY = 400;

describe('the ladder', () => {
  it('goes up after three right in a row and down after two wrong', () => {
    let c = { step: 1, right: 0, wrong: 0 };
    c = climb(c, true, 4); c = climb(c, true, 4);
    expect(c.step).toBe(1);
    c = climb(c, true, 4);
    expect(c).toEqual({ step: 2, right: 0, wrong: 0 });
    c = climb(c, false, 4);
    expect(c.step).toBe(2);
    c = climb(c, false, 4);
    expect(c).toEqual({ step: 1, right: 0, wrong: 0 });
  });

  it('a wrong answer breaks a run of right ones', () => {
    let c = { step: 0, right: 0, wrong: 0 };
    for (const ok of [true, true, false, true, true]) c = climb(c, ok, 4);
    expect(c.step).toBe(0);
  });

  it('never climbs off either end', () => {
    let c = { step: 3, right: 0, wrong: 0 };
    for (let i = 0; i < 9; i += 1) c = climb(c, true, 4);
    expect(c.step).toBe(3);
    for (let i = 0; i < 20; i += 1) c = climb(c, false, 4);
    expect(c.step).toBe(0);
  });
});

describe('the number buttons', () => {
  it('always hold the answer, four different numbers, all in range', () => {
    for (let i = 0; i < MANY; i += 1) {
      const hi = [5, 10, 20, 120][i % 4];
      const answer = Math.floor(Math.random() * (hi + 1));
      const c = choices(answer, 0, hi);
      expect(c).toContain(answer);
      expect(new Set(c).size).toBe(c.length);
      expect(c.length).toBe(Math.min(4, hi + 1));
      for (const x of c) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(hi); }
      expect([...c].sort((a, b) => a - b)).toEqual(c);
    }
  });

  it('offers a miscount by one as a wrong answer', () => {
    for (let i = 0; i < 50; i += 1) {
      const c = choices(6, 0, 10);
      expect(c.includes(5) || c.includes(7)).toBe(true);
    }
  });
});

describe('Off the Bench', () => {
  it('always has someone on the pitch and someone to come', () => {
    for (const step of BENCH_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = benchQuestion(step);
        expect(q.target).toBe(step.target);
        expect(q.on).toBeGreaterThanOrEqual(1);
        expect(q.need).toBeGreaterThanOrEqual(1);
        expect(q.on + q.need).toBe(step.target);
      }
    }
  });

  it('does not ask the same question twice running', () => {
    const step = BENCH_STEPS[1];
    let last = benchQuestion(step);
    for (let i = 0; i < MANY; i += 1) {
      const q = benchQuestion(step, last);
      expect(q.on).not.toBe(last.on);
      last = q;
    }
  });
});

describe('Scoreboard Sums', () => {
  it('asks only sums within the step, with the right answer', () => {
    for (const step of SUM_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = sumQuestion(step);
        expect(q.answer).toBe(q.op === '+' ? q.a + q.b : q.a - q.b);
        expect(Math.max(q.a, q.b, q.answer)).toBeLessThanOrEqual(step.max);
        expect(q.a).toBeGreaterThanOrEqual(1);
        expect(q.b).toBeGreaterThanOrEqual(1);
        /* taking away never goes below nothing, and never takes all of them */
        if (q.op === '-') expect(q.answer).toBeGreaterThanOrEqual(1);
        if (step.op === '+') expect(q.op).toBe('+');
        /* adding to 20 keeps the second number small enough to count on */
        if (q.op === '+' && step.max === 20) expect(q.b).toBeLessThanOrEqual(9);
      }
    }
  });

  it('starts with adding, and only takes away from the take-away steps on', () => {
    expect(SUM_STEPS[0].op).toBe('+');
    expect(SUM_STEPS.findIndex((s) => s.op === '-')).toBeGreaterThan(1);
  });
});

describe('Number Line Penalty', () => {
  it('asks numbers on the line that are not already written under it', () => {
    for (const step of LINE_STEPS) {
      expect(step.labels[0]).toBe(step.lo);
      expect(step.labels.at(-1)).toBe(step.hi);
      for (let i = 0; i < MANY; i += 1) {
        const n = lineQuestion(step);
        expect(n).toBeGreaterThanOrEqual(step.lo);
        expect(n).toBeLessThanOrEqual(step.hi);
        /* the first step writes every number, so finding the 7 is the
           question; after that, a written number is never asked */
        const allWritten = step.labels.length === (step.hi - step.lo) / step.tick + 1;
        if (!allWritten) expect(step.labels).not.toContain(n);
        if (step.ask === 'tens') expect(n % 10).toBe(0);
      }
    }
  });

  it('reads a tap as the number under it, and forgives a near miss only on long lines', () => {
    const ten = LINE_STEPS[0];
    expect(valueAt(ten, 0.7)).toBe(7);
    expect(valueAt(ten, 0.74)).toBe(7);
    expect(valueAt(ten, -1)).toBe(0);
    expect(valueAt(ten, 2)).toBe(10);
    expect(onTarget(ten, 7, 8)).toBe(false);
    const hundred = LINE_STEPS.find((s) => s.name === '0 to 100')!;
    expect(valueAt(hundred, 0.63)).toBe(63);
    expect(onTarget(hundred, 63, 66)).toBe(true);
    expect(onTarget(hundred, 63, 70)).toBe(false);
    /* in tens, the tap snaps to the nearest ten */
    const tens = LINE_STEPS.find((s) => s.ask === 'tens')!;
    expect(valueAt(tens, 0.38)).toBe(40);
  });
});

describe('Flash Count', () => {
  it('shows a number the step allows, as dice that really add up to it', () => {
    for (const step of FLASH_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = flashQuestion(step);
        expect(q.n).toBeLessThanOrEqual(step.max);
        expect(q.n).toBeGreaterThanOrEqual(step.look === 'two-dice' ? 2 : 1);
        expect(q.parts.reduce((a, b) => a + b, 0)).toBe(q.n);
        if (step.look !== 'frame') for (const p of q.parts) { expect(p).toBeGreaterThanOrEqual(1); expect(p).toBeLessThanOrEqual(6); }
      }
    }
  });

  it('puts the right number of spots on every die face', () => {
    for (let n = 1; n <= 6; n += 1) expect(new Set(DICE[n]).size).toBe(n);
  });
});
