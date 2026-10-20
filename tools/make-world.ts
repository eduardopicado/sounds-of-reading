/* Makes src/content/world-shapes.ts: the world map's countries and oceans.
 *
 * The countries come from Natural Earth's 1:110m countries, which are in the
 * public domain (naturalearthdata.com). This runs on a laptop, never in the
 * app: the map ships inside the app, so it works with no signal and asks
 * nothing of any other server.
 *
 *   mkdir ne && cd ne
 *   curl -O https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson
 *   cd .. && node --experimental-strip-types tools/make-world.ts ne
 *
 * Each country keeps its continent, with three changes for a child's map:
 * Natural Earth puts all of Russia in Europe, so it is cut at the Urals
 * (60° E) and the east goes to Asia; French Guiana, part of France, goes
 * with South America, where it is; and Oceania is called Australia, the
 * name he learns at school for the continent (src/content/world.ts says the
 * rest). The oceans, and the three seas that are no ocean's, are traced
 * from the rules in src/content/seas.ts.
 *
 * Shapes are projected (src/content/projection.ts), simplified to within
 * 0.4 of a unit on a map 1000 wide (the oceans, mostly under the land, to
 * 0.8), and written with one decimal. Add a picture to look at with
 * `node … tools/make-world.ts ne preview.svg`. */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAP_H, MAP_W, outline, project } from '../src/content/projection.ts';
import { seaAt, type SeaId } from '../src/content/seas.ts';
import { area, keep, path, polygons, toMap, type Feature, type Pt, type Ring } from './shapes.ts';

const onMap = (ring: Ring, tol = 0.4): Ring => toMap(ring, project, tol);


const here = fileURLToPath(new URL('.', import.meta.url));
const dir = resolve(process.argv[2] ?? '.');
const read = (name: string): { features: Feature[] } => JSON.parse(readFileSync(join(dir, name), 'utf8'));

const CONTINENTS: Record<string, string> = {
  Africa: 'africa', Antarctica: 'antarctica', Asia: 'asia', Europe: 'europe',
  'North America': 'north-america', 'South America': 'south-america', Oceania: 'australia',
};

/** keep the part of a ring west (or east) of a line of longitude */
function clip(ring: Ring, lon: number, west: boolean): Ring {
  const inside = (p: Pt): boolean => (west ? p[0] < lon : p[0] >= lon);
  const cross = (a: Pt, b: Pt): Pt => {
    const t = (lon - a[0]) / (b[0] - a[0]);
    return [lon, a[1] + t * (b[1] - a[1])];
  };
  const out: Ring = [];
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    if (inside(a) && inside(b)) out.push(b);
    else if (inside(a)) out.push(cross(a, b));
    else if (inside(b)) out.push(cross(a, b), b);
  }
  return out;
}

/* the countries */
const countries: { id: string; continent: string; d: string }[] = [];
for (const f of read('ne_110m_admin_0_countries.geojson').features) {
  const id = String(f.properties.ADM0_A3);
  const continent = CONTINENTS[String(f.properties.CONTINENT)] ?? '';
  const polys = polygons(f);
  if (id === 'RUS') {
    /* the tip of Chukotka over the date line has longitudes below 0, but it
       is as far east as Asia goes */
    const rings = polys.flat();
    const far = rings.filter((r) => r.every((p) => p[0] < 0));
    const rest = rings.filter((r) => !far.includes(r));
    for (const [west, part] of [[true, 'europe'], [false, 'asia']] as const) {
      const cut = rest.map((r) => clip(r, 60, west)).filter((r) => r.length >= 3);
      countries.push({ id, continent: part, d: path(keep((west ? cut : [...cut, ...far]).map((r) => onMap(r)))) });
    }
    continue;
  }
  if (id === 'FRA') {
    /* French Guiana is part of France, but it is in South America */
    const guiana = polys.filter((p) => p[0].every((pt) => pt[0] < -30));
    const rest = polys.filter((p) => !guiana.includes(p));
    countries.push({ id, continent, d: path(keep(rest.flat().map((r) => onMap(r)))) });
    countries.push({ id, continent: 'south-america', d: path(keep(guiana.flat().map((r) => onMap(r)))) });
    continue;
  }
  countries.push({ id, continent, d: path(keep(polys.flat().map((r) => onMap(r)))) });
}
countries.sort((a, b) => a.id.localeCompare(b.id) || a.continent.localeCompare(b.continent));

/* the oceans, traced from the grid */
const STEP = 0.5;
const COLS = 360 / STEP;
const ROWS = 180 / STEP;
const cellOcean: SeaId[] = [];
for (let r = 0; r < ROWS; r += 1) {
  for (let c = 0; c < COLS; c += 1) cellOcean.push(seaAt(-180 + (c + 0.5) * STEP, 90 - (r + 0.5) * STEP));
}
/** the outline of every patch of one ocean, as rings of grid corners (lon, lat) */
function trace(ocean: SeaId): Ring[] {
  const is = (r: number, c: number): boolean => r >= 0 && r < ROWS && c >= 0 && c < COLS && cellOcean[r * COLS + c] === ocean;
  /* the edges between this ocean and anything else, each going round it the same way */
  const next = new Map<string, string[]>();
  const key = (r: number, c: number): string => `${r},${c}`;
  const edge = (a: [number, number], b: [number, number]): void => {
    const k = key(...a);
    const list = next.get(k) ?? [];
    list.push(key(...b));
    next.set(k, list);
  };
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (!is(r, c)) continue;
      if (!is(r - 1, c)) edge([r, c], [r, c + 1]);
      if (!is(r, c + 1)) edge([r, c + 1], [r + 1, c + 1]);
      if (!is(r + 1, c)) edge([r + 1, c + 1], [r + 1, c]);
      if (!is(r, c - 1)) edge([r + 1, c], [r, c]);
    }
  }
  const rings: Ring[] = [];
  for (const start of [...next.keys()]) {
    while ((next.get(start) ?? []).length) {
      const ring: Ring = [];
      let at = start;
      for (;;) {
        const list = next.get(at)!;
        const to = list.pop()!;
        if (!list.length) next.delete(at);
        const [r, c] = at.split(',').map(Number);
        ring.push([-180 + c * STEP, 90 - r * STEP]);
        at = to;
        if (at === start) break;
      }
      rings.push(ring);
    }
  }
  return rings;
}
const OCEAN_IDS: SeaId[] = ['pacific', 'atlantic', 'indian', 'southern', 'arctic'];
const oceans = OCEAN_IDS.map((id) => ({ id, d: path(trace(id).map((r) => onMap(r, 0.8)).filter((r) => area(r) >= 1)) }));
/* the three seas that are no ocean's */
const seas = (['mediterranean', 'black', 'caspian'] as SeaId[]).map((id) => ({ id, d: path(trace(id).map((r) => onMap(r, 0.8)).filter((r) => area(r) >= 1)) }));

const out = `/* The world map's shapes, made by tools/make-world.ts from Natural Earth's
   1:110m countries (public domain) and the oceans of src/content/seas.ts,
   in the Natural Earth projection on a map ${MAP_W} wide and ${MAP_H} high.
   Do not edit: run the tool again. A country is its Natural Earth code
   (ADM0_A3) and its continent; Russia comes twice, its European and its
   Asian part. */

export const COUNTRY_SHAPES: readonly { id: string; continent: string; d: string }[] = [
${countries.map((c) => `  { id: '${c.id}', continent: '${c.continent}', d: '${c.d}' },`).join('\n')}
];

export const OCEAN_SHAPES: readonly { id: string; d: string }[] = [
${oceans.map((o) => `  { id: '${o.id}', d: '${o.d}' },`).join('\n')}
];

/** the seas that belong to no ocean */
export const SEA_SHAPES: readonly { id: string; d: string }[] = [
${seas.map((o) => `  { id: '${o.id}', d: '${o.d}' },`).join('\n')}
];

/** the edge of the world */
export const OUTLINE = '${path([outline()])}';
`;
writeFileSync(join(here, '../src/content/world-shapes.ts'), out);
console.log(`${countries.length} shapes, ${oceans.length} oceans, ${Math.round(out.length / 1024)} KB`);

if (process.argv[3]) {
  const colour: Record<string, string> = {
    africa: '#E9B44C', antarctica: '#F2F2F2', asia: '#D96C5F', europe: '#7C9CD6', 'north-america': '#8BC48A',
    'south-america': '#C58BCB', australia: '#E8875B', '': '#999',
  };
  const sea: Record<string, string> = { pacific: '#6FB7E8', atlantic: '#4F8FCF', indian: '#3E7BB5', southern: '#9DCBE8', arctic: '#BFE0F2' };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP_W} ${MAP_H}" width="${MAP_W * 1.5}">`
    + `<path d="${path([outline()])}" fill="#223"/>`
    + oceans.map((o) => `<path d="${o.d}" fill="${sea[o.id]}" fill-rule="evenodd"/>`).join('')
    + seas.map((o) => `<path d="${o.d}" fill="#8a8" fill-rule="evenodd"/>`).join('')
    + countries.map((c) => `<path d="${c.d}" fill="${colour[c.continent]}" stroke="#333" stroke-width=".3" fill-rule="evenodd"/>`).join('')
    + '</svg>';
  writeFileSync(resolve(process.argv[3]), svg);
}
