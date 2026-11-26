/* Orbits — the planets going round the Sun (src/content/orbits.ts).
 *
 * The pictures move. Seen from above, the planets go round the Sun at their
 * real speeds against each other: the Earth once every few seconds, Mercury
 * four times as fast, Neptune so slowly it hardly seems to move. Then the
 * distances to scale, where the four planets near the Sun crowd into the
 * middle; the Earth spinning as it goes round, so one side has day; the
 * Moon going round the Earth; and where the Moon is for each of its shapes.
 *
 * The answers are buttons, so nothing has to be caught while it moves. In
 * English or Portuguese, switched with the flags like Solar System. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import {
  DISTANCE, MOON_ANGLE, ORBIT_STEPS, YEAR, orbitQuestion,
  type MoonAt, type OrbitQuestion, type OrbitStep,
} from '../content/orbits';
import { IN_ORDER, SAYS, planet, type PlanetId } from '../content/space';
import type { Both } from '../content/pt';
import { mountMaths, type Kit } from './maths-kit';
import { GEO_LANG, langSwitch, speak, speakTurn, talkMs } from './lang-kit';
import { svg } from '../ui/writing';

export function mount(root: HTMLElement): () => void {
  return mountMaths<OrbitStep>({
    id: 'orbits',
    title: 'Planet',
    swash: 'Orbits',
    tagline: 'Round the Sun, and the Moon round the Earth.',
    steps: ORBIT_STEPS,
    face: '🌙',
    cheer: 'Good space exploring!',
    build,
  }, root);
}

const COLOUR: Record<PlanetId, string> = {
  mercury: '#A7A39C', venus: '#E9C97C', earth: '#3B7DD8', mars: '#C8553D',
  jupiter: '#D9B88E', saturn: '#E3CB8F', uranus: '#9BD8DC', neptune: '#3F63C9',
};
/** one Earth year on the screen, in milliseconds */
const EARTH_YEAR_MS = 9000;
const TAU = Math.PI * 2;

/** where each planet starts round its orbit, so they are spread out */
const START: Record<PlanetId, number> = {
  mercury: 0.3, venus: 2.1, earth: 4.0, mars: 5.6, jupiter: 1.2, saturn: 3.0, uranus: 4.8, neptune: 0.6,
};

function build(kit: Kit) {
  const langs = langSwitch(GEO_LANG);
  const lang = () => langs.lang();
  const ask = el('p', { class: 'mx-ask' });
  const sky = el('div', { class: 'ob-sky' });
  const node = el('div', { class: 'mx-stage ob-stage' }, langs.node, ask, sky);
  let retext: () => void = () => undefined;
  langs.onChange(() => retext());

  /** run `frame` every animation frame until the picture is replaced or he leaves */
  function animate(picture: SVGSVGElement, frame: (ms: number) => void): void {
    const t0 = performance.now();
    const tick = (now: number): void => {
      if (!kit.life.alive() || !picture.isConnected) return;
      frame(now - t0);
      requestAnimationFrame(tick);
    };
    frame(0);
    requestAnimationFrame(tick);
  }

  const label = (x: number, y: number, text: string, cls = 'ob-name'): SVGElement => {
    const t = svg('text', { x, y, class: cls, 'text-anchor': 'middle' });
    t.textContent = text;
    return t;
  };

  /** the planets going round, evenly spaced or to scale; `named` are labelled */
  function orrery(scale: boolean, named: PlanetId[] | 'all', marked?: PlanetId): SVGSVGElement {
    const root = svg('svg', { class: 'ob-picture', viewBox: '-210 -210 420 420', role: 'img', 'aria-label': 'The planets going round the Sun' }) as SVGSVGElement;
    const radius = (id: PlanetId): number => (scale ? 6 + (196 * DISTANCE[id]) / DISTANCE.neptune : 26 + 22 * planet(id).order);
    root.append(svg('circle', { cx: 0, cy: 0, r: scale ? 5 : 15, class: 'ob-sun' }));
    const movers: { id: PlanetId; g: SVGElement }[] = [];
    for (const p of IN_ORDER) {
      root.append(svg('circle', { cx: 0, cy: 0, r: radius(p.id), class: `ob-orbit${p.id === marked ? ' marked' : ''}${p.id === 'earth' && scale ? ' earth' : ''}` }));
      const size = scale ? (p.order >= 5 ? 5 : 2.6) : (p.order >= 5 ? 8 : 5);
      const g = svg('g', { class: 'ob-planet', 'data-planet': p.id });
      if (p.id === 'saturn') g.append(svg('ellipse', { cx: 0, cy: 0, rx: size * 1.9, ry: size * 0.6, class: 'ob-ring' }));
      g.append(svg('circle', { cx: 0, cy: 0, r: size, fill: COLOUR[p.id] }));
      if (named === 'all' || named.includes(p.id)) g.append(label(0, -size - 4, p.name[lang()]));
      root.append(g);
      movers.push({ id: p.id, g });
    }
    if (scale) root.append(label(0, -radius('earth') - 4, '1', 'ob-step'));
    animate(root, (ms) => {
      for (const { id, g } of movers) {
        const a = START[id] - (TAU * ms) / (YEAR[id] * EARTH_YEAR_MS);
        g.setAttribute('transform', `translate(${(radius(id) * Math.cos(a)).toFixed(1)} ${(radius(id) * Math.sin(a)).toFixed(1)})`);
      }
    });
    return root;
  }

  /** the Earth going round the Sun and spinning, its night side away from the Sun */
  function earthYear(): SVGSVGElement {
    const root = svg('svg', { class: 'ob-picture', viewBox: '-210 -210 420 420', role: 'img', 'aria-label': 'The Earth going round the Sun' }) as SVGSVGElement;
    const R = 150;
    root.append(svg('circle', { cx: 0, cy: 0, r: R, class: 'ob-orbit' }), svg('circle', { cx: 0, cy: 0, r: 30, class: 'ob-sun' }));
    const earth = svg('g', {});
    const spin = svg('g', {});
    spin.append(svg('circle', { cx: 0, cy: 0, r: 28, fill: COLOUR.earth }),
      svg('path', { d: 'M-17 -11 q11 -8 20 0 q3 11 -8 14 q-11 0 -12 -14 z M6 8 q11 -3 14 8 q-6 8 -14 3 z', fill: '#4BA55B' }),
      svg('text', { x: 0, y: -31, class: 'ob-home', 'text-anchor': 'middle' }));
    spin.lastElementChild!.textContent = '🏠';
    const night = svg('path', { d: 'M0 -28 A28 28 0 0 1 0 28 Z', fill: 'rgba(6, 12, 34, .62)' });
    earth.append(spin, night, svg('circle', { cx: 0, cy: 0, r: 28, fill: 'none', class: 'ob-edge' }));
    root.append(earth);
    animate(root, (ms) => {
      const a = 1.2 - (TAU * ms) / EARTH_YEAR_MS;
      const x = R * Math.cos(a);
      const y = R * Math.sin(a);
      earth.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      /* the night half faces away from the Sun */
      night.setAttribute('transform', `rotate(${((a * 180) / Math.PI).toFixed(1)})`);
      /* a day is a spin: far too quick to show 365 of them, so a slow one */
      spin.setAttribute('transform', `rotate(${((-ms / 1500) * 360 % 360).toFixed(1)})`);
    });
    return root;
  }

  /** the Moon going round the Earth, lit on the side facing the Sun (to the left) */
  function moonPicture(at?: MoonAt): SVGSVGElement {
    const root = svg('svg', { class: 'ob-picture wide', viewBox: '-260 -150 520 300', role: 'img', 'aria-label': 'The Moon going round the Earth' }) as SVGSVGElement;
    root.append(svg('circle', { cx: -330, cy: 0, r: 110, class: 'ob-sun' }));
    for (let i = -2; i <= 2; i += 1) root.append(svg('line', { x1: -215, y1: i * 40, x2: -150, y2: i * 40, class: 'ob-ray' }));
    const R = 110;
    root.append(svg('circle', { cx: 0, cy: 0, r: R, class: 'ob-orbit' }),
      svg('circle', { cx: 0, cy: 0, r: 34, fill: COLOUR.earth }),
      svg('path', { d: 'M0 -34 A34 34 0 0 1 0 34 Z', fill: 'rgba(6, 12, 34, .55)' }),
      label(0, 54, lang() === 'pt' ? 'Terra' : 'Earth', 'ob-name'));
    const moon = svg('g', { class: 'ob-moon', ...(at ? { 'data-at': at } : {}) });
    moon.append(svg('circle', { cx: 0, cy: 0, r: 15, fill: '#E9E6DC' }),
      /* its far side from the Sun is dark */
      svg('path', { d: 'M0 -15 A15 15 0 0 1 0 15 Z', fill: 'rgba(6, 12, 34, .7)' }));
    root.append(moon);
    const place = (deg: number): void => {
      /* 0 is away from the Sun (full), 180 towards it (new) */
      const a = (deg * Math.PI) / 180;
      moon.setAttribute('transform', `translate(${(R * Math.cos(a)).toFixed(1)} ${(-R * Math.sin(a)).toFixed(1)})`);
    };
    if (at) {
      place(MOON_ANGLE[at]);
      /* the way we look at it, from the Earth */
      const a = (MOON_ANGLE[at] * Math.PI) / 180;
      root.insertBefore(svg('line', { x1: 0, y1: 0, x2: (R - 18) * Math.cos(a), y2: -(R - 18) * Math.sin(a), class: 'ob-look' }), moon);
    } else {
      animate(root, (ms) => place(90 + (ms / 7000) * 360));
    }
    return root;
  }

  function picture(q: OrbitQuestion): SVGSVGElement {
    switch (q.task) {
      case 'fast': return orrery(false, q.planets!);
      case 'between': return orrery(false, q.planets!);
      case 'scale': return orrery(true, ['jupiter', 'saturn', 'uranus', 'neptune'], q.planets![0]);
      case 'year': return earthYear();
      case 'moon': return moonPicture();
      default: return moonPicture(q.moon);
    }
  }

  return {
    node,
    ask: async (step: OrbitStep): Promise<boolean> => {
      const q = orbitQuestion(step.task);
      node.dataset.task = q.task;
      node.dataset.answer = q.answer;
      sky.replaceChildren(picture(q));
      const words = (k: string): string => q.labels[k][lang()];
      retext = () => { ask.textContent = q.ask[lang()]; kit.choices.relabel(words); sky.replaceChildren(picture(q)); };
      speak(q.ask, lang());
      const asked = kit.choices.askWords(q.options, words);
      ask.textContent = q.ask[lang()];
      kit.choices.relabel(words);
      const picked = await asked;
      kit.choices.revealWord(q.answer, picked);
      const ok = picked === q.answer;
      if (ok) sfx.cheer(); else sfx.wrong();
      const lines: Both[] = ok ? [SAYS.yes, q.why] : [q.why];
      const show = (): void => kit.note(lines.map((l) => l[lang()]).join(' '), ok);
      show();
      const was = retext;
      retext = () => { was(); show(); };
      const now = lang();
      await kit.said((end) => speakTurn(lines, now, end), ok ? 2600 : 4200, talkMs(lines));
      return ok;
    },
  };
}
