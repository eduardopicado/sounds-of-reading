/* Number Line Penalty — kick the ball to where the number lives.
 *
 * A number line runs across the goal. The referee calls a number and he taps
 * the spot on the line where it belongs; the ball flies there and the keeper
 * dives. Where numbers sit, and how far apart they are, is what makes
 * "bigger", "closer to 10" and later adding on a line make sense.
 *
 * It starts at 0 to 10 with every number written under its tick, then
 * writes fewer of them, then goes to 20 and on to 100 and 120 (Year 1), where
 * there is a tick for every ten and a near miss of a few still scores.
 *
 * Years 3 and 4 go on to 10 000, then round: the line is one ten long, 40 to
 * 50, the number is marked on it, and he kicks to the end it is nearer —
 * rounding seen as a distance rather than learnt as a rule. Then the line
 * from 0 to 1 counts in tenths. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import {
  LINE_STEPS, belowZero, lineQuestion, lineText, onTarget, roundOnTarget, roundQuestion, roundWhy, spokenNumber, valueAt,
  type LineStep, type RoundQuestion,
} from '../content/maths';
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

  /** the stretch of line on show: a step's whole line, or one ten of it to round on */
  type View = Pick<LineStep, 'lo' | 'hi' | 'tick' | 'labels' | 'per'>;
  const xOf = (step: View, v: number): number => LEFT + ((v - step.lo) / (step.hi - step.lo)) * (RIGHT - LEFT);

  function draw(step: View): void {
    line.replaceChildren(svg('line', { x1: LEFT, x2: RIGHT, y1: Y, y2: Y, class: 'mx-axis' }));
    for (let v = step.lo; v <= step.hi; v += step.tick) {
      line.append(svg('line', { x1: xOf(step, v), x2: xOf(step, v), y1: Y - 14, y2: Y + 14, class: 'mx-tick' }));
    }
    for (const v of step.labels) {
      const text = lineText(v, step.per);
      /* a long number at either end is kept inside the goal */
      const end = text.length >= 4 && v === step.hi;
      const t = svg('text', { x: end ? 996 : xOf(step, v), y: Y + 58, class: end ? 'mx-label end' : 'mx-label' });
      t.textContent = text;
      line.append(t);
    }
    line.dataset.lo = String(step.lo / (step.per ?? 1));
    line.dataset.hi = String(step.hi / (step.per ?? 1));
    line.setAttribute('aria-label', `A number line from ${lineText(step.lo, step.per)} to ${lineText(step.hi, step.per)}`);
  }

  function mark(step: View, v: number, cls: string, text?: string): void {
    const g = svg('g', { class: cls, transform: `translate(${xOf(step, v)} ${Y})` });
    const c = svg('text', { x: 0, y: -22, class: 'mx-mark' });
    c.textContent = text ?? '⚽';
    g.append(c);
    line.append(g);
  }

  /** where on the drawn line a tap landed, as a fraction of the way along */
  const along = (e: PointerEvent): number => {
    const box = line.getBoundingClientRect();
    /* the svg keeps its shape, so map the tap through the drawn width */
    return ((e.clientX - box.left) / box.width * 1000 - LEFT) / (RIGHT - LEFT);
  };

  /** kick it to the ten (or hundred) that the marked number is nearer */
  const round = (step: LineStep): Promise<boolean> => new Promise((resolve) => {
    const q: RoundQuestion = roundQuestion(step, last);
    last = q.n;
    const view: View = { lo: q.lo, hi: q.hi, tick: q.tick, labels: [q.lo, q.hi] };
    draw(view);
    /* halfway, dashed: past it, the number is nearer the far end */
    const half = xOf(view, (q.lo + q.hi) / 2);
    line.append(svg('line', { x1: half, x2: half, y1: Y - 30, y2: Y + 30, class: 'mx-half' }));
    mark(view, q.n, 'mx-asked', '📍');
    keeper.replaceChildren(player(kit.rival(), 70, 'keeper'));
    keeper.style.translate = '';
    const what = step.round === 100 ? 'hundred' : 'ten';
    ask.replaceChildren(`Kick it to the ${what} nearest `, el('b', { class: 'mx-big', text: String(q.n) }));
    say(`Kick it to the ${what} nearest ${q.n}`);
    line.dataset.ready = '1';
    line.dataset.asked = String(q.n);
    line.dataset.answer = String(q.answer);
    const tap = async (e: PointerEvent): Promise<void> => {
      goal.removeEventListener('pointerdown', tap);
      delete line.dataset.ready;
      const v = view.lo + Math.min(1, Math.max(0, along(e))) * (view.hi - view.lo);
      const ok = roundOnTarget(q, v);
      sfx.kick();
      mark(view, Math.round(v), 'mx-shot');
      const box = line.getBoundingClientRect();
      const toward = (xOf(view, ok ? (q.answer === q.lo ? q.hi : q.lo) : v) / 1000 - 0.5) * box.width;
      keeper.style.translate = `${toward}px 0`;
      await kit.wait(450);
      if (ok) {
        sfx.cheer();
        kit.note(`GOAL! ${q.n} is nearer ${q.answer}.`, true);
        narrate('goal', kit.us(), () => say(`${q.n} is nearer ${q.answer}`), kit.life.later);
        await kit.wait(3000);
        resolve(true);
        return;
      }
      sfx.wrong();
      mark(view, q.answer, 'mx-answer', '🚩');
      const why = roundWhy(q);
      kit.note(`Saved! ${why}`);
      narrate('save', kit.rival(), () => say(why), kit.life.later);
      await kit.wait(4200);
      resolve(false);
    };
    goal.addEventListener('pointerdown', tap);
  });

  return {
    node,
    ask: (step: LineStep): Promise<boolean> => (step.round ? round(step) : new Promise((resolve) => {
      const n = lineQuestion(step, last);
      last = n;
      draw(step);
      keeper.replaceChildren(player(kit.rival(), 70, 'keeper'));
      keeper.style.translate = '';
      const shown = lineText(n, step.per);
      ask.replaceChildren('Kick it to ', el('b', { class: 'mx-big', text: shown }));
      say(`Kick it to ${step.per ? shown : spokenNumber(n)}`);
      line.dataset.ready = '1';
      line.dataset.asked = String(n / (step.per ?? 1));
      delete line.dataset.answer;

      /* a tap anywhere in the goal counts, at its distance along the line:
         a six-year-old's finger lands near the line, not always on it */
      const tap = async (e: PointerEvent): Promise<void> => {
        goal.removeEventListener('pointerdown', tap);
        delete line.dataset.ready;
        const box = line.getBoundingClientRect();
        const v = valueAt(step, along(e));
        const ok = onTarget(step, n, v);
        sfx.kick();
        mark(step, v, 'mx-shot');
        /* the keeper goes the wrong way when he is right */
        const toward = (xOf(step, ok ? (v > (step.lo + step.hi) / 2 ? step.lo : step.hi) : v) / 1000 - 0.5) * box.width;
        keeper.style.translate = `${toward}px 0`;
        await kit.wait(450);
        if (ok) {
          sfx.cheer();
          kit.note(`GOAL! ${shown} is right there.`, true);
          narrate('goal', kit.us(), () => say(step.per ? shown : spokenNumber(n)), kit.life.later);
          await kit.wait(3000);
          resolve(true);
          return;
        }
        sfx.wrong();
        mark(step, n, 'mx-answer', '🚩');
        /* below zero: how far below it is */
        kit.note(`Saved! ${shown} lives here, by the flag.${n < 0 ? ` ${belowZero(n)}` : ''}`);
        narrate('save', kit.rival(), () => say(`${step.per ? shown : spokenNumber(n)} is here${n < 0 ? `, ${-n} below zero` : ''}`), kit.life.later);
        await kit.wait(3200);
        resolve(false);
      };
      goal.addEventListener('pointerdown', tap);
    })),
  };
}
