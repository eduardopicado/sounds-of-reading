/* The globe's sums: the map run backwards, the ball turned, and what is
 * under a tap, by the same shapes as the flat map.
 *
 *   npm run test:unit */

import { describe, expect, it } from 'vitest';
import {
  COUNTRIES, HOME, MAX_LAT, OCEANS, SEA_PARTS, fromScreen, isIsland, lookAt, middle, middleOf, parse, placeAt, toScreen, wrapLon,
} from '../../src/content/globe';
import { project, unproject } from '../../src/content/projection';
import { PLACES } from '../../src/content/world';

describe('the map, run backwards', () => {
  it('takes a place on the map back to its longitude and latitude', () => {
    for (let lat = -88; lat <= 88; lat += 8) {
      for (let lon = -178; lon <= 178; lon += 11) {
        const [x, y] = project(lon, lat);
        const [lon2, lat2] = unproject(x, y);
        expect(lon2).toBeCloseTo(lon, 6);
        expect(lat2).toBeCloseTo(lat, 6);
      }
    }
  });

  it('keeps every shape on the world: no longitude past 180, no latitude past 90', () => {
    for (const s of [...COUNTRIES, ...OCEANS, ...SEA_PARTS]) {
      for (const r of s.rings) {
        for (let i = 0; i < r.length; i += 2) {
          const [lon, lat] = unproject(r[i], r[i + 1]);
          expect(Math.abs(lon)).toBeLessThanOrEqual(180);
          expect(Math.abs(lat)).toBeLessThanOrEqual(90);
        }
      }
    }
  });

  it('reads the shapes\' outlines as points', () => {
    expect(parse('M1 2l3 4-1 .5zM10 10l1 1z')).toEqual([[1, 2, 4, 6, 3, 6.5], [10, 10, 11, 11]]);
  });
});

describe('the ball', () => {
  const view = { lon: 40, lat: 20 };

  it('has the place it looks at in the middle, north up and east to the right', () => {
    const mid = toScreen(40, 20, view);
    expect(mid.u).toBeCloseTo(0, 9);
    expect(mid.v).toBeCloseTo(0, 9);
    expect(mid.facing).toBeCloseTo(1, 9);
    expect(toScreen(40, 30, view).v).toBeGreaterThan(0);
    expect(toScreen(50, 20, view).u).toBeGreaterThan(0);
    /* the other side of the world faces away */
    expect(toScreen(-140, -20, view).facing).toBeCloseTo(-1, 9);
  });

  it('finds the same place on the screen and back', () => {
    for (const [lon, lat] of [[40, 20], [80, 10], [10, -30], [-5, 60], [100, 45]]) {
      const p = toScreen(lon, lat, view);
      expect(p.facing).toBeGreaterThan(0);
      const back = fromScreen(p.u, p.v, view)!;
      expect(back[0]).toBeCloseTo(lon, 6);
      expect(back[1]).toBeCloseTo(lat, 6);
    }
    expect(fromScreen(0.8, 0.8, view)).toBeNull();
  });

  it('turns to a place, keeping north up near the poles', () => {
    expect(lookAt(200, 10)).toEqual({ lon: -160, lat: 10 });
    expect(lookAt(0, -90).lat).toBe(-MAX_LAT);
    expect(wrapLon(-190)).toBe(170);
    expect(wrapLon(180)).toBe(-180);
    const [lon, lat] = middleOf([[170, 0], [-170, 0]]);
    expect(Math.abs(lon)).toBeCloseTo(180, 6);
    expect(lat).toBeCloseTo(0, 6);
  });

  it('starts on Australia, with Asia above it', () => {
    expect(toScreen(134, -25, HOME).facing).toBeGreaterThan(0.8);
    expect(toScreen(95, 48, HOME).facing).toBeGreaterThan(0.4);
  });
});

describe('a tap on the globe', () => {
  it('finds each continent and ocean where its name goes', () => {
    for (const p of PLACES) {
      for (const [lon, lat] of p.labels) expect(placeAt(lon, lat, { continents: p.eight ? 8 : 7 }), `${p.id} at ${lon}, ${lat}`).toBe(p.id);
    }
    /* Central America is North America when counting seven */
    expect(placeAt(-85.5, 14)).toBe('north-america');
  });

  it('finds a country when looking for one, and its continent otherwise', () => {
    expect(placeAt(151.2, -33.9, { byCountry: true })).toBe('AUS');
    expect(placeAt(151.2, -33.9)).toBe('australia');
    expect(placeAt(-47.9, -15.8, { byCountry: true })).toBe('BRA');
    expect(placeAt(2.35, 48.85, { byCountry: true })).toBe('FRA');
  });

  it('finds the seas that are no ocean\'s', () => {
    expect(placeAt(18, 35)).toBe('mediterranean');
    expect(placeAt(34, 43)).toBe('black');
  });

  it('lets a tap on a little island through to the ocean round it, when an ocean is asked for', () => {
    const fiji = COUNTRIES.find((c) => c.id === 'FJI')!;
    expect(isIsland(fiji)).toBe(true);
    const [lon, lat] = middle(fiji);
    expect(placeAt(lon, lat)).toBe('australia');
    expect(placeAt(lon, lat, { wantsOcean: true })).toBe('pacific');
    /* a big one stays land */
    expect(placeAt(134, -25, { wantsOcean: true })).toBe('australia');
  });

  it('turns to the middle of a country to show it: on it, for a solid one, and in its box for any', () => {
    for (const id of ['AUS', 'BRA', 'CHN', 'ZAF', 'USA', 'GBR', 'FRA', 'IND']) {
      const c = COUNTRIES.find((x) => x.id === id)!;
      const [lon, lat] = middle(c);
      expect(placeAt(lon, lat, { byCountry: true }), id).toBe(id);
    }
    for (const c of COUNTRIES) {
      const [x, y] = project(...middle(c));
      expect(x, c.id).toBeGreaterThanOrEqual(c.box.x0 - 0.01);
      expect(x, c.id).toBeLessThanOrEqual(c.box.x1 + 0.01);
      expect(y, c.id).toBeGreaterThanOrEqual(c.box.y0 - 0.01);
      expect(y, c.id).toBeLessThanOrEqual(c.box.y1 + 0.01);
    }
  });
});
