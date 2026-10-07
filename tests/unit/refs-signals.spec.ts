/* Ref's Signals: the IBJJF gestures and the calls. */

import { describe, expect, it } from 'vitest';
import { COMMANDS, MOMENTS, MOVES, SIGNAL_MEANING, SIGNAL_STEPS, signalFor, signalQuestion } from '../../src/content/bjj';

const MANY = 300;

describe("Ref's Signals", () => {
  it('gives the signal for what happened: fingers for points, the rest by name', () => {
    for (const m of MOMENTS) {
      const s = signalFor(m);
      if (m.call === 'points') expect(s).toBe(`points-${MOVES.find((x) => x.id === m.move)!.points}`);
      else expect(s).toBe(m.call);
    }
  });

  it('has every signal and call in both languages', () => {
    for (const both of [...Object.values(SIGNAL_MEANING), ...Object.values(COMMANDS).map((c) => c.means)]) {
      expect(both.en).toBeTruthy();
      expect(both.pt).toBeTruthy();
    }
  });

  it('asks every question with its answer among the choices, and one move worth the fingers', () => {
    for (const step of SIGNAL_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = signalQuestion(step);
        expect(q.options, step.name).toContain(q.answer);
        expect(new Set(q.options).size).toBe(q.options.length);
        if (q.task === 'fingers') expect(q.signal).toBe(`points-${q.answer}`);
        if (q.task === 'move') {
          const n = Number(q.signal!.slice(7));
          expect(q.moves.filter((m) => m.points === n)).toHaveLength(1);
        }
        if (q.task === 'referee') expect(q.answer).toBe(signalFor(q.moment!));
      }
    }
  });
});
