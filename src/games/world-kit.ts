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
import { read, write } from '../lib/storage';
import { svg } from '../ui/writing';
import { MAP_H, MAP_W, project } from '../content/projection';
import { COUNTRY_SHAPES, OCEAN_SHAPES, OUTLINE, SEA_SHAPES } from '../content/world-shapes';
import { PLACES, SEAS, nameIn, place, type MapStep, type PlaceId, type SeaId } from '../content/world';
import type { Lang } from '../content/pt';
import { dirName, type Dir } from '../content/treasure';
import { COUNTRIES, SEA_PARTS, isIsland, middle, middleOf, placeAt } from '../content/globe';
import { globe as makeGlobe, type Globe } from './globe';

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
  /* north, south, east and west, in the corner of the map, in his language */
  const rose = el('div', { class: 'tm-compass wm-compass', hidden: 'hidden', 'aria-hidden': 'true' });
  const drawRose = (lang: Lang): void => {
    const n = (d: Dir): string => dirName(d, lang)[0];
    rose.replaceChildren(
      el('span', { class: 'tm-n', text: n('north') }), el('span', { class: 'tm-w', text: n('west') }),
      el('span', { class: 'tm-rose', text: '✦' }), el('span', { class: 'tm-e', text: n('east') }),
      el('span', { class: 'tm-s', text: n('south') }),
    );
  };
  drawRose('en');
  const node = el('div', { class: 'wm-wrap' }, map, labels, rose);

  /* a country smaller than this, in map units, is an island a tap goes
     through when an ocean is asked for (the sum is the globe's, so it is
     the same on both, and needs no drawn map) */
  let marked = false;
  const markIslands = (): void => {
    if (marked) return;
    marked = true;
    const small = new Set(COUNTRIES.filter(isIsland).map((c) => c.id));
    for (const path of map.querySelectorAll<SVGPathElement>('[data-country]')) {
      if (small.has(path.dataset.country ?? '')) path.classList.add('wm-island');
    }
  };

  /* the globe: made the first time it is asked for, and remembered */
  let ball: Globe | null = null;
  const globeBtn = el('button', {
    class: 'wm-globe-btn', type: 'button', 'aria-label': 'Globe', 'aria-pressed': 'false', text: '🌍',
    on: { click: () => setGlobe(!onGlobe) },
  });
  node.append(globeBtn);
  let onGlobe = false;
  function setGlobe(on: boolean): void {
    onGlobe = on;
    write('world-globe', on);
    globeBtn.setAttribute('aria-pressed', String(on));
    globeBtn.textContent = on ? '🗺️' : '🌍';
    node.classList.toggle('globe', on);
    if (on && !ball) {
      ball = makeGlobe(map, (x, y) => tapAt(x, y));
      ball.language(lang);
      node.insertBefore(ball.node, rose);
    }
    if (on) { repaint(); focus(); }
  }
  let lang: Lang = 'en';
  /* the globe painted again from the map's colours, once for a run of changes */
  let painting = false;
  const repaint = (): void => {
    if (!ball || !onGlobe || painting) return;
    painting = true;
    requestAnimationFrame(() => { painting = false; ball?.repaint(); });
  };
  /** where a place is, to turn the globe to */
  const whereIs = (id: string): [number, number] | null => {
    if (isPlace(id)) return place(id).labels[0];
    const shape = COUNTRIES.find((c) => c.id === id) ?? SEA_PARTS.find((x) => x.id === id);
    return shape ? middle(shape) : null;
  };
  /* the places the question is about, to turn the globe to them */
  let about: string[] = [];
  const focus = (): void => {
    if (!ball || !onGlobe || !about.length) return;
    const at = about.map(whereIs).filter((p): p is [number, number] => !!p);
    if (at.length) ball.spinTo(...middleOf(at));
  };

  const region = (id: string): Element[] => [
    ...map.querySelectorAll(`[data-place="${id}"], [data-sea="${id}"], [data-country="${id}"]`),
    ...node.querySelectorAll(`.wm-label[data-place="${id}"]`),
  ];

  /** what is under a point on the screen: a country when looking for one,
      and otherwise its continent; or the ocean or sea */
  let byCountry = false;
  const idAt = (x: number, y: number): string | null => {
    if (onGlobe && ball) {
      const at = ball.at(x, y);
      return at ? placeAt(at[0], at[1], { byCountry, wantsOcean: want !== null && kindOf(want) === 'ocean' }) : null;
    }
    const hit = document.elementFromPoint(x, y);
    if (!hit || !map.contains(hit)) return null;
    const country = byCountry ? hit.closest('[data-country]') : null;
    if (country) return country.getAttribute('data-country');
    const at = hit.closest('[data-place], [data-sea]');
    return at ? at.getAttribute('data-place') ?? at.getAttribute('data-sea') : null;
  };

  let waiting: ((id: string) => void) | null = null;
  let want: string | null = null;
  /** a tap on the map or the globe, at a point on the screen */
  function tapAt(clientX: number, clientY: number): void {
    if (!waiting || !want) return;
    let id = idAt(clientX, clientY);
    if (!id) return;
    const looking = kindOf(want);
    if ((looking === 'continent' || looking === 'country') && id !== want && kindOf(id) !== looking) {
      /* just off a coast: what was asked for if it is that near, and
         otherwise the nearest land of the kind asked for round about */
      const near: string[] = [];
      for (const r of [9, 18]) {
        for (let i = 0; i < 8; i += 1) {
          const a = (i * Math.PI) / 4;
          const n = idAt(clientX + r * Math.cos(a), clientY + r * Math.sin(a));
          if (n && kindOf(n) === looking) near.push(n);
        }
      }
      if (near.length) id = near.includes(want) ? want : near[0];
    }
    const done = waiting;
    waiting = null;
    map.classList.remove('wants-ocean', 'wants-land');
    done(id);
  }
  map.addEventListener('click', (e) => tapAt(e.clientX, e.clientY));

  if (read<boolean>('world-globe', false) === true) setGlobe(true);

  return {
    node,
    /** the names on the map in English or Portuguese */
    language: (to: Lang) => {
      lang = to;
      for (const n of labels.querySelectorAll<HTMLElement>('[data-place]')) n.textContent = nameIn(place(n.dataset.place as PlaceId), to);
      ball?.language(to);
      drawRose(to);
    },
    /** the compass on the map, or not */
    compass: (on: boolean) => { rose.hidden = !on; },
    /** the names of the continents, or the oceans, or both, on the map; or none */
    names: (of: MapStep['of'] | null) => {
      if (of) node.dataset.names = of;
      else delete node.dataset.names;
    },
    /** every place back to plain */
    reset: () => {
      for (const n of node.querySelectorAll('.right, .wrong, .glow, .shown, .given')) n.classList.remove('right', 'wrong', 'glow', 'shown', 'given');
      about = [];
      repaint();
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
      for (const n of node.querySelectorAll(`.wm-label[data-place="${id}"]`)) n.classList.add('given');
      about = [...about, id];
      focus();
    },
    /** light a place or a country up: the answer, a wrong tap, or the one to name */
    mark: (id: string, how: 'right' | 'wrong' | 'glow') => {
      for (const n of region(id)) {
        n.classList.add(how);
        if (how !== 'glow' && n.classList.contains('wm-label')) n.classList.add('shown');
      }
      repaint();
      /* the globe turns to show the answer, or the place to name */
      if (how !== 'wrong') { about = [id]; focus(); }
    },
    /** whether the globe is showing */
    globe: () => onGlobe,
  };
}
