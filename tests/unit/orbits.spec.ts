/* Orbits: the real distances and years, and every question's answer worked
 * out again from them.
 *
 *   npm run test:unit */

import { describe, expect, it } from 'vitest';
import {
  DISTANCE, MOON_ANGLE, ORBIT_STEPS, SHAPE_OF, STEPS_AWAY, YEAR, orbitLines, orbitQuestion,
} from '../../src/content/orbits';
import { IN_ORDER, PLANETS, planet, type PlanetId } from '../../src/content/space';

function seeded(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) % 2 ** 31; return s / 2 ** 31; };
}

describe('the planets\' orbits', () => {
  it('are further out and slower in order from the Sun', () => {
    const ids = IN_ORDER.map((p) => p.id);
    for (let i = 1; i < ids.length; i += 1) {
      expect(DISTANCE[ids[i]]).toBeGreaterThan(DISTANCE[ids[i - 1]]);
      expect(YEAR[ids[i]]).toBeGreaterThan(YEAR[ids[i - 1]]);
    }
  });

  it('follow Kepler: a year squared is the distance cubed, near enough', () => {
    for (const p of PLANETS) expect(YEAR[p.id] ** 2 / DISTANCE[p.id] ** 3, p.id).toBeCloseTo(1, 1);
  });

  it('round the giants\' distances the way he would say them', () => {
    for (const [id, steps] of Object.entries(STEPS_AWAY)) {
      expect(Math.abs(DISTANCE[id as PlanetId] - steps!) / steps!, id).toBeLessThan(0.1);
    }
  });
});

describe('the questions', () => {
  it('always have the answer among different choices, each with words both ways', () => {
    const r = seeded(3);
    for (const step of ORBIT_STEPS) {
      for (let i = 0; i < 300; i += 1) {
        const q = orbitQuestion(step.task, r);
        expect(q.options, q.ask.en).toContain(q.answer);
        expect(new Set(q.options).size).toBe(q.options.length);
        for (const o of q.options) expect(q.labels[o]?.en && q.labels[o]?.pt, `${q.ask.en} ${o}`).toBeTruthy();
      }
    }
  });

  it('fastest and slowest are the nearest and the furthest of the three', () => {
    const r = seeded(5);
    for (let i = 0; i < 300; i += 1) {
      const q = orbitQuestion('fast', r);
      const byYear = [...q.options].sort((a, b) => YEAR[a as PlanetId] - YEAR[b as PlanetId]);
      expect(q.answer).toBe(q.ask.en.includes('fastest') ? byYear[0] : byYear[2]);
    }
  });

  it('the planet between two is the one between them in order, and is not named on the picture', () => {
    const r = seeded(7);
    for (let i = 0; i < 300; i += 1) {
      const q = orbitQuestion('between', r);
      const [a, c] = q.planets!.map((id) => planet(id).order);
      expect(c - a).toBe(2);
      expect(planet(q.answer as PlanetId).order).toBe(a + 1);
      expect(q.planets).not.toContain(q.answer);
    }
  });

  it('the Moon\'s shape follows where it is: away from the Sun full, towards it new, beside half', () => {
    expect(SHAPE_OF).toEqual({ new: 'new', first: 'half', full: 'full', last: 'half' });
    /* the Sun is to the left: angle 0 points away from it, 180 towards it */
    expect(MOON_ANGLE.full).toBe(0);
    expect(MOON_ANGLE.new).toBe(180);
    const r = seeded(9);
    for (let i = 0; i < 100; i += 1) {
      const q = orbitQuestion('phases', r);
      expect(q.answer).toBe(SHAPE_OF[q.moon!]);
    }
  });

  it('says Earth with its article in Portuguese', () => {
    const q = orbitQuestion('between', () => 0.3);
    expect(orbitLines('pt')).toContain('Qual planeta fica entre a Terra e Júpiter?');
    expect(orbitLines('pt')).toContain('Marte fica entre a Terra e Júpiter.');
    expect(q.ask.pt).toMatch(/^Qual planeta fica entre /);
  });

  it('has every line as a sentence, both ways, for the recordings', () => {
    for (const lang of ['en', 'pt'] as const) {
      const lines = orbitLines(lang);
      expect(lines.length).toBeGreaterThan(30);
      for (const l of lines) expect(l, l).toMatch(/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ].*[.!?]$/);
    }
  });
});
