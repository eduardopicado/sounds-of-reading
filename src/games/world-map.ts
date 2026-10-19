/* World Map — the continents and the oceans.
 *
 * A map of the whole world, every country drawn and coloured by its
 * continent, the oceans in blues. He finds the seven continents with their
 * names on the map, then the five oceans, then both again with no names.
 * After that a place glows and he reads which name is its, and Year 2 asks
 * where things are: what is north, south, east and west of Australia, and
 * which ocean is between two continents. Whatever he finds, he is told one
 * true thing about it (src/content/world.ts).
 *
 * A tap just off the coast counts for the continent there: on a phone,
 * Europe is about a finger wide. Small islands let a tap through to the
 * ocean round them when an ocean is asked for, so tapping Fiji still finds
 * the Pacific. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { svg } from '../ui/writing';
import { MAP_H, MAP_W, project } from '../content/projection';
import { COUNTRY_SHAPES, OCEAN_SHAPES, OUTLINE, SEA_SHAPES } from '../content/world-shapes';
import {
  MAP_STEPS, PLACES, SEAS, findSays, mapQuestion, place, seaSays,
  type MapQuestion, type MapStep, type PlaceId, type SeaId,
} from '../content/world';
import { mountMaths, type Kit } from './maths-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<MapStep>({
    id: 'world-map',
    title: 'World',
    swash: 'Map',
    tagline: 'Find the continents and the oceans.',
    steps: MAP_STEPS,
    face: '🌏',
    cheer: 'Good map reading!',
    build,
  }, root);
}

const isPlace = (id: string): id is PlaceId => PLACES.some((p) => p.id === id);
const isSea = (id: string): id is SeaId => SEAS.some((s) => s.id === id);
const kindOf = (id: string): 'continent' | 'ocean' | 'sea' =>
  (isPlace(id) ? place(id).kind : 'sea');

/** the map, with a name for each place that can be shown or hidden */
function worldMap() {
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

  const region = (id: string): Element[] =>
    [...map.querySelectorAll(`[data-place="${id}"], [data-sea="${id}"]`), ...labels.querySelectorAll(`[data-place="${id}"]`)];

  /** the place or sea under a point on the screen */
  const idAt = (x: number, y: number): string | null => {
    const hit = document.elementFromPoint(x, y)?.closest('[data-place], [data-sea]');
    if (!hit || !map.contains(hit)) return null;
    return hit.getAttribute('data-place') ?? hit.getAttribute('data-sea');
  };

  let waiting: ((id: string) => void) | null = null;
  let want: PlaceId | null = null;
  map.addEventListener('click', (e) => {
    if (!waiting || !want) return;
    let id = idAt(e.clientX, e.clientY);
    if (!id) return;
    if (place(want).kind === 'continent' && kindOf(id) !== 'continent') {
      /* just off a coast: the continent asked for if it is that near, and
         otherwise the nearest one round about */
      const near: string[] = [];
      for (const r of [9, 18]) {
        for (let i = 0; i < 8; i += 1) {
          const a = (i * Math.PI) / 4;
          const n = idAt(e.clientX + r * Math.cos(a), e.clientY + r * Math.sin(a));
          if (n && kindOf(n) === 'continent') near.push(n);
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
    /** wait for a tap on the map, while looking for this place */
    tap: (looking: PlaceId): Promise<string> => {
      markIslands();
      want = looking;
      map.classList.toggle('wants-ocean', place(looking).kind === 'ocean');
      map.classList.toggle('wants-land', place(looking).kind === 'continent');
      return new Promise((resolve) => { waiting = resolve; });
    },
    /** a place's name on the map, for the places a question is about */
    give: (id: PlaceId) => {
      for (const n of labels.querySelectorAll(`[data-place="${id}"]`)) n.classList.add('given');
    },
    /** light a place up: the answer, a wrong tap, or the one to name */
    mark: (id: string, how: 'right' | 'wrong' | 'glow') => {
      for (const n of region(id)) {
        n.classList.add(how);
        if (how !== 'glow' && n.classList.contains('wm-label')) n.classList.add('shown');
      }
    },
  };
}

function build(kit: Kit) {
  const map = worldMap();
  const ask = el('p', { class: 'mx-ask' });
  const node = el('div', { class: 'mx-stage wm-stage' }, ask, map.node);
  let recent: PlaceId[] = [];

  /** what he tapped, said and written: "That is Asia." */
  const that = (id: string): string => (isSea(id) ? seaSays(id).that : findSays(place(id as PlaceId)).that);

  async function finish(ok: boolean, q: MapQuestion, picked: string): Promise<boolean> {
    map.mark(q.answer, 'right');
    if (ok) {
      sfx.cheer();
      kit.note(`Yes! ${q.why}`, true);
      say(q.why);
      await kit.wait(2600);
      return true;
    }
    sfx.wrong();
    /* where it was, then what he tapped and the right answer in words */
    const right = q.task === 'find' ? findSays(place(q.answer)).here : q.why;
    const first = q.task === 'name' ? findSays(place(q.answer)).this : that(picked);
    if (q.task !== 'name') map.mark(picked, 'wrong');
    kit.note(`${first} ${right}`);
    say(first, { onEnd: () => say(right) });
    await kit.wait(4600);
    return false;
  }

  return {
    node,
    ask: async (step: MapStep): Promise<boolean> => {
      const q = mapQuestion(step, recent);
      recent = [q.answer, ...recent].slice(0, step.of === 'ocean' ? 3 : 4);
      map.reset();
      map.names(step.names ? step.of : null);
      for (const id of q.given ?? []) map.give(id);
      /* what the tests look for, the way the other games' cards say it */
      node.dataset.answer = q.answer;
      ask.textContent = q.ask;
      say(q.ask);
      if (q.task === 'name') {
        map.mark(q.answer, 'glow');
        const picked = await kit.choices.askWords(q.options!, (id) => place(id as PlaceId).name);
        kit.choices.revealWord(q.answer, picked);
        return finish(picked === q.answer, q, picked);
      }
      const picked = await map.tap(q.answer);
      return finish(picked === q.answer, q, picked);
    },
  };
}
