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
 * The line and the arcs are drawn in one svg, the way Number Line Penalty
 * draws its line, so a phone and an iPad see the same thing at their size. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { JUMP_STEPS, jumpQuestion, jumpsFor, type JumpQuestion, type JumpStep } from '../content/maths';
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

  function draw(step: JumpStep): (v: number) => number {
    const x = (v: number): number => LEFT + (v / step.top) * (RIGHT - LEFT);
    line.replaceChildren(svg('line', { x1: LEFT, x2: RIGHT, y1: Y, y2: Y, class: 'mx-axis' }));
    const every = step.top === 100 ? 10 : 1;
    for (let v = 0; v <= step.top; v += every) {
      line.append(svg('line', { x1: x(v), x2: x(v), y1: Y - 12, y2: Y + 12, class: 'mx-tick' }));
      const t = svg('text', { x: x(v), y: Y + 56, class: step.top === 20 ? 'jl-label tight' : 'jl-label' });
      t.textContent = String(v);
      line.append(t);
    }
    /* on the long line, a small tick for every one, so the ones jumps show */
    if (step.top === 100) for (let v = 0; v <= 100; v += 1) if (v % 10) line.append(svg('line', { x1: x(v), x2: x(v), y1: Y - 5, y2: Y + 5, class: 'jl-small' }));
    return x;
  }

  /** an arc from one number to another, labelled with the jump */
  function arc(x: (v: number) => number, from: number, to: number, cls: string): void {
    const x1 = x(from);
    const x2 = x(to);
    const hop = Math.min(80, 18 + Math.abs(x2 - x1) * 0.5);
    line.append(svg('path', { d: `M ${x1} ${Y - 6} Q ${(x1 + x2) / 2} ${Y - 6 - hop * 2} ${x2} ${Y - 6}`, class: `jl-arc ${cls}` }));
    if (Math.abs(to - from) >= 10) {
      const t = svg('text', { x: (x1 + x2) / 2, y: Y - hop - 14, class: 'jl-hop' });
      t.textContent = `${to > from ? '+' : '−'}${Math.abs(to - from)}`;
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
      const ball = svg('text', { x: x(q.a), y: Y - 14, class: 'jl-ball' });
      ball.textContent = '⚽';
      line.append(ball);
      line.dataset.a = String(q.a);
      line.dataset.b = String(q.b);
      line.dataset.answer = String(q.answer);
      const symbol = q.op === '+' ? '+' : '−';
      sum.textContent = `${q.a} ${symbol} ${q.b} = ?`;
      const text = q.op === '+' ? `Start at ${q.a}. Jump on ${q.b}.` : `Start at ${q.a}. Jump back ${q.b}.`;
      ask.textContent = text;
      say(`${q.a} ${q.op === '+' ? 'plus' : 'take away'} ${q.b}. ${text}`);
      line.setAttribute('aria-label', `A number line from 0 to ${step.top}, the ball on ${q.a}`);

      let at = q.a;
      const made: number[] = [];
      const counter = el('span', { class: 'jl-made', 'aria-live': 'polite' });
      const move = (by: number): void => {
        const to = at + by;
        if (to < 0 || to > step.top || made.length >= MOST) { sfx.wrong(); return; }
        sfx.tap();
        arc(x, at, to, 'his');
        made.push(by);
        at = to;
        ball.setAttribute('x', String(x(at)));
        line.append(ball);
        line.dataset.at = String(at);
        counter.textContent = made.length ? `${made.length} ${made.length === 1 ? 'jump' : 'jumps'}` : '';
      };
      const undo = (): void => {
        if (!made.length) return;
        made.pop();
        at = q.a + made.reduce((s, j) => s + j, 0);
        /* redraw the line with the jumps that are left */
        draw(step);
        let from = q.a;
        for (const j of made) { arc(x, from, from + j, 'his'); from += j; }
        ball.setAttribute('x', String(x(at)));
        line.append(ball);
        line.dataset.at = String(at);
        counter.textContent = made.length ? `${made.length} ${made.length === 1 ? 'jump' : 'jumps'}` : '';
      };
      const jump = (by: number): HTMLElement => el('button', {
        class: 'jl-jump', type: 'button', text: `${by > 0 ? '+' : '−'}${Math.abs(by)}`,
        'aria-label': `Jump ${by > 0 ? 'on' : 'back'} ${Math.abs(by)}`, on: { click: () => move(by) },
      });
      const done = el('button', { class: 'btn mx-go', type: 'button', text: 'Done ✓' });
      pad.replaceChildren(
        el('div', { class: 'jl-jumps' }, ...(step.tens ? [jump(sign * 10)] : []), jump(sign),
          el('button', { class: 'jl-undo', type: 'button', text: '↩', 'aria-label': 'Undo a jump', on: { click: undo } })),
        counter, done);

      done.addEventListener('click', async () => {
        if (!made.length) { say(text); return; }
        pad.replaceChildren();
        const ok = at === q.answer;
        sum.textContent = `${q.a} ${symbol} ${q.b} = ${q.answer}`;
        /* the way there, tens then ones, said and (on a miss) drawn */
        const jumps = jumpsFor(q, step.tens);
        const tens = jumps.filter((j) => Math.abs(j) === 10).length;
        const ones = jumps.length - tens;
        const way = tens
          ? `${tens} ${tens === 1 ? 'jump' : 'jumps'} of ten${ones ? ` and ${ones} of one` : ''}`
          : `${ones} ${ones === 1 ? 'jump' : 'jumps'}`;
        const how = `${q.a} ${q.op === '+' ? 'and' : 'take away'} ${q.b} is ${q.answer}: ${way} ${q.op === '+' ? 'on' : 'back'}.`;
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
        for (const j of jumps) { arc(x, from, from + j, 'way'); from += j; }
        ball.setAttribute('x', String(x(q.answer)));
        line.append(ball);
        kit.note(`You landed on ${at}. ${how}`);
        say(`You landed on ${at}. ${how}`);
        await kit.wait(4200);
        resolve(false);
      });
    }),
  };
}
