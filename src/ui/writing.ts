/* Letters on writing lines, drawn as SVG: the tracing board, the tall /
 * small / tail cards and the printed practice sheet all use this, so a
 * letter looks the same on the screen as on paper.
 *
 * Everything inside `letters` is in the units of src/content/handwriting.ts
 * (head line 0, waist 50, base 100, tail 150), with the forward slope of the
 * Foundation hand added as a skew about the base line. The lines themselves
 * run far past the letters so they fill whatever width the board is given. */

import { glyph, type Glyph } from '../content/handwriting';
import { samplePath, type Point } from '../lib/strokes';

const NS = 'http://www.w3.org/2000/svg';

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K, attrs: Record<string, string | number> = {}, ...children: (SVGElement | null)[]
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  for (const c of children) if (c) node.append(c);
  return node;
}

/** the slope: a few degrees forward, about the base line so letters stay on it */
export const SLOPE = 'translate(0 100) skewX(-5) translate(0 -100)';
const GAP = 16;

/** one stroke of an item, placed: which letter it belongs to and where it is */
export interface PlacedStroke {
  d: string;
  /** how far along the letter sits, for items of two letters */
  dx: number;
  /** points along it, already moved by dx */
  points: Point[];
  /** a dot (the top of i and j), which is tapped rather than drawn */
  dot: boolean;
  /** its number within its own letter, as the chart numbers them */
  n: number;
}

export interface Layout { width: number; glyphs: { g: Glyph; dx: number }[]; strokes: PlacedStroke[] }

/** one or two letters side by side (A then a) */
export function layout(item: string): Layout {
  let x = 0;
  const glyphs = [...item].map((ch) => {
    const g = glyph(ch);
    const at = { g, dx: x };
    x += g.width + GAP;
    return at;
  });
  const strokes = glyphs.flatMap(({ g, dx }) => g.strokes.map((d, i) => {
    const points = samplePath(d).map((p) => ({ x: p.x + dx, y: p.y }));
    return { d, dx, points, dot: points.length === 1, n: i + 1 };
  }));
  return { width: x - GAP, glyphs, strokes };
}

/** the four lines: head, waist (dashed), base (strongest) and tail */
export function writingLines(from = -1000, to = 1000): SVGGElement {
  const line = (y: number, cls: string) => svg('line', { x1: from, x2: to, y1: y, y2: y, class: `wl ${cls}` });
  return svg('g', { class: 'wl-lines', 'aria-hidden': 'true' },
    line(0, 'head'), line(50, 'waist'), line(100, 'base'), line(150, 'tail'));
}

/** the box a board needs: the letters, plus the slope, plus a margin */
export function viewBox(width: number, minWidth = 0): string {
  const w = Math.max(width + 34, minWidth);
  const left = -10 - (w - width - 34) / 2;
  return `${left} -16 ${w} 182`;
}

/** a stroke as something drawable: a path, or a circle for a dot */
export function strokeShape(s: PlacedStroke, cls: string, extra: Record<string, string | number> = {}): SVGElement {
  if (s.dot) return svg('circle', { cx: s.points[0].x, cy: s.points[0].y, r: 5, class: `${cls} dot`, ...extra });
  return svg('path', { d: s.d, transform: `translate(${s.dx} 0)`, class: cls, ...extra });
}

/** the green numbered dot where a stroke starts; `shift` moves it aside
 *  when an earlier stroke's number is already there */
export function startDot(s: PlacedStroke, n = s.n, shift = 0): SVGGElement {
  const p = { x: s.points[0].x + shift, y: s.points[0].y };
  return svg('g', { class: 'tr-start', 'data-n': n },
    svg('circle', { cx: p.x, cy: p.y, r: 9 }),
    Object.assign(svg('text', { x: p.x, y: p.y + 4 }), { textContent: String(n) }),
  );
}

/** a small arrowhead a little way along, pointing the way to go */
export function arrow(s: PlacedStroke): SVGElement | null {
  if (s.dot || s.points.length < 4) return null;
  const k = Math.min(7, s.points.length - 2);
  const a = s.points[k - 1];
  const b = s.points[k + 1];
  const p = s.points[k];
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return svg('path', {
    d: 'M-6 -6 L6 0 L-6 6 Z', class: 'tr-arrow',
    transform: `translate(${p.x} ${p.y}) rotate(${angle})`,
  });
}

/** a finished-looking letter on its lines, for cards and the model row */
export function letterCard(item: string, opts: { minWidth?: number; label?: string } = {}): SVGSVGElement {
  const lay = layout(item);
  const letters = svg('g', { transform: SLOPE },
    ...lay.strokes.map((s) => strokeShape(s, 'wl-ink')));
  return svg('svg', {
    viewBox: viewBox(lay.width, opts.minWidth), class: 'wl-card', role: 'img',
    'aria-label': opts.label ?? item,
  }, writingLines(), letters);
}
