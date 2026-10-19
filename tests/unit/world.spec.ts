/* The World Map's content: every name sits on its own place, every question
 * has the answer the map shows, and the shapes and the places agree.
 *
 *   npm run test:unit */

import { describe, expect, it } from 'vitest';
import {
  AROUND_AUSTRALIA, BETWEEN, DIRECTIONS, MAP_STEPS, PLACES, SEAS, mapLines, mapQuestion, place,
  type PlaceId,
} from '../../src/content/world';
import { MAP_H, MAP_W, project } from '../../src/content/projection';
import { seaAt } from '../../src/content/seas';
import { COUNTRY_SHAPES, OCEAN_SHAPES, SEA_SHAPES } from '../../src/content/world-shapes';
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

const LAND = COUNTRY_SHAPES.map((c) => ({ continent: c.continent, rings: rings(c.d) }));
/** the continent of the land at a point on the map, or null for the sea */
const landAt = (p: Pt): string | null => LAND.find((c) => c.rings.some((r) => inside(p, r)))?.continent ?? null;

describe('the map', () => {
  it('has a shape for every continent and ocean, and for every sea it names', () => {
    const continents = new Set(COUNTRY_SHAPES.map((c) => c.continent).filter(Boolean));
    expect([...continents].sort()).toEqual(PLACES.filter((p) => p.kind === 'continent').map((p) => p.id).sort());
    expect(OCEAN_SHAPES.map((o) => o.id).sort()).toEqual(PLACES.filter((p) => p.kind === 'ocean').map((p) => p.id).sort());
    expect(SEA_SHAPES.map((s) => s.id).sort()).toEqual(SEAS.map((s) => s.id).sort());
  });

  it('puts every name on its own place: a continent on its land, an ocean on its water', () => {
    for (const p of PLACES) {
      for (const [lon, lat] of p.labels) {
        const at = project(lon, lat);
        expect(at[0], p.id).toBeGreaterThan(0);
        expect(at[0], p.id).toBeLessThan(MAP_W);
        expect(at[1], p.id).toBeGreaterThan(0);
        expect(at[1], p.id).toBeLessThan(MAP_H);
        if (p.kind === 'continent') expect(landAt(at), p.id).toBe(p.id);
        else {
          expect(seaAt(lon, lat), p.id).toBe(p.id);
          expect(landAt(at), p.id).toBeNull();
        }
      }
    }
  });

  it('colours each country by the continent it is in', () => {
    /* Natural Earth keeps French Guiana with France and all of Russia in Europe */
    const where = (lon: number, lat: number): string | null => landAt(project(lon, lat));
    expect(where(-53, 4)).toBe('south-america');
    expect(where(-175, 66.5)).toBe('asia');
    expect(where(100, 60)).toBe('asia');
    expect(where(40, 55)).toBe('europe');
    expect(where(2, 47)).toBe('europe');
  });
});

describe('the questions', () => {
  /* a rough look at the map: the middle of a place, from where its name is */
  const lons = (id: PlaceId): number[] => place(id).labels.map(([lon]) => lon);
  const lat = (id: PlaceId): number => place(id).labels[0][1];

  it('points the right way: what is north of a place is further north on the map', () => {
    for (const d of [...AROUND_AUSTRALIA, ...DIRECTIONS]) {
      const label = `${d.answer} is ${d.dir} of ${d.of}`;
      if (d.dir === 'north') expect(lat(d.answer), label).toBeGreaterThan(lat(d.of));
      if (d.dir === 'south') expect(lat(d.answer), label).toBeLessThan(lat(d.of));
      /* east and west: one of the Pacific's two names is on that side */
      if (d.dir === 'east') expect(Math.max(...lons(d.answer)), label).toBeGreaterThan(lons(d.of)[0]);
      if (d.dir === 'west') expect(Math.min(...lons(d.answer)), label).toBeLessThan(lons(d.of)[0]);
    }
  });

  it('asks each direction once, so each has one answer', () => {
    const asked = [...AROUND_AUSTRALIA, ...DIRECTIONS].map((d) => `${d.dir} of ${d.of}, ${place(d.answer).kind}`);
    expect(new Set(asked).size).toBe(asked.length);
    const between = BETWEEN.map((b) => [b.a, b.b].sort().join(' and '));
    expect(new Set(between).size).toBe(between.length);
  });

  it('asks only for the kind of place each step is about', () => {
    for (const step of MAP_STEPS) {
      for (let i = 0; i < 40; i += 1) {
        const q = mapQuestion(step);
        if (step.task === 'find' && step.of !== 'both') expect(place(q.answer).kind, step.name).toBe(step.of);
        if (step.task === 'name') {
          expect(q.options, step.name).toContain(q.answer);
          expect(new Set(q.options).size).toBe(3);
          /* all three the same kind, so "Ocean" in a name gives nothing away */
          expect(new Set(q.options!.map((o) => place(o).kind)).size).toBe(1);
        }
        if (q.task === 'around' || q.task === 'between' || q.task === 'direction') expect(q.given?.length).toBeGreaterThan(0);
      }
    }
  });

  it('does not ask for the same place again straight away', () => {
    for (const step of MAP_STEPS) {
      let recent: PlaceId[] = [];
      for (let i = 0; i < 60; i += 1) {
        const q = mapQuestion(step, recent);
        expect(recent[0], step.name).not.toBe(q.answer);
        recent = [q.answer, ...recent].slice(0, step.of === 'ocean' ? 3 : 4);
      }
    }
  });

  it('has every line it says on the list to record', () => {
    const list = new Set(wanted());
    expect(mapLines().filter((line) => !list.has(speakable(line)))).toEqual([]);
  });
});
