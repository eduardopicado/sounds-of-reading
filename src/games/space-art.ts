/* The Solar System game's pictures: each planet as a child knows it from a
 * space book (Saturn's rings, Jupiter's bands and its red spot, the blue and
 * green Earth, red Mars), the Sun, and the Earth lit on one side for day
 * and night. Drawn here, nothing fetched. Not to scale: Jupiter would be
 * eleven Earths across. */

import { svg } from '../ui/writing';
import type { PlanetId } from '../content/space';

let uid = 0;

/** a ball with light from the left: its colour, a darker side, and what is on it */
function ball(root: SVGElement, r: number, fill: string, marks: (g: SVGElement) => void): void {
  const id = `ss-clip-${uid += 1}`;
  const clip = svg('clipPath', { id });
  clip.append(svg('circle', { cx: 0, cy: 0, r }));
  const defs = svg('defs', {});
  defs.append(clip);
  const g = svg('g', { 'clip-path': `url(#${id})` });
  g.append(svg('circle', { cx: 0, cy: 0, r, fill }));
  marks(g);
  /* the side away from the Sun, darker */
  g.append(svg('circle', { cx: r * 0.55, cy: r * 0.25, r: r * 1.05, fill: 'rgba(0, 0, 0, .22)' }));
  root.append(defs, g, svg('circle', { cx: 0, cy: 0, r, fill: 'none', stroke: 'rgba(0, 0, 0, .25)', 'stroke-width': 0.8 }));
}

const band = (g: SVGElement, y: number, h: number, fill: string): void => {
  g.append(svg('rect', { x: -50, y, width: 100, height: h, fill }));
};
const spot = (g: SVGElement, cx: number, cy: number, r: number, fill: string): void => {
  g.append(svg('circle', { cx, cy, r, fill }));
};
const blob = (g: SVGElement, d: string, fill: string): void => {
  g.append(svg('path', { d, fill }));
};

/** a planet, in a square picture */
export function planetPicture(id: PlanetId): SVGSVGElement {
  const root = svg('svg', { class: `ss-planet-art ${id}`, viewBox: '-50 -50 100 100', 'aria-hidden': 'true' }) as SVGSVGElement;
  switch (id) {
    case 'mercury':
      ball(root, 40, '#A7A39C', (g) => {
        for (const [x, y, r] of [[-14, -12, 6], [10, 8, 8], [-4, 20, 4], [18, -16, 4], [-22, 10, 3]]) spot(g, x, y, r, '#8C877F');
      });
      break;
    case 'venus':
      ball(root, 40, '#E9C97C', (g) => {
        band(g, -22, 6, '#F2DA9C'); band(g, -4, 8, '#DDB765'); band(g, 16, 5, '#F2DA9C');
      });
      break;
    case 'earth':
      ball(root, 40, '#3B7DD8', (g) => {
        blob(g, 'M-26 -20 q10 -12 22 -4 q6 8 -2 14 q-10 2 -12 12 q-8 2 -10 -8 z', '#4BA55B');
        blob(g, 'M8 -4 q12 -6 18 4 q4 14 -6 22 q-10 2 -10 -10 z', '#4BA55B');
        blob(g, 'M-30 -4 h22 v3 h-22 z M2 -26 h24 v3 h-24 z M-6 24 h26 v3 h-26 z', 'rgba(255, 255, 255, .75)');
      });
      break;
    case 'mars':
      ball(root, 40, '#C8553D', (g) => {
        spot(g, -10, 6, 10, '#A8432E'); spot(g, 14, -10, 7, '#A8432E');
        g.append(svg('ellipse', { cx: 0, cy: -40, rx: 16, ry: 7, fill: '#F4EDE6' }));
      });
      break;
    case 'jupiter':
      ball(root, 46, '#D9B88E', (g) => {
        band(g, -30, 8, '#B8875B'); band(g, -12, 7, '#E9D5B5'); band(g, 2, 9, '#B8875B'); band(g, 20, 6, '#E9D5B5'); band(g, 32, 6, '#C49A70');
        g.append(svg('ellipse', { cx: 12, cy: 14, rx: 9, ry: 5, fill: '#C0583F' }));
      });
      break;
    case 'saturn':
      root.append(svg('ellipse', { cx: 0, cy: 0, rx: 49, ry: 13, fill: 'none', stroke: '#CDB27A', 'stroke-width': 6, transform: 'rotate(-14)' }));
      ball(root, 30, '#E3CB8F', (g) => {
        band(g, -16, 5, '#D2B475'); band(g, -2, 4, '#F0DFB3'); band(g, 9, 6, '#D2B475');
      });
      /* the front of the rings, over the ball */
      root.append(svg('path', { d: 'M-49 0 A49 13 0 0 0 49 0', fill: 'none', stroke: '#E8D29A', 'stroke-width': 6, transform: 'rotate(-14)' }));
      break;
    case 'uranus':
      ball(root, 36, '#9BD8DC', (g) => { band(g, -6, 10, '#AEE2E5'); });
      /* its faint rings stand up, because it lies on its side */
      root.append(svg('ellipse', { cx: 0, cy: 0, rx: 8, ry: 46, fill: 'none', stroke: 'rgba(225, 245, 247, .8)', 'stroke-width': 2 }));
      break;
    default:
      ball(root, 36, '#3F63C9', (g) => {
        band(g, -12, 5, '#5A7EDB');
        g.append(svg('ellipse', { cx: -8, cy: 10, rx: 8, ry: 4, fill: '#2A4596' }));
      });
      break;
  }
  return root;
}

/** the Sun, its edge showing */
export function sunPicture(): SVGSVGElement {
  const root = svg('svg', { class: 'ss-sun-art', viewBox: '0 0 60 200', preserveAspectRatio: 'none', 'aria-hidden': 'true' }) as SVGSVGElement;
  root.append(svg('ellipse', { cx: -60, cy: 100, rx: 110, ry: 130, fill: '#F7B733' }),
    svg('ellipse', { cx: -60, cy: 100, rx: 98, ry: 118, fill: '#FBD14B' }));
  return root;
}

/** the Sun on the left, the Earth on the right lit on the side facing it,
    and a house at `angle` degrees round from that side */
export function dayNightPicture(angle: number): SVGSVGElement {
  const root = svg('svg', { class: 'ss-daynight', viewBox: '0 0 200 110', role: 'img', 'aria-label': 'The Sun and the Earth' }) as SVGSVGElement;
  root.append(svg('rect', { x: 0, y: 0, width: 200, height: 110, fill: '#0E1A3A' }));
  for (const [x, y] of [[70, 12], [96, 92], [120, 20], [190, 98], [182, 10], [60, 96], [150, 8]]) root.append(svg('circle', { cx: x, cy: y, r: 0.9, fill: '#FFF6E7' }));
  /* the Sun, and its light */
  root.append(svg('circle', { cx: 14, cy: 55, r: 30, fill: '#FBD14B' }));
  for (let i = -2; i <= 2; i += 1) root.append(svg('line', { x1: 50, y1: 55 + i * 12, x2: 100, y2: 55 + i * 12, stroke: 'rgba(251, 209, 75, .35)', 'stroke-width': 1.4, 'stroke-dasharray': '3 3' }));
  const cx = 142; const cy = 55; const r = 34;
  root.append(svg('circle', { cx, cy, r, fill: '#3B7DD8' }),
    svg('path', { d: `M${cx - 8} ${cy - 24} q12 -6 20 4 q2 12 -8 16 q-10 -2 -12 -20 z M${cx + 6} ${cy + 6} q10 -2 14 8 q-2 10 -12 8 z`, fill: '#4BA55B' }),
    /* night: the half away from the Sun */
    svg('path', { d: `M${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx} ${cy + r} z`, fill: 'rgba(6, 12, 34, .68)' }),
    svg('circle', { cx, cy, r, fill: 'none', stroke: 'rgba(255, 255, 255, .35)', 'stroke-width': 0.8 }));
  /* the house, on the edge of the Earth, at its angle from the side facing the Sun */
  const a = (angle * Math.PI) / 180;
  const hx = cx - (r + 6) * Math.cos(a);
  const hy = cy - (r + 6) * Math.sin(a);
  root.append(svg('text', { x: hx, y: hy + 4, 'text-anchor': 'middle', 'font-size': 13, class: 'ss-house' }));
  root.lastElementChild!.textContent = '🏠';
  return root;
}
