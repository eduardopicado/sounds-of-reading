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
 * In Years 3 and 4 the arrays are the times-table facts, up to 12 rows of 12.
 * They are drawn in blocks of five, a gap after every fifth row and column,
 * so 7 rows of 6 is seen as 5 rows and 2 more rather than counted. The
 * numbers to choose from are the slips made with a fact — a row too many or
 * too few — and a miss splits the array into those two easier parts.
 *
 * The numbers to choose from only appear once the dots have gone, so the
 * dots have to be remembered, not counted. A wrong answer shows them again,
 * and counts them. */

import { el, prefersReducedMotion } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { pro } from '../lib/settings';
import { read, write } from '../lib/storage';
import {
  DICE, FLASH_STEPS, choices, factChoices, factKey, flashLowest, flashMs, flashQuestion, timesHelp,
  type FlashQuestion, type FlashSpeed, type FlashStep,
} from '../content/maths';
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

/** the extra space after every fifth row or column of a times-table array */
const BLOCK = 18;

/**
 * Rows and columns of dots, evenly spaced. A times-table array is drawn in
 * blocks of five, and can colour its rows from `split` on in a second colour,
 * to show the fact as two easier parts.
 */
function array(rows: number, cols: number, blocks = false, split = rows): SVGSVGElement {
  const gap = 40;
  const extra = (i: number): number => (blocks ? Math.floor(i / 5) * BLOCK : 0);
  const w = cols * gap + extra(cols - 1);
  const h = rows * gap + extra(rows - 1);
  const a = svg('svg', { class: blocks ? 'mx-array facts' : 'mx-array', viewBox: `0 0 ${w} ${h}` });
  a.style.setProperty('--aspect', String(w / h));
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      a.append(svg('circle', {
        cx: gap / 2 + c * gap + extra(c), cy: gap / 2 + r * gap + extra(r), r: 13,
        class: r < split ? 'mx-dot' : 'mx-dot more',
      }));
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

  function show(q: FlashQuestion, step: FlashStep, split?: number): void {
    card.classList.remove('gone');
    card.replaceChildren(...(step.look === 'frame' ? [frame(q.n)]
      : step.look === 'array' ? [array(q.parts[0], q.parts[1])]
        : step.look === 'facts' ? [array(q.parts[0], q.parts[1], true, split)]
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
      const facts = step.look === 'facts';
      const [rows, cols] = q.parts;
      const picked = await kit.choices.ask(facts ? factChoices(rows, cols) : choices(q.n, flashLowest(step), step.max));
      kit.choices.reveal(q.n, picked);
      show(q, step);
      if (picked === q.n) {
        sfx.right();
        const yes = facts ? `Yes! ${rows} rows of ${cols} make ${q.n}.` : `Yes, ${q.n}!`;
        kit.note(yes, true);
        say(facts ? yes : String(q.n));
        streak += 1;
        await kit.wait(facts ? 1800 : 1300);
        return true;
      }
      sfx.wrong();
      /* a miss gives him the long look back */
      streak = 0;
      if (facts) {
        /* the fact in two easier parts: 7 rows of 6 is 5 rows and 2 more */
        const help = timesHelp({ a: rows, b: cols, op: '×', answer: q.n, table: cols, lots: rows, fact: factKey(rows, cols) }, 'rows');
        show(q, step, help.parts[1] ? help.parts[0] : rows);
        kit.note(help.text);
        say(help.text.replace(/×/g, 'times').replace(/=/g, 'is'));
        await kit.wait(5000);
        return false;
      }
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
