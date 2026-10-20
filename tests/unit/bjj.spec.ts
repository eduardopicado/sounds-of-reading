/* Jiu-jitsu: the IBJJF points, both languages, and every question Ref's Call asks. */

import { describe, expect, it } from 'vitest';
import {
  CALL_NAME, MATCH_STEPS, MOMENTS, MOVES, REF_STEPS, SCORES, behindWhy, groupedSum, leastToWin, matchQuestion, missingOptions,
  moveById, needWhy, pointsOf, pointsWords, refCall, refQuestion, scoreLabel, winnerOf, type Move, type Score,
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
    /* the tie-breakers end Year 2; what comes after is Years 3–4 */
    const tiebreak = MATCH_STEPS.findIndex((s) => s.task === 'tiebreak');
    expect(MATCH_STEPS.slice(0, tiebreak).some((s) => s.task === 'behind' || s.task === 'need' || s.white)).toBe(false);
    expect(MATCH_STEPS.slice(tiebreak + 1).map((s) => s.task)).toEqual(['total', 'behind', 'need']);
  });
});

describe('Match Maths, Years 3–4', () => {
  const step = (task: string) => MATCH_STEPS.find((s) => s.task === task && (task !== 'total' || s.white))!;
  const of = (...points: number[]): Move[] => points.map((p) => MOVES.find((m) => m.points === p)!);

  it('adds up a long match by putting the same points together', () => {
    expect(groupedSum(of(2, 4, 3, 2, 4, 2))).toEqual({
      en: 'Group the same points: 3 × 2 = 6, 2 × 4 = 8, and a 3. 6 + 8 + 3 = 17.',
      pt: 'Junte os pontos iguais: 3 × 2 = 6, 2 × 4 = 8, e um 3. 6 + 8 + 3 = 17.',
    });
    /* one group is already the total */
    expect(groupedSum(of(2, 2, 2, 2, 2))!.en).toBe('Group the same points: 5 × 2 = 10.');
    expect(groupedSum(of(4, 4, 3, 2))!.en).toBe('Group the same points: 2 × 4 = 8, and a 2 and a 3. 8 + 2 + 3 = 13.');
    /* nothing to group */
    expect(groupedSum(of(2, 3, 4))).toBeNull();
    for (let i = 0; i < MANY; i += 1) {
      const q = matchQuestion(step('total'));
      expect(q.blue.length).toBeGreaterThanOrEqual(5);
      expect(q.white.length).toBeGreaterThanOrEqual(2);
      expect(q.options).toContain(q.answer);
      /* five moves of three kinds always have two the same */
      expect(groupedSum(q.blue)).not.toBeNull();
    }
  });

  it('has Blue behind after a whole match, and counts up through the ten', () => {
    for (let i = 0; i < MANY; i += 1) {
      const q = matchQuestion(step('behind'));
      expect(q.answer).toBe(pointsOf(q.white) - pointsOf(q.blue));
      expect(q.answer as number).toBeGreaterThan(0);
      expect(q.options).toContain(q.answer);
    }
    expect(behindWhy(8, 14).en).toBe('From 8, 2 more is 10, and 4 more is 14: Blue is 6 points behind.');
    expect(behindWhy(8, 14).pt).toBe('Do 8, mais 2 dá 10, e mais 4 dá 14: o Azul está 6 pontos atrás.');
    expect(behindWhy(10, 17).en).toBe('17 take away 10 is 7: Blue is 7 points behind.');
    expect(behindWhy(12, 19).en).toBe('19 take away 12 is 7: Blue is 7 points behind.');
  });

  it('decides a match the IBJJF way: points, advantages, then fewer penalties', () => {
    const none = { Blue: 0, White: 0 };
    expect(winnerOf({ Blue: 4, White: 2 }, { Blue: 0, White: 3 }, none)).toBe('Blue');
    expect(winnerOf({ Blue: 4, White: 4 }, { Blue: 0, White: 1 }, none)).toBe('White');
    expect(winnerOf({ Blue: 4, White: 4 }, { Blue: 1, White: 1 }, { Blue: 0, White: 1 })).toBe('Blue');
    expect(winnerOf({ Blue: 4, White: 4 }, { Blue: 1, White: 1 }, { Blue: 1, White: 1 })).toBeNull();
  });

  it('finds the least that wins, and nothing less would', () => {
    const answers = new Set<Score>();
    for (let i = 0; i < MANY * 2; i += 1) {
      const q = matchQuestion(step('need'));
      const d = pointsOf(q.white) - pointsOf(q.blue);
      expect([0, 2, 3]).toContain(d);
      expect(q.options).toEqual(SCORES);
      const least = q.answer as Score;
      expect(leastToWin(q)).toBe(least);
      const after = (s: Score) => winnerOf(
        { Blue: pointsOf(q.blue) + (s === 'advantage' ? 0 : s), White: pointsOf(q.white) },
        { ...q.advantages, Blue: q.advantages.Blue + (s === 'advantage' ? 1 : 0) }, q.penalties);
      expect(after(least)).toBe('Blue');
      for (const s of SCORES.slice(0, SCORES.indexOf(least))) expect(after(s)).not.toBe('Blue');
      answers.add(least);
      /* the explanation names the score that wins */
      const why = needWhy(q);
      expect(why.en).toContain(least === 'advantage' ? 'An advantage' : `${least === 2 ? 'a takedown' : least === 3 ? 'a guard pass' : 'a mount'} wins it.`);
      expect(why.pt.length).toBeGreaterThan(20);
    }
    expect(answers).toEqual(new Set(SCORES));
  });

  it('says why drawing level is enough, or is not', () => {
    const q = (blue: number[], white: number[], adv: [number, number], pen: [number, number]) => {
      const base = { blue: of(...blue), white: of(...white), advantages: { Blue: adv[0], White: adv[1] }, penalties: { Blue: pen[0], White: pen[1] } };
      return { ...base, answer: leastToWin(base)! };
    };
    expect(needWhy(q([2], [4], [1, 0], [0, 0])).en).toBe('Blue is 2 behind. A takedown makes it 4 each, and Blue has more advantages, 1 to 0: a takedown wins it.');
    expect(needWhy(q([2], [4], [0, 1], [0, 0])).en).toBe('Blue is 2 behind. A takedown only makes it 4 each, and White has more advantages, 1 to 0. 3 points put Blue ahead: a guard pass wins it.');
    expect(needWhy(q([2], [4], [0, 1], [0, 0])).pt).toBe('O Azul está 2 pontos atrás. Uma queda só empata em 4 a 4, e o Branco tem mais vantagens, 1 a 0. Com 3 pontos o Azul passa na frente: uma passagem de guarda ganha a luta.');
    expect(needWhy(q([4], [4], [1, 1], [0, 0])).en).toBe('The points are level, 4 each. An advantage makes it 2 advantages to 1: Blue wins on advantages.');
    expect(needWhy(q([4], [4], [0, 1], [0, 1])).en).toBe('The points are level, 4 each. An advantage makes the advantages level too, 1 each, and Blue has fewer penalties, 0 to 1: Blue wins.');
    expect(needWhy(q([4], [4], [0, 2], [0, 0])).en).toBe('The points are level, 4 each, but an advantage would still leave White ahead on advantages, 2 to 1. 2 points put Blue ahead: a takedown wins it.');
    expect(needWhy(q([2], [2, 3], [1, 1], [1, 1])).en).toBe('Blue is 3 behind. A guard pass only makes it 5 each, and the advantages and penalties are level too, so the referee would decide. 4 points put Blue ahead: a mount wins it.');
  });

  it('offers each score by its move', () => {
    expect(scoreLabel('advantage', 'en')).toBe('An advantage');
    expect(scoreLabel(2, 'en')).toBe('Takedown: 2');
    expect(scoreLabel(3, 'pt')).toBe('Passagem de guarda: 3');
    expect(scoreLabel(4, 'en')).toBe(`${moveById('mount').name.en[0].toUpperCase()}${moveById('mount').name.en.slice(1)}: 4`);
  });
});
