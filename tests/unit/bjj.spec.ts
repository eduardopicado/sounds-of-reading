/* Jiu-jitsu: the IBJJF points, both languages, and every question Ref's Call asks. */

import { describe, expect, it } from 'vitest';
import { CALL_NAME, MOMENTS, MOVES, REF_STEPS, pointsWords, refCall, refQuestion } from '../../src/content/bjj';

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
