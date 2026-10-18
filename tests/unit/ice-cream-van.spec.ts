/* Ice Cream Van: Australian coins, prices and change. */

import { describe, expect, it } from 'vitest';
import {
  COINS, KIOSK_STEPS, cheaperWhy, coinOf, countUp, kioskQuestion, money, moneyWords, pays, priceWhy, priceWords, totalWhy,
} from '../../src/content/maths';

const MANY = 300;

describe('Ice Cream Van', () => {
  it('knows the six coins, and the $2 is smaller than the 50c and the $1', () => {
    expect(COINS.map((c) => c.cents)).toEqual([5, 10, 20, 50, 100, 200]);
    expect(coinOf(200).mm).toBeLessThan(coinOf(50).mm);
    expect(coinOf(200).mm).toBeLessThan(coinOf(100).mm);
    expect(coinOf(50).sides).toBe(12);
  });

  it('writes and says money the way a price tag and a person do', () => {
    expect(money(50)).toBe('50c');
    expect(money(200)).toBe('$2');
    expect(money(350)).toBe('$3.50');
    expect(money(305)).toBe('$3.05');
    expect(moneyWords(350)).toBe('3 dollars 50 cents');
    expect(moneyWords(100)).toBe('1 dollar');
  });

  it('asks every question with its answer among the choices', () => {
    for (const step of KIOSK_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = kioskQuestion(step);
        if (q.task === 'more') {
          expect(Math.max(...q.coins)).toBe(q.answer);
          expect(new Set(q.coins).size).toBe(2);
        } else if (q.task === 'one') {
          expect(q.coins).toContain(q.price);
        } else if (q.task === 'cheaper') {
          expect(q.answer).toBe(Math.min(q.price, q.otherPrice!));
          expect(q.price).not.toBe(q.otherPrice);
          expect(q.other).not.toBe(q.treat);
        } else if (q.task === 'pay') {
          /* the purse can always make the price exactly */
          const canMake = (left: number, coins: number[]): boolean =>
            left === 0 || coins.some((c, j) => c <= left && canMake(left - c, coins.slice(j + 1)));
          expect(canMake(q.price, [...q.coins].sort((a, b) => b - a))).toBe(true);
        } else {
          expect(q.options, step.name).toContain(q.answer);
          expect(q.options.every((o) => o > 0)).toBe(true);
          if (q.task === 'count' || q.task === 'mixed') expect(q.coins.reduce((s, c) => s + c, 0)).toBe(q.answer);
          if (q.task === 'change') expect(q.answer + q.price).toBe(q.paid);
          if (q.task === 'total') expect(q.answer).toBe(q.price + q.otherPrice!);
          if (q.task === 'read') { expect(q.options).toHaveLength(4); expect(new Set(q.options.map(money)).size).toBe(4); }
        }
        /* Years 3–4 prices are to the 5 cents, except two to compare like
           $3.45 and $3.54 */
        if (step.fives && q.task !== 'cheaper') expect(q.price % 5).toBe(0);
      }
    }
  });

  it('goes on, for Years 3–4, to dollars and cents, cheaper, two treats and change from notes', () => {
    expect(KIOSK_STEPS.slice(6).map((s) => s.name)).toEqual([
      'Dollars and cents', 'Pay to the 5 cents', 'Which is cheaper?', 'Two treats', 'Change from $5, $10 and $20',
    ]);
    const notes = new Set<number>();
    for (let i = 0; i < MANY; i += 1) notes.add(kioskQuestion(KIOSK_STEPS[10]).paid!);
    expect([...notes].sort((a, b) => a - b)).toEqual([500, 1000, 2000]);
  });

  it('offers the price tags a child writes by mistake', () => {
    for (let i = 0; i < MANY; i += 1) {
      const q = kioskQuestion(KIOSK_STEPS[6]);
      if (q.price % 100 < 10) expect(q.options).toContain(q.price - (q.price % 100) + (q.price % 100) * 10);
    }
    expect(priceWords(345)).toBe('3 dollars and 45 cents');
    expect(priceWords(105)).toBe('1 dollar and 5 cents');
    expect(priceWhy(305)).toBe('3 dollars and 5 cents is $3.05. 5 cents is written .05, with a nought: there are always two digits after the point.');
  });

  it('includes the lost dollar among the totals and the change', () => {
    for (let i = 0; i < MANY; i += 1) {
      const t = kioskQuestion(KIOSK_STEPS[9]);
      const carried = (t.price % 100) + (t.otherPrice! % 100) >= 100;
      expect(t.options).toContain(carried ? t.answer - 100 : t.answer + 100);
      const c = kioskQuestion(KIOSK_STEPS[10]);
      expect(c.options).toContain(c.answer + 100);
    }
  });

  it('says why: dollars before cents, and the change counted up', () => {
    expect(cheaperWhy(354, 345)).toBe('Both are 3 dollars, and 45 cents is less than 54 cents, so $3.45 is cheaper.');
    expect(cheaperWhy(290, 315)).toBe('$2.90 is less than $3, and $3.15 is more, so $2.90 is cheaper.');
    expect(totalWhy(240, 185)).toBe('Dollars: $2 + $1 = $3. Cents: 40c + 85c = $1.25. Together: $4.25.');
    expect(countUp(735, 1000)).toEqual({
      jumps: [5, 60, 200],
      text: 'Count up from $7.35: 5c makes $7.40, 60c makes $8, and $2 makes $10. The change is 5c + 60c + $2 = $2.65.',
    });
    expect(countUp(450, 500).text).toBe('Count up from $4.50: 50c makes $5. The change is 50c.');
    for (let i = 0; i < MANY; i += 1) {
      const q = kioskQuestion(KIOSK_STEPS[10]);
      expect(countUp(q.price, q.paid!).jumps.reduce((s, j) => s + j, 0)).toBe(q.answer);
    }
  });

  it('says a purse pays only when it adds up exactly', () => {
    expect(pays([200, 100, 50], 350)).toBe(true);
    expect(pays([200, 200], 350)).toBe(false);
  });
});
