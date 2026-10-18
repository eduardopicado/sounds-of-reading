/* Jump Line — adding and taking away as jumps along a number line.
 *
 * "6 + 3": the ball starts on 6 and he makes the jumps himself, one at a
 * time, then says Done where it lands. Counting on (and back) along a line is
 * the strategy the Year 1 syllabus builds adding and taking away within 20
 * on, and making the jumps is what makes it his rather than a picture.
 *
 * Year 2 goes to 100 with a jump of ten as well as a jump of one: 38 + 25 is
 * two jumps of ten and five of one. Any jumps that land on the answer count;
 * a miss draws the tens-then-ones way, and says it.
 *
 * Years 3 and 4 go to 1000 in jumps of a hundred and ten, then to 10 000 in
 * jumps of a thousand and a hundred. And they jump to the next ten (or
 * hundred) first: 38 + 25 is 38 → 40, then 23 more. He says how far the
 * first jump is, it is drawn, and he jumps the rest.
 *
 * The line and the arcs are drawn in one svg, the way Number Line Penalty
 * draws its line, so a phone and an iPad see the same thing at their size. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { JUMP_STEPS, bridgeOf, jumpQuestion, jumpWord, jumpsFor, lineText, sizesOf, type JumpQuestion, type JumpStep } from '../content/maths';
import { shuffle } from '../lib/random';
import { mountMaths, type Kit } from './maths-kit';
import { svg } from '../ui/writing';

export function mount(root: HTMLElement): () => void {
  return mountMaths<JumpStep>({
    id: 'jump-line',
    title: 'Jump',
    swash: 'Line',
    tagline: 'Make the jumps along the line. Where does the ball land?',
    steps: JUMP_STEPS,
    face: '🐸',
    build,
  }, root);
}

const LEFT = 40;
const RIGHT = 960;
const Y = 120;
const H = 200;
/** the most jumps he can make before the line stops taking more */
const MOST = 30;

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const sum = el('p', { class: 'mx-sum' });
  const line = svg('svg', { class: 'jl-line', viewBox: `0 0 1000 ${H}`, role: 'img' });
  const pad = el('div', { class: 'jl-pad' });
  const node = el('div', { class: 'mx-stage' }, ask, sum, el('div', { class: 'jl-board' }, line), pad);
  let last: JumpQuestion | undefined;

  /* the ticks on each line: a tick, a number under every so many, and small ticks between */
  const MARKS: Record<JumpStep['top'], { tick: number; label: number; small?: number }> = {
    10: { tick: 1, label: 1 },
    20: { tick: 1, label: 1 },
    100: { tick: 10, label: 10, small: 1 },
    1000: { tick: 100, label: 200, small: 10 },
    10000: { tick: 1000, label: 5000, small: 100 },
  };

  function draw(step: JumpStep): (v: number) => number {
    const x = (v: number): number => LEFT + (v / step.top) * (RIGHT - LEFT);
    const marks = MARKS[step.top];
    line.replaceChildren(svg('line', { x1: LEFT, x2: RIGHT, y1: Y, y2: Y, class: 'mx-axis' }));
    for (let v = 0; v <= step.top; v += marks.tick) {
      line.append(svg('line', { x1: x(v), x2: x(v), y1: Y - 12, y2: Y + 12, class: 'mx-tick' }));
      if (v % marks.label) continue;
      /* a long last number sits back from the end, inside the line */
      const end = v === step.top && step.top >= 1000;
      const t = svg('text', { x: x(v), y: Y + 56, class: `jl-label${step.top === 20 ? ' tight' : ''}${end ? ' end' : ''}` });
      t.textContent = lineText(v);
      line.append(t);
    }
    /* on the long lines, small ticks between, so the smaller jumps show */
    const small = marks.small;
    if (small) for (let v = 0; v <= step.top; v += small) if (v % marks.tick) line.append(svg('line', { x1: x(v), x2: x(v), y1: Y - 5, y2: Y + 5, class: 'jl-small' }));
    return x;
  }

  /** an arc from one number to another, labelled with the jump when it is a big one */
  function arc(x: (v: number) => number, from: number, to: number, cls: string, label: boolean): void {
    const x1 = x(from);
    const x2 = x(to);
    const hop = Math.min(80, 18 + Math.abs(x2 - x1) * 0.5);
    line.append(svg('path', { d: `M ${x1} ${Y - 6} Q ${(x1 + x2) / 2} ${Y - 6 - hop * 2} ${x2} ${Y - 6}`, class: `jl-arc ${cls}` }));
    if (label) {
      const t = svg('text', { x: (x1 + x2) / 2, y: Y - hop - 14, class: 'jl-hop' });
      t.textContent = `${to > from ? '+' : '−'}${lineText(Math.abs(to - from))}`;
      line.append(t);
    }
  }

  return {
    node,
    ask: (step: JumpStep): Promise<boolean> => new Promise((resolve) => {
      const q = jumpQuestion(step, last);
      last = q;
      const x = draw(step);
      const sign = q.op === '+' ? 1 : -1;
      const sizes = sizesOf(step);
      /* a jump of the biggest size gets its number over it, and so does the jump to the ten */
      const labelled = (j: number): boolean => Math.abs(j) >= sizes[0] && sizes.length > 1;
      const ball = svg('text', { x: x(q.a), y: Y - 14, class: 'jl-ball' });
      ball.textContent = '⚽';
      line.append(ball);
      line.dataset.a = String(q.a);
      line.dataset.b = String(q.b);
      line.dataset.answer = String(q.answer);
      const [a, b, answer] = [q.a, q.b, q.answer].map((v) => lineText(v));
      const symbol = q.op === '+' ? '+' : '−';
      sum.textContent = `${a} ${symbol} ${b} = ?`;
      const text = q.op === '+' ? `Start at ${a}. Jump on ${b}.` : `Start at ${a}. Jump back ${b}.`;
      ask.textContent = text;
      line.setAttribute('aria-label', `A number line from 0 to ${lineText(step.top)}, the ball on ${a}`);

      /* the jump to the ten (or hundred) first, when the step asks for it: drawn, and not undone */
      const fixed: number[] = [];
      let firstRight = true;
      let at = q.a;
      const made: number[] = [];
      const counter = el('span', { class: 'jl-made', 'aria-live': 'polite' });
      const redraw = (): void => {
        draw(step);
        let from = q.a;
        for (const [i, j] of [...fixed, ...made].entries()) { arc(x, from, from + j, 'his', labelled(j) || (i === 0 && fixed.length > 0)); from += j; }
        ball.setAttribute('x', String(x(at)));
        line.append(ball);
        line.dataset.at = String(at);
        counter.textContent = made.length ? `${made.length} ${made.length === 1 ? 'jump' : 'jumps'}` : '';
      };
      const move = (by: number): void => {
        const to = at + by;
        if (to < 0 || to > step.top || made.length >= MOST) { sfx.wrong(); return; }
        sfx.tap();
        arc(x, at, to, 'his', labelled(by));
        made.push(by);
        at = to;
        ball.setAttribute('x', String(x(at)));
        line.append(ball);
        line.dataset.at = String(at);
        counter.textContent = `${made.length} ${made.length === 1 ? 'jump' : 'jumps'}`;
      };
      const undo = (): void => {
        if (!made.length) return;
        made.pop();
        at = q.a + [...fixed, ...made].reduce((sum2, j) => sum2 + j, 0);
        redraw();
      };
      const jump = (by: number): HTMLElement => el('button', {
        class: 'jl-jump', type: 'button', text: `${by > 0 ? '+' : '−'}${lineText(Math.abs(by))}`,
        'aria-label': `Jump ${by > 0 ? 'on' : 'back'} ${Math.abs(by)}`, on: { click: () => move(by) },
      });
      const done = el('button', { class: 'btn mx-go', type: 'button', text: 'Done ✓' });
      const showPad = (): void => {
        pad.replaceChildren(
          el('div', { class: 'jl-jumps' }, ...sizes.map((size) => jump(sign * size)),
            el('button', { class: 'jl-undo', type: 'button', text: '↩', 'aria-label': 'Undo a jump', on: { click: undo } })),
          counter, done);
      };

      /* the way there, said: the jump to the ten first, or the big jumps then the small */
      const jumps = jumpsFor(q, sizes, step.bridge);
      let how: string;
      if (step.bridge) {
        const first = bridgeOf(q, step.bridge);
        const next = lineText(q.a + sign * first);
        how = q.op === '+'
          ? `${a} + ${b}: ${lineText(first)} to ${next}, then ${lineText(q.b - first)} more is ${answer}.`
          : `${a} − ${b}: back ${lineText(first)} to ${next}, then ${lineText(q.b - first)} more back is ${answer}.`;
      } else {
        const counts = sizes.map((size) => jumps.filter((j) => Math.abs(j) === size).length);
        const parts = sizes.map((size, i) => ({ size, n: counts[i] })).filter((p) => p.n);
        const way = sizes.length === 1
          ? `${parts[0].n} ${parts[0].n === 1 ? 'jump' : 'jumps'}`
          : parts.map((p, i) => (i === 0 ? `${p.n} ${p.n === 1 ? 'jump' : 'jumps'} of ${jumpWord(p.size)}` : `${p.n} of ${jumpWord(p.size)}`)).join(' and ');
        how = `${a} ${q.op === '+' ? 'and' : 'take away'} ${b} is ${answer}: ${way} ${q.op === '+' ? 'on' : 'back'}.`;
      }

      done.addEventListener('click', async () => {
        if (!made.length && !fixed.length) { say(text); return; }
        pad.replaceChildren();
        const ok = at === q.answer && firstRight;
        sum.textContent = `${a} ${symbol} ${b} = ${answer}`;
        if (ok) {
          sfx.cheer();
          kit.note(`Yes! ${how}`, true);
          say(`Yes! ${how}`);
          await kit.wait(2600);
          resolve(true);
          return;
        }
        sfx.wrong();
        draw(step);
        let from = q.a;
        for (const [i, j] of jumps.entries()) { arc(x, from, from + j, 'way', labelled(j) || (!!step.bridge && i === 0)); from += j; }
        ball.setAttribute('x', String(x(q.answer)));
        line.append(ball);
        const landed = at === q.answer ? '' : `You landed on ${lineText(at)}. `;
        kit.note(`${landed}${how}`);
        say(`${landed}${how}`);
        await kit.wait(4200);
        resolve(false);
      });

      if (!step.bridge) {
        say(`${a} ${q.op === '+' ? 'plus' : 'take away'} ${b}. ${text}`);
        showPad();
        return;
      }
      /* first: how far to the next ten (or hundred)? */
      const bridge = step.bridge;
      const first = bridgeOf(q, bridge);
      const unit = bridge / 10;
      const place = bridge === 10 ? 'ten' : 'hundred';
      const whereTo = q.op === '+' ? `to the next ${place}` : `back to the ${place}`;
      ask.textContent = `${text} First: how far is it ${whereTo}?`;
      say(`${a} ${q.op === '+' ? 'plus' : 'take away'} ${b}. First: how far is it ${whereTo}?`);
      line.dataset.bridge = String(first);
      /* the slip is the other part of the ten: 8 for 38, not 2 */
      const options = [first, bridge - first, first + unit, first - unit, first + 2 * unit]
        .filter((v, i, all) => v > 0 && v < bridge && all.indexOf(v) === i).slice(0, 4);
      void kit.choices.ask(shuffle(options)).then(async (picked) => {
        kit.choices.reveal(first, picked);
        const next = q.a + sign * first;
        if (picked !== first) {
          firstRight = false;
          sfx.wrong();
          kit.note(`${a} is ${lineText(first)} from ${lineText(next)}.`);
        } else {
          sfx.tap();
          kit.note('');
        }
        fixed.push(sign * first);
        at = next;
        redraw();
        await kit.wait(picked === first ? 500 : 1800);
        kit.choices.clear();
        const rest = lineText(q.b - first);
        ask.textContent = q.op === '+' ? `Now jump the rest: ${rest} more.` : `Now jump back the rest: ${rest} more.`;
        say(ask.textContent);
        showPad();
      });
    }),
  };
}
