/* Capital Cities — Australia's states and their capitals, then the world's.
 *
 * A map of Australia with its states and territories. He finds New South
 * Wales, where he lives, and the others, first with their names on the map;
 * then (Years 3 and 4) he says which city is a state's capital, and finds
 * the capitals as dots on the map. After that come the capitals of the
 * countries in Flags of the World, with the flag beside the question, and
 * the ones where the capital is not the biggest city: Canberra, Brasília,
 * Washington, D.C. (src/content/capitals.ts). */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { svg } from '../ui/writing';
import { AUS_H, AUS_W, projectAus } from '../content/australia-projection';
import { STATE_SHAPES } from '../content/australia-shapes';
import {
  CAPITALS, CAPITAL_STEPS, STATES, capitalQuestion, capitalSays, state, stateSays,
  type CapitalQuestion, type CapitalStep, type StateId,
} from '../content/capitals';
import { country } from '../content/flags';
import { mountMaths, type Kit } from './maths-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<CapitalStep>({
    id: 'capitals',
    title: 'Capital',
    swash: 'Cities',
    tagline: "Australia's states and their capitals, then the world's.",
    steps: CAPITAL_STEPS,
    face: '🏛️',
    cheer: 'Good map reading!',
    build,
  }, root);
}

const nameOf = (code: string): string => country(code).name;
const isState = (id: string): id is StateId => STATES.some((s) => s.id === id);
const pct = (x: number, of: number): string => `${(100 * x) / of}%`;

/** the map of Australia: the states, the capital cities, and their names */
function australiaMap() {
  const map = svg('svg', { class: 'au-map', viewBox: `0 0 ${AUS_W} ${AUS_H}`, role: 'img', 'aria-label': 'A map of Australia' });
  map.append(svg('rect', { class: 'au-sea', x: 0, y: 0, width: AUS_W, height: AUS_H, rx: 28 }));
  for (const s of STATE_SHAPES) map.append(svg('path', { class: 'au-state', d: s.d, 'data-state': s.id }));
  const dots = new Map<string, SVGCircleElement>();
  for (const s of STATES) {
    const [x, y] = projectAus(...s.at);
    const dot = svg('circle', { class: 'au-city', cx: x, cy: y, r: 11, 'data-city': s.capital });
    dots.set(s.capital, dot);
    map.append(dot);
  }
  const labels = el('div', { class: 'au-labels', 'aria-hidden': 'true' });
  for (const s of STATES) {
    const [x, y] = projectAus(...s.label);
    labels.append(el('span', { class: 'au-label state', text: s.id === 'ACT' ? 'ACT' : s.name, dataset: { state: s.id }, style: `left: ${pct(x, AUS_W)}; top: ${pct(y, AUS_H)}` }));
    const [cx, cy] = projectAus(...s.at);
    labels.append(el('span', { class: 'au-label city', text: s.capital, dataset: { city: s.capital }, style: `left: ${pct(cx, AUS_W)}; top: ${pct(cy, AUS_H)}` }));
  }
  const node = el('div', { class: 'au-wrap' }, map, labels);

  const stateAt = (x: number, y: number): string | null => {
    const hit = document.elementFromPoint(x, y)?.closest('[data-state]');
    return hit && map.contains(hit) ? hit.getAttribute('data-state') : null;
  };

  /** the capital nearest a point on the screen, if it is near enough to have been meant */
  const cityNear = (x: number, y: number): string | null => {
    let best: string | null = null;
    let far = 30;
    for (const [city, dot] of dots) {
      const r = dot.getBoundingClientRect();
      const d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y);
      if (d < far) { far = d; best = city; }
    }
    return best;
  };

  let waiting: ((id: string) => void) | null = null;
  let want = '';
  let mode: 'state' | 'city' = 'state';
  map.addEventListener('click', (e) => {
    if (!waiting) return;
    let id: string | null;
    if (mode === 'city') id = cityNear(e.clientX, e.clientY);
    else {
      id = stateAt(e.clientX, e.clientY);
      /* the ACT is a few pixels across on a phone: near it, a tap counts */
      if (id !== want) {
        for (const r of [9, 18]) {
          for (let i = 0; i < 8 && id !== want; i += 1) {
            const a = (i * Math.PI) / 4;
            if (stateAt(e.clientX + r * Math.cos(a), e.clientY + r * Math.sin(a)) === want) id = want;
          }
        }
      }
    }
    if (!id) return;
    const done = waiting;
    waiting = null;
    done(id);
  });

  return {
    node,
    /** the states' names on the map, and the capital cities as dots */
    show: (names: boolean, cities: boolean) => {
      node.classList.toggle('names', names);
      node.classList.toggle('cities', cities);
    },
    reset: () => {
      for (const n of node.querySelectorAll('.right, .wrong, .glow, .shown')) n.classList.remove('right', 'wrong', 'glow', 'shown');
    },
    /** wait for a tap on a state, or on a capital city's dot */
    tap: (looking: string, by: 'state' | 'city'): Promise<string> => {
      want = looking;
      mode = by;
      return new Promise((resolve) => { waiting = resolve; });
    },
    /** light up a state or a city, with its name */
    mark: (id: string, how: 'right' | 'wrong' | 'glow') => {
      const key = isState(id) ? 'state' : 'city';
      for (const n of node.querySelectorAll(`[data-${key}="${CSS.escape(id)}"]`)) {
        n.classList.add(how);
        if (how !== 'glow') n.classList.add('shown');
      }
    },
  };
}

function build(kit: Kit) {
  const map = australiaMap();
  const ask = el('p', { class: 'mx-ask' });
  const flag = el('div', { class: 'fl-flag cc-flag', role: 'img' });
  const node = el('div', { class: 'mx-stage cc-stage' }, ask, flag, map.node);
  let recent: string[] = [];

  /** the state a capital belongs to */
  const stateOf = (city: string) => STATES.find((s) => s.capital === city);

  async function finish(ok: boolean, q: CapitalQuestion, picked: string): Promise<boolean> {
    if (q.task === 'state') map.mark(q.answer, 'right');
    if (q.task === 'capital' || q.task === 'city') {
      map.mark(q.about, 'right');
      map.mark(q.answer, 'right');
    }
    if (ok) {
      sfx.cheer();
      kit.note(`Yes! ${q.why}`, true);
      say(q.why);
      await kit.wait(2600);
      return true;
    }
    sfx.wrong();
    let first = '';
    let then = q.why;
    if (q.task === 'state') {
      map.mark(picked, 'wrong');
      first = stateSays(state(picked as StateId)).that;
      then = stateSays(state(q.answer as StateId)).here;
    } else if (q.task === 'capital' || q.task === 'city') {
      /* what he picked is another state's capital: say whose */
      const other = stateOf(picked);
      if (other) {
        map.mark(picked, 'wrong');
        first = stateSays(other).is;
      }
    } else {
      /* another country's capital: say whose; a bigger city needs no more than the answer */
      const other = CAPITALS.find((c) => c.capital === picked);
      if (other) first = capitalSays(other, nameOf(other.country)).is;
    }
    kit.note(first ? `${first} ${then}` : then);
    if (first) say(first, { onEnd: () => say(then) });
    else say(then);
    await kit.wait(5200);
    return false;
  }

  return {
    node,
    ask: async (step: CapitalStep): Promise<boolean> => {
      const q = capitalQuestion(step, nameOf, recent);
      recent = [q.about, ...recent].slice(0, 3);
      node.dataset.answer = q.answer;
      map.reset();
      const onMap = q.task === 'state' || q.task === 'capital' || q.task === 'city';
      map.node.hidden = !onMap;
      map.show(!!step.names, q.task === 'city');
      flag.hidden = onMap;
      if (!onMap) {
        flag.textContent = country(q.about).flag;
        flag.setAttribute('aria-label', `The flag of ${nameOf(q.about)}`);
      }
      ask.textContent = q.ask;
      say(q.ask);
      if (q.task === 'state' || q.task === 'city') {
        const picked = await map.tap(q.answer, q.task);
        return finish(picked === q.answer, q, picked);
      }
      if (q.task === 'capital') map.mark(q.about, 'glow');
      const picked = await kit.choices.askWords(q.options);
      kit.choices.revealWord(q.answer, picked);
      return finish(picked === q.answer, q, picked);
    },
  };
}
