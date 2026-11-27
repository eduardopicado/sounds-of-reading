/* Pick a Bib — chance, with training bibs (src/content/chance.ts).
 *
 * A see-through bag of coloured bibs: could he pick green? Will he pick
 * yellow, for certain? Is blue likely or unlikely? Which colour is most
 * likely? Then a spinner in eight equal parts, and last, ten picks made one
 * at a time in front of him, put back each time, and which came up most:
 * usually the colour there was most of, and now and then not. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { CHANCE_STEPS, SHIRT, chanceQuestion, type ChanceQuestion, type ChanceStep, type Colour } from '../content/chance';
import { mountMaths, type Kit } from './maths-kit';
import { svg } from '../ui/writing';

export function mount(root: HTMLElement): () => void {
  return mountMaths<ChanceStep>({
    id: 'pick-a-bib',
    title: 'Pick a',
    swash: 'Bib',
    tagline: 'Certain, possible or impossible? Likely or unlikely?',
    steps: CHANCE_STEPS,
    face: '🎽',
    cheer: 'Good guessing!',
    build,
  }, root);
}

const INK = '#1E2B2A';

/** a training bib, centred on x, y */
function bib(x: number, y: number, s: number, colour: Colour): SVGElement {
  const d = `M${x - s * 0.5} ${y - s * 0.45} l${s * 0.22} -${s * 0.1} q${s * 0.28} ${s * 0.22} ${s * 0.56} 0 l${s * 0.22} ${s * 0.1} l-${s * 0.08} ${s * 0.95} h-${s * 0.84} z`;
  return svg('path', { d, fill: SHIRT[colour], stroke: INK, 'stroke-width': 1.5, 'stroke-linejoin': 'round', class: 'pb-bib', 'data-colour': colour });
}

/** the see-through bag, its bibs jumbled inside */
function bagPicture(bag: Partial<Record<Colour, number>>): SVGSVGElement {
  const root = svg('svg', { class: 'pb-pic', viewBox: '0 0 300 220', role: 'img', 'aria-label': `A bag of bibs: ${Object.entries(bag).map(([c, n]) => `${n} ${c}`).join(', ')}` }) as SVGSVGElement;
  root.append(svg('path', { d: 'M40 40 Q150 20 260 40 L250 205 Q150 218 50 205 Z', class: 'pb-bag' }),
    svg('path', { d: 'M40 40 Q150 58 260 40', class: 'pb-rim' }));
  const all: Colour[] = Object.entries(bag).flatMap(([c, n]) => Array<Colour>(n!).fill(c as Colour));
  /* a steady jumble: the same bag always looks the same */
  const order = all.map((c, i) => ({ c, k: (i * 37 + c.length * 11) % 97 })).sort((a, b) => a.k - b.k).map((x) => x.c);
  const perRow = 5;
  order.forEach((c, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    root.append(bib(78 + col * 36 + (row % 2) * 16, 80 + row * 38, 32, c));
  });
  return root;
}

/** a spinner in equal parts, with its arrow */
function spinnerPicture(parts: Colour[]): SVGSVGElement {
  const root = svg('svg', { class: 'pb-pic pb-spin', viewBox: '-110 -110 220 220', role: 'img', 'aria-label': 'A spinner' }) as SVGSVGElement;
  const n = parts.length;
  parts.forEach((c, i) => {
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
    const p = (a: number): string => `${(100 * Math.cos(a)).toFixed(1)} ${(100 * Math.sin(a)).toFixed(1)}`;
    root.append(svg('path', { d: `M0 0 L${p(a0)} A100 100 0 0 1 ${p(a1)} Z`, fill: SHIRT[c], stroke: INK, 'stroke-width': 2, class: 'pb-part', 'data-colour': c }));
  });
  root.append(svg('path', { d: 'M0 -70 L9 0 L-9 0 Z', fill: INK }), svg('circle', { cx: 0, cy: 0, r: 9, fill: INK }));
  return root;
}

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const board = el('div', { class: 'pb-board' });
  const node = el('div', { class: 'mx-stage pb-stage' }, ask, board);
  let last = '';

  /** the ten picks, one at a time, and the tally */
  async function showPicks(q: ChanceQuestion): Promise<void> {
    const row = el('div', { class: 'pb-picks' });
    board.append(row);
    for (const c of q.picks!) {
      await kit.wait(260);
      const s = svg('svg', { class: 'pb-picked', viewBox: '0 0 40 40', 'aria-hidden': 'true' });
      s.append(bib(20, 22, 30, c));
      row.append(s);
      sfx.tap();
    }
    const counts = Object.fromEntries(q.options.map((c) => [c, q.picks!.filter((p) => p === c).length]));
    board.append(el('p', { class: 'pb-tally', text: q.options.map((c) => `${q.labels[c]}: ${'|'.repeat(counts[c])} ${counts[c]}`).join('   ') }));
  }

  return {
    node,
    ask: async (step: ChanceStep): Promise<boolean> => {
      let q = chanceQuestion(step.task);
      for (let i = 0; i < 20 && q.ask + JSON.stringify(q.bag ?? q.spinner) === last; i += 1) q = chanceQuestion(step.task);
      last = q.ask + JSON.stringify(q.bag ?? q.spinner);
      node.dataset.task = q.task;
      node.dataset.answer = q.answer;
      board.replaceChildren(q.spinner ? spinnerPicture(q.spinner) : bagPicture(q.bag!));
      ask.textContent = q.ask;
      if (q.picks) {
        ask.textContent = 'Watch: ten bibs are picked, one at a time.';
        await showPicks(q);
        ask.textContent = q.ask;
      }
      say(q.ask);
      const picked = await kit.choices.askWords(q.options, (k) => q.labels[k]);
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
