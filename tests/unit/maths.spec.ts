/* The maths content: every question every step can ask, and the ladder. */

import { describe, expect, it } from 'vitest';
import {
  BOARD_STEPS, GRID, STEP_OF, boardQuestion, compassHelp, gridRef, refSquare, turnPath, turnWhy, turned,
  SHAPE_STEPS, SHAPES_3D, shapeQuestion, sidesOf,
  FACT_STEPS, factQuestion, factText, family,
  SURVEY_STEPS, countIn, surveyChoices, surveyQuestion,
  CLOCK_STEPS, DAYS, MONTHS, clockQuestion, seasonOf, timeWords, digital, time24, duration, ampm, countOn,
  JUMP_STEPS, bridgeOf, jumpQuestion, jumpsFor, sizesOf,
  FRACTION_STEPS, fractionQuestion,
  DRILL_STEPS, drillChoices, drillQuestion, drillWorkOut, type DrillQuestion,
  LINEUP, LINEUP_STEPS, LINEUP_TABLE, LINEUP_TEAM, lineupAsk, lineupChoices, lineupQuestion, lineupWhy, type LineupQuestion,
  bigSumChoices, crosses, sumWhy, type SumQuestion,
  BOUNCES, SKIP_STEPS, belowZero, signed, skipChoices, skipFact, skipQuestion, spokenNumber,
  BUS_STEPS, regroupChoices, anotherChoices, busQuestion, placeChoices, places, valueOf,
  TIMES_STEPS, TIMES_TOP, KNOWN_BOX, askAgain, factKey, knowsStep, nextBox, timesFacts, timesHelp, timesQuestion,
  factChoices,
  toThousand,
  lineText, roundOnTarget, roundQuestion, roundWhy,
  BENCH_STEPS, DICE, FLASH_STEPS, LINE_STEPS, SUM_STEPS, benchQuestion, choices, climb,
  flashLowest, flashMs, flashQuestion, lineQuestion, onTarget, sumQuestion, valueAt,
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

  it('counting in tens, offers only tens', () => {
    for (let i = 0; i < MANY; i += 1) {
      const answer = (1 + Math.floor(Math.random() * 9)) * 10;
      const c = choices(answer, 10, 90, 4, 10);
      expect(c).toContain(answer);
      expect(c).toHaveLength(4);
      for (const x of c) { expect(x % 10).toBe(0); expect(x).toBeGreaterThanOrEqual(10); expect(x).toBeLessThanOrEqual(90); }
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
        if (step.tens) { expect(q.on % 10).toBe(0); expect(q.need % 10).toBe(0); }
      }
    }
  });

  it('Year 2 is a stadium of 100, in tens and then any number', () => {
    const year2 = BENCH_STEPS.filter((s) => s.target === 100);
    expect(year2).toHaveLength(2);
    expect(year2[0].tens).toBe(true);
    expect(year2[1].tens).toBeFalsy();
  });

  it('ends with Years 3–4: a stadium of 1000, in hundreds, then tens, then any number', () => {
    const top = BENCH_STEPS.slice(-3);
    expect(top.map((s) => [s.target, s.unit])).toEqual([[1000, 100], [1000, 10], [1000, 1]]);
    for (const step of top) {
      for (let i = 0; i < MANY; i += 1) {
        const q = benchQuestion(step);
        expect(q.on % step.unit!).toBe(0);
        /* each step needs the one before it: rows leave a stand part full, any number a row */
        if (step.unit === 10) expect(q.on % 100).not.toBe(0);
        if (step.unit === 1) expect(q.on % 10).not.toBe(0);
      }
    }
  });

  it('counts the empty seats to 1000 a row, a stand, then stands at a time', () => {
    const seven = toThousand(637);
    expect([seven.ones, seven.tens, seven.hundreds]).toEqual([3, 60, 300]);
    expect(seven.text).toBe('Fill up the row: 3 more makes 640. Fill up the stand: 6 more rows of 10 make 700. Then 3 more stands of 100 make 1000. 3 and 60 and 300 make 363.');
    expect(toThousand(700).text).toBe('3 more stands of 100 make 1000.');
    expect(toThousand(900).text).toBe('1 more stand of 100 makes 1000.');
    expect(toThousand(990).text).toBe('Fill up the stand: 1 more row of 10 makes 1000.');
    for (let on = 1; on < 1000; on += 1) {
      const t = toThousand(on);
      expect(t.ones + t.tens + t.hundreds).toBe(1000 - on);
      expect(t.ones).toBeLessThan(10);
      expect(t.tens % 10).toBe(0);
      expect(t.hundreds % 100).toBe(0);
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
        if (!step.mix && step.op === '-') expect(q.op).toBe('-');
        /* within 100: whole tens, then never crossing a ten, then always */
        if (step.hundred === 'tens') { expect(q.a % 10).toBe(0); expect(q.b % 10).toBe(0); }
        const carries = q.op === '+' ? (q.a % 10) + (q.b % 10) > 9 : (q.a % 10) < (q.b % 10);
        if (step.hundred === 'no-carry') expect(carries, `${q.a} ${q.op} ${q.b}`).toBe(false);
        if (step.hundred === 'past') expect(carries, `${q.a} ${q.op} ${q.b}`).toBe(true);
        if (step.hundred && step.hundred !== 'tens') { expect(q.a).toBeGreaterThan(10); expect(q.b).toBeGreaterThan(10); }
      }
    }
  });

  it('mixes adding and taking away on the mixed steps', () => {
    for (const step of SUM_STEPS.filter((s) => s.mix)) {
      const ops = new Set(Array.from({ length: 60 }, () => sumQuestion(step).op));
      expect(ops).toEqual(new Set(['+', '-']));
    }
  });

  it('starts with adding, and only takes away from the take-away steps on', () => {
    expect(SUM_STEPS[0].op).toBe('+');
    expect(SUM_STEPS.findIndex((s) => s.op === '-')).toBeGreaterThan(1);
  });

  it('goes on, for Years 3–4, to the crowd: to 1000, then 10 000', () => {
    const big = SUM_STEPS.filter((s) => s.big);
    expect(SUM_STEPS.slice(-big.length)).toEqual(big);
    expect(big.map((s) => s.max)).toEqual([1000, 1000, 1000, 1000, 1000, 10000, 10000]);
    for (const step of big) {
      for (let i = 0; i < MANY; i += 1) {
        const q = sumQuestion(step);
        const what = `${q.a} ${q.op} ${q.b}`;
        expect(q.answer, what).toBeLessThan(step.max);
        /* three-figure numbers to 1000, four to 10 000 */
        const figures = step.max === 1000 ? 3 : 4;
        expect(String(q.a)).toHaveLength(figures);
        expect(String(q.b)).toHaveLength(figures);
        if (step.big === 'round') {
          expect(q.b % 100, what).toBe(0);
          expect(q.a % (step.max === 1000 ? 10 : 100), what).toBe(0);
        } else {
          /* every place of the second number is a step of the working */
          expect(String(q.b)).not.toContain('0');
          expect(crosses(q.a, q.b, q.op), what).toBe(step.big === 'carry');
        }
        const c = bigSumChoices(q, step.max);
        expect(c).toHaveLength(4);
        expect(c).toContain(q.answer);
        expect(new Set(c).size).toBe(4);
        for (const x of c) { expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(step.max); }
        /* the working ends at the answer */
        expect(sumWhy(q).endsWith(` ${lineText(q.answer)}.`), sumWhy(q)).toBe(true);
      }
    }
  });

  it('splits the second number a place at a time, the way Year 2 splits tens and ones', () => {
    const q = (a: number, b: number, op: '+' | '-'): SumQuestion => ({ a, b, op, answer: op === '+' ? a + b : a - b });
    expect(sumWhy(q(38, 25, '+'))).toBe('38 and 20 is 58, and 5 more is 63.');
    expect(sumWhy(q(52, 27, '-'))).toBe('52 take away 20 is 32, take away 7 more is 25.');
    expect(sumWhy(q(30, 20, '+'))).toBe('30 and 20 make 50.');
    expect(sumWhy(q(368, 257, '+'))).toBe('368 and 200 is 568, and 50 more is 618, and 7 more is 625.');
    expect(sumWhy(q(652, 278, '-'))).toBe('652 take away 200 is 452, take away 70 more is 382, take away 8 more is 374.');
    expect(sumWhy(q(2365, 1478, '+'))).toBe('2365 and 1000 is 3365, and 400 more is 3765, and 70 more is 3835, and 8 more is 3843.');
  });

  it('offers the slips made with big numbers: forgetting to carry, the smaller digit from the bigger', () => {
    const q = (a: number, b: number, op: '+' | '-'): SumQuestion => ({ a, b, op, answer: op === '+' ? a + b : a - b });
    expect(bigSumChoices(q(368, 257, '+'), 1000)).toContain(515);
    expect(bigSumChoices(q(652, 278, '-'), 1000)).toContain(426);
    expect(bigSumChoices(q(3800, 2500, '+'), 10000)).toContain(5300);
    /* whole hundreds have only slips of a hundred or more */
    for (const x of bigSumChoices(q(3400, 2500, '+'), 10000)) expect(x % 100).toBe(0);
  });
});

describe('Number Line Penalty', () => {
  it('asks numbers on the line that are not already written under it', () => {
    for (const step of LINE_STEPS.filter((s) => !s.round)) {
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
        if (step.ask === 'hundreds') expect(n % 100).toBe(0);
        if (step.ask === 'thousands') expect(n % 1000).toBe(0);
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
    /* to 1000 in hundreds, a tap snaps to the nearest hundred */
    const hundreds = LINE_STEPS.find((s) => s.ask === 'hundreds')!;
    expect(valueAt(hundreds, 0.62)).toBe(600);
    expect(onTarget(hundreds, 600, 700)).toBe(false);
  });

  it('goes on to 1000 in Year 2, then to 10 000, rounding and tenths', () => {
    expect(LINE_STEPS.map((s) => s.name).slice(-9)).toEqual([
      '0 to 1000', '0 to 10 000 in thousands', '0 to 10 000', 'Nearest ten', 'Nearest hundred', '0 to 1 in tenths', '0 to 2 in tenths',
      '−10 to 10', '−20 to 20',
    ]);
    /* a near miss on 0 to 10 000 forgives what one on 0 to 1000 does, ten times over */
    const big = LINE_STEPS.find((s) => s.name === '0 to 10 000')!;
    expect(onTarget(big, 6300, 6650)).toBe(true);
    expect(onTarget(big, 6300, 6800)).toBe(false);
  });

  it('writes a number the way it goes on the line', () => {
    expect(lineText(10000)).toBe('10 000');
    expect(lineText(5000)).toBe('5000');
    expect(lineText(7, 10)).toBe('0.7');
    expect(lineText(13, 10)).toBe('1.3');
    expect(lineText(10, 10)).toBe('1');
    expect(lineText(0, 10)).toBe('0');
    expect(lineText(-7)).toBe('−7');
  });

  it('goes past zero at the very top, asking only numbers below it', () => {
    for (const step of LINE_STEPS.filter((s) => s.below)) {
      expect(step.lo).toBeLessThan(0);
      expect(LINE_STEPS.indexOf(step)).toBeGreaterThan(LINE_STEPS.findIndex((s) => s.name === '0 to 2 in tenths'));
      for (let i = 0; i < MANY; i += 1) {
        const n = lineQuestion(step);
        expect(n).toBeLessThan(0);
        expect(n).toBeGreaterThanOrEqual(step.lo);
      }
    }
  });

  it('rounds: a number inside one ten (or hundred), never halfway, never already round', () => {
    for (const step of LINE_STEPS.filter((s) => s.round)) {
      const r = step.round!;
      for (let i = 0; i < MANY; i += 1) {
        const q = roundQuestion(step);
        expect(q.hi - q.lo).toBe(r);
        expect(q.n).toBeGreaterThan(q.lo);
        expect(q.n).toBeLessThan(q.hi);
        expect(q.n - q.lo).not.toBe(r / 2);
        expect(q.answer).toBe(Math.round(q.n / r) * r);
        if (r === 100) expect(q.n % 10).not.toBe(0);
        expect(q.lo).toBeGreaterThanOrEqual(r);
      }
    }
  });

  it('a rounding kick scores on the half of the line nearer the answer', () => {
    const q = { lo: 40, hi: 50, tick: 1, n: 47, answer: 50 };
    expect(roundOnTarget(q, 49)).toBe(true);
    expect(roundOnTarget(q, 46)).toBe(true);
    expect(roundOnTarget(q, 44)).toBe(false);
    expect(roundWhy(q)).toBe('47 is 3 from 50 and 7 from 40, so it is nearer 50.');
    expect(roundWhy({ ...q, n: 42, answer: 40 })).toBe('42 is 2 from 40 and 8 from 50, so it is nearer 40.');
  });
});

describe('Flash Count', () => {
  it('shows a number the step allows, as dice that really add up to it', () => {
    for (const step of FLASH_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = flashQuestion(step);
        expect(q.n).toBeLessThanOrEqual(step.max);
        expect(q.n).toBeGreaterThanOrEqual(flashLowest(step));
        if (step.look === 'facts') {
          /* a times-table fact: rows of one of the step's tables */
          const [rows, cols] = q.parts;
          expect(rows * cols).toBe(q.n);
          expect(step.tables).toContain(cols);
          expect(rows).toBeGreaterThanOrEqual(2);
          expect(rows).toBeLessThanOrEqual(step.rowsTo!);
          continue;
        }
        if (step.look === 'array') {
          /* rows times columns, two to five of each */
          expect(q.parts[0] * q.parts[1]).toBe(q.n);
          for (const p of q.parts) { expect(p).toBeGreaterThanOrEqual(2); expect(p).toBeLessThanOrEqual(5); }
          continue;
        }
        expect(q.parts.reduce((a, b) => a + b, 0)).toBe(q.n);
        if (step.look !== 'frame') for (const p of q.parts) { expect(p).toBeGreaterThanOrEqual(1); expect(p).toBeLessThanOrEqual(6); }
      }
    }
  });

  it('gives a long first look, 15% shorter for each right answer, never below the step', () => {
    const step = FLASH_STEPS[0];
    expect(flashMs(step, 0)).toBe(step.ms * 1.5);
    expect(flashMs(step, 1)).toBe(Math.round(step.ms * 1.35));
    expect(flashMs(step, 3)).toBe(Math.round(step.ms * 1.05));
    expect(flashMs(step, 4)).toBe(step.ms);
    expect(flashMs(step, 40)).toBe(step.ms);
    for (let i = 0; i < 6; i += 1) expect(flashMs(step, i + 1)).toBeLessThanOrEqual(flashMs(step, i));
  });

  it('slows down for slow and reduced motion, speeds up for quick', () => {
    const step = FLASH_STEPS[2];
    expect(flashMs(step, 0, 'slow')).toBeGreaterThan(flashMs(step, 0, 'normal'));
    expect(flashMs(step, 0, 'quick')).toBeLessThan(flashMs(step, 0, 'normal'));
    expect(flashMs(step, 0, 'normal', true)).toBe(Math.round(flashMs(step, 0) * 1.5));
    /* even quick, at full speed, leaves time to see a pattern */
    for (const s of FLASH_STEPS) expect(flashMs(s, 99, 'quick')).toBeGreaterThanOrEqual(900);
  });

  it('Years 3–4: climbs from rows of 2, 5 and 10 to any fact up to 12 × 12', () => {
    const facts = FLASH_STEPS.filter((s) => s.look === 'facts');
    expect(facts.map((s) => s.tables)).toEqual([[2, 5, 10], [3, 4], [6, 7, 8, 9], [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]]);
    expect(FLASH_STEPS.at(-1)!.max).toBe(144);
    /* they come after every Year 2 step */
    expect(FLASH_STEPS.findIndex((s) => s.look === 'facts')).toBeGreaterThan(FLASH_STEPS.findLastIndex((s) => s.look === 'array'));
  });

  it('offers a fact with the slips made with it: a row or a column too many or too few', () => {
    for (let rows = 2; rows <= 12; rows += 1) {
      for (let cols = 2; cols <= 12; cols += 1) {
        const c = factChoices(rows, cols);
        expect(c).toContain(rows * cols);
        expect(c).toHaveLength(4);
        expect(new Set(c).size).toBe(4);
        expect([...c].sort((a, b) => a - b)).toEqual(c);
        for (const x of c) expect(x).toBeGreaterThan(0);
        /* every wrong one is a whole row or column away */
        for (const x of c.filter((y) => y !== rows * cols)) {
          expect(x % cols === 0 || x % rows === 0).toBe(true);
        }
      }
    }
  });

  it('a miss on an array is said in rows', () => {
    const help = timesHelp({ a: 7, b: 6, op: '×', answer: 42, table: 6, lots: 7, fact: factKey(6, 7) }, 'rows');
    expect(help.text).toBe('7 × 6 = 42. 7 rows of 6 is 5 rows and 2 more: 30 and 12 make 42.');
    expect(timesHelp({ a: 1, b: 4, op: '×', answer: 4, table: 4, lots: 1, fact: factKey(1, 4) }, 'rows').text).toContain('1 row of 4');
  });

  it('puts the right number of spots on every die face', () => {
    for (let n = 1; n <= 6; n += 1) expect(new Set(DICE[n]).size).toBe(n);
  });
});

describe('Team Buses', () => {
  it('asks numbers in each step, and only breaks down a bus when there are two and loose fans', () => {
    for (const step of BUS_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const n = busQuestion(step);
        expect(n).toBeGreaterThanOrEqual(step.lo);
        expect(n).toBeLessThanOrEqual(step.hi);
        if (step.task === 'another') { expect(n % 10).not.toBe(0); expect(n).toBeGreaterThanOrEqual(21); }
      }
    }
  });

  it('splits a number into hundreds, tens and ones, and back', () => {
    expect(places(347)).toEqual({ hundreds: 3, tens: 4, ones: 7 });
    /* without trains, 112 is eleven buses and two */
    expect(places(112, false)).toEqual({ hundreds: 0, tens: 11, ones: 2 });
    for (let n = 1; n < 1000; n += 1) expect(valueOf(places(n))).toBe(n);
  });

  it('offers the place-value slips as wrong answers', () => {
    for (let i = 0; i < 50; i += 1) {
      const c = placeChoices(61, 120);
      expect(c).toEqual(expect.arrayContaining([61, 16, 51, 71]));
      const big = placeChoices(347, 999);
      expect(big).toContain(347);
      expect(new Set(big).size).toBe(4);
      for (const x of big) { expect(x).toBeGreaterThanOrEqual(1); expect(x).toBeLessThanOrEqual(999); }
    }
    expect(placeChoices(11, 120)).toContain(11);
    expect(placeChoices(11, 120)).toHaveLength(4);
  });

  it('when a bus breaks down, offers forgetting its ten as a wrong answer', () => {
    expect(anotherChoices(4)).toEqual(expect.arrayContaining([14, 4]));
    expect(anotherChoices(4)).toHaveLength(4);
  });

  it('starts with teen numbers, and keeps trains for Year 2', () => {
    expect(BUS_STEPS[0].hi).toBeLessThan(20);
    const firstTrain = BUS_STEPS.findIndex((s) => s.trains);
    expect(BUS_STEPS.slice(0, firstTrain).every((s) => s.hi <= 120)).toBe(true);
  });

  it('goes on, for Years 3–4, to planes of 1000, and numbers made in more than one way', () => {
    const top = BUS_STEPS.slice(7);
    expect(top.map((s) => s.task)).toEqual(['read', 'build', 'regroup', 'regroup']);
    expect(places(3245, true, true)).toEqual({ thousands: 3, hundreds: 2, tens: 4, ones: 5 });
    for (let n = 1; n < 10000; n += 1) expect(valueOf(places(n, true, true))).toBe(n);
    for (const step of top) {
      for (let i = 0; i < MANY; i += 1) {
        const n = busQuestion(step);
        if (step.task === 'regroup') {
          /* whole buses, some in each place, so one digit alone is wrong */
          expect(n % 10).toBe(0);
          expect(Math.floor(n / 10) % 10).not.toBe(0);
          expect(Math.floor(n / 100) % 10).not.toBe(0);
          const c = regroupChoices(n, step.unit!);
          expect(c).toContain(Math.floor(n / step.unit!));
          expect(c).toContain(Math.floor(n / step.unit!) % 10);
          expect(new Set(c).size).toBe(4);
        } else {
          const c = placeChoices(n, 9999);
          expect(c).toContain(n);
          expect(new Set(c).size).toBe(4);
          for (const x of c) { expect(x).toBeGreaterThanOrEqual(1); expect(x).toBeLessThanOrEqual(9999); }
        }
      }
    }
  });

  it('carries 350 in 35 buses, and 1250 in 12 trains: the slip is the digit on its own', () => {
    expect(regroupChoices(350, 10)).toEqual(expect.arrayContaining([35, 5]));
    expect(regroupChoices(1250, 100)).toEqual(expect.arrayContaining([12, 2]));
  });
});

describe('Keepy-Uppy Count', () => {
  it('counts in even steps, all within the step, with the gap never in the first two', () => {
    for (const step of SKIP_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = skipQuestion(step);
        expect(q.seq).toHaveLength(BOUNCES);
        expect(step.by).toContain(q.by);
        for (let j = 1; j < q.seq.length; j += 1) expect(q.seq[j] - q.seq[j - 1]).toBe(step.dir * q.by);
        /* only past zero does a count go below it */
        for (const n of q.seq) { expect(n).toBeGreaterThanOrEqual(step.from === 'past-zero' ? -step.max : 0); expect(n).toBeLessThanOrEqual(step.max); }
        expect(q.gap).toBeGreaterThanOrEqual(2);
        expect(q.gap).toBeLessThan(BOUNCES);
        if (step.from === 'zero') expect(q.seq[0] % q.by).toBe(0);
        if (step.from === 'odd') for (const n of q.seq) expect(n % 2).toBe(1);
        /* from any number in fives and tens: not from a multiple, or it is the easy count */
        if (step.from === 'any' && q.by >= 5) expect(q.seq[0] % q.by).not.toBe(0);
      }
    }
  });

  it('offers the gap and its slips', () => {
    for (const step of SKIP_STEPS) {
      for (let i = 0; i < 50; i += 1) {
        const q = skipQuestion(step);
        const c = skipChoices(q);
        expect(c).toContain(q.seq[q.gap]);
        expect(new Set(c).size).toBe(4);
        if (step.from !== 'past-zero') for (const x of c) expect(x).toBeGreaterThanOrEqual(0);
      }
    }
  });

  /* he understands negative numbers, so past zero is at the very top */
  it('counts past zero, back and up, with zero in the count and the gap below it', () => {
    const past = SKIP_STEPS.filter((s) => s.from === 'past-zero');
    expect(past.map((s) => s.dir)).toEqual([-1, 1]);
    expect(SKIP_STEPS.slice(-2)).toEqual(past);
    for (const step of past) {
      for (let i = 0; i < MANY; i += 1) {
        const q = skipQuestion(step);
        expect(q.seq).toContain(0);
        expect(q.seq.some((n) => Object.is(n, -0))).toBe(false);
        expect(q.seq[q.gap]).toBeLessThan(0);
        expect(q.gap).toBeGreaterThanOrEqual(2);
        expect(skipChoices(q)).toContain(q.seq[q.gap]);
      }
    }
    expect(signed(-4)).toBe('−4');
    expect(signed(4)).toBe('4');
    expect(spokenNumber(-4)).toBe('negative 4');
    expect(belowZero(-3)).toBe('−3 is 3 below zero.');
  });

  it('keeps 2s, 5s and 10s for Year 1, and 3s and any-number tens for Year 2', () => {
    const y1 = SKIP_STEPS.slice(0, 5).flatMap((s) => s.by);
    expect(new Set(y1)).toEqual(new Set([1, 2, 5, 10]));
    expect(SKIP_STEPS.slice(5).some((s) => s.by.includes(3))).toBe(true);
  });

  it('Years 3–4: counts along a times table, up and back, never past 12 of the step', () => {
    const tables = SKIP_STEPS.filter((s) => s.facts);
    /* above every Year 2 step, and every table from 3 to 9 but 5 */
    expect(SKIP_STEPS.indexOf(tables[0])).toBe(SKIP_STEPS.findIndex((s) => s.name === 'Back in 10s and 5s') + 1);
    expect(new Set(tables.flatMap((s) => s.by))).toEqual(new Set([3, 4, 6, 7, 8, 9]));
    expect(tables.some((s) => s.dir === -1)).toBe(true);
    for (const step of tables) {
      const seen = new Set<number>();
      for (let i = 0; i < MANY; i += 1) {
        const q = skipQuestion(step);
        for (const n of q.seq) {
          expect(n % q.by).toBe(0);
          expect(n).toBeLessThanOrEqual(12 * q.by);
        }
        const gap = q.seq[q.gap];
        expect(gap).toBeGreaterThan(0);
        expect(skipFact(q)).toBe(`${gap / q.by} × ${q.by} = ${gap}`);
        seen.add(q.by);
      }
      expect(seen).toEqual(new Set(step.by));
    }
  });
});

describe('Training Drills', () => {
  it('makes equal groups within the step, and asks the right thing for each task', () => {
    for (const step of DRILL_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = drillQuestion(step);
        expect(q.groups).toBeGreaterThanOrEqual(step.groups[0]);
        expect(q.groups).toBeLessThanOrEqual(step.groups[1]);
        expect(step.each).toContain(q.each);
        expect(q.total).toBe(q.groups * q.each);
        expect(q.answer).toBe(step.task === 'share' ? q.each : step.task === 'make-rows' ? q.groups : q.total);
        if (step.task === 'share' || step.task === 'make-rows') expect(q.each).toBeGreaterThan(1);
      }
    }
  });

  it('offers adding instead of grouping as a wrong answer', () => {
    const step = DRILL_STEPS[0];
    for (let i = 0; i < 50; i += 1) {
      const q = drillQuestion(step);
      const c = drillChoices(step, q);
      expect(c).toContain(q.answer);
      expect(new Set(c).size).toBe(4);
      for (const x of c) expect(x).toBeGreaterThanOrEqual(1);
    }
    const c = drillChoices(step, { groups: 3, each: 4, total: 12, answer: 12 });
    expect(c).toContain(7);
  });

  it('keeps arrays and grouping for Year 2', () => {
    expect(DRILL_STEPS.slice(0, 2).map((s) => s.task)).toEqual(['groups', 'share']);
    expect(DRILL_STEPS.slice(2, 5).map((s) => s.task)).toEqual(expect.arrayContaining(['rows', 'make-rows']));
  });

  /* Years 3–4 at the top of the ladder: the rest of the times tables, to 12 × 12 */
  it('puts the Years 3–4 teams at the top, covering every table but 2, 5 and 10 up to 10 teams of 12', () => {
    const top = DRILL_STEPS.slice(5);
    expect(top.length).toBeGreaterThan(0);
    expect(DRILL_STEPS.slice(0, 5).every((s) => !s.workOut)).toBe(true);
    expect(top.every((s) => s.workOut && s.teams)).toBe(true);
    const tables = new Set(top.flatMap((s) => s.each));
    expect([...tables].sort((a, b) => a - b)).toEqual([3, 4, 6, 7, 8, 9, 11, 12]);
    for (const step of top) {
      for (let i = 0; i < MANY; i += 1) {
        const q = drillQuestion(step);
        expect(q.groups).toBeLessThanOrEqual(10);
        expect(q.total).toBeLessThanOrEqual(120);
      }
    }
  });

  it('works a miss out from facts he knows: counting on, 5 teams and the rest, or tens', () => {
    const groups = DRILL_STEPS.find((s) => s.name === 'Teams of 6, 7, 8 and 9')!;
    const into = DRILL_STEPS.find((s) => s.name === 'Players into teams')!;
    const q = (g: number, e: number, answer = g * e): DrillQuestion => ({ groups: g, each: e, total: g * e, answer });
    expect(drillWorkOut(groups, q(7, 8))).toEqual({ text: 'That is 5 teams and 2 more: 40 and 16 make 56.', split: 5 });
    expect(drillWorkOut(groups, q(4, 7))).toEqual({ text: 'Count in 7s: 7, 14, 21, 28.', split: 0 });
    expect(drillWorkOut(groups, q(10, 9))).toEqual({ text: '10 teams of 9 is 9 tens: 90.', split: 0 });
    expect(drillWorkOut(into, q(6, 7, 6))).toEqual({ text: '5 teams of 7 use 35 players, and the 7 left make 1 team more: 6 teams.', split: 5 });
    expect(drillWorkOut(into, q(3, 8, 3))).toEqual({ text: 'Count in 8s to 24: 8, 16, 24. That is 3 teams.', split: 0 });
    /* whatever the question, it ends at the answer, and only 6 to 9 teams are split */
    for (const step of DRILL_STEPS.filter((s) => s.workOut)) {
      for (let i = 0; i < MANY; i += 1) {
        const x = drillQuestion(step);
        const { text, split } = drillWorkOut(step, x);
        expect(text).toContain(step.task === 'make-rows' ? `${x.groups} team` : String(x.total));
        expect(split === 0 || (split === 5 && x.groups > 5 && x.groups < 10)).toBe(true);
      }
    }
  });
});

describe('Half-Time Oranges', () => {
  it('shares bibs exactly, and names the pieces', () => {
    for (const step of FRACTION_STEPS.filter((s) => s.task !== 'many' && s.task !== 'equal')) {
      for (let i = 0; i < MANY; i += 1) {
        const q = fractionQuestion(step);
        expect(step.parts).toContain(q.parts);
        expect(q.total % q.parts).toBe(0);
        expect(q.total).toBeGreaterThanOrEqual(q.parts);
        expect(q.total).toBeLessThanOrEqual(q.parts === 2 ? 20 : q.parts === 3 ? 15 : q.parts === 5 ? 25 : 40);
        expect(q.answer).toBe(step.task === 'part-of' ? q.total / q.parts : q.parts);
      }
    }
  });

  it('asks about fair and unfair cuts about equally', () => {
    const step = FRACTION_STEPS[0];
    const fair = Array.from({ length: 400 }, () => fractionQuestion(step).fair).filter(Boolean).length;
    expect(fair).toBeGreaterThan(120);
    expect(fair).toBeLessThan(280);
  });

  it('goes on, for Years 3–4, to thirds and fifths, more than one piece, and the same amount', () => {
    expect(FRACTION_STEPS.slice(6).map((s) => s.task)).toEqual(['name', 'part-of', 'many', 'equal']);
    for (const step of FRACTION_STEPS.slice(6)) {
      for (let i = 0; i < MANY; i += 1) {
        const q = fractionQuestion(step);
        if (step.task === 'many') {
          expect(q.k).toBeGreaterThanOrEqual(2);
          expect(q.k).toBeLessThan(q.parts);
          expect(q.answer).toBe((q.total / q.parts) * q.k);
          /* the slip of one share only is always offered */
          expect(q.options).toContain(q.total / q.parts);
          expect(q.options).toContain(q.answer);
          expect(new Set(q.options).size).toBe(q.options!.length);
        }
        if (step.task === 'equal') {
          const o = q.other!;
          expect(q.same).toBe(q.k * o.parts === o.k * q.parts);
        }
      }
    }
  });

  it('is halves only until Year 2', () => {
    expect(FRACTION_STEPS.slice(0, 2).every((s) => s.parts.every((p) => p === 2))).toBe(true);
    expect(FRACTION_STEPS.slice(2).some((s) => s.parts.includes(8))).toBe(true);
  });
});

describe('Jump Line', () => {
  it('keeps every sum on its line, with the right answer', () => {
    for (const step of JUMP_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = jumpQuestion(step);
        expect(q.answer).toBe(q.op === '+' ? q.a + q.b : q.a - q.b);
        for (const n of [q.a, q.answer]) { expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThanOrEqual(step.top); }
        expect(q.b).toBeGreaterThanOrEqual(1);
        if (step.b === 'ones') expect(q.b).toBeLessThanOrEqual(9);
        if (step.b === 'tens') expect(q.b % 10).toBe(0);
        if (step.b === 'tens-ones') { expect(q.b).toBeGreaterThan(10); expect(q.b % 10).not.toBe(0); }
      }
    }
  });

  it('jumps tens then ones, and the jumps add up to the second number', () => {
    expect(jumpsFor({ a: 38, b: 25, op: '+', answer: 63 }, true)).toEqual([10, 10, 1, 1, 1, 1, 1]);
    expect(jumpsFor({ a: 9, b: 3, op: '-', answer: 6 }, false)).toEqual([-1, -1, -1]);
    for (const step of JUMP_STEPS) {
      const q = jumpQuestion(step);
      expect(q.a + jumpsFor(q, sizesOf(step), step.bridge).reduce((s, j) => s + j, 0)).toBe(q.answer);
    }
  });

  it('stays within 20 until Year 2', () => {
    expect(JUMP_STEPS.filter((s) => !s.tens).every((s) => s.top <= 20)).toBe(true);
  });

  it('goes on, for Years 3–4, to 1000 and 10 000, and to the next ten or hundred first', () => {
    const top = JUMP_STEPS.slice(7);
    expect(top.map((s) => s.top)).toEqual([1000, 1000, 1000, 100, 100, 1000, 10000]);
    for (const step of top) {
      const sizes = sizesOf(step);
      for (let i = 0; i < MANY; i += 1) {
        const q = jumpQuestion(step);
        const what = `${q.a} ${q.op} ${q.b}`;
        for (const n of [q.a, q.answer]) { expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThanOrEqual(step.top); }
        const jumps = jumpsFor(q, sizes, step.bridge);
        expect(q.a + jumps.reduce((s, j) => s + j, 0), what).toBe(q.answer);
        /* every jump after the first is one of his buttons, and there are never too many */
        for (const j of jumps.slice(step.bridge ? 1 : 0)) expect(sizes).toContain(Math.abs(j));
        expect(jumps.length).toBeLessThanOrEqual(13);
        if (step.b === 'hundreds') expect(q.b % 100).toBe(0);
        if (step.b === 'thousands') { expect(q.b % 100).toBe(0); expect(q.b).toBeGreaterThan(1000); }
        if (step.bridge) {
          const first = bridgeOf(q, step.bridge);
          const to = q.a + (q.op === '+' ? first : -first);
          /* the first jump lands on a ten (or a hundred), is shorter than the
             other part (so that part can be the slip), and the sum goes past it */
          expect(to % step.bridge, what).toBe(0);
          expect(first, what).toBeLessThan(step.bridge - first);
          expect(q.b % step.bridge, what).toBeGreaterThan(first);
        }
      }
    }
  });

  it('jumps to the next ten first: 38 + 25 is 2 to 40, then 23 more', () => {
    const q = { a: 38, b: 25, op: '+' as const, answer: 63 };
    expect(bridgeOf(q, 10)).toBe(2);
    expect(jumpsFor(q, [10, 1], 10)).toEqual([2, 10, 10, 1, 1, 1]);
    const back = { a: 63, b: 25, op: '-' as const, answer: 38 };
    expect(jumpsFor(back, [10, 1], 10)).toEqual([-3, -10, -10, -1, -1]);
    expect(jumpsFor({ a: 470, b: 260, op: '+', answer: 730 }, [100, 10], 100)).toEqual([30, 100, 100, 10, 10, 10]);
  });
});

describe('Match Clock', () => {
  it('says times the way they are said', () => {
    expect(timeWords(3, 0)).toBe("3 o'clock");
    expect(timeWords(3, 30)).toBe('half past 3');
    expect(timeWords(3, 15)).toBe('quarter past 3');
    expect(timeWords(3, 45)).toBe('quarter to 4');
    expect(timeWords(12, 45)).toBe('quarter to 1');
  });

  it('knows the Australian seasons', () => {
    expect(['December', 'January', 'February'].map((m) => seasonOf(MONTHS.indexOf(m)))).toEqual(['Summer', 'Summer', 'Summer']);
    expect(seasonOf(MONTHS.indexOf('July'))).toBe('Winter');
    expect(seasonOf(MONTHS.indexOf('April'))).toBe('Autumn');
    expect(seasonOf(MONTHS.indexOf('October'))).toBe('Spring');
  });

  it('always offers the answer among different choices, with the classic slips', () => {
    for (const step of CLOCK_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = clockQuestion(step);
        expect(q.options).toContain(q.answer);
        expect(new Set(q.options).size).toBe(q.options.length);
        /* am or pm is the one question with two answers */
        expect(q.options.length).toBeGreaterThanOrEqual(step.task === 'ampm' ? 2 : 3);
        if (step.task === 'read' || step.task === 'set') {
          expect(step.minutes).toContain(q.m);
          expect(q.answer).toBe(timeWords(q.h, q.m));
        }
        if (step.task === 'days') expect(q.answer).toBe(DAYS[(q.index + (q.after ? 1 : 6)) % 7]);
        if (step.task === 'months') expect(q.answer).toBe(MONTHS[(q.index + (q.after ? 1 : 11)) % 12]);
      }
    }
    /* half past 3 offers half past 4, the hour hand misread */
    const half = CLOCK_STEPS.find((s) => s.name === 'Half past')!;
    for (let i = 0; i < 100; i += 1) {
      const q = clockQuestion(half);
      if (q.m === 30 && q.h < 12) expect(q.options.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('goes on, for Years 3–4, to the minute, am and pm, how long, and the 24-hour clock', () => {
    expect(CLOCK_STEPS.slice(8).map((s) => s.name)).toEqual(['Five minutes', 'To the minute', 'am or pm', 'How long until kick-off?', '24-hour time']);
    expect(digital(15, 7)).toBe('3:07');
    expect(digital(0, 30)).toBe('12:30');
    expect(time24(19, 30)).toBe('19:30');
    expect(time24(9, 5)).toBe('09:05');
    expect(duration(35)).toBe('35 minutes');
    expect(duration(65)).toBe('1 hour 5 minutes');
    expect(duration(120)).toBe('2 hours');
    expect(ampm(7, 30)).toBe('7:30 am');
    expect(ampm(12, 30)).toBe('12:30 pm');
    expect(ampm(19, 45)).toBe('7:45 pm');
  });

  it('reads five minutes and single minutes with the slips children make', () => {
    const fives = CLOCK_STEPS.find((s) => s.name === 'Five minutes')!;
    const q = (() => { for (;;) { const x = clockQuestion(fives); if (x.m === 20 && x.h === 3) return x; } })();
    expect(q.options.sort()).toEqual(['20 past 3', '20 past 4', '20 to 4', '4 past 3'].sort());
    const toMinute = CLOCK_STEPS.find((s) => s.name === 'To the minute')!;
    for (let i = 0; i < MANY; i += 1) {
      const m = clockQuestion(toMinute);
      expect(m.m % 5).not.toBe(0);
      expect(m.answer).toBe(digital(m.h, m.m));
      /* the hour after is always there to be tempted by */
      expect(m.options).toContain(digital(m.h + 1, m.m));
    }
  });

  it('counts on to kick-off, and offers the 100-minute hour as the slip', () => {
    expect(countOn(14 * 60 + 40, 15 * 60 + 15)).toEqual({
      jumps: [20, 15],
      text: "From 2:40, 20 minutes makes 3 o'clock, then 15 minutes makes 3:15. 20 minutes and 15 minutes make 35 minutes.",
    });
    expect(countOn(14 * 60 + 40, 16 * 60 + 30).jumps).toEqual([20, 60, 30]);
    expect(countOn(15 * 60, 15 * 60 + 45).text).toBe("From 3:00, 45 minutes makes 3:45.");
    const elapsed = CLOCK_STEPS.find((s) => s.task === 'elapsed')!;
    for (let i = 0; i < MANY; i += 1) {
      const q = clockQuestion(elapsed);
      expect(q.to).toBeGreaterThan(q.from);
      expect(q.to - q.from).toBeLessThanOrEqual(120);
      expect(q.answer).toBe(duration(q.to - q.from));
      expect(countOn(q.from, q.to).jumps.reduce((a, b) => a + b, 0)).toBe(q.to - q.from);
      /* 2:40 to 3:15 as 315 − 240: 40 minutes too many for every hour crossed */
      const hours = Math.floor(q.to / 60) - Math.floor(q.from / 60);
      if (hours) expect(q.options).toContain(duration(q.to - q.from + 40 * hours));
    }
  });

  it('turns a ticket time into am and pm, and an event into am or pm', () => {
    const t = CLOCK_STEPS.find((s) => s.task === 'twentyfour')!;
    for (let i = 0; i < MANY; i += 1) {
      const q = clockQuestion(t);
      expect(q.h).toBeGreaterThanOrEqual(13);
      expect(q.answer).toBe(`${q.h - 12}:${String(q.m).padStart(2, '0')} pm`);
      expect(q.options).toContain(`${q.h - 12}:${String(q.m).padStart(2, '0')} am`);
    }
    const a = CLOCK_STEPS.find((s) => s.task === 'ampm')!;
    for (let i = 0; i < MANY; i += 1) {
      const q = clockQuestion(a);
      expect(q.options).toEqual([`${digital(q.h, q.m)} am`, `${digital(q.h, q.m)} pm`]);
      expect(q.answer.endsWith(q.h >= 12 ? 'pm' : 'am')).toBe(true);
    }
  });

  it('keeps quarters and seasons for Year 2', () => {
    const y1 = CLOCK_STEPS.slice(0, 4);
    expect(y1.flatMap((s) => s.minutes).every((m) => m === 0 || m === 30)).toBe(true);
    expect(y1.some((s) => s.task === 'seasons')).toBe(false);
  });
});

describe('Fan Survey', () => {
  it('has different votes for every team, so one got the most, and the right answer', () => {
    for (const step of SURVEY_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = surveyQuestion(step);
        expect(q.votes).toHaveLength(step.teams);
        expect(new Set(q.votes).size).toBe(step.teams);
        for (const v of q.votes) { expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(step.max); }
        if (step.task === 'most') expect(q.votes[q.answer]).toBe(Math.max(...q.votes));
        else if (step.task === 'more') {
          expect(q.votes[q.other]).toBeLessThan(q.votes[q.team]);
          expect(q.answer).toBe(q.votes[q.team] - q.votes[q.other]);
        } else if (step.task === 'total') expect(q.answer).toBe(q.votes.reduce((a, b) => a + b, 0));
        else expect(q.answer).toBe(q.votes[q.team]);
      }
    }
  });

  it('keeps column graphs for Year 2', () => {
    expect(SURVEY_STEPS.slice(0, 3).map((s) => s.task)).toEqual(['count', 'tally', 'most']);
  });

  it('goes on, for Years 3–4, to pictures of many fans, a scale, and tables', () => {
    const top = SURVEY_STEPS.slice(5);
    expect(top.map((s) => [s.task, s.key])).toEqual([['key', 2], ['key', 5], ['key', 10], ['scale', 5], ['table', undefined], ['total', undefined]]);
    for (const step of top) {
      for (let i = 0; i < MANY; i += 1) {
        const q = surveyQuestion(step);
        /* with a key, whole pictures only */
        if (step.key) for (const v of q.votes) expect(v % step.key).toBe(0);
        /* the scale is about the lines with no number on */
        if (step.task === 'scale') expect(q.votes[q.team] % 10).toBe(5);
        /* the tally asked has a gate of five in it */
        if (step.task === 'table') expect(q.votes[q.team]).toBeGreaterThanOrEqual(6);
        const c = surveyChoices(step, q);
        expect(c).toHaveLength(4);
        expect(c).toContain(q.answer);
        expect(new Set(c).size).toBe(4);
        for (const x of c) expect(x).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('offers the slips: the pictures counted, not the fans; a gate as one mark; a row left out', () => {
    const at = (task: string): (typeof SURVEY_STEPS)[number] => SURVEY_STEPS.find((s) => s.task === task && (task !== 'key' || s.key === 5))!;
    expect(surveyChoices(at('key'), { votes: [20, 5, 10, 15], team: 0, other: 0, answer: 20 })).toContain(4);
    expect(surveyChoices(at('scale'), { votes: [35, 10, 20, 45], team: 0, other: 0, answer: 35 })).toEqual(expect.arrayContaining([30, 40, 7]));
    expect(surveyChoices(at('table'), { votes: [18, 4, 9, 22], team: 0, other: 0, answer: 18 })).toEqual(expect.arrayContaining([6, 15]));
    expect(surveyChoices(at('total'), { votes: [12, 9, 15, 7], team: 0, other: 0, answer: 43 })).toContain(36);
    expect(countIn(5, 4)).toBe('5, 10, 15, 20');
  });
});

describe('Fact Family Formation', () => {
  it('makes four true facts from three numbers', () => {
    const f = family(3, 5);
    expect(f.map((x) => factText(x))).toEqual(['3 + 5 = 8', '5 + 3 = 8', '8 − 3 = 5', '8 − 5 = 3']);
    expect(factText(f[2], 1)).toBe('8 − ? = 5');
  });

  it('asks a fact of the same family, true once the gap is filled', () => {
    for (const step of FACT_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = factQuestion(step);
        expect(q.a + q.b).toBe(q.whole);
        expect(q.a).not.toBe(q.b);
        expect(q.whole).toBeLessThanOrEqual(step.max);
        expect(Math.min(q.a, q.b)).toBeGreaterThanOrEqual(step.tens ? 10 : 1);
        const { op, x, y, z } = q.asked;
        expect(op === '+' ? x + y : x - y).toBe(z);
        expect([x, y, z][q.gap]).toBe(q.answer);
        if (step.tens) for (const n of [x, y, z]) expect(n % 10).toBe(0);
        if (step.kind === 'turnaround') expect(q.asked.op).toBe('+');
        if (step.kind === 'take') expect(q.asked.op).toBe('-');
        if (step.kind === 'missing') { expect(q.known).toBeUndefined(); expect(q.gap).not.toBe(2); }
      }
    }
  });
});

describe('Kit and Ball Shapes', () => {
  it('knows the sides of every shape', () => {
    expect(['circle', 'triangle', 'square', 'rectangle', 'pentagon', 'hexagon'].map(sidesOf)).toEqual([0, 3, 4, 4, 5, 6]);
  });

  it('always offers the answer among different choices', () => {
    for (const step of SHAPE_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = shapeQuestion(step);
        expect(q.options).toContain(q.answer);
        expect(new Set(q.options).size).toBe(q.options.length);
        if (step.task === 'sides') expect(q.answer).toBe(String(sidesOf(q.shape)));
        if (step.task === 'solid') expect(SHAPES_3D).toContain(q.answer);
        if (step.task === 'symmetry') expect(q.answer).toBe(q.same ? 'Yes' : 'No');
        /* "which shape has 4 sides" must have one answer: never a square and a rectangle together */
        if (step.task === 'which') expect(new Set(q.options.map(sidesOf)).size).toBe(q.options.length);
      }
    }
  });

  it('keeps pentagons, hexagons and symmetry for Year 2', () => {
    expect(SHAPE_STEPS[0].shapes).not.toContain('hexagon');
    expect(SHAPE_STEPS.slice(4).map((s) => s.task)).toContain('symmetry');
  });
});

describe("Coach's Whiteboard", () => {
  it('turns the right way', () => {
    expect(turned('up', 'quarter-clockwise')).toBe('right');
    expect(turned('up', 'quarter-anticlockwise')).toBe('left');
    expect(turned('left', 'half')).toBe('right');
    expect(turned('left', 'quarter-clockwise')).toBe('up');
    expect(turned('up', 'three-quarter-clockwise')).toBe('left');
    expect(turned('up', 'three-quarter-anticlockwise')).toBe('right');
    for (const d of ['up', 'right', 'down', 'left'] as const) {
      for (const t of ['quarter-clockwise', 'quarter-anticlockwise', 'half', 'three-quarter-clockwise', 'three-quarter-anticlockwise'] as const) {
        expect(turnPath(d, t).at(-1)).toBe(turned(d, t));
      }
    }
  });

  it('counts a turn out in quarters, in compass points', () => {
    expect(turnWhy('up', 'three-quarter-clockwise')).toBe('From north, a three-quarter turn clockwise is 3 quarter turns: east, south, west. He faces west.');
    expect(turnWhy('down', 'quarter-anticlockwise')).toBe('From south, a quarter turn anticlockwise goes to east.');
    expect(turnWhy('left', 'half')).toBe('From west, a half turn is 2 quarter turns: north, east. He faces east.');
  });

  it('adds grid references and the compass and right angles after Year 2', () => {
    expect(BOARD_STEPS.map((s) => s.name).slice(4)).toEqual([
      'Flip, slide or turn?', 'Grid references', 'North, south, east and west', 'Right angles',
      'Three-quarter turns', 'North-east and the points between',
    ]);
  });

  it('names a square by its letter across and number down', () => {
    expect(gridRef([0, 0])).toBe('A1');
    expect(gridRef([2, 2])).toBe('C3');
    expect(gridRef([4, 4])).toBe('E5');
    for (let x = 0; x < GRID; x += 1) for (let y = 0; y < GRID; y += 1) expect(refSquare(gridRef([x, y]))).toEqual([x, y]);
  });

  it('says which way a compass point goes on the board', () => {
    expect(compassHelp([{ dir: 'north', n: 2 }, { dir: 'west', n: 1 }])).toBe('North is up and west is to the left.');
    expect(compassHelp([{ dir: 'south-east', n: 1 }])).toBe('South-east is between south and east: down and to the right.');
  });

  it('keeps every move on the grid, and lands where the moves say', () => {
    for (const step of BOARD_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = boardQuestion(step);
        if (step.task === 'side') { expect(q.ball).not.toBe(q.keeper); expect(q.answer).toBe(q.ball < q.keeper ? 'left' : 'right'); }
        if (step.task === 'move' || step.task === 'moves' || step.task === 'compass') {
          expect(q.moves).toHaveLength(step.task === 'move' || step.points === 8 ? 1 : 2);
          let [x, y] = q.start;
          for (const m of q.moves) {
            expect(m.n).toBeGreaterThanOrEqual(1);
            expect(m.n).toBeLessThanOrEqual(3);
            x += STEP_OF[m.dir][0] * m.n;
            y += STEP_OF[m.dir][1] * m.n;
            for (const v of [x, y]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(GRID); }
            /* compass moves are said as compass points, and the points between come last */
            if (step.task === 'compass') expect(m.dir.includes('-')).toBe(step.points === 8);
            else expect(['up', 'down', 'left', 'right']).toContain(m.dir);
          }
          expect(q.answer).toBe(`${x},${y}`);
          /* two moves go along different lines: across, then up or down */
          const across = (d: string): boolean => STEP_OF[d as keyof typeof STEP_OF][1] === 0;
          if (q.moves.length === 2) expect(across(q.moves[0].dir)).not.toBe(across(q.moves[1].dir));
        }
        if (step.task === 'turn') expect(q.answer).toBe(turned(q.facing, q.turn));
        if (step.task === 'turn' && !step.compass) expect(q.turn).not.toContain('three-quarter');
        if (step.task === 'gridref') {
          for (const v of q.end) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(GRID); }
          if (q.way === 'tap') expect(q.answer).toBe(q.end.join());
          else {
            expect(q.answer).toBe(gridRef(q.end));
            /* four different squares, the right one among them, each next to it */
            expect(new Set(q.refs).size).toBe(4);
            expect(q.refs).toContain(q.answer);
            for (const r of q.refs) {
              const [x, y] = refSquare(r);
              expect(Math.max(Math.abs(x - q.end[0]), Math.abs(y - q.end[1]))).toBeLessThanOrEqual(1);
            }
            /* one has only the letter wrong, one only the number */
            expect(q.refs.some((r) => r !== q.answer && r.slice(1) === q.answer.slice(1))).toBe(true);
            expect(q.refs.some((r) => r !== q.answer && r[0] === q.answer[0])).toBe(true);
          }
        }
        if (step.task === 'angle') {
          expect(q.answer).toBe(q.angle < 90 ? 'smaller' : q.angle > 90 ? 'bigger' : 'right');
          /* never so near a right angle that it needs a protractor */
          expect(q.angle === 90 || Math.abs(q.angle - 90) >= 30).toBe(true);
        }
      }
    }
  });
});

describe('Times Table Sprint', () => {
  const none: Record<string, number> = {};

  it('climbs the tables in the order they are taught, to 12 × 12, then divides', () => {
    expect(TIMES_STEPS.map((s) => s.tables)).toEqual([
      [2, 10], [5], [3], [4], [6], [8], [7], [9], [11], [12],
      [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    ]);
    expect(TIMES_STEPS.at(-1)!.divide).toBe(true);
    /* each table step reviews every table before it */
    expect(TIMES_STEPS[0].review).toEqual([]);
    expect(TIMES_STEPS[3].review).toEqual([2, 10, 5, 3]);
  });

  it('asks only the step’s tables (or its review), up to 12 lots, with the right answer', () => {
    for (const step of TIMES_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = timesQuestion(step, none);
        expect([...step.tables, ...step.review]).toContain(q.table);
        expect(q.lots).toBeGreaterThanOrEqual(1);
        expect(q.lots).toBeLessThanOrEqual(TIMES_TOP);
        if (q.op === '×') {
          expect(q.answer).toBe(q.a * q.b);
          expect(q.a * q.b).toBe(q.table * q.lots);
          expect([q.a, q.b].sort((x, y) => x - y)).toEqual([q.table, q.lots].sort((x, y) => x - y));
        } else {
          expect(step.divide).toBe(true);
          expect(q.a / q.b).toBe(q.answer);
          expect(q.b).toBe(q.table);
        }
      }
    }
  });

  it('reviews earlier tables about a quarter of the time', () => {
    const step = TIMES_STEPS[4];
    let review = 0;
    for (let i = 0; i < 4000; i += 1) if (step.review.includes(timesQuestion(step, none).table)) review += 1;
    expect(review / 4000).toBeGreaterThan(0.18);
    expect(review / 4000).toBeLessThan(0.32);
  });

  it('6 × 7 and 7 × 6 are one fact; 42 ÷ 6 is a fact of its own', () => {
    expect(factKey(6, 7)).toBe(factKey(7, 6));
    expect(factKey(6, 7, true)).not.toBe(factKey(6, 7));
    expect(timesFacts([2, 10])).toHaveLength(23);
  });

  it('asks the facts he does not know far more often than the ones he does', () => {
    const step = TIMES_STEPS[1];
    const boxes: Record<string, number> = {};
    for (const f of timesFacts(step.tables)) boxes[f] = 4;
    boxes[factKey(5, 7)] = 0;
    let weak = 0;
    const tries = 3000;
    const noReview = { ...step, review: [] };
    for (let i = 0; i < tries; i += 1) if (timesQuestion(noReview, boxes).fact === factKey(5, 7)) weak += 1;
    /* one fact of twelve, weighted 8 to the others' 1: about two in five */
    expect(weak / tries).toBeGreaterThan(0.3);
  });

  it('never asks one of the last few facts straight back', () => {
    const step = { ...TIMES_STEPS[1], review: [] };
    const recent = timesFacts([5]).slice(0, 4);
    for (let i = 0; i < MANY; i += 1) expect(recent).not.toContain(timesQuestion(step, none, recent).fact);
  });

  it('moves a fact up a box when quick, keeps it when slow, and starts it again when wrong', () => {
    expect(nextBox(1, true, true)).toBe(2);
    expect(nextBox(4, true, true)).toBe(4);
    expect(nextBox(2, true, false)).toBe(2);
    expect(nextBox(3, false, true)).toBe(0);
  });

  it('knows a step only when every one of its facts is known', () => {
    const step = TIMES_STEPS[1];
    const boxes: Record<string, number> = {};
    for (const f of timesFacts(step.tables)) boxes[f] = KNOWN_BOX;
    expect(knowsStep(step, boxes)).toBe(true);
    boxes[factKey(5, 9)] = KNOWN_BOX - 1;
    expect(knowsStep(step, boxes)).toBe(false);
  });

  it('a miss is built from facts he knows, and the parts add up', () => {
    for (const step of TIMES_STEPS) {
      for (let i = 0; i < 200; i += 1) {
        const q = timesQuestion(step, none);
        const help = timesHelp(q);
        expect(help.text).toContain(String(q.op === '×' ? q.answer : q.a));
        const [first, more] = help.parts;
        expect(first + more).toBe(q.lots);
        if (more) {
          expect([5, 10]).toContain(first);
          expect(help.text).toContain(`${first * q.table} and ${more * q.table} make ${q.lots * q.table}`);
        }
      }
    }
    const seven = timesHelp({ a: 7, b: 6, op: '×', answer: 42, table: 6, lots: 7, fact: factKey(6, 7) });
    expect(seven.text).toBe('7 × 6 = 42. 7 lots of 6 is 5 lots and 2 more: 30 and 12 make 42.');
    expect(seven.parts).toEqual([5, 2]);
    const share = timesHelp({ a: 42, b: 6, op: '÷', answer: 7, table: 6, lots: 7, fact: factKey(6, 7, true) });
    expect(share.text.startsWith('42 ÷ 6 = 7, because 7 × 6 = 42.')).toBe(true);
  });

  it('asking again keeps the fact, and may turn it round', () => {
    const q = timesQuestion(TIMES_STEPS[6], none);
    for (let i = 0; i < 50; i += 1) {
      const back = askAgain(q);
      expect(back.fact).toBe(q.fact);
      expect(back.answer).toBe(q.answer);
    }
  });
});

describe('Foosball Line-Up', () => {
  it('is a real table: a goalie, 2, 5 and 3, 11 a side, each side between the other', () => {
    expect(LINEUP.map((r) => r.players)).toEqual([1, 2, 5, 3]);
    expect(LINEUP.reduce((a, r) => a + r.players, 0)).toBe(LINEUP_TEAM);
    expect(LINEUP_TABLE.map((r) => `${r.ours ? 'us' : 'them'} ${r.kind}`)).toEqual([
      'us goalie', 'us defence', 'them attack', 'us midfield', 'them midfield', 'us attack', 'them defence', 'them goalie',
    ]);
  });

  it('asks the right thing at every step, with four answers that include it', () => {
    const players = (i: number): number => LINEUP.find((r) => r.kind === LINEUP_TABLE[i].kind)!.players;
    for (const step of LINEUP_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = lineupQuestion(step);
        expect(q.task).toBe(step.task);
        const want = q.task === 'rod' ? players(q.lit[0])
          : q.task === 'two' ? players(q.lit[0]) + players(q.lit[1])
            : q.task === 'hiding' ? players(q.hidden!)
              : q.task === 'spares' ? q.rods! * LINEUP.find((r) => r.kind === q.kind)!.players
                : q.tables! * 2 * (q.kind === 'all' ? LINEUP_TEAM : LINEUP.find((r) => r.kind === q.kind)!.players);
        expect(q.answer).toBe(want);
        if (q.task === 'two' || q.task === 'hiding') expect(q.lit.every((r) => LINEUP_TABLE[r].ours)).toBe(true);
        const c = lineupChoices(q);
        expect(c).toContain(q.answer);
        expect(new Set(c).size).toBe(4);
        for (const x of c) expect(x).toBeGreaterThanOrEqual(1);
        expect(lineupAsk(q)).toMatch(/\?$/);
        expect(lineupWhy(q)).toContain(String(q.answer));
      }
    }
  });

  it('works each one out the way he can: counting on, making 11, counting in steps, 22 as 20 and 2', () => {
    const q = (x: Partial<LineupQuestion>): LineupQuestion => ({ task: 'rod', lit: [], answer: 0, ...x });
    expect(lineupWhy(q({ task: 'two', lit: [1, 3], answer: 7 }))).toBe('Start at 5 and count on 2: 6, 7. 5 and 2 make 7.');
    expect(lineupWhy(q({ task: 'hiding', lit: [0, 1, 3, 5], hidden: 5, answer: 3 })))
      .toBe('You can see 1, 2 and 5: 8. 8 and 3 more make 11, so 3 are hiding.');
    expect(lineupWhy(q({ task: 'spares', rods: 4, kind: 'midfield', answer: 20 }))).toBe('Count in 5s: 5, 10, 15, 20. 4 rods of 5 make 20.');
    expect(lineupWhy(q({ task: 'tournament', tables: 4, kind: 'all', answer: 88 })))
      .toBe('Each table has 2 teams of 11: 22 players. 4 tables of 22 is 4 lots of 20 and 4 lots of 2: 80 and 8 make 88.');
    /* the telling slips: the whole team for hiding, one team a table for a tournament */
    expect(lineupChoices(q({ task: 'hiding', lit: [0, 1, 3, 5], hidden: 5, answer: 3 }))).toContain(11);
    expect(lineupChoices(q({ task: 'tournament', tables: 4, kind: 'all', answer: 88 }))).toContain(44);
  });

  it('keeps equal groups for Year 2 and the tournament for Years 3–4, at the top', () => {
    expect(LINEUP_STEPS.map((s) => s.task)).toEqual(['rod', 'two', 'hiding', 'spares', 'tournament']);
  });
});
