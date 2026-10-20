/* Makes src/content/australia-shapes.ts: Australia's states and territories
 * for the Capital Cities game.
 *
 * They come from Natural Earth's 1:50m states and provinces, which are in
 * the public domain (naturalearthdata.com). This runs on a laptop, never in
 * the app: the map ships inside it, so it works with no signal.
 *
 *   cd ne
 *   curl -O https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson
 *   cd .. && node --experimental-strip-types tools/make-australia.ts ne
 *
 * The Jervis Bay Territory, a few kilometres of coast, is drawn with New
 * South Wales round it: too small to show, and too small to tap. */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUS_H, AUS_W, projectAus } from '../src/content/australia-projection.ts';
import { keep, path, polygons, toMap, type Feature } from './shapes.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const dir = resolve(process.argv[2] ?? '.');
const all = JSON.parse(readFileSync(join(dir, 'ne_50m_admin_1_states_provinces.geojson'), 'utf8')) as { features: Feature[] };

/** Natural Earth's postal codes, and the ones he will see on a map at school */
const STATE: Record<string, string> = {
  NS: 'NSW', VI: 'VIC', QL: 'QLD', SA: 'SA', WA: 'WA', TS: 'TAS', NT: 'NT', CT: 'ACT', JB: 'NSW',
};

const rings = new Map<string, ReturnType<typeof toMap>[]>();
for (const f of all.features) {
  if (f.properties.adm0_a3 !== 'AUS') continue;
  const id = STATE[String(f.properties.postal)];
  if (!id) throw new Error(`no state for ${String(f.properties.name)}`);
  const list = rings.get(id) ?? [];
  list.push(...polygons(f).flat().map((r) => toMap(r, projectAus, 0.6)));
  rings.set(id, list);
}

const ORDER = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
const states = ORDER.map((id) => {
  const r = rings.get(id);
  if (!r) throw new Error(`no shape for ${id}`);
  /* the ACT is small enough that keep() would leave only its biggest ring anyway */
  return { id, d: path(keep(r)) };
});

const out = `/* Australia's states and territories, made by tools/make-australia.ts
   from Natural Earth's 1:50m states and provinces (public domain), on a map
   ${AUS_W} wide and ${AUS_H} high (src/content/australia-projection.ts).
   Do not edit: run the tool again. */

export const STATE_SHAPES: readonly { id: string; d: string }[] = [
${states.map((s) => `  { id: '${s.id}', d: '${s.d}' },`).join('\n')}
];
`;
writeFileSync(join(here, '../src/content/australia-shapes.ts'), out);
console.log(`${states.length} states and territories, ${Math.round(out.length / 1024)} KB, map ${AUS_W} by ${AUS_H}`);
