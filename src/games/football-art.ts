/* Football Ref's pictures: the pitch from above, with what happened on it,
 * and the referee showing a signal.
 *
 * The pitch is 105 by 68 metres with its real markings (src/content/
 * football-rules.ts has the sizes); his team attacks the goal on the right,
 * in his team's shirts, against the side he plays against. */

import { svg } from '../ui/writing';
import {
  BOX, GOAL_AREA, GOAL_WIDTH, HALFWAY, PENALTY_SPOT, PITCH, type Player, type Pt, type Scene, type Signal,
} from '../content/football-rules';
import type { Team } from './teams';
import { el } from '../lib/dom';

const M = 4;
const PR = 1.9;

const line = (x1: number, y1: number, x2: number, y2: number, cls = 'fr-mark'): SVGElement =>
  svg('line', { x1, y1, x2, y2, class: cls });
const rect = (x: number, y: number, w: number, h: number, cls = 'fr-mark'): SVGElement =>
  svg('rect', { x, y, width: w, height: h, class: cls });

/** the pitch, its stripes and its lines */
function markings(g: SVGElement): void {
  const { w, h } = PITCH;
  for (let i = 0; i < 10; i += 1) g.append(rect((w / 10) * i, 0, w / 10, h, i % 2 ? 'fr-grass dark' : 'fr-grass'));
  g.append(rect(0, 0, w, h), line(HALFWAY, 0, HALFWAY, h),
    svg('circle', { cx: HALFWAY, cy: h / 2, r: 9.15, class: 'fr-mark' }),
    svg('circle', { cx: HALFWAY, cy: h / 2, r: 0.5, class: 'fr-spot' }));
  for (const right of [false, true]) {
    const at = (d: number): number => (right ? w - d : d);
    const box = (depth: number, width: number): SVGElement =>
      rect(right ? w - depth : 0, h / 2 - width / 2, depth, width);
    g.append(box(BOX.depth, BOX.width), box(GOAL_AREA.depth, GOAL_AREA.width),
      svg('circle', { cx: at(PENALTY_SPOT), cy: h / 2, r: 0.5, class: 'fr-spot' }),
      /* the goal, outside the line */
      rect(right ? w : -2, h / 2 - GOAL_WIDTH / 2, 2, GOAL_WIDTH, 'fr-goal'));
  }
}

function player(p: Player, us: Team, them: Team): SVGElement {
  const team = p.side === 'us' ? us : them;
  const g = svg('g', { class: `fr-player ${p.side}${p.keeper ? ' keeper' : ''}${p.mark ? ` ${p.mark}` : ''}`, 'data-side': p.side, ...(p.mark ? { 'data-mark': p.mark } : {}) });
  g.append(svg('circle', {
    cx: p.at[0], cy: p.at[1], r: PR,
    fill: p.keeper ? '#2B2B2B' : team.colours[0], stroke: p.keeper ? '#F3B229' : team.colours[1], 'stroke-width': 0.7,
  }));
  return g;
}

/** the pitch with what happened on it; `answered` draws the line that decides offside */
export function pitchPicture(scene: Scene, us: Team, them: Team, answered = false): SVGSVGElement {
  const root = svg('svg', {
    class: 'fr-pitch', viewBox: `${-M} ${-M} ${PITCH.w + 2 * M} ${PITCH.h + 2 * M}`, role: 'img', 'aria-label': 'A football pitch',
  }) as SVGSVGElement;
  const g = svg('g', {});
  markings(g);
  root.append(g);
  if (scene.line && answered) {
    root.append(line(scene.line.x, -1, scene.line.x, PITCH.h + 1, `fr-line ${scene.line.kind}`));
  }
  if (scene.foul) {
    root.append(svg('circle', { cx: scene.foul[0], cy: scene.foul[1], r: 4.2, class: 'fr-foul' }));
  }
  if (scene.path) {
    const [[x1, y1], [x2, y2]] = scene.path;
    root.append(line(x1, y1, x2, y2, 'fr-path'));
    /* an arrow head where it goes */
    const a = Math.atan2(y2 - y1, x2 - x1);
    const head = (d: number): Pt => [x2 - 2.6 * Math.cos(a + d), y2 - 2.6 * Math.sin(a + d)];
    root.append(svg('path', { d: `M${head(0.5).join(' ')}L${x2} ${y2}L${head(-0.5).join(' ')}`, class: 'fr-path head' }));
  }
  /* the player the question is about: the one the pass goes to */
  for (const p of scene.players) if (p.mark === 'runner') root.append(svg('circle', { cx: p.at[0], cy: p.at[1], r: PR + 1.6, class: 'fr-him' }));
  /* the player who made the foul: attacker or defender decides the call */
  for (const p of scene.players) if (p.mark === 'fouler') root.append(svg('circle', { cx: p.at[0], cy: p.at[1], r: PR + 1.6, class: 'fr-fouler' }));
  for (const p of scene.players) root.append(player(p, us, them));
  const [bx, by] = scene.ball;
  root.append(svg('circle', { cx: bx, cy: by, r: 1.15, class: `fr-ball${scene.throwIn ? ' thrown' : ''}` }));
  return root;
}

/* ── the referee ─────────────────────────────────────────────────────── */

/** a stick figure: arms at angles (degrees, 0 straight out to the right,
    90 straight up), with what the signal points at beside him */
function figure(root: SVGElement, left: number, right: number, flag = false): void {
  const shoulder: Pt = [50, 38];
  const arm = (deg: number, len = 30): Pt => [shoulder[0] + len * Math.cos((deg * Math.PI) / 180), shoulder[1] - len * Math.sin((deg * Math.PI) / 180)];
  const [lx, ly] = arm(left);
  const [rx, ry] = arm(right);
  root.append(
    svg('circle', { cx: 50, cy: 22, r: 8, class: 'fr-ref skin' }),
    svg('path', { d: 'M38 34 h24 l-3 30 h-18 z', class: 'fr-ref shirt' }),
    line(44, 64, 40, 92, 'fr-ref limb'), line(56, 64, 60, 92, 'fr-ref limb'),
    line(shoulder[0] - 6, shoulder[1], lx, ly, 'fr-ref limb'), line(shoulder[0] + 6, shoulder[1], rx, ry, 'fr-ref limb'),
  );
  if (flag) {
    root.append(line(rx, ry, rx, ry - 14, 'fr-flag-stick'),
      svg('path', { d: `M${rx} ${ry - 14} h11 v8 h-11 z`, class: 'fr-flag' }));
  }
}

/** the referee (or for offside, the assistant with the flag) showing a signal */
export function signalPicture(s: Signal): SVGSVGElement {
  const root = svg('svg', { class: 'fr-signal', viewBox: '0 0 140 100', role: 'img', 'aria-label': 'The referee' }) as SVGSVGElement;
  root.append(rect(0, 70, 140, 30, 'fr-grass'));
  switch (s) {
    case 'offside':
      figure(root, -100, 90, true);
      break;
    case 'penalty':
      /* pointing down at the spot, in the box */
      root.append(rect(78, 76, 60, 20, 'fr-mark'), svg('circle', { cx: 100, cy: 86, r: 2.5, class: 'fr-spot' }));
      figure(root, -100, -35);
      break;
    case 'corner':
      /* pointing at the corner flag */
      root.append(line(120, 92, 120, 62, 'fr-flag-stick'), svg('path', { d: 'M120 62 h12 v8 h-12 z', class: 'fr-flag corner' }));
      figure(root, -100, 15);
      break;
    case 'goal-kick':
      /* pointing down at the goal area */
      root.append(rect(84, 78, 40, 14, 'fr-mark'), rect(96, 72, 16, 6, 'fr-goal'));
      figure(root, -100, -20);
      break;
    case 'advantage':
      /* both arms forward */
      figure(root, 2, 22);
      root.append(svg('path', { d: 'M118 30 l10 8 l-10 8', class: 'fr-go' }));
      break;
    default:
      /* one arm out, the way the kick goes */
      figure(root, -100, 0);
      break;
  }
  return root;
}

/** which team is which: his attacks the goal on the right, the other defends it */
export function sidesKey(us: Team, them: Team, lang: 'en' | 'pt'): HTMLElement {
  const chip = (t: Team, words: string, side: string): HTMLElement => {
    const dot = el('span', { class: 'fr-dot', 'aria-hidden': 'true' });
    dot.style.background = t.colours[0];
    dot.style.borderColor = t.colours[1];
    return el('span', { class: 'fr-side', dataset: { side } }, dot, el('span', { text: words }));
  };
  return el('div', { class: 'fr-key' },
    chip(us, lang === 'pt' ? `${us.short} ataca ➜` : `${us.short} attack ➜`, 'us'),
    chip(them, lang === 'pt' ? `${them.short} defende` : `${them.short} defend`, 'them'));
}
