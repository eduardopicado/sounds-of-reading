/* Match Clock — telling the time, and the days, months and seasons.
 *
 * Match day runs on a clock. Year 1 reads o'clock and half past on a clock
 * with hands, sets the hands for a kick-off time, and knows the days of the
 * week in order (training is on Tuesday, the match is the day after).
 *
 * Year 2 adds quarter past and quarter to, setting those, the months in
 * order, and which season a month falls in — in Australia, where summer is
 * December to February.
 *
 * The wrong answers are the ones children give: half past 4 for half past
 * 3 (the hour hand has gone past the 3 but not reached the 4), reading the
 * minute hand as the hour, and the day before for the day after. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { CLOCK_STEPS, DAYS, MONTHS, clockQuestion, seasonOf, timeWords, type ClockQuestion, type ClockStep } from '../content/maths';
import { mountMaths, type Kit } from './maths-kit';
import { svg } from '../ui/writing';

export function mount(root: HTMLElement): () => void {
  return mountMaths<ClockStep>({
    id: 'match-clock',
    title: 'Match',
    swash: 'Clock',
    tagline: "What time is kick-off? O'clock, half past, and the days of the week.",
    steps: CLOCK_STEPS,
    face: '⏰',
    build,
  }, root);
}

const SEASON_LOOK: Record<string, string> = { Summer: '☀️', Autumn: '🍂', Winter: '❄️', Spring: '🌸' };

/** a clock face with hands at this many minutes past 12 */
function clock(): { node: SVGSVGElement; set: (minutes: number) => void } {
  const face = svg('svg', { class: 'mc-clock', viewBox: '0 0 200 200', role: 'img' },
    svg('circle', { cx: 100, cy: 100, r: 94, class: 'mc-face' }));
  for (let i = 0; i < 60; i += 1) {
    const a = (i * 6 * Math.PI) / 180;
    const inner = i % 5 ? 86 : 80;
    face.append(svg('line', { x1: 100 + inner * Math.sin(a), y1: 100 - inner * Math.cos(a), x2: 100 + 90 * Math.sin(a), y2: 100 - 90 * Math.cos(a), class: i % 5 ? 'mc-tick' : 'mc-tick big' }));
  }
  for (let n = 1; n <= 12; n += 1) {
    const a = (n * 30 * Math.PI) / 180;
    const t = svg('text', { x: 100 + 64 * Math.sin(a), y: 100 - 64 * Math.cos(a) + 8, class: 'mc-number' });
    t.textContent = String(n);
    face.append(t);
  }
  const hour = svg('line', { x1: 100, y1: 100, x2: 100, y2: 52, class: 'mc-hour' });
  const minute = svg('line', { x1: 100, y1: 100, x2: 100, y2: 24, class: 'mc-minute' });
  face.append(hour, minute, svg('circle', { cx: 100, cy: 100, r: 6, class: 'mc-pin' }));
  return {
    node: face,
    set: (minutes) => {
      hour.setAttribute('transform', `rotate(${(minutes / 2) % 360} 100 100)`);
      minute.setAttribute('transform', `rotate(${(minutes * 6) % 360} 100 100)`);
      const h = Math.floor(minutes / 60) % 12 || 12;
      face.setAttribute('aria-label', `A clock showing ${timeWords(h, minutes % 60)}`);
      face.dataset.minutes = String(minutes % 720);
    },
  };
}

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const board = el('div', { class: 'mc-board' });
  const pad = el('div', { class: 'mc-pad' });
  const node = el('div', { class: 'mx-stage' }, ask, board, pad);
  let last: ClockQuestion | undefined;

  async function finish(ok: boolean, how: string): Promise<boolean> {
    if (ok) {
      sfx.cheer();
      kit.note(`Yes! ${how}`, true);
      say(`Yes! ${how}`);
      await kit.wait(2400);
      return true;
    }
    sfx.wrong();
    kit.note(how);
    say(how);
    await kit.wait(3600);
    return false;
  }

  async function read(q: ClockQuestion): Promise<boolean> {
    const c = clock();
    c.set((q.h % 12) * 60 + q.m);
    board.replaceChildren(c.node);
    ask.textContent = 'What time is kick-off?';
    say(ask.textContent);
    const picked = await kit.choices.askWords(q.options);
    kit.choices.revealWord(q.answer, picked);
    const hint = q.m === 30 ? ` The hour hand is half way past the ${q.h}.`
      : q.m === 45 ? ` The hour hand is nearly at the ${(q.h % 12) + 1}.`
        : q.m === 15 ? ` The hour hand is just past the ${q.h}.`
          : ` The long hand is on the 12.`;
    return finish(picked === q.answer, `It's ${q.answer}.${picked === q.answer ? '' : hint}`);
  }

  function set(step: ClockStep, q: ClockQuestion): Promise<boolean> {
    return new Promise((resolve) => {
      const c = clock();
      let t = 0;
      c.set(t);
      board.replaceChildren(c.node);
      const want = (q.h % 12) * 60 + q.m;
      const by = step.minutes.includes(15) ? 15 : 30;
      ask.textContent = `Kick-off is at ${q.answer}. Set the clock.`;
      say(ask.textContent);
      const turn = (minutes: number): void => { t = (t + minutes) % 720; c.set(t); sfx.tap(); };
      const done = el('button', { class: 'btn mx-go', type: 'button', text: 'Done ✓' });
      pad.replaceChildren(
        el('div', { class: 'mc-turns' },
          el('button', { class: 'mc-turn', type: 'button', text: '+1 hour', on: { click: () => turn(60) } }),
          el('button', { class: 'mc-turn', type: 'button', text: `+${by} minutes`, on: { click: () => turn(by) } }),
          el('button', { class: 'mc-turn back', type: 'button', text: '↺', 'aria-label': 'Back to 12 o\'clock', on: { click: () => { t = 0; c.set(t); sfx.tap(); } } })),
        done);
      done.addEventListener('click', async () => {
        pad.replaceChildren();
        const ok = t === want;
        const h = Math.floor(t / 60) % 12 || 12;
        const said = timeWords(h, t % 60);
        if (!ok) c.set(want);
        resolve(await finish(ok, ok ? `The clock says ${q.answer}.` : `That's ${said}. ${q.answer} looks like this.`));
      });
    });
  }

  /** a row of days or months, only the one in the question named */
  function strip(names: string[], given: number, target: number): HTMLElement {
    return el('div', { class: `mc-strip n${names.length}` }, ...names.map((n, i) =>
      el('span', { class: i === given ? 'mc-cell given' : i === target ? 'mc-cell target' : 'mc-cell', text: i === given ? n.slice(0, 3) : i === target ? '?' : '' })));
  }

  async function order(step: ClockStep, q: ClockQuestion): Promise<boolean> {
    const days = step.task === 'days';
    const names = days ? DAYS : MONTHS;
    const n = names.length;
    const target = (q.index + (q.after ? 1 : n - 1)) % n;
    board.replaceChildren(strip(names, q.index, target));
    const given = names[q.index];
    ask.textContent = days
      ? `Training is on ${given}. The match is the day ${q.after ? 'after' : 'before'}. What day is the match?`
      : `It's ${given}. What month comes ${q.after ? 'next' : 'before'}?`;
    say(ask.textContent);
    const picked = await kit.choices.askWords(q.options);
    kit.choices.revealWord(q.answer, picked);
    board.querySelector('.mc-cell.target')!.textContent = q.answer.slice(0, 3);
    return finish(picked === q.answer, q.after ? `${given}, then ${q.answer}.` : `${q.answer}, then ${given}.`);
  }

  async function season(q: ClockQuestion): Promise<boolean> {
    board.replaceChildren(el('div', { class: 'mc-month', text: MONTHS[q.index] }));
    ask.textContent = `The match is in ${MONTHS[q.index]}. Which season is it in Australia?`;
    say(ask.textContent);
    const picked = await kit.choices.askWords(q.options);
    kit.choices.revealWord(q.answer, picked);
    const months = MONTHS.filter((_, i) => seasonOf(i) === q.answer);
    /* summer runs over new year: December, January, February */
    const run = q.answer === 'Summer' ? ['December', 'January', 'February'] : months;
    board.append(el('div', { class: 'mc-season', text: `${SEASON_LOOK[q.answer]} ${q.answer}: ${run.join(', ')}` }));
    return finish(picked === q.answer, `${MONTHS[q.index]} is in ${q.answer}. ${q.answer} is ${run.join(', ')}.`);
  }

  return {
    node,
    ask: async (step: ClockStep): Promise<boolean> => {
      const q = clockQuestion(step, last);
      last = q;
      pad.replaceChildren();
      board.dataset.answer = q.answer;
      board.dataset.minutes = String((q.h % 12) * 60 + q.m);
      if (step.task === 'read') return read(q);
      if (step.task === 'set') return set(step, q);
      if (step.task === 'seasons') return season(q);
      return order(step, q);
    },
  };
}
