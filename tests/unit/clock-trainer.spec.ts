/* Short Hand, Long Hand: the words, the explanations, the geared hands and
   the three times offered when reading the clock. */

import { describe, expect, it } from 'vitest';
import {
  HANDS_STEPS, clockHour, handsChoices, handsTarget, hourExplained, minuteExplained, minuteHint, moveMinute,
  sameTime, timeWords,
} from '../../src/content/maths';

const MANY = 400;
const step = (name: string) => HANDS_STEPS.find((s) => s.name === name)!;

describe('time in words', () => {
  it('says every minute the Australian way', () => {
    expect(timeWords(3, 0)).toBe("3 o'clock");
    expect(timeWords(3, 5)).toBe('5 past 3');
    expect(timeWords(3, 15)).toBe('quarter past 3');
    expect(timeWords(3, 23)).toBe('23 past 3');
    expect(timeWords(3, 25)).toBe('25 past 3');
    expect(timeWords(3, 30)).toBe('half past 3');
    expect(timeWords(3, 40)).toBe('20 to 4');
    expect(timeWords(3, 45)).toBe('quarter to 4');
    expect(timeWords(3, 59)).toBe('1 to 4');
  });

  it('calls 0 and 12 both 12, and goes round from 12 to 1', () => {
    expect(timeWords(0, 30)).toBe('half past 12');
    expect(timeWords(12, 45)).toBe('quarter to 1');
    expect(timeWords(11, 50)).toBe('10 to 12');
    expect(clockHour(0)).toBe(12);
    expect(clockHour(13)).toBe(1);
  });
});

describe('the explanations on the Play screen', () => {
  it('reads the short hand by its zone, not the nearest number', () => {
    expect(hourExplained({ h: 3, m: 0 })).toBe('The short hand points right at the 3. So the hour is 3.');
    expect(hourExplained({ h: 3, m: 5 })).toBe('The short hand is in the 3 zone. It went past the 3 and has not reached the 4 yet. So the hour is 3.');
    expect(hourExplained({ h: 3, m: 23 })).not.toContain('looks close');
    /* nearly at the 4, still 3 */
    expect(hourExplained({ h: 3, m: 45 })).toContain('It looks close to the 4, but it is still 3');
    expect(hourExplained({ h: 3, m: 59 })).toContain('So the hour is 3.');
    expect(hourExplained({ h: 0, m: 30 })).toBe('The short hand is in the 12 zone. It went past the 12 and has not reached the 1 yet. So the hour is 12.');
  });

  it('counts the long hand in fives, then the little steps', () => {
    expect(minuteExplained(0)).toEqual({ text: 'The long hand points straight up. That means 0 minutes. A brand new hour starts here!', fives: [], extra: 0, total: '' });
    expect(minuteExplained(1)).toMatchObject({ text: 'The long hand is 1 little step past the top.', fives: [], extra: 1, total: '1 minute' });
    expect(minuteExplained(25)).toMatchObject({ fives: [5, 10, 15, 20, 25], extra: 0, total: '25 minutes' });
    expect(minuteExplained(25).text).toContain('points at the red 5, but the long hand does not use red numbers');
    expect(minuteExplained(23)).toMatchObject({ fives: [5, 10, 15, 20], extra: 3, total: '23 minutes' });
    expect(minuteExplained(23).text).toBe('The long hand is 3 little steps past the red 4. Count in fives, then add the little steps:');
    expect(minuteExplained(59)).toMatchObject({ extra: 4, total: '59 minutes' });
  });

  it('gives a minute hint that says how to count to it', () => {
    expect(minuteHint(0)).toContain('straight up');
    expect(minuteHint(25)).toBe('Move the long hand. Count in fives until you say 25. It will point at the red 5.');
    expect(minuteHint(23)).toBe('Move the long hand. Count in fives to 20, then go 3 little steps more.');
    expect(minuteHint(21)).toContain('1 little step more');
  });
});

describe('the geared hands', () => {
  it('moves the hour on when the long hand goes past the top, and back', () => {
    expect(moveMinute({ h: 3, m: 55 }, 65)).toEqual({ h: 4, m: 5 });
    expect(moveMinute({ h: 4, m: 5 }, -5)).toEqual({ h: 3, m: 55 });
    expect(moveMinute({ h: 11, m: 58 }, 63)).toEqual({ h: 0, m: 3 });
    expect(moveMinute({ h: 0, m: 2 }, 58)).toEqual({ h: 11, m: 58 });
    /* a drag from 55 round to 2 is past the top too */
    expect(moveMinute({ h: 3, m: 55 }, 2)).toEqual({ h: 4, m: 2 });
    expect(moveMinute({ h: 3, m: 20 }, 25)).toEqual({ h: 3, m: 25 });
  });
});

describe('the games', () => {
  it('asks times the level allows, never the same one twice running', () => {
    const allowed: Record<string, (m: number) => boolean> = {
      "o'clock": (m) => m === 0,
      'half past': (m) => m === 0 || m === 30,
      quarters: (m) => m % 15 === 0,
      fives: (m) => m % 5 === 0,
      'any minute': (m) => m >= 0 && m < 60,
    };
    for (const s of HANDS_STEPS) {
      let last;
      for (let i = 0; i < MANY; i += 1) {
        const t = handsTarget(s, last);
        expect(allowed[s.name](t.m), `${s.name} ${t.h}:${t.m}`).toBe(true);
        expect(t.h).toBeGreaterThanOrEqual(0);
        expect(t.h).toBeLessThan(12);
        if (last && s.name !== "o'clock") expect(sameTime(t, last)).toBe(false);
        last = t;
      }
    }
  });

  it('offers three different times, exactly one right', () => {
    for (const s of HANDS_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const t = handsTarget(s);
        const list = handsChoices(t, s);
        expect(list).toHaveLength(3);
        expect(list.filter((c) => c.ok)).toHaveLength(1);
        expect(sameTime(list.find((c) => c.ok)!, t)).toBe(true);
        const keys = list.map((c) => `${clockHour(c.h)}:${c.m}`);
        expect(new Set(keys).size).toBe(3);
        for (const c of list) { expect(c.m).toBeGreaterThanOrEqual(0); expect(c.m).toBeLessThan(60); }
      }
    }
  });

  it('makes the wrong ones the mistakes children make', () => {
    /* 3:25: the red 5 read as minutes (3:05), and the hands swapped (5:15) */
    const keys = (list: ReturnType<typeof handsChoices>) => list.filter((c) => !c.ok).map((c) => `${clockHour(c.h)}:${c.m}`);
    expect(keys(handsChoices({ h: 3, m: 25 }, step('fives'))).sort()).toEqual(['3:5', '5:15']);
    /* 4 o'clock: the hands swapped (12:20), then the hour one on (5:00) */
    expect(keys(handsChoices({ h: 4, m: 0 }, step("o'clock"))).sort()).toEqual(['12:20', '5:0']);
  });
});
