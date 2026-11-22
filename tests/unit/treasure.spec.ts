/* Treasure Map's content: every question has one answer the map shows, and
 * everything the game says is on the list of recordings.
 *
 *   npm run test:unit */

import { describe, expect, it } from 'vitest';
import {
  DIAGONAL, STEP, STRAIGHT, THINGS, TREASURE_STEPS, inside, squareName, thingAt, treasureLines, treasureQuestion, treasureSaid,
  type Cell, type Dir, type TreasureQuestion,
} from '../../src/content/treasure';
import { MAP_THINGS } from '../../src/content/words';

const many = (step: number, n = 400): TreasureQuestion[] =>
  Array.from({ length: n }, () => treasureQuestion(TREASURE_STEPS[step]));

describe('Treasure Map', () => {
  it('draws every thing in the word lists, with a picture and a Portuguese name', () => {
    expect(THINGS.map((t) => t.word)).toEqual(MAP_THINGS.split('|').map((x) => x.trim()));
    for (const t of THINGS) {
      expect(t.picture, t.word).toBeTruthy();
      expect(t.pt.name, t.word).toBeTruthy();
    }
    /* no two things share a picture, or the key would be no help */
    expect(new Set(THINGS.map((t) => t.picture)).size).toBe(THINGS.length);
  });

  it('puts each thing on the map once, on a square of its own, inside the map', () => {
    for (let s = 0; s < TREASURE_STEPS.length; s += 1) {
      for (const q of many(s, 100)) {
        expect(q.map.things).toHaveLength(TREASURE_STEPS[s].things);
        expect(new Set(q.map.things.map((t) => t.thing.word)).size).toBe(q.map.things.length);
        expect(new Set(q.map.things.map(squareName)).size).toBe(q.map.things.length);
        for (const t of q.map.things) expect(inside(q.map, t)).toBe(true);
        expect(inside(q.map, q.answer)).toBe(true);
      }
    }
  });

  it('asks for a thing that is there, and beside it only where something is', () => {
    for (const q of many(0)) expect(thingAt(q.map, q.answer)).toBeTruthy();
    for (const q of many(1)) {
      const [from, to] = [q.from!, q.answer];
      /* one square away, straight across or straight up and down */
      expect(Math.abs(from.c - to.c) + Math.abs(from.r - to.r)).toBe(1);
      const side = to.c < from.c ? 'left' : to.c > from.c ? 'right' : to.r < from.r ? 'above' : 'below';
      expect(q.ask[0].en).toContain(side === 'left' || side === 'right' ? `to the ${side} of the ${from.thing.word}` : `${side} the ${from.thing.word}`);
      expect(thingAt(q.map, to)).toBeTruthy();
    }
  });

  it('names squares letter first, number second, and offers the near misses', () => {
    expect(squareName({ c: 2, r: 1 })).toBe('C2');
    for (const q of many(3)) {
      expect(q.options).toContain(q.pick);
      expect(new Set(q.options).size).toBe(q.options!.length);
      expect(q.pick).toBe(squareName(q.answer));
      /* every wrong one is one square out */
      for (const o of q.options!.filter((x) => x !== q.pick)) {
        const c = 'ABCDEF'.indexOf(o[0]);
        const r = Number(o.slice(1)) - 1;
        expect(Math.abs(c - q.answer.c) + Math.abs(r - q.answer.r)).toBe(1);
      }
    }
  });

  it('follows the compass to the one thing that is there', () => {
    for (const step of [4, 7]) {
      for (const q of many(step)) {
        const m = q.ask[1].en.match(/^Go (\d) squares? ([a-z-]+)\.$/)!;
        const [n, d] = [Number(m[1]), m[2] as Dir];
        expect(step === 4 ? STRAIGHT : DIAGONAL).toContain(d);
        const end = { c: q.from!.c + STEP[d].c * n, r: q.from!.r + STEP[d].r * n };
        expect(end).toEqual({ c: q.answer.c, r: q.answer.r });
        expect(thingAt(q.map, end)).toBeTruthy();
      }
    }
  });

  it('walks the route square by square, and buries the treasure at its end', () => {
    for (const q of many(5)) {
      let at: Cell = q.from!;
      for (const next of q.walk!) {
        expect(Math.abs(next.c - at.c) + Math.abs(next.r - at.r)).toBe(1);
        expect(inside(q.map, next)).toBe(true);
        at = next;
      }
      expect(at).toEqual(q.answer);
      expect(q.ask[1].en).toMatch(/,$/);
      expect(q.ask[2].en).toMatch(/^then /);
    }
  });

  it('asks which way only along a row or a column, and the way is right', () => {
    for (const q of many(6)) {
      const [a, b] = [q.from!, q.answer];
      expect(a.c === b.c || a.r === b.r).toBe(true);
      const d = b.r < a.r ? 'north' : b.r > a.r ? 'south' : b.c > a.c ? 'east' : 'west';
      expect(q.pick).toBe(d);
    }
  });

  it('measures with the scale, and the wrong answers are the usual slips', () => {
    for (const q of many(8)) {
      const apart = Math.abs(q.answer.c - q.from!.c) + Math.abs(q.answer.r - q.from!.r);
      expect(Number(q.pick)).toBe(apart * q.metres!);
      expect(q.options).toContain(q.pick);
      expect(new Set(q.options).size).toBe(q.options!.length);
      expect(q.options!.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('says nothing that is not on the list of recordings, in either language', () => {
    for (const lang of ['en', 'pt'] as const) {
      const lines = new Set(treasureLines(lang));
      const missing = new Set<string>();
      for (let s = 0; s < TREASURE_STEPS.length; s += 1) {
        for (const q of many(s, 200)) {
          const other = q.map.things.find((t) => t.c !== q.answer.c || t.r !== q.answer.r);
          const said = [...q.ask, ...treasureSaid(q, true), ...treasureSaid(q, false, other ?? { c: 0, r: 0 }), ...treasureSaid(q, false, { c: 0, r: 0 })];
          for (const b of said) if (!lines.has(b[lang])) missing.add(`${TREASURE_STEPS[s].name}: ${b[lang]}`);
        }
      }
      expect([...missing].slice(0, 10)).toEqual([]);
    }
  });
});
