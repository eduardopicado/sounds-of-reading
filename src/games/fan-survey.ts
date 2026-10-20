/* Fan Survey — counting votes, tallies, picture graphs and column graphs.
 *
 * The fans vote for their team, and he reads the results. Kindergarten
 * sorts and counts (how many are waving Brazil's flag?); Year 1 reads tally
 * marks in fives and a picture graph (which team got the most?); Year 2 reads
 * a column graph against its scale and compares two columns (how many more
 * voted for Brazil than for Portugal?).
 *
 * Years 3 and 4 read picture graphs where each picture is 2, 5 or 10 fans,
 * a column graph numbered every 10 with a line every 5 (so 35 is the line
 * with no number between 30 and 40), tallies turned into a table, and the
 * total of a table. The wrong choices are the slips made reading them:
 * counting the pictures and not the fans, a gate of five counted as one.
 *
 * The teams are countries with their flags, so every picture says which
 * team it is without a crest. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { shuffle } from '../lib/random';
import { SURVEY_STEPS, choices, countIn, surveyChoices, surveyQuestion, type SurveyQuestion, type SurveyStep } from '../content/maths';
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
  /* its width comes from its shape: Safari will not work it out from the height alone */
  marks.style.setProperty('--aspect', String(Math.max(width, 20) / 50));
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

  /** a picture graph: a ● for each fan, or for every `key` fans */
  function pictures(q: SurveyQuestion, teams: Team[], key = 1): void {
    board.replaceChildren(el('div', { class: 'fs-table' }, ...teams.map((t, i) =>
      el('div', { class: 'fs-row' }, el('span', { class: 'fs-team', text: label(t) }),
        el('span', { class: 'fs-pics' }, ...Array.from({ length: q.votes[i] / key }, () => {
          const f = el('span', { class: 'fs-pic', 'aria-hidden': 'true' });
          f.style.background = strong(t);
          return f;
        }))))),
    el('p', { class: `fs-key${key > 1 ? ' big' : ''}`, text: key === 1 ? 'Each ● is one fan' : `Each ● is ${key} fans` }));
  }

  /** a column graph with a scale up the side, a column for each team: a
      line every `every`, numbered every `numbered` */
  function columns(q: SurveyQuestion, teams: Team[], top: number, every = 1, numbered = 1): void {
    const W = 120 * teams.length + 70;
    const H = 330;
    const base = 280;
    const unit = 250 / top;
    const g = svg('svg', { class: 'fs-graph', viewBox: `0 0 ${W} ${H}`, role: 'img' });
    for (let v = 0; v <= top; v += every) {
      const y = base - v * unit;
      g.append(svg('line', { x1: 50, x2: W - 10, y1: y, y2: y, class: v ? 'fs-grid' : 'fs-axis' }));
      if (v % numbered) continue;
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

  /** a table: each team's tally and its number, one to fill in; or the
      numbers alone, with the total to find */
  function table(q: SurveyQuestion, teams: Team[], withTally: boolean): void {
    const cell = (text: string, cls = ''): HTMLElement => el('td', { class: cls, text });
    const head = el('tr', {}, el('th', { text: 'Team' }), ...(withTally ? [el('th', { text: 'Tally' })] : []), el('th', { text: 'Number' }));
    const rows = teams.map((t, i) => el('tr', {}, cell(label(t), 'fs-team'),
      ...(withTally ? [el('td', {}, tally(q.votes[i]))] : []),
      cell(withTally && i === q.team ? '?' : String(q.votes[i]), withTally && i === q.team ? 'fs-gap' : 'fs-n')));
    const total = withTally ? [] : [el('tr', { class: 'fs-total' }, cell('Total'), cell('?', 'fs-gap'))];
    board.replaceChildren(el('table', { class: 'fs-sheet' }, el('thead', {}, head), el('tbody', {}, ...rows, ...total)));
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
      else if (step.task === 'key') pictures(q, teams, step.key);
      else if (step.task === 'scale') columns(q, teams, step.max, step.key, 10);
      else if (step.task === 'table' || step.task === 'total') table(q, teams, step.task === 'table');
      else columns(q, teams, step.max);

      ask.textContent = step.task === 'more'
        ? `How many more fans voted for ${team.name} than for ${teams[q.other].name}?`
        : step.task === 'count' ? `How many fans are waving the flag of ${team.name}?`
          : step.task === 'table' ? `Fill in the table: how many fans voted for ${team.name}?`
            : step.task === 'total' ? 'How many fans voted altogether?'
              : `How many fans voted for ${team.name}?`;
      say(ask.textContent);
      /* every team got a vote, and "how many more" is never none */
      const big = ['key', 'scale', 'table', 'total'].includes(step.task);
      const picked = await kit.choices.ask(big ? surveyChoices(step, q) : choices(q.answer, 1, step.max));
      kit.choices.reveal(q.answer, picked);
      if (step.task === 'count') {
        /* light up his team's fans, to count again */
        board.querySelectorAll<HTMLElement>(`.fs-fan[data-team="${team.id}"]`).forEach((f) => f.classList.add('lit'));
      }
      const v = q.votes[q.team];
      const gates = Math.floor(v / 5);
      const how = step.task === 'more'
        ? `${team.name} got ${q.votes[q.team]} and ${teams[q.other].name} got ${q.votes[q.other]}. That's ${q.answer} more.`
        : step.task === 'tally' ? `${q.answer} for ${team.name}: count the gate of five, then the rest.`
          : step.task === 'key' ? `${team.name} has ${v / step.key!} ●, and each ● is ${step.key} fans: ${countIn(step.key!, v / step.key!)}. That's ${v} fans.`
            : step.task === 'scale' ? `The column for ${team.name} stops on the line halfway between ${v - 5} and ${v + 5}: that's ${v}.`
              : step.task === 'table' ? `Count the gates of five, then the rest: ${countIn(5, gates)}${v % 5 ? `, and ${v % 5} more makes ${v}` : ` makes ${v}`}.`
                : step.task === 'total' ? `${q.votes.join(' + ')} = ${q.answer}.`
                  : `${q.answer} for ${team.name}.`;
      if (step.task === 'table' || step.task === 'total') {
        /* the number goes in the table */
        const gap = board.querySelector('.fs-gap');
        if (gap) { gap.textContent = String(q.answer); gap.classList.add('filled'); }
      }
      return finish(picked === q.answer, how);
    },
  };
}
