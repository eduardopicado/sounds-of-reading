/* Half-Time Oranges — halves, then quarters and eighths.
 *
 * At half-time the oranges come out, cut up, and the bibs are shared out for
 * the second half. Year 1 is halves: is this orange (or the pitch) cut into
 * two halves, the same size, or not? And half of a group of bibs, one half
 * for each team.
 *
 * Year 2 brings quarters and eighths: naming a piece of an orange cut into
 * 2, 4 or 8, deciding whether a cut makes quarters, and a quarter or an
 * eighth of the bibs. A fraction is equal parts, so the "or not?" questions
 * show cuts that make the right number of pieces in the wrong sizes — the
 * mistake that tells you he is counting pieces, not comparing them.
 *
 * The teams sharing the bibs are countries, with their flags. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import {
  FRACTION_NAME, FRACTION_PLURAL, FRACTION_STEPS, choices, fractionQuestion,
  type Fraction, type FractionQuestion, type FractionStep,
} from '../content/maths';
import { mountMaths, type Kit } from './maths-kit';
import { pick, shuffle } from '../lib/random';
import { TEAMS, strong, type Team } from './teams';
import { svg } from '../ui/writing';

export function mount(root: HTMLElement): () => void {
  return mountMaths<FractionStep>({
    id: 'half-time-oranges',
    title: 'Half-Time',
    swash: 'Oranges',
    tagline: 'Halves, quarters and eighths: are the pieces fair?',
    steps: FRACTION_STEPS,
    face: '🍊',
    build,
  }, root);
}

const W = 220;
const H = 160;
let clips = 0;

/** points around the edge of the shape, for cutting it */
function cuts(q: FractionQuestion): [number, number, number, number][] {
  const cx = W / 2;
  const cy = H / 2;
  const line = (x: number, y: number, angle: number): [number, number, number, number] => {
    const dx = Math.cos(angle) * 400;
    const dy = Math.sin(angle) * 400;
    return [x - dx, y - dy, x + dx, y + dy];
  };
  if (q.shape === 'orange') {
    const turn = Math.random() * Math.PI;
    if (q.parts === 2) return [q.fair ? line(cx, cy, turn) : line(cx + 34 * Math.cos(turn + Math.PI / 2), cy + 34 * Math.sin(turn + Math.PI / 2), turn)];
    if (q.fair) return [line(cx, cy, turn), line(cx, cy, turn + Math.PI / 2)];
    /* four pieces, but crossing away from the middle */
    return [line(cx + 36, cy - 28, turn), line(cx + 36, cy - 28, turn + Math.PI / 2)];
  }
  /* the pitch: straight down the middle, across, or corner to corner */
  if (q.parts === 2) {
    if (!q.fair) return [Math.random() < 0.5 ? [W * 0.32, 0, W * 0.32, H] : [0, H * 0.3, W, H * 0.3]];
    return [pick([[W / 2, 0, W / 2, H], [0, H / 2, W, H / 2], [0, 0, W, H]] as [number, number, number, number][])];
  }
  if (q.fair) {
    return pick([
      [[W / 2, 0, W / 2, H], [0, H / 2, W, H / 2]],
      [[W / 4, 0, W / 4, H], [W / 2, 0, W / 2, H], [W * 3 / 4, 0, W * 3 / 4, H]],
    ] as [number, number, number, number][][]);
  }
  return pick([
    [[W * 0.35, 0, W * 0.35, H], [0, H * 0.35, W, H * 0.35]],
    [[W * 0.15, 0, W * 0.15, H], [W * 0.45, 0, W * 0.45, H], [W * 0.8, 0, W * 0.8, H]],
  ] as [number, number, number, number][][]);
}

/** the shape, cut by these lines */
function cutShape(q: FractionQuestion): SVGSVGElement {
  const id = `ht-clip-${clips += 1}`;
  const outline = q.shape === 'orange'
    ? svg('circle', { cx: W / 2, cy: H / 2, r: H / 2 - 6 })
    : svg('rect', { x: 6, y: 6, width: W - 12, height: H - 12, rx: 6 });
  const fill = outline.cloneNode() as SVGElement;
  fill.setAttribute('class', q.shape === 'orange' ? 'ht-orange' : 'ht-pitch');
  const lines = svg('g', { 'clip-path': `url(#${id})`, class: 'ht-cut' });
  for (const [x1, y1, x2, y2] of cuts(q)) lines.append(svg('line', { x1, y1, x2, y2 }));
  return svg('svg', { class: 'ht-shape', viewBox: `0 0 ${W} ${H}` },
    svg('defs', {}, svg('clipPath', { id }, outline)), fill, lines);
}

/** the shape cut into equal pieces, one of them picked out */
function pieces(q: FractionQuestion): SVGSVGElement {
  const g = svg('svg', { class: 'ht-shape', viewBox: `0 0 ${W} ${H}` });
  const n = q.parts;
  if (q.shape === 'orange') {
    const r = H / 2 - 6;
    const cx = W / 2;
    const cy = H / 2;
    const turn = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i += 1) {
      const a = turn + (i * 2 * Math.PI) / n;
      const b = turn + ((i + 1) * 2 * Math.PI) / n;
      const d = `M ${cx} ${cy} L ${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(b)} ${cy + r * Math.sin(b)} Z`;
      g.append(svg('path', { d, class: i === 0 ? 'ht-orange picked' : 'ht-orange' }));
    }
    return g;
  }
  /* the pitch in strips, or in a grid of two rows */
  const cols = n === 2 ? 2 : n === 4 ? pick([2, 4]) : 4;
  const rows = n / cols;
  const w = (W - 12) / cols;
  const h = (H - 12) / rows;
  for (let i = 0; i < n; i += 1) {
    g.append(svg('rect', { x: 6 + (i % cols) * w, y: 6 + Math.floor(i / cols) * h, width: w, height: h, class: i === 0 ? 'ht-pitch picked' : 'ht-pitch' }));
  }
  return g;
}

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const board = el('div', { class: 'ht-board' });
  const node = el('div', { class: 'mx-stage' }, ask, board);
  let last: FractionQuestion | undefined;

  /** the countries sharing the bibs: his team if it is a country, and others */
  function teams(n: number): Team[] {
    const countries = TEAMS.filter((t) => t.kind === 'country' && t.flag);
    const us = kit.us();
    const first = us.kind === 'country' && us.flag ? [us] : [];
    return [...first, ...shuffle(countries.filter((t) => !first.includes(t)))].slice(0, n);
  }

  function bib(team?: Team): HTMLElement {
    const b = el('span', { class: 'ht-bib', 'aria-hidden': 'true' });
    if (team) b.style.background = strong(team);
    return b;
  }

  async function fair(q: FractionQuestion): Promise<boolean> {
    board.replaceChildren(cutShape(q));
    const what = q.shape === 'orange' ? 'this orange' : 'the pitch';
    const name = FRACTION_PLURAL[q.parts];
    ask.textContent = `Is ${what} cut into ${name}?`;
    say(ask.textContent);
    const picked = await kit.choices.askWords(['Yes', 'No']);
    const answer = q.fair ? 'Yes' : 'No';
    kit.choices.revealWord(answer, picked);
    const how = q.fair
      ? `Yes, ${q.parts} pieces the same size. They are ${name}.`
      : `No. There are ${q.parts} pieces, but they are not the same size, so they are not ${name}.`;
    return finish(picked === answer, how);
  }

  async function name(q: FractionQuestion): Promise<boolean> {
    board.replaceChildren(pieces(q));
    const what = q.shape === 'orange' ? 'This orange' : 'The pitch';
    ask.textContent = `${what} is cut into ${q.parts} pieces the same size. What is each piece called?`;
    say(ask.textContent);
    const options = (Object.keys(FRACTION_NAME).map(Number) as Fraction[]).map((p) => `a ${FRACTION_NAME[p]}`.replace('a eighth', 'an eighth'));
    const answer = options[[2, 4, 8].indexOf(q.parts)];
    const picked = await kit.choices.askWords(options);
    kit.choices.revealWord(answer, picked);
    return finish(picked === answer, `${q.parts} pieces the same size: each one is ${answer}.`);
  }

  async function partOf(q: FractionQuestion): Promise<boolean> {
    const sides = teams(q.parts);
    board.replaceChildren(el('div', { class: 'ht-pile' }, ...Array.from({ length: q.total }, () => bib())));
    const piece = FRACTION_NAME[q.parts];
    const article = piece === 'eighth' ? 'an' : 'a';
    const text = q.parts === 2
      ? `${q.total} bibs, half for each team. How many bibs is half?`
      : `${q.total} bibs shared between ${q.parts} teams. How many is ${article} ${piece}?`;
    ask.textContent = text;
    say(text);
    const picked = await kit.choices.ask(choices(q.answer, 1, q.total));
    kit.choices.reveal(q.answer, picked);
    /* the bibs go out, one share to each team */
    board.replaceChildren(el('div', { class: 'ht-shares' }, ...sides.map((t) =>
      el('div', { class: 'ht-share' },
        el('span', { class: 'ht-flag', text: t.flag ?? '', 'aria-label': t.name }),
        el('span', { class: 'ht-bibs' }, ...Array.from({ length: q.answer }, () => bib(t)))))));
    const how = q.parts === 2
      ? `Half of ${q.total} is ${q.answer}. ${q.answer} and ${q.answer} make ${q.total}.`
      : `${article[0].toUpperCase()}${article.slice(1)} ${piece} of ${q.total} is ${q.answer}: ${q.parts} teams with ${q.answer} each.`;
    return finish(picked === q.answer, how);
  }

  async function finish(ok: boolean, how: string): Promise<boolean> {
    if (ok) {
      sfx.cheer();
      kit.note(`Yes! ${how}`, true);
      say(`Yes! ${how}`);
      await kit.wait(2600);
      return true;
    }
    sfx.wrong();
    kit.note(how);
    say(how);
    await kit.wait(3800);
    return false;
  }

  return {
    node,
    ask: async (step: FractionStep): Promise<boolean> => {
      const q = fractionQuestion(step, last);
      last = q;
      /* the answer as its button reads, for the tests */
      board.dataset.answer = step.task === 'fair' ? (q.fair ? 'Yes' : 'No')
        : step.task === 'name' ? `${q.parts === 8 ? 'an' : 'a'} ${FRACTION_NAME[q.parts]}` : String(q.answer);
      board.dataset.parts = String(q.parts);
      if (step.task === 'fair') return fair(q);
      if (step.task === 'name') return name(q);
      return partOf(q);
    },
  };
}
