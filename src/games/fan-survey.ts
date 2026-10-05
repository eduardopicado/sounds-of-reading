/* Fan Survey — counting votes, tallies, picture graphs and column graphs.
 *
 * The fans vote for their team, and he reads the results. Kindergarten
 * sorts and counts (how many are waving Brazil's flag?); Year 1 reads tally
 * marks in fives and a picture graph (which team got the most?); Year 2 reads
 * a column graph against its scale and compares two columns (how many more
 * voted for Brazil than for Portugal?).
 *
 * The teams are countries with their flags, so every picture says which
 * team it is without a crest. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { shuffle } from '../lib/random';
import { SURVEY_STEPS, choices, surveyQuestion, type SurveyQuestion, type SurveyStep } from '../content/maths';
import { mountMaths, type Kit } from './maths-kit';
import { TEAMS, strong, type Team } from './teams';
import { svg } from '../ui/writing';

export function mount(root: HTMLElement): () => void {
  return mountMaths<SurveyStep>({
    id: 'fan-survey',
    title: 'Fan',
    swash: 'Survey',
    tagline: 'The fans have voted. Count them, and read the graph.',
    steps: SURVEY_STEPS,
    face: '📊',
    build,
  }, root);
}

const COUNTRIES = (): Team[] => TEAMS.filter((t) => t.kind === 'country' && t.flag);


/** tally marks: a gate of five, then the rest */
function tally(n: number): SVGSVGElement {
  const gates = Math.floor(n / 5);
  const rest = n % 5;
  const width = gates * 70 + rest * 14 + 10;
  const marks = svg('svg', { class: 'fs-tally', viewBox: `0 0 ${Math.max(width, 20)} 50`, 'aria-hidden': 'true' });
  let x = 8;
  for (let g = 0; g < gates; g += 1) {
    for (let i = 0; i < 4; i += 1) marks.append(svg('line', { x1: x + i * 12, y1: 6, x2: x + i * 12, y2: 44 }));
    marks.append(svg('line', { x1: x - 6, y1: 38, x2: x + 42, y2: 12 }));
    x += 70;
  }
  for (let i = 0; i < rest; i += 1) marks.append(svg('line', { x1: x + i * 14, y1: 6, x2: x + i * 14, y2: 44 }));
  marks.style.width = `${Math.max(width, 20) * 0.9}px`;
  return marks;
}

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const board = el('div', { class: 'fs-board' });
  const node = el('div', { class: 'mx-stage' }, ask, board);
  let last: SurveyQuestion | undefined;

  const label = (t: Team): string => `${t.flag} ${t.name}`;

  /** a crowd of fans, each waving a flag, in no order */
  function crowd(q: SurveyQuestion, teams: Team[]): void {
    const fans = shuffle(q.votes.flatMap((v, i) => Array.from({ length: v }, () => teams[i])));
    board.replaceChildren(el('div', { class: 'fs-crowd' }, ...fans.map((t) =>
      el('span', { class: 'fs-fan', text: t.flag ?? '', 'aria-hidden': 'true', dataset: { team: t.id } }))));
  }

  function tallies(q: SurveyQuestion, teams: Team[]): void {
    board.replaceChildren(el('div', { class: 'fs-table' }, ...teams.map((t, i) =>
      el('div', { class: 'fs-row' }, el('span', { class: 'fs-team', text: label(t) }), tally(q.votes[i])))));
  }

  function pictures(q: SurveyQuestion, teams: Team[]): void {
    board.replaceChildren(el('div', { class: 'fs-table' }, ...teams.map((t, i) =>
      el('div', { class: 'fs-row' }, el('span', { class: 'fs-team', text: label(t) }),
        el('span', { class: 'fs-pics' }, ...Array.from({ length: q.votes[i] }, () => {
          const f = el('span', { class: 'fs-pic', 'aria-hidden': 'true' });
          f.style.background = strong(t);
          return f;
        }))))),
    el('p', { class: 'fs-key', text: 'Each ● is one fan' }));
  }

  /** a column graph with a scale up the side, a column for each team */
  function columns(q: SurveyQuestion, teams: Team[], top: number): void {
    const W = 120 * teams.length + 70;
    const H = 330;
    const base = 280;
    const unit = 250 / top;
    const g = svg('svg', { class: 'fs-graph', viewBox: `0 0 ${W} ${H}`, role: 'img' });
    for (let v = 0; v <= top; v += 1) {
      const y = base - v * unit;
      g.append(svg('line', { x1: 50, x2: W - 10, y1: y, y2: y, class: v ? 'fs-grid' : 'fs-axis' }));
      const t = svg('text', { x: 38, y: y + 8, class: 'fs-scale' });
      t.textContent = String(v);
      g.append(t);
    }
    teams.forEach((team, i) => {
      const x = 70 + i * 120;
      g.append(svg('rect', { x, y: base - q.votes[i] * unit, width: 80, height: q.votes[i] * unit, class: 'fs-bar', fill: strong(team) }));
      const flag = svg('text', { x: x + 40, y: base + 40, class: 'fs-flag' });
      flag.textContent = team.flag ?? '';
      g.append(flag);
    });
    g.setAttribute('aria-label', teams.map((t, i) => `${t.name} ${q.votes[i]}`).join(', '));
    board.replaceChildren(g, el('div', { class: 'fs-legend' }, ...teams.map((t) => el('span', { text: label(t) }))));
  }

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

  return {
    node,
    ask: async (step: SurveyStep): Promise<boolean> => {
      const q = surveyQuestion(step, last);
      last = q;
      const teams = shuffle(COUNTRIES()).slice(0, step.teams);
      const team = teams[q.team];
      board.dataset.answer = step.task === 'most' ? label(teams[q.answer]) : String(q.answer);

      if (step.task === 'most') {
        pictures(q, teams);
        ask.textContent = 'Which team got the most votes?';
        say(ask.textContent);
        const options = teams.map(label);
        const picked = await kit.choices.askWords(options);
        const answer = label(teams[q.answer]);
        kit.choices.revealWord(answer, picked);
        return finish(picked === answer, `${teams[q.answer].name} got the most: ${q.votes[q.answer]} votes.`);
      }

      if (step.task === 'count') crowd(q, teams);
      else if (step.task === 'tally') tallies(q, teams);
      else columns(q, teams, step.max);

      ask.textContent = step.task === 'more'
        ? `How many more fans voted for ${team.name} than for ${teams[q.other].name}?`
        : step.task === 'count' ? `How many fans are waving the flag of ${team.name}?` : `How many fans voted for ${team.name}?`;
      say(ask.textContent);
      /* every team got a vote, and "how many more" is never none */
      const picked = await kit.choices.ask(choices(q.answer, 1, step.max));
      kit.choices.reveal(q.answer, picked);
      if (step.task === 'count') {
        /* light up his team's fans, to count again */
        board.querySelectorAll<HTMLElement>(`.fs-fan[data-team="${team.id}"]`).forEach((f) => f.classList.add('lit'));
      }
      const how = step.task === 'more'
        ? `${team.name} got ${q.votes[q.team]} and ${teams[q.other].name} got ${q.votes[q.other]}. That's ${q.answer} more.`
        : step.task === 'tally' ? `${q.answer} for ${team.name}: count the gate of five, then the rest.`
          : `${q.answer} for ${team.name}.`;
      return finish(picked === q.answer, how);
    },
  };
}
