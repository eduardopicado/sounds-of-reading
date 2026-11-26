/* Fixture Calendar: real calendars, and every question's answer right and
 * among its choices.
 *
 *   npm run test:unit */

import { describe, expect, it } from 'vitest';
import {
  CALENDAR_STEPS, DAYS, MONTHS, calendarLines, calendarQuestion, daysIn, leap, ordinal, seasonOf, untilQuestion, weekday, readQuestion,
} from '../../src/content/calendar';

function seeded(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) % 2 ** 31; return s / 2 ** 31; };
}

describe('the calendar', () => {
  it('knows the days in each month, February in a leap year', () => {
    expect(MONTHS.map((_, m) => daysIn(m, 2026))).toEqual([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
    expect(daysIn(1, 2028)).toBe(29);
    expect([2024, 2026, 2100, 2000].map(leap)).toEqual([true, false, false, true]);
  });

  it('knows what day a date is, Monday first', () => {
    /* 24 November 2026 is a Tuesday */
    expect(DAYS[weekday(2026, 10, 24)]).toBe('Tuesday');
    expect(DAYS[weekday(2027, 0, 1)]).toBe('Friday');
  });

  it('says dates the way they are said', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '31st']);
  });

  it('has Australia\'s seasons: summer is December to February', () => {
    expect(MONTHS.map((_, m) => seasonOf(m))).toEqual(['summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter', 'winter', 'winter', 'spring', 'spring', 'spring', 'summer']);
  });
});

describe('the questions', () => {
  it('always have the answer among the choices, and the choices all different', () => {
    const r = seeded(11);
    for (const step of CALENDAR_STEPS) {
      for (let i = 0; i < 500; i += 1) {
        const q = calendarQuestion(step.task, 2026, r);
        if (!q.options.length) continue;
        expect(q.options, q.ask).toContain(q.answer);
        expect(new Set(q.options).size, q.ask).toBe(q.options.length);
        expect(q.options.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('counts the days until the match right, both on one month', () => {
    const r = seeded(5);
    for (let i = 0; i < 300; i += 1) {
      const q = untilQuestion(2026, r);
      const c = q.calendar!;
      expect(c.match! - c.today!).toBe(Number(q.answer));
      expect(c.match!).toBeLessThanOrEqual(daysIn(c.month, c.year));
      expect(q.ask).toContain(`Today is ${DAYS[weekday(c.year, c.month, c.today!)]}`);
    }
  });

  it('asks for a date he can find: the second Saturday is the one in the answer', () => {
    const r = seeded(9);
    for (let i = 0; i < 300; i += 1) {
      const q = readQuestion(2026, r);
      const c = q.calendar!;
      if (q.options.length) {
        expect(q.answer).toBe(DAYS[weekday(c.year, c.month, c.match!)]);
        continue;
      }
      const date = Number(q.answer);
      const day = DAYS[weekday(c.year, c.month, date)];
      const nth = ['first', 'second', 'third', 'fourth', 'fifth'][Math.ceil(date / 7) - 1];
      expect(q.ask).toContain(`the ${nth} ${day} in`);
      expect(c.match).toBeUndefined();
    }
  });

  it('has the fixed lines as sentences, for the recordings', () => {
    const lines = calendarLines();
    expect(lines.length).toBeGreaterThan(100);
    for (const l of lines) expect(l, l).toMatch(/^[A-Z].*[.!?]$/);
    const r = seeded(2);
    for (const task of ['days', 'months', 'seasons'] as const) {
      for (let i = 0; i < 50; i += 1) {
        const q = calendarQuestion(task, 2026, r);
        expect(lines).toContain(q.ask);
        expect(lines).toContain(q.why);
      }
    }
  });
});
