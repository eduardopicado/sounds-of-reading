/* The world map the geography games share: every country drawn and
 * coloured by its continent, the oceans in blues, and the names of the
 * continents and oceans ready to show (src/content/world.ts). World Map asks
 * for a continent or an ocean; Flags asks for a country.
 *
 * A tap just off a coast counts for what is asked for there, if it is that
 * near: on a phone, Europe is about a finger wide, and New Zealand less.
 * Small islands let a tap through to the ocean round them when an ocean is
 * asked for, so tapping Fiji still finds the Pacific. */

import { el } from '../lib/dom';
import { svg } from '../ui/writing';
import { MAP_H, MAP_W, project } from '../content/projection';
import { COUNTRY_SHAPES, OCEAN_SHAPES, OUTLINE, SEA_SHAPES } from '../content/world-shapes';
import { PLACES, SEAS, place, type MapStep, type PlaceId, type SeaId } from '../content/world';

export const isPlace = (id: string): id is PlaceId => PLACES.some((p) => p.id === id);
export const isSea = (id: string): id is SeaId => SEAS.some((s) => s.id === id);
const kindOf = (id: string): 'continent' | 'ocean' | 'sea' | 'country' =>
  (isPlace(id) ? place(id).kind : isSea(id) ? 'sea' : 'country');

export type WorldMap = ReturnType<typeof worldMap>;

/** the map, with a name for each continent and ocean that can be shown or hidden */
export function worldMap() {
  const map = svg('svg', {
    class: 'wm-map', viewBox: `0 0 ${MAP_W} ${MAP_H}`, role: 'img', 'aria-label': 'A map of the world',
  });
  map.append(svg('path', { class: 'wm-edge', d: OUTLINE }));
  for (const o of OCEAN_SHAPES) map.append(svg('path', { class: 'wm-ocean', d: o.d, 'data-place': o.id }));
  for (const s of SEA_SHAPES) map.append(svg('path', { class: 'wm-sea', d: s.d, 'data-sea': s.id }));
  const lands = new Map<string, SVGGElement>();
  for (const c of COUNTRY_SHAPES) {
    let g = lands.get(c.continent);
    if (!g) {
      g = svg('g', c.continent ? { class: 'wm-land', 'data-place': c.continent } : { class: 'wm-land wm-nowhere' });
      lands.set(c.continent, g);
      map.append(g);
    }
    g.append(svg('path', { d: c.d, 'data-country': c.id }));
  }
  map.append(svg('path', { class: 'wm-rim', d: OUTLINE }));

  const labels = el('div', { class: 'wm-labels', 'aria-hidden': 'true' });
  for (const p of PLACES) {
    for (const [lon, lat] of p.labels) {
      const [x, y] = project(lon, lat);
      labels.append(el('span', {
        class: `wm-label ${p.kind}`, text: p.name, dataset: { place: p.id },
        style: `left: ${(100 * x) / MAP_W}%; top: clamp(16px, ${(100 * y) / MAP_H}%, calc(100% - 16px))`,
      }));
    }
  }
  const node = el('div', { class: 'wm-wrap' }, map, labels);

  /* a country smaller than this, in map units, is an island a tap goes
     through when an ocean is asked for */
  let marked = false;
  const markIslands = (): void => {
    if (marked) return;
    marked = true;
    for (const path of map.querySelectorAll<SVGPathElement>('[data-country]')) {
      try {
        const box = path.getBBox();
        if (box.width * box.height < 160) path.classList.add('wm-island');
      } catch {
        /* not drawn yet: it stays a tap on land */
      }
    }
  };

  const region = (id: string): Element[] => [
    ...map.querySelectorAll(`[data-place="${id}"], [data-sea="${id}"], [data-country="${id}"]`),
    ...labels.querySelectorAll(`[data-place="${id}"]`),
  ];

  /** what is under a point on the screen: a country when looking for one,
      and otherwise its continent; or the ocean or sea */
  let byCountry = false;
  const idAt = (x: number, y: number): string | null => {
    const hit = document.elementFromPoint(x, y);
    if (!hit || !map.contains(hit)) return null;
    const country = byCountry ? hit.closest('[data-country]') : null;
    if (country) return country.getAttribute('data-country');
    const at = hit.closest('[data-place], [data-sea]');
    return at ? at.getAttribute('data-place') ?? at.getAttribute('data-sea') : null;
  };

  let waiting: ((id: string) => void) | null = null;
  let want: string | null = null;
  map.addEventListener('click', (e) => {
    if (!waiting || !want) return;
    let id = idAt(e.clientX, e.clientY);
    if (!id) return;
    const looking = kindOf(want);
    if ((looking === 'continent' || looking === 'country') && id !== want && kindOf(id) !== looking) {
      /* just off a coast: what was asked for if it is that near, and
         otherwise the nearest land of the kind asked for round about */
      const near: string[] = [];
      for (const r of [9, 18]) {
        for (let i = 0; i < 8; i += 1) {
          const a = (i * Math.PI) / 4;
          const n = idAt(e.clientX + r * Math.cos(a), e.clientY + r * Math.sin(a));
          if (n && kindOf(n) === looking) near.push(n);
        }
      }
      if (near.length) id = near.includes(want) ? want : near[0];
    }
    const done = waiting;
    waiting = null;
    map.classList.remove('wants-ocean', 'wants-land');
    done(id);
  });

  return {
    node,
    /** the names of the continents, or the oceans, or both, on the map; or none */
    names: (of: MapStep['of'] | null) => {
      if (of) node.dataset.names = of;
      else delete node.dataset.names;
    },
    /** every place back to plain */
    reset: () => {
      for (const n of node.querySelectorAll('.right, .wrong, .glow, .shown, .given')) n.classList.remove('right', 'wrong', 'glow', 'shown', 'given');
    },
    /** wait for a tap on the map, looking for a continent, an ocean, or a
        country by its code; it resolves with what was tapped */
    tap: (looking: string): Promise<string> => {
      markIslands();
      want = looking;
      byCountry = kindOf(looking) === 'country';
      map.classList.toggle('wants-ocean', kindOf(looking) === 'ocean');
      map.classList.toggle('wants-land', kindOf(looking) !== 'ocean');
      return new Promise((resolve) => { waiting = resolve; });
    },
    /** a place's name on the map, for the places a question is about */
    give: (id: PlaceId) => {
      for (const n of labels.querySelectorAll(`[data-place="${id}"]`)) n.classList.add('given');
    },
    /** light a place or a country up: the answer, a wrong tap, or the one to name */
    mark: (id: string, how: 'right' | 'wrong' | 'glow') => {
      for (const n of region(id)) {
        n.classList.add(how);
        if (how !== 'glow' && n.classList.contains('wm-label')) n.classList.add('shown');
      }
    },
  };
}
