/* Measure the Pitch — length, area and capacity at football training
 * (src/content/measure.ts).
 *
 * Which of two things is longer, lined up at one end; how many boots long
 * the bench is, with the boots end to end; which team measured it the right
 * way (no gaps, no overlaps); centimetres on a ruler, then a ruler that does
 * not start at 0; metres or centimetres; squares covering a shape on the
 * mat; and cups filling a drink bottle. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import {
  MEASURE_STEPS, kitName, measureQuestion, KIT,
  type MeasureQuestion, type MeasureStep,
} from '../content/measure';
import { mountMaths, type Kit } from './maths-kit';
import { svg } from '../ui/writing';

export function mount(root: HTMLElement): () => void {
  return mountMaths<MeasureStep>({
    id: 'measure-the-pitch',
    title: 'Measure the',
    swash: 'Pitch',
    tagline: 'Boots, rulers, squares and cups: how long, how big, how much?',
    steps: MEASURE_STEPS,
    face: '📏',
    cheer: 'Good measuring!',
    build,
  }, root);
}

const INK = '#1E2B2A';
const X0 = 24;
const colourOf = (id: string): string => KIT.find((k) => k.id === id)!.colour;
const words = (x: number, y: number, text: string, cls = 'mt-words', anchor = 'start'): SVGElement => {
  const t = svg('text', { x, y, class: cls, 'text-anchor': anchor });
  t.textContent = text;
  return t;
};

/** a football boot, `w` long, its toe to the right */
function boot(x: number, y: number, w: number, fill: string): SVGElement {
  const h = w * 0.5;
  return svg('path', {
    d: `M${x + 1} ${y} h${w * 0.45} q${w * 0.1} ${h * 0.45} ${w * 0.5} ${h * 0.55} q${w * 0.05} ${h * 0.45} -${w * 0.05} ${h * 0.45} h-${w * 0.9} z`,
    fill, stroke: INK, 'stroke-width': 1.5, 'stroke-linejoin': 'round', class: 'mt-boot',
  });
}

/** the pictures for each kind of question */
function picture(q: MeasureQuestion): SVGSVGElement {
  if (q.cells) return mat(q.cells);
  if (q.cups) return bottle(q.cups);
  const unit = q.ruler ? 20 : 32;
  const rows = q.rows?.length ?? 0;
  const height = q.ruler ? 120 : q.bars!.length > 1 ? 120 : rows > 1 ? 196 : 100;
  const root = svg('svg', { class: 'mt-pic', viewBox: `0 0 ${X0 * 2 + 15 * 20} ${height}`, role: 'img', 'aria-label': 'Training kit to measure' }) as SVGSVGElement;
  /* the line the things start at, for comparing */
  if (q.task === 'compare') root.append(svg('line', { x1: X0, y1: 6, x2: X0, y2: height - 6, class: 'mt-start' }));
  q.bars!.forEach((b, i) => {
    const y = 18 + i * 52;
    root.append(svg('rect', { x: X0 + b.from * unit, y, width: b.length * unit, height: 30, rx: 6, fill: colourOf(b.kit), stroke: INK, 'stroke-width': 2, class: 'mt-bar', 'data-kit': b.kit }));
    if (q.task === 'compare' || !q.ruler) root.append(words(X0 + b.from * unit + 8, y + 21, kitName(b.kit).replace(/^the /, ''), 'mt-label'));
  });
  q.rows?.forEach((row, i) => {
    const y = (rows > 1 ? 78 : 64) + i * 52;
    const fill = row.name === 'red' ? '#E4572E' : row.name === 'blue' ? '#3B7DD8' : '#2B2B2B';
    if (rows > 1) root.append(words(X0, y - 6, row.name === 'red' ? 'Red team' : 'Blue team', 'mt-team'));
    for (const at of row.at) root.append(boot(X0 + at * unit, y, unit, fill));
  });
  if (q.ruler) {
    const y = 64;
    root.append(svg('rect', { x: X0 - 8, y, width: q.ruler * unit + 16, height: 40, rx: 4, class: 'mt-ruler' }));
    for (let cm = 0; cm <= q.ruler; cm += 1) {
      const x = X0 + cm * unit;
      root.append(svg('line', { x1: x, y1: y, x2: x, y2: y + (cm % 5 === 0 ? 16 : 11), class: 'mt-tick' }));
      root.append(words(x, y + 32, String(cm), 'mt-cm', 'middle'));
      if (cm < q.ruler) root.append(svg('line', { x1: x + unit / 2, y1: y, x2: x + unit / 2, y2: y + 6, class: 'mt-tick half' }));
    }
    /* where the thing starts and ends, down to the ruler */
    const b = q.bars![0];
    for (const at of [b.from, b.from + b.length]) root.append(svg('line', { x1: X0 + at * unit, y1: 48, x2: X0 + at * unit, y2: y, class: 'mt-drop' }));
  }
  return root;
}

/** the mat in squares, the shape's squares coloured */
function mat(cells: [number, number][]): SVGSVGElement {
  const s = 40;
  const cols = 6;
  const rows = 7;
  const root = svg('svg', { class: 'mt-pic mt-mat', viewBox: `0 0 ${cols * s + 8} ${rows * s + 8}`, role: 'img', 'aria-label': 'A shape on a mat of squares' }) as SVGSVGElement;
  for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1) root.append(svg('rect', { x: 4 + x * s, y: 4 + y * s, width: s, height: s, class: 'mt-square' }));
  for (const [x, y] of cells) root.append(svg('rect', { x: 4 + (x + 1) * s + 2, y: 4 + y * s + 2, width: s - 4, height: s - 4, rx: 4, class: 'mt-cell' }));
  return root;
}

/** a drink bottle with a line for each cup it holds, and the cup */
function bottle(cups: number): SVGSVGElement {
  const step = 26;
  const h = cups * step;
  const top = 30;
  const root = svg('svg', { class: 'mt-pic mt-bottle', viewBox: `0 0 260 ${h + top + 30}`, role: 'img', 'aria-label': 'A drink bottle and a cup' }) as SVGSVGElement;
  const x = 60;
  const w = 80;
  root.append(svg('rect', { x: x + 25, y: top - 18, width: 30, height: 20, rx: 4, fill: '#2E8B4F', stroke: INK, 'stroke-width': 2 }),
    svg('rect', { x, y: top, width: w, height: h, rx: 14, class: 'mt-water' }),
    svg('rect', { x, y: top, width: w, height: h, rx: 14, fill: 'none', stroke: INK, 'stroke-width': 3 }));
  /* a line at each cup's level, the last at the top */
  for (let i = 1; i <= cups; i += 1) root.append(svg('line', { x1: x, y1: top + h - i * step + (i === cups ? 4 : 0), x2: x + 26, y2: top + h - i * step + (i === cups ? 4 : 0), class: 'mt-mark' }));
  /* the cup that fills it, one line's worth */
  const cx = 190;
  const cy = top + h - 46;
  root.append(svg('path', { d: `M${cx - 22} ${cy} h44 l-6 46 h-32 z`, class: 'mt-cup' }), words(cx, cy + 66, '1 cup', 'mt-cm', 'middle'));
  return root;
}

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const board = el('div', { class: 'mt-board' });
  const node = el('div', { class: 'mx-stage mt-stage' }, ask, board);
  let last = '';

  return {
    node,
    ask: async (step: MeasureStep): Promise<boolean> => {
      let q = measureQuestion(step.task);
      for (let i = 0; i < 20 && q.ask + q.answer === last; i += 1) q = measureQuestion(step.task);
      last = q.ask + q.answer;
      node.dataset.task = q.task;
      node.dataset.answer = q.answer;
      board.replaceChildren(...(q.task === 'units' ? [] : [picture(q)]));
      ask.textContent = q.ask;
      say(q.ask);
      const label = q.labels ? (k: string) => q.labels![k] : undefined;
      const picked = await kit.choices.askWords(q.options, label);
      kit.choices.revealWord(q.answer, picked);
      const ok = picked === q.answer;
      const line = ok ? `Yes! ${q.why}` : q.why;
      if (ok) sfx.cheer(); else sfx.wrong();
      kit.note(line, ok);
      await kit.say(line, ok ? 2400 : 3800);
      return ok;
    },
  };
}
