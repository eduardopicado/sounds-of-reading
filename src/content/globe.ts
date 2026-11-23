/* The globe: the world map's own shapes (world-shapes.ts) on a ball he can
 * turn. Nothing new is drawn for it: each shape is taken back from the map
 * to longitude and latitude (projection.ts, run backwards), painted flat,
 * and wrapped round the ball a pixel at a time (src/games/globe.ts).
 *
 * Here are the sums, which need no screen, so the tests can check them: the
 * ball turned to look at any longitude and latitude, a place on the ball
 * found on the screen and a point on the screen found on the ball, and what
 * is at a longitude and latitude, by the same shapes as a tap on the flat
 * map, small islands letting a tap through when an ocean is asked for. */

import { COUNTRY_SHAPES, OCEAN_SHAPES, SEA_SHAPES } from './world-shapes';
import { project, unproject } from './projection';

const RAD = Math.PI / 180;

/** where the ball is turned to: the longitude and latitude in the middle */
export interface View { lon: number; lat: number }

/** where he first sees it: Australia, with Asia above it */
export const HOME: View = { lon: 135, lat: 5 };

/** the furthest north or south the middle can be turned, so north stays up */
export const MAX_LAT = 80;

/** a longitude back between -180 and 180 */
export const wrapLon = (lon: number): number => ((((lon + 180) % 360) + 360) % 360) - 180;

/**
 * Where a longitude and latitude are on the ball, looking at `view`: u to
 * the right and v up, on a ball of radius 1, and how far it faces him (1 in
 * the middle, 0 at the edge, below 0 round the back).
 */
export function toScreen(lon: number, lat: number, view: View): { u: number; v: number; facing: number } {
  const l = lon * RAD;
  const p = lat * RAD;
  const px = Math.cos(p) * Math.cos(l);
  const py = Math.cos(p) * Math.sin(l);
  const pz = Math.sin(p);
  const cl = Math.cos(view.lon * RAD);
  const sl = Math.sin(view.lon * RAD);
  const cp = Math.cos(view.lat * RAD);
  const sp = Math.sin(view.lat * RAD);
  const x1 = px * cl + py * sl;
  const y1 = -px * sl + py * cl;
  return { u: y1, v: -x1 * sp + pz * cp, facing: x1 * cp + pz * sp };
}

/** the longitude and latitude at a point on the ball (u right, v up, radius 1); null off it */
export function fromScreen(u: number, v: number, view: View): [number, number] | null {
  const r2 = u * u + v * v;
  if (r2 > 1) return null;
  const x = Math.sqrt(1 - r2);
  const cl = Math.cos(view.lon * RAD);
  const sl = Math.sin(view.lon * RAD);
  const cp = Math.cos(view.lat * RAD);
  const sp = Math.sin(view.lat * RAD);
  const x1 = x * cp - v * sp;
  const z1 = x * sp + v * cp;
  const x2 = x1 * cl - u * sl;
  const y2 = x1 * sl + u * cl;
  return [Math.atan2(y2, x2) / RAD, Math.asin(Math.max(-1, Math.min(1, z1))) / RAD];
}

/** the view that puts a place in the middle */
export const lookAt = (lon: number, lat: number): View => ({ lon: wrapLon(lon), lat: Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) });

/** the middle of several places: the way between them, on the ball */
export function middleOf(points: [number, number][]): [number, number] {
  let x = 0; let y = 0; let z = 0;
  for (const [lon, lat] of points) {
    x += Math.cos(lat * RAD) * Math.cos(lon * RAD);
    y += Math.cos(lat * RAD) * Math.sin(lon * RAD);
    z += Math.sin(lat * RAD);
  }
  return [Math.atan2(y, x) / RAD, Math.atan2(z, Math.hypot(x, y)) / RAD];
}

/* ── the shapes ─────────────────────────────────────────────────────────── */

export interface Box { x0: number; y0: number; x1: number; y1: number }

export interface Shape {
  kind: 'country' | 'ocean' | 'sea';
  id: string;
  /** a country's continent; '' for the few that are no continent's */
  continent: string;
  /** its outlines on the flat map, as x, y, x, y… */
  rings: number[][];
  box: Box;
}

/** the outlines in the shapes' format: M x y, then l dx dy…, z, as points on the map */
export function parse(d: string): number[][] {
  return d.split(/(?=M)/).filter((s) => s.trim()).map((ring) => {
    const nums = (ring.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    const out = [nums[0], nums[1]];
    let x = nums[0];
    let y = nums[1];
    for (let i = 2; i + 1 < nums.length; i += 2) {
      x += nums[i];
      y += nums[i + 1];
      out.push(x, y);
    }
    return out;
  });
}

function boxOf(rings: number[][]): Box {
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const r of rings) {
    for (let i = 0; i < r.length; i += 2) {
      box.x0 = Math.min(box.x0, r[i]); box.x1 = Math.max(box.x1, r[i]);
      box.y0 = Math.min(box.y0, r[i + 1]); box.y1 = Math.max(box.y1, r[i + 1]);
    }
  }
  return box;
}

const shape = (kind: Shape['kind'], id: string, continent: string, d: string): Shape => {
  const rings = parse(d);
  return { kind, id, continent, rings, box: boxOf(rings) };
};

export const COUNTRIES: Shape[] = COUNTRY_SHAPES.map((c) => shape('country', c.id, c.continent, c.d));
export const OCEANS: Shape[] = OCEAN_SHAPES.map((o) => shape('ocean', o.id, '', o.d));
export const SEA_PARTS: Shape[] = SEA_SHAPES.map((s) => shape('sea', s.id, '', s.d));

/** a country smaller than this, in map units, lets a tap through to the
    ocean round it when an ocean is asked for: the flat map's rule */
export const ISLAND = 160;
export const isIsland = (s: Shape): boolean => (s.box.x1 - s.box.x0) * (s.box.y1 - s.box.y0) < ISLAND;

/** whether a point on the map is inside a shape: in an odd number of its outlines */
export function inside(s: Shape, x: number, y: number): boolean {
  if (x < s.box.x0 || x > s.box.x1 || y < s.box.y0 || y > s.box.y1) return false;
  let odd = false;
  for (const r of s.rings) {
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      const yi = r[i + 1];
      const yj = r[j + 1];
      if ((yi > y) !== (yj > y) && x < ((r[j] - r[i]) * (y - yi)) / (yj - yi) + r[i]) odd = !odd;
    }
  }
  return odd;
}

/**
 * What is at a longitude and latitude, as the flat map answers a tap: a
 * country by its code when looking for countries, otherwise its continent;
 * or the sea or ocean. A country that is no continent's is passed through,
 * and so is a small island when an ocean is asked for.
 */
export function placeAt(lon: number, lat: number, o: { byCountry?: boolean; wantsOcean?: boolean } = {}): string | null {
  const [x, y] = project(lon, lat);
  for (const c of COUNTRIES) {
    if (!c.continent || (o.wantsOcean && isIsland(c)) || !inside(c, x, y)) continue;
    return o.byCountry ? c.id : c.continent;
  }
  for (const s of SEA_PARTS) if (inside(s, x, y)) return s.id;
  for (const s of OCEANS) if (inside(s, x, y)) return s.id;
  return null;
}

/** somewhere in the middle of a shape, to turn the ball to: the middle of its biggest outline */
export function middle(s: Shape): [number, number] {
  let best = s.rings[0];
  let size = -1;
  for (const r of s.rings) {
    const b = boxOf([r]);
    const a = (b.x1 - b.x0) * (b.y1 - b.y0);
    if (a > size) { size = a; best = r; }
  }
  const b = boxOf([best]);
  return unproject((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2);
}
