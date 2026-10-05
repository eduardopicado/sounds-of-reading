/* The maths content: every question every step can ask, and the ladder. */

import { describe, expect, it } from 'vitest';
import {
  SHAPE_STEPS, SHAPES_3D, shapeQuestion, sidesOf,
  FACT_STEPS, factQuestion, factText, family,
  SURVEY_STEPS, surveyQuestion,
  CLOCK_STEPS, DAYS, MONTHS, clockQuestion, seasonOf, timeWords,
  JUMP_STEPS, jumpQuestion, jumpsFor,
  FRACTION_STEPS, fractionQuestion,
  DRILL_STEPS, drillChoices, drillQuestion,
  BOUNCES, SKIP_STEPS, skipChoices, skipQuestion,
  BUS_STEPS, anotherChoices, busQuestion, placeChoices, places, valueOf,
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

  it('ends with Year 2: a stadium of 100, in tens and then any number', () => {
    const top = BENCH_STEPS.slice(-2);
    expect(top.map((s) => s.target)).toEqual([100, 100]);
    expect(top[0].tens).toBe(true);
    expect(top[1].tens).toBeFalsy();
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
        if (step.ask === 'hundreds') expect(n % 100).toBe(0);
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

  it('goes on to 1000 in Year 2', () => {
    expect(LINE_STEPS.at(-1)!.hi).toBe(1000);
  });
});

describe('Flash Count', () => {
  it('shows a number the step allows, as dice that really add up to it', () => {
    for (const step of FLASH_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = flashQuestion(step);
        expect(q.n).toBeLessThanOrEqual(step.max);
        expect(q.n).toBeGreaterThanOrEqual(flashLowest(step));
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
});

describe('Keepy-Uppy Count', () => {
  it('counts in even steps, all within the step, with the gap never in the first two', () => {
    for (const step of SKIP_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = skipQuestion(step);
        expect(q.seq).toHaveLength(BOUNCES);
        expect(step.by).toContain(q.by);
        for (let j = 1; j < q.seq.length; j += 1) expect(q.seq[j] - q.seq[j - 1]).toBe(step.dir * q.by);
        for (const n of q.seq) { expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThanOrEqual(step.max); }
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
        for (const x of c) expect(x).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('keeps 2s, 5s and 10s for Year 1, and 3s and any-number tens for Year 2', () => {
    const y1 = SKIP_STEPS.slice(0, 5).flatMap((s) => s.by);
    expect(new Set(y1)).toEqual(new Set([1, 2, 5, 10]));
    expect(SKIP_STEPS.slice(5).some((s) => s.by.includes(3))).toBe(true);
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
    expect(DRILL_STEPS.slice(2).map((s) => s.task)).toEqual(expect.arrayContaining(['rows', 'make-rows']));
  });
});

describe('Half-Time Oranges', () => {
  it('shares bibs exactly, and names the pieces', () => {
    for (const step of FRACTION_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = fractionQuestion(step);
        expect(step.parts).toContain(q.parts);
        expect(q.total % q.parts).toBe(0);
        expect(q.total).toBeGreaterThanOrEqual(q.parts);
        expect(q.total).toBeLessThanOrEqual(q.parts === 2 ? 20 : 40);
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
      expect(q.a + jumpsFor(q, step.tens).reduce((s, j) => s + j, 0)).toBe(q.answer);
    }
  });

  it('stays within 20 until Year 2', () => {
    expect(JUMP_STEPS.filter((s) => !s.tens).every((s) => s.top <= 20)).toBe(true);
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
        expect(q.options.length).toBeGreaterThanOrEqual(3);
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
        } else expect(q.answer).toBe(q.votes[q.team]);
      }
    }
  });

  it('keeps column graphs for Year 2', () => {
    expect(SURVEY_STEPS.slice(0, 3).map((s) => s.task)).toEqual(['count', 'tally', 'most']);
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
