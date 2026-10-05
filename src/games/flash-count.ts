/* Flash Count — how many did you see?
 *
 * Dots flash up for a moment and go: dice patterns first, then a ten frame,
 * then two dice. Too quick to count one by one, so he learns to see "five"
 * as a shape and "seven" as five and two — subitising, the quick number
 * sense the Kindergarten syllabus starts with. A good warm-up before the
 * other maths games.
 *
 * In Year 2 the dots come in rows and columns, an array: "3 rows of 4" is
 * seen as a shape too, and it is where multiplying starts.
 *
 * The numbers to choose from only appear once the dots have gone, so the
 * dots have to be remembered, not counted. A wrong answer shows them again,
 * and counts them. */

import { el, prefersReducedMotion } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { pro } from '../lib/settings';
import { read, write } from '../lib/storage';
import { DICE, FLASH_STEPS, choices, flashLowest, flashMs, flashQuestion, type FlashQuestion, type FlashSpeed, type FlashStep } from '../content/maths';
import { mountMaths, type Kit } from './maths-kit';
import { svg } from '../ui/writing';

export function mount(root: HTMLElement): () => void {
  return mountMaths<FlashStep>({
    id: 'flash-count',
    title: 'Flash',
    swash: 'Count',
    tagline: 'Look quickly! How many did you see?',
    steps: FLASH_STEPS,
    face: '⚡',
    build,
  }, root);
}

/** one die face: spots on a 3 × 3 grid */
function die(n: number): SVGSVGElement {
  const face = svg('svg', { class: 'mx-die', viewBox: '0 0 90 90' },
    svg('rect', { x: 3, y: 3, width: 84, height: 84, rx: 14, class: 'mx-die-face' }));
  for (const at of DICE[n] ?? []) {
    face.append(svg('circle', { cx: 18 + (at % 3) * 27, cy: 18 + Math.floor(at / 3) * 27, r: 9, class: 'mx-dot' }));
  }
  return face;
}

/** a ten frame: two rows of five, filled from the top left, as at school */
function frame(n: number): SVGSVGElement {
  const f = svg('svg', { class: 'mx-frame', viewBox: '0 0 250 104' });
  for (let i = 0; i < 10; i += 1) {
    const x = 2 + (i % 5) * 49;
    const y = 2 + Math.floor(i / 5) * 50;
    f.append(svg('rect', { x, y, width: 49, height: 50, class: 'mx-cell' }));
    if (i < n) f.append(svg('circle', { cx: x + 24.5, cy: y + 25, r: 16, class: 'mx-dot' }));
  }
  return f;
}

/** rows and columns of dots, evenly spaced */
function array(rows: number, cols: number): SVGSVGElement {
  const gap = 40;
  const a = svg('svg', { class: 'mx-array', viewBox: `0 0 ${cols * gap} ${rows * gap}` });
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      a.append(svg('circle', { cx: gap / 2 + c * gap, cy: gap / 2 + r * gap, r: 13, class: 'mx-dot' }));
    }
  }
  return a;
}

function build(kit: Kit) {
  const card = el('div', { class: 'mx-flash', role: 'img' });
  const ask = el('p', { class: 'mx-ask', text: 'Look!' });
  const node = el('div', { class: 'mx-stage' }, ask, card);
  let last: number | undefined;
  /* right answers in a row at the current step: each one shortens the look */
  let streak = 0;
  let streakStep: FlashStep | null = null;

  /* the grown-up's pace, remembered; Pro starts on quick */
  const speedSel = el('select', { 'aria-label': 'Speed' },
    el('option', { value: 'slow', text: 'Speed: slow' }),
    el('option', { value: 'normal', text: 'Speed: normal' }),
    el('option', { value: 'quick', text: 'Speed: quick' }),
  );
  const saved = read<string>('flash-speed', '');
  speedSel.value = saved === 'slow' || saved === 'normal' || saved === 'quick' ? saved : pro() ? 'quick' : 'normal';
  speedSel.addEventListener('change', () => write('flash-speed', speedSel.value));

  function show(q: FlashQuestion, step: FlashStep): void {
    card.classList.remove('gone');
    card.replaceChildren(...(step.look === 'frame' ? [frame(q.n)]
      : step.look === 'array' ? [array(q.parts[0], q.parts[1])]
        : q.parts.map(die)));
    card.setAttribute('aria-label', `${q.n} dots`);
  }

  return {
    node,
    setup: speedSel,
    ask: async (step: FlashStep): Promise<boolean> => {
      const q = flashQuestion(step, last);
      last = q.n;
      ask.textContent = 'Look!';
      show(q, step);
      /* a long first look at each step, closing in as he gets them right */
      if (streakStep !== step) { streakStep = step; streak = 0; }
      const ms = flashMs(step, streak, speedSel.value as FlashSpeed, prefersReducedMotion());
      card.dataset.ms = String(ms);
      await kit.wait(ms);
      card.classList.add('gone');
      card.replaceChildren(el('span', { class: 'mx-big', text: '?' }));
      card.setAttribute('aria-label', 'hidden');
      ask.textContent = 'How many did you see?';
      const picked = await kit.choices.ask(choices(q.n, flashLowest(step), step.max));
      kit.choices.reveal(q.n, picked);
      show(q, step);
      if (picked === q.n) {
        sfx.right();
        kit.note(`Yes, ${q.n}!`, true);
        say(String(q.n));
        streak += 1;
        await kit.wait(1300);
        return true;
      }
      sfx.wrong();
      /* a miss gives him the long look back */
      streak = 0;
      const how = step.look === 'two-dice' ? `${q.parts[0]} and ${q.parts[1]} make ${q.n}.`
        : step.look === 'array' ? `${q.parts[0]} rows of ${q.parts[1]} make ${q.n}.`
          : `There were ${q.n}.`;
      kit.note(how);
      say(how);
      await kit.wait(2600);
      return false;
    },
  };
}
