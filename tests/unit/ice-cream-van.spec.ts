/* Ice Cream Van: Australian coins, prices and change. */

import { describe, expect, it } from 'vitest';
import { COINS, KIOSK_STEPS, coinOf, kioskQuestion, money, moneyWords, pays } from '../../src/content/maths';

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
        }
      }
    }
  });

  it('says a purse pays only when it adds up exactly', () => {
    expect(pays([200, 100, 50], 350)).toBe(true);
    expect(pays([200, 200], 350)).toBe(false);
  });
});
