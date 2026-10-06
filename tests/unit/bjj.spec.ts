/* Jiu-jitsu: the IBJJF points, both languages, and every question Ref's Call asks. */

import { describe, expect, it } from 'vitest';
import {
  CALL_NAME, MATCH_STEPS, MOMENTS, MOVES, REF_STEPS, matchQuestion, missingOptions, pointsOf, pointsWords, refCall, refQuestion,
} from '../../src/content/bjj';

const MANY = 300;

describe('the moves', () => {
  it('score the IBJJF points', () => {
    const points = Object.fromEntries(MOVES.map((m) => [m.id, m.points]));
    expect(points).toEqual({ takedown: 2, sweep: 2, 'knee-on-belly': 2, 'guard-pass': 3, mount: 4, back: 4 });
  });

  it('have a name in English and in Portuguese', () => {
    for (const m of MOVES) { expect(m.name.en).toBeTruthy(); expect(m.name.pt).toBeTruthy(); expect(m.name.en).not.toBe(m.name.pt); }
  });

  it('are called the way a referee calls them, in both languages', () => {
    const mount = MOVES.find((m) => m.id === 'mount')!;
    expect(refCall(mount, 'en')).toBe('Mount! 4 points!');
    expect(refCall(mount, 'pt')).toBe('Montada! Quatro pontos!');
    expect(pointsWords(3, 'pt')).toBe('três pontos');
    expect(pointsWords(1, 'en')).toBe('1 point');
  });
});

describe("Ref's Call", () => {
  it('offers only one move worth the points asked', () => {
    const which = REF_STEPS.find((s) => s.task === 'which')!;
    for (let i = 0; i < MANY; i += 1) {
      const q = refQuestion(which);
      expect(q.options).toHaveLength(4);
      expect(q.options).toContain(q.move);
      expect(new Set(q.options.map((m) => m.id)).size).toBe(4);
      expect(q.options.filter((m) => m.points === q.move.points)).toHaveLength(1);
    }
  });

  it('every moment on the mat says what happened and why, both ways, with the right call', () => {
    for (const m of MOMENTS) {
      for (const lang of ['en', 'pt'] as const) { expect(m.text[lang]).toBeTruthy(); expect(m.why[lang]).toBeTruthy(); }
      expect(Object.keys(CALL_NAME)).toContain(m.call);
      /* a moment that scores names its move, and only those do */
      expect(Boolean(m.move)).toBe(m.call === 'points');
    }
    for (const call of ['points', 'advantage', 'penalty']) expect(MOMENTS.filter((m) => m.call === call).length).toBeGreaterThanOrEqual(3);
  });

  it('keeps advantages and penalties for Year 2', () => {
    expect(REF_STEPS.at(-1)!.task).toBe('call');
    expect(REF_STEPS.slice(0, -1).some((s) => s.task === 'call')).toBe(false);
  });
});

describe('Match Maths', () => {
  it('asks a score the moves add up to, at every step', () => {
    for (const step of MATCH_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = matchQuestion(step);
        expect(q.blue.length).toBeGreaterThanOrEqual(step.moves[0]);
        expect(q.blue.length).toBeLessThanOrEqual(step.moves[1]);
        if (step.task === 'total') expect(q.answer).toBe(pointsOf(q.side === 'Blue' ? q.blue : q.white));
        if (step.task === 'ahead') {
          expect(q.answer).toBe(Math.abs(pointsOf(q.blue) - pointsOf(q.white)));
          expect(q.answer).toBeGreaterThan(0);
        }
        if (step.task === 'total' || step.task === 'ahead') expect(q.options).toContain(q.answer);
        if (!step.both && step.task === 'total') expect(q.white).toHaveLength(0);
      }
    }
  });

  it('settles a draw the IBJJF way: advantages first, then fewer penalties', () => {
    const step = MATCH_STEPS.find((s) => s.task === 'tiebreak')!;
    for (let i = 0; i < MANY; i += 1) {
      const q = matchQuestion(step);
      expect(pointsOf(q.blue)).toBe(pointsOf(q.white));
      const { advantages: a, penalties: p } = q;
      const winner = a.Blue !== a.White ? (a.Blue > a.White ? 'Blue' : 'White') : (p.Blue < p.White ? 'Blue' : 'White');
      expect(a.Blue !== a.White || p.Blue !== p.White).toBe(true);
      expect(q.answer).toBe(winner);
    }
  });

  it('offers one move of each value for "which move was it"', () => {
    for (const m of MOVES) {
      const o = missingOptions(m);
      expect(o).toContain(m);
      expect(o.map((x) => x.points).sort()).toEqual([2, 3, 4]);
    }
  });

  it('starts with the points written down, and keeps tie-breakers for Year 2', () => {
    expect(MATCH_STEPS[0].shown).toBe(true);
    expect(MATCH_STEPS.slice(1).every((s) => !s.shown)).toBe(true);
    expect(MATCH_STEPS.at(-1)!.task).toBe('tiebreak');
  });
});
