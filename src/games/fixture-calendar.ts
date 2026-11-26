/* Fixture Calendar — the week, the year and the calendar on the clubhouse
 * wall (src/content/calendar.ts).
 *
 * The first steps are words: what day comes after Tuesday, what month
 * before March, what season July is in, how many days April has. Then a
 * real month's calendar, this year's: what day the match is, tap the second
 * Saturday, count the days from today to the match. The last step counts
 * weeks into days and months to the grand final. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import {
  CALENDAR_STEPS, DAYS, MONTHS, SEASON_NAME, calendarQuestion, daysIn, weekday,
  type CalendarQuestion, type CalendarStep, type Season,
} from '../content/calendar';
import { mountMaths, type Kit } from './maths-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<CalendarStep>({
    id: 'fixture-calendar',
    title: 'Fixture',
    swash: 'Calendar',
    tagline: 'Days, months, seasons, and how long until the match.',
    steps: CALENDAR_STEPS,
    face: '📅',
    cheer: 'Good calendar reading!',
    build,
  }, root);
}

/** a month's calendar, Monday first, with today and the match marked */
function monthGrid(c: NonNullable<CalendarQuestion['calendar']>): HTMLElement {
  const first = weekday(c.year, c.month, 1);
  const days = daysIn(c.month, c.year);
  const cells: HTMLElement[] = DAYS.map((d) => el('span', { class: 'fc-head', text: d.slice(0, 3), 'aria-hidden': 'true' }));
  for (let i = 0; i < first; i += 1) cells.push(el('span', { class: 'fc-blank', 'aria-hidden': 'true' }));
  for (let d = 1; d <= days; d += 1) {
    const b = el('button', {
      class: 'fc-date', type: 'button', disabled: 'disabled', dataset: { date: String(d) },
      'aria-label': `${DAYS[weekday(c.year, c.month, d)]} the ${d}`,
    }, el('span', { class: 'fc-n', text: String(d) }));
    if (d === c.today) { b.classList.add('today'); b.append(el('span', { class: 'fc-tag', text: 'Today' })); }
    if (d === c.match) { b.classList.add('match'); b.append(el('span', { class: 'fc-ball', text: '⚽', 'aria-hidden': 'true' })); }
    cells.push(b);
  }
  return el('div', { class: 'fc-calendar' },
    el('div', { class: 'fc-title', text: `${MONTHS[c.month]} ${c.year}` }),
    el('div', { class: 'fc-grid' }, ...cells));
}

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const board = el('div', { class: 'fc-board' });
  const node = el('div', { class: 'mx-stage fc-stage' }, ask, board);
  const year = new Date().getFullYear();
  let last = '';

  async function finish(ok: boolean, why: string): Promise<boolean> {
    const line = ok ? `Yes! ${why}` : why;
    if (ok) sfx.cheer(); else sfx.wrong();
    kit.note(line, ok);
    await kit.say(line, ok ? 2400 : 3600);
    return ok;
  }

  /** a question not the same as the one before */
  const fresh = (step: CalendarStep): CalendarQuestion => {
    for (let i = 0; i < 20; i += 1) {
      const q = calendarQuestion(step.task, year);
      if (q.ask !== last) { last = q.ask; return q; }
    }
    return calendarQuestion(step.task, year);
  };

  return {
    node,
    ask: async (step: CalendarStep): Promise<boolean> => {
      const q = fresh(step);
      node.dataset.task = step.task;
      node.dataset.answer = q.answer;
      board.replaceChildren(...(q.calendar ? [monthGrid(q.calendar)] : []));
      ask.textContent = q.ask;
      say(q.ask);
      if (!q.options.length) {
        /* tap the date on the calendar */
        const dates = [...board.querySelectorAll<HTMLButtonElement>('.fc-date')];
        for (const b of dates) b.disabled = false;
        const picked = await new Promise<string>((resolve) => {
          for (const b of dates) b.addEventListener('click', () => { sfx.tap(); resolve(b.dataset.date!); }, { once: true });
        });
        for (const b of dates) {
          b.disabled = true;
          b.classList.toggle('right', b.dataset.date === q.answer);
          b.classList.toggle('wrong', b.dataset.date === picked && picked !== q.answer);
        }
        return finish(picked === q.answer, q.why);
      }
      const label = step.task === 'seasons' ? (s: string) => SEASON_NAME[s as Season] : undefined;
      const picked = await kit.choices.askWords(q.options, label);
      kit.choices.revealWord(q.answer, picked);
      return finish(picked === q.answer, q.why);
    },
  };
}
