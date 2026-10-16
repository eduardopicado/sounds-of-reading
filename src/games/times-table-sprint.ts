/* Times Table Sprint — the times tables to 12 × 12, by heart.
 *
 * Working a fact out and knowing it are different jobs. The other maths
 * games teach the working out (Training Drills' equal groups, Flash Count's
 * rows of dots); this one is for the knowing, which is what Years 3 and 4
 * ask for. So he types the answer on a number pad rather than picking it from
 * four, and only a quick answer counts: a bar runs down while he thinks. A
 * slow right answer is still right and is praised, but the fact comes back.
 *
 * Every fact is remembered on its own, in boxes (see timesQuestion in
 * src/content/maths.ts): a quick right answer moves it up a box, a wrong one
 * sends it back to the start, and the facts in the low boxes come up most.
 * A fact he misses also comes back a few questions later in the same round.
 * He moves up to the next table only when he knows every fact in this one,
 * not after three lucky ones in a row.
 *
 * A wrong answer is never just a buzz: it shows the fact built from ones he
 * knows — 7 lots of 6 is 5 lots and 2 more — on rows of dots, split in two. */

import { el, replay } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { read, write } from '../lib/storage';
import {
  SPRINT_MS, TIMES_STEPS, askAgain, knowsStep, nextBox, timesHelp, timesQuestion,
  type Climb, type SprintPace, type TimesQuestion, type TimesStep,
} from '../content/maths';
import { mountMaths, type Kit } from './maths-kit';
import { svg } from '../ui/writing';

const FACTS_KEY = 'times-facts';
const PACE_KEY = 'sprint-pace';
/** a fact he got wrong or slow comes back this many questions later */
const AGAIN_AFTER = 3;
/** none of the last few facts comes straight back */
const RECENT = 4;
/** the longest answer: 12 × 12 is 144 */
const DIGITS = 3;

/** what he knows, as saved: a box for each fact, anything else dropped */
function savedBoxes(): Record<string, number> {
  const raw = read<Record<string, unknown>>(FACTS_KEY, {});
  const out: Record<string, number> = {};
  for (const [fact, box] of Object.entries(raw)) {
    if (typeof box === 'number' && Number.isInteger(box) && box >= 0 && box <= 4) out[fact] = box;
  }
  return out;
}

/** a sum the way it is said: "7 times 6 is 42" */
const spoken = (text: string): string =>
  text.replace(/×/g, 'times').replace(/÷/g, 'divided by').replace(/=/g, 'is');

/** the fact on rows of dots, the rows of its two easier parts in two colours */
function rows(q: TimesQuestion, parts: [number, number]): SVGSVGElement {
  const gap = 40;
  const cols = q.table;
  const a = svg('svg', { class: 'mx-array ts-array', viewBox: `0 0 ${cols * gap} ${q.lots * gap}`, role: 'img',
    'aria-label': `${q.lots} rows of ${q.table}` });
  a.style.setProperty('--aspect', String(cols / q.lots));
  for (let r = 0; r < q.lots; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      a.append(svg('circle', { cx: gap / 2 + c * gap, cy: gap / 2 + r * gap, r: 13, class: r < parts[0] ? 'mx-dot' : 'mx-dot ts-more' }));
    }
  }
  return a;
}

export function mount(root: HTMLElement): () => void {
  /* he moves up a table when he knows it, and never down: a table he has
     not got yet keeps coming, and the earlier ones come back as review */
  const climbWhenKnown = (c: Climb, ok: boolean, steps: number): Climb => {
    const right = ok ? c.right + 1 : 0;
    if (ok && c.step < steps - 1 && knowsStep(TIMES_STEPS[c.step], savedBoxes())) return { step: c.step + 1, right: 0, wrong: 0 };
    return { step: c.step, right, wrong: ok ? 0 : c.wrong + 1 };
  };
  return mountMaths<TimesStep>({
    id: 'times-table-sprint',
    title: 'Times Table',
    swash: 'Sprint',
    tagline: 'How fast can you say it? Type the answer before the bar runs out.',
    steps: TIMES_STEPS,
    face: '⏱️',
    lengths: [12, 20],
    counts: 'Quick and right',
    cheer: 'Good sprinting!',
    climb: climbWhenKnown,
    build,
  }, root);
}

function build(kit: Kit) {
  const sum = el('p', { class: 'mx-sum ts-sum', 'aria-live': 'polite' });
  const entry = el('span', { class: 'ts-entry', text: '?' });
  const fill = el('div', { class: 'ts-fill' });
  const bar = el('div', { class: 'ts-bar', role: 'presentation' }, fill);
  const help = el('div', { class: 'ts-help' });
  const pad = el('div', { class: 'ts-pad' });
  const node = el('div', { class: 'mx-stage' }, sum, bar, pad, help);

  /* the grown-up's pace, remembered */
  const paceSel = el('select', { 'aria-label': 'Time to answer' },
    el('option', { value: 'relaxed', text: 'Time: relaxed (12 s)' }),
    el('option', { value: 'steady', text: 'Time: steady (8 s)' }),
    el('option', { value: 'quick', text: 'Time: quick (5 s)' }),
  );
  const savedPace = read<string>(PACE_KEY, 'steady');
  paceSel.value = savedPace === 'relaxed' || savedPace === 'steady' || savedPace === 'quick' ? savedPace : 'steady';
  paceSel.addEventListener('change', () => write(PACE_KEY, paceSel.value));

  /* what he has typed, and who is waiting for it */
  let typed = '';
  let waiting: ((n: number) => void) | null = null;
  const showTyped = (): void => { entry.textContent = typed || '?'; };
  const press = (key: string): void => {
    if (!waiting) return;
    if (key === 'del') { typed = typed.slice(0, -1); showTyped(); sfx.tap(); return; }
    if (key === 'go') {
      if (!typed) return;
      const done = waiting;
      waiting = null;
      done(Number(typed));
      return;
    }
    if (typed.length >= DIGITS) return;
    typed = typed === '0' ? key : typed + key;
    sfx.tap();
    showTyped();
  };
  const key = (k: string, text: string, label: string, cls = ''): HTMLElement => el('button', {
    class: `ts-key ${cls}`.trim(), type: 'button', text, 'aria-label': label, on: { click: () => press(k) },
  });
  pad.append(
    ...['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => key(d, d, d)),
    key('del', '⌫', 'Delete', 'ts-del'), key('0', '0', '0'), key('go', '✓', 'Check', 'ts-go'),
  );
  /* a keyboard works too, for a grown-up or a tablet with one; it listens only
     while this game is on screen and a question is waiting */
  const onKey = (e: KeyboardEvent): void => {
    if (!node.isConnected) { window.removeEventListener('keydown', onKey); return; }
    if (!waiting || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('del');
    else if (e.key === 'Enter') press('go');
    else return;
    e.preventDefault();
  };
  window.addEventListener('keydown', onKey);

  let boxes = savedBoxes();
  const recent: string[] = [];
  /* facts to ask again later this round: the question, and how many more
     questions until it comes back */
  const again: { q: TimesQuestion; in: number }[] = [];

  function next(step: TimesStep): TimesQuestion {
    for (const a of again) a.in -= 1;
    const due = again.findIndex((a) => a.in <= 0 && a.q.op === (step.divide ? '÷' : '×'));
    if (due >= 0) return askAgain(again.splice(due, 1)[0].q);
    return timesQuestion(step, boxes, recent);
  }

  function remember(q: TimesQuestion, right: boolean, quick: boolean): void {
    boxes = savedBoxes();
    boxes[q.fact] = nextBox(boxes[q.fact] ?? 0, right, quick);
    write(FACTS_KEY, boxes);
    recent.push(q.fact);
    if (recent.length > RECENT) recent.shift();
    if (!right || !quick) again.push({ q, in: AGAIN_AFTER });
  }

  return {
    node,
    setup: paceSel,
    ask: async (step: TimesStep): Promise<boolean> => {
      const q = next(step);
      const ms = SPRINT_MS[paceSel.value as SprintPace] ?? SPRINT_MS.steady;
      typed = '';
      showTyped();
      entry.classList.remove('right', 'wrong');
      help.replaceChildren();
      sum.replaceChildren(`${q.a} ${q.op} ${q.b} = `, entry);
      sum.dataset.answer = String(q.answer);
      bar.style.setProperty('--ms', `${ms}ms`);
      bar.classList.remove('late');
      fill.classList.remove('stopped');
      replay(fill, 'run');
      const late = kit.life.later(() => bar.classList.add('late'), ms);
      say(spoken(`${q.a} ${q.op} ${q.b}`));

      const started = performance.now();
      const answer = await new Promise<number>((resolve) => { waiting = resolve; });
      const quick = performance.now() - started <= ms;
      late();
      /* the bar stops where it got to, so he can see how quick he was */
      fill.classList.add('stopped');
      const fact = `${q.a} ${q.op} ${q.b} = ${q.answer}`;
      const right = answer === q.answer;
      remember(q, right, quick);

      if (right) {
        sfx.right();
        entry.classList.add('right');
        if (quick) {
          kit.note(`Yes! ${fact}`, true);
          say(spoken(fact));
          await kit.wait(900);
          return true;
        }
        kit.note(`Right! ${fact}. It will come back, to get quicker.`, true);
        say(`Right! ${spoken(fact)}.`);
        await kit.wait(1800);
        return false;
      }

      sfx.wrong();
      entry.classList.add('wrong');
      entry.textContent = String(q.answer);
      const how = timesHelp(q);
      help.replaceChildren(rows(q, how.parts));
      kit.note(how.text);
      say(spoken(how.text));
      await kit.wait(5200);
      return false;
    },
  };
}
