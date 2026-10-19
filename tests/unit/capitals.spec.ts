/* Capital Cities: every capital sits in its own state, every question has
 * one answer, and every line is on the list to record.
 *
 *   npm run test:unit */

import { describe, expect, it } from 'vitest';
import {
  CAPITALS, CAPITAL_STEPS, STATES, capitalLines, capitalQuestion, type StateId,
} from '../../src/content/capitals';
import { AUS_H, AUS_W, projectAus } from '../../src/content/australia-projection';
import { STATE_SHAPES } from '../../src/content/australia-shapes';
import { COUNTRIES, country } from '../../src/content/flags';
import { wanted } from '../../tools/make-audio';
import { speakable } from '../../src/lib/clip-id';

type Pt = [number, number];

/** the shapes' path format: M x y, then l dx dy, z, and M for the next ring */
function rings(d: string): Pt[][] {
  const out: Pt[][] = [];
  const tokens = d.match(/[MlzZ]|-?\d*\.?\d+/g) ?? [];
  let ring: Pt[] = [];
  let x = 0;
  let y = 0;
  let mode = '';
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (t === 'M' || t === 'l') { mode = t; continue; }
    if (t === 'z' || t === 'Z') { if (ring.length) out.push(ring); ring = []; continue; }
    const a = Number(t);
    const b = Number(tokens[(i += 1)]);
    if (mode === 'M') { x = a; y = b; ring = [[x, y]]; mode = 'l'; } else { x += a; y += b; ring.push([x, y]); }
  }
  if (ring.length) out.push(ring);
  return out;
}

const inside = (p: Pt, ring: Pt[]): boolean => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

/** the state at a point on the map, the ACT first since it is inside New South Wales */
const SHAPES = [...STATE_SHAPES].reverse().map((s) => ({ id: s.id, rings: rings(s.d) }));
const stateAt = (lon: number, lat: number): string | null => {
  const p = projectAus(lon, lat);
  /* even-odd across a state's rings, as the map draws them */
  return SHAPES.find((s) => s.rings.filter((r) => inside(p, r)).length % 2 === 1)?.id ?? null;
};
const nameOf = (code: string): string => country(code).name;

/** how far a point on the map is from a state's coast or border */
const distanceTo = (id: string, p: Pt): number => {
  let best = Infinity;
  for (const r of SHAPES.find((s) => s.id === id)!.rings) {
    for (let i = 0; i < r.length; i += 1) {
      const [ax, ay] = r[i];
      const [bx, by] = r[(i + 1) % r.length];
      const t = Math.max(0, Math.min(1, ((p[0] - ax) * (bx - ax) + (p[1] - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1)));
      best = Math.min(best, Math.hypot(p[0] - (ax + t * (bx - ax)), p[1] - (ay + t * (by - ay))));
    }
  }
  return best;
};

describe('the map of Australia', () => {
  it('has a shape for each state and territory', () => {
    expect(STATE_SHAPES.map((s) => s.id).sort()).toEqual(STATES.map((s) => s.id).sort());
  });

  it('puts every capital city inside its own state, on the map', () => {
    for (const s of STATES) {
      const [x, y] = projectAus(...s.at);
      expect(x, s.capital).toBeGreaterThan(0);
      expect(x, s.capital).toBeLessThan(AUS_W);
      expect(y, s.capital).toBeGreaterThan(0);
      expect(y, s.capital).toBeLessThan(AUS_H);
      /* a city on its harbour can fall just in the sea once the coast is
         simplified (Darwin does): then it must be right by its own state,
         and nearer it than any other */
      const at = stateAt(...s.at);
      if (at !== s.id) {
        const p = projectAus(...s.at);
        expect(at, s.capital).toBeNull();
        expect(distanceTo(s.id, p), s.capital).toBeLessThan(4);
        for (const other of STATES.filter((x) => x.id !== s.id)) expect(distanceTo(other.id, p), `${s.capital} near ${other.id}`).toBeGreaterThan(distanceTo(s.id, p));
      }
    }
  });

  it("puts every state's name on that state", () => {
    for (const s of STATES) expect(stateAt(...s.label), s.name).toBe(s.id);
  });
});

describe('the questions', () => {
  const step = (task: string) => CAPITAL_STEPS.find((s) => s.task === task)!;

  it('offers three capitals of the states, the answer among them', () => {
    const capitals = new Set(STATES.map((s) => s.capital));
    for (let i = 0; i < 200; i += 1) {
      const q = capitalQuestion(step('capital'), nameOf);
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(3);
      for (const o of q.options) expect(capitals.has(o)).toBe(true);
      expect(STATES.find((s) => s.id === (q.about as StateId))!.capital).toBe(q.answer);
    }
  });

  it("asks the world's capitals only of countries in Flags of the World, not Indonesia or South Africa", () => {
    const flags = new Set(COUNTRIES.map((c) => c.id));
    for (const c of CAPITALS) expect(flags.has(c.country), c.country).toBe(true);
    expect(CAPITALS.map((c) => c.country)).not.toContain('IDN');
    expect(CAPITALS.map((c) => c.country)).not.toContain('ZAF');
    for (let i = 0; i < 200; i += 1) {
      const q = capitalQuestion(step('world'), nameOf);
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(3);
    }
  });

  it('offers the bigger cities as the wrong answers where the capital is not the biggest', () => {
    for (let i = 0; i < 200; i += 1) {
      const q = capitalQuestion(step('bigger'), nameOf);
      const c = CAPITALS.find((x) => x.country === q.about)!;
      expect(c.bigger?.length).toBeGreaterThan(0);
      for (const b of c.bigger!) expect(q.options).toContain(b);
      expect(q.why).toContain(`${c.capital} is the capital of ${nameOf(c.country)}.`);
    }
  });

  it('does not ask about the same place again straight away', () => {
    for (const s of CAPITAL_STEPS) {
      let recent: string[] = [];
      for (let i = 0; i < 60; i += 1) {
        const q = capitalQuestion(s, nameOf, recent);
        expect(recent[0], s.name).not.toBe(q.about);
        recent = [q.about, ...recent].slice(0, 3);
      }
    }
  });

  it('has every line it says on the list to record', () => {
    const list = new Set(wanted());
    expect(capitalLines(nameOf).filter((line) => !list.has(speakable(line)))).toEqual([]);
  });
});
