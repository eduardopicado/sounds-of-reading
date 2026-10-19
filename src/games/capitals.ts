/* Capital Cities — Australia's states and their capitals, then the world's.
 *
 * A map of Australia with its states and territories. He finds New South
 * Wales, where he lives, and the others, first with their names on the map;
 * then (Years 3 and 4) he says which city is a state's capital, and finds
 * the capitals as dots on the map. After that come the capitals of the
 * countries in Flags of the World, with the flag beside the question, and
 * the ones where the capital is not the biggest city: Canberra, Brasília,
 * Washington, D.C. (src/content/capitals.ts).
 *
 * In English or Portuguese, switched with the flags at the top, like the
 * other geography games: Camberra and Pequim in Portuguese. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { svg } from '../ui/writing';
import { AUS_H, AUS_W, projectAus } from '../content/australia-projection';
import { STATE_SHAPES } from '../content/australia-shapes';
import {
  CAPITALS, CAPITAL_STEPS, STATES, capitalQuestion, capitalSays, capitalSaysPt, cityIn, state, stateSays,
  type CapitalQuestion, type CapitalStep, type State, type StateId,
} from '../content/capitals';
import { country } from '../content/flags';
import { of, type Both, type Lang } from '../content/pt';
import { mountMaths, type Kit } from './maths-kit';
import { GEO_LANG, langSwitch, speak } from './lang-kit';

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
const ptOf = (code: string) => country(code).pt;
/** a state's name on the map: the ACT by its letters, in both languages */
const stateLabel = (s: State, lang: Lang): string => (s.id === 'ACT' ? 'ACT' : lang === 'pt' ? s.pt.name : s.name);
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
    labels.append(el('span', { class: 'au-label state', text: stateLabel(s, 'en'), dataset: { state: s.id }, style: `left: ${pct(x, AUS_W)}; top: ${pct(y, AUS_H)}` }));
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
    /** the names on the map in English or Portuguese */
    language: (lang: Lang) => {
      for (const s of STATES) {
        for (const n of labels.querySelectorAll(`[data-state="${s.id}"]`)) n.textContent = stateLabel(s, lang);
        for (const n of labels.querySelectorAll(`[data-city="${CSS.escape(s.capital)}"]`)) n.textContent = cityIn(s.capital, lang);
      }
    },
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

/** a state's line, both ways */
const stateBoth = (s: State, what: keyof ReturnType<typeof stateSays>): Both => ({ en: stateSays(s)[what], pt: stateSays(s, 'pt')[what] });

function build(kit: Kit) {
  const langs = langSwitch(GEO_LANG);
  const lang = () => langs.lang();
  const map = australiaMap();
  const ask = el('p', { class: 'mx-ask' });
  const flag = el('div', { class: 'fl-flag cc-flag', role: 'img' });
  const node = el('div', { class: 'mx-stage cc-stage' }, langs.node, ask, flag, map.node);
  let recent: string[] = [];
  /** redraws the words on screen in the chosen language */
  let retext: () => void = () => undefined;
  langs.onChange(() => { map.language(lang()); retext(); });
  map.language(lang());

  /** the state a capital belongs to */
  const stateOf = (city: string) => STATES.find((s) => s.capital === city);

  async function finish(ok: boolean, q: CapitalQuestion, picked: string): Promise<boolean> {
    if (q.task === 'state') map.mark(q.answer, 'right');
    if (q.task === 'capital' || q.task === 'city') {
      map.mark(q.about, 'right');
      map.mark(q.answer, 'right');
    }
    const why: Both = { en: q.why, pt: q.pt.why };
    if (ok) {
      sfx.cheer();
      retext = () => kit.note(`${lang() === 'pt' ? 'Isso!' : 'Yes!'} ${why[lang()]}`, true);
      retext();
      speak(why, lang());
      await kit.wait(2600);
      return true;
    }
    sfx.wrong();
    let first: Both | null = null;
    let then = why;
    if (q.task === 'state') {
      map.mark(picked, 'wrong');
      first = stateBoth(state(picked as StateId), 'that');
      then = stateBoth(state(q.answer as StateId), 'here');
    } else if (q.task === 'capital' || q.task === 'city') {
      /* what he picked is another state's capital: say whose */
      const other = stateOf(picked);
      if (other) {
        map.mark(picked, 'wrong');
        first = stateBoth(other, 'is');
      }
    } else {
      /* another country's capital: say whose; a bigger city needs no more than the answer */
      const other = CAPITALS.find((c) => c.capital === picked);
      if (other) first = { en: capitalSays(other, nameOf(other.country)).is, pt: capitalSaysPt(other, ptOf(other.country)).is };
    }
    const said = first;
    retext = () => kit.note(said ? `${said[lang()]} ${then[lang()]}` : then[lang()]);
    retext();
    const now = lang();
    if (said) speak(said, now, () => speak(then, now));
    else speak(then, now);
    await kit.wait(5200);
    return false;
  }

  return {
    node,
    ask: async (step: CapitalStep): Promise<boolean> => {
      const q = capitalQuestion(step, nameOf, recent, ptOf);
      recent = [q.about, ...recent].slice(0, 3);
      node.dataset.answer = q.answer;
      map.reset();
      const onMap = q.task === 'state' || q.task === 'capital' || q.task === 'city';
      map.node.hidden = !onMap;
      map.show(!!step.names, q.task === 'city');
      flag.hidden = onMap;
      if (!onMap) flag.textContent = country(q.about).flag;
      const question: Both = { en: q.ask, pt: q.pt.ask };
      const label = (city: string): string => cityIn(city, lang());
      const words = (): void => {
        ask.textContent = question[lang()];
        if (!onMap) flag.setAttribute('aria-label', lang() === 'pt' ? `A bandeira ${of(ptOf(q.about))}` : `The flag of ${nameOf(q.about)}`);
      };
      retext = () => {
        words();
        if (q.task !== 'state' && q.task !== 'city') kit.choices.relabel(label);
      };
      words();
      speak(question, lang());
      if (q.task === 'state' || q.task === 'city') {
        const picked = await map.tap(q.answer, q.task);
        return finish(picked === q.answer, q, picked);
      }
      if (q.task === 'capital') map.mark(q.about, 'glow');
      const picked = await kit.choices.askWords(q.options, label);
      kit.choices.revealWord(q.answer, picked);
      return finish(picked === q.answer, q, picked);
    },
  };
}
