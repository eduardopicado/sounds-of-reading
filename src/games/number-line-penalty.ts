/* Number Line Penalty — kick the ball to where the number lives.
 *
 * A number line runs across the goal. The referee calls a number and he taps
 * the spot on the line where it belongs; the ball flies there and the keeper
 * dives. Where numbers sit, and how far apart they are, is what makes
 * "bigger", "closer to 10" and later adding on a line make sense.
 *
 * It starts at 0 to 10 with every number written under its tick, then
 * writes fewer of them, then goes to 20 and on to 100 and 120 (Year 1), where
 * there is a tick for every ten and a near miss of a few still scores. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { LINE_STEPS, lineQuestion, onTarget, valueAt, type LineStep } from '../content/maths';
import { mountMaths, type Kit } from './maths-kit';
import { narrate } from './narration';
import { player } from './teams';
import { svg } from '../ui/writing';

/* the line in its own units: 0 at LEFT, the top number at RIGHT */
const LEFT = 40;
const RIGHT = 960;
const Y = 70;
/** the line's drawn height, in the same units */
const H = 150;

export function mount(root: HTMLElement): () => void {
  return mountMaths<LineStep>({
    id: 'number-line-penalty',
    title: 'Number Line',
    swash: 'Penalty',
    tagline: 'Kick the ball to where the number goes on the line.',
    steps: LINE_STEPS,
    face: '🥅',
    football: true,
    build,
  }, root);
}

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const keeper = el('div', { class: 'mx-keeper', 'aria-hidden': 'true' });
  const line = svg('svg', { class: 'mx-line', viewBox: `0 0 1000 ${H}`, role: 'img' });
  const goal = el('div', { class: 'mx-goal' }, keeper, line);
  const node = el('div', { class: 'mx-stage' }, ask, goal);
  let last: number | undefined;

  const xOf = (step: LineStep, v: number): number => LEFT + ((v - step.lo) / (step.hi - step.lo)) * (RIGHT - LEFT);

  function draw(step: LineStep): void {
    line.replaceChildren(svg('line', { x1: LEFT, x2: RIGHT, y1: Y, y2: Y, class: 'mx-axis' }));
    for (let v = step.lo; v <= step.hi; v += step.tick) {
      line.append(svg('line', { x1: xOf(step, v), x2: xOf(step, v), y1: Y - 14, y2: Y + 14, class: 'mx-tick' }));
    }
    for (const v of step.labels) {
      const t = svg('text', { x: xOf(step, v), y: Y + 58, class: 'mx-label' });
      t.textContent = String(v);
      line.append(t);
    }
    line.setAttribute('aria-label', `A number line from ${step.lo} to ${step.hi}`);
  }

  function mark(step: LineStep, v: number, cls: string, text?: string): void {
    const g = svg('g', { class: cls, transform: `translate(${xOf(step, v)} ${Y})` });
    const c = svg('text', { x: 0, y: -22, class: 'mx-mark' });
    c.textContent = text ?? '⚽';
    g.append(c);
    line.append(g);
  }

  return {
    node,
    ask: (step: LineStep): Promise<boolean> => new Promise((resolve) => {
      const n = lineQuestion(step, last);
      last = n;
      draw(step);
      keeper.replaceChildren(player(kit.rival(), 70, 'keeper'));
      keeper.style.translate = '';
      ask.replaceChildren('Kick it to ', el('b', { class: 'mx-big', text: String(n) }));
      say(`Kick it to ${n}`);
      line.dataset.ready = '1';
      line.dataset.asked = String(n);

      /* a tap anywhere in the goal counts, at its distance along the line:
         a six-year-old's finger lands near the line, not always on it */
      const tap = async (e: PointerEvent): Promise<void> => {
        goal.removeEventListener('pointerdown', tap);
        delete line.dataset.ready;
        const box = line.getBoundingClientRect();
        /* the svg keeps its shape, so map the tap through the drawn width */
        const fraction = ((e.clientX - box.left) / box.width * 1000 - LEFT) / (RIGHT - LEFT);
        const v = valueAt(step, fraction);
        const ok = onTarget(step, n, v);
        sfx.kick();
        mark(step, v, 'mx-shot');
        /* the keeper goes the wrong way when he is right */
        const toward = (xOf(step, ok ? (v > (step.lo + step.hi) / 2 ? step.lo : step.hi) : v) / 1000 - 0.5) * box.width;
        keeper.style.translate = `${toward}px 0`;
        await kit.wait(450);
        if (ok) {
          sfx.cheer();
          kit.note(`GOAL! ${n} is right there.`, true);
          narrate('goal', kit.us(), () => say(String(n)), kit.life.later);
          await kit.wait(3000);
          resolve(true);
          return;
        }
        sfx.wrong();
        mark(step, n, 'mx-answer', '🚩');
        kit.note(`Saved! ${n} lives here, by the flag.`);
        narrate('save', kit.rival(), () => say(`${n} is here`), kit.life.later);
        await kit.wait(3200);
        resolve(false);
      };
      goal.addEventListener('pointerdown', tap);
    }),
  };
}
