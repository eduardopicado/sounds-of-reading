/* Scoreboard Sums — adding and taking away, told as a match.
 *
 * "Brazil have 3 goals. They score 2 more! How many now?" Adding is goals
 * scored; taking away is goals ruled out for offside. Each question is also
 * written as a sum (3 + 2 = ?), since Year 1 is where the symbols come in.
 *
 * The goals are drawn as balls at first, so he can count them all. The next
 * step shows only the goals being added, so he counts on from the first
 * number instead of starting again from one, which is the strategy the
 * syllabus asks for. The top steps show only the sum. A wrong answer brings
 * every ball back and counts them with him.
 *
 * Year 2 goes to 100 over a season of goals. The balls come in racks of ten
 * and loose ones, tens and ones, and a wrong answer splits the second number
 * the same way: 38 and 20 is 58, and 5 more is 63. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { SUM_STEPS, choices, sumQuestion, type SumQuestion, type SumStep } from '../content/maths';
import { mountMaths, type Kit } from './maths-kit';
import { narrate } from './narration';
import { kit as shirt } from './teams';

export function mount(root: HTMLElement): () => void {
  return mountMaths<SumStep>({
    id: 'scoreboard-sums',
    title: 'Scoreboard',
    swash: 'Sums',
    tagline: 'Goals in, goals ruled out. What is the score now?',
    steps: SUM_STEPS,
    face: '🏟️',
    football: true,
    build,
  }, root);
}

function build(kit: Kit) {
  const team = el('div', { class: 'mx-team' });
  const balls = el('div', { class: 'mx-balls', role: 'img' });
  const sum = el('p', { class: 'mx-sum' });
  const story = el('p', { class: 'mx-ask' });
  const node = el('div', { class: 'mx-stage' }, story, el('div', { class: 'mx-scoreboard' }, team, balls), sum);
  let last: SumQuestion | undefined;

  const ball = (cls = ''): HTMLElement => el('span', { class: `mx-ball ${cls}`, text: '⚽', 'aria-hidden': 'true' });

  /** a number as racks of ten and loose ones; the last `cross` of each are offside */
  function bundle(n: number, cls = '', cross = 0): HTMLElement {
    const g = el('span', { class: 'mx-group' });
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    for (let i = 0; i < tens; i += 1) {
      const rack = el('span', { class: `mx-ten ${cls}`, 'aria-hidden': 'true' });
      for (let j = 0; j < 10; j += 1) rack.append(el('i', {}));
      if (i >= tens - Math.floor(cross / 10)) rack.classList.add('offside');
      g.append(rack);
    }
    const loose = el('span', { class: 'mx-ones' });
    for (let i = 0; i < ones; i += 1) {
      loose.append(el('span', { class: `mx-one ${cls}${i >= ones - (cross % 10) ? ' offside' : ''}`, 'aria-hidden': 'true' }));
    }
    if (ones) g.append(loose);
    return g;
  }

  /** the balls on the board: all, only the added ones, tens and ones, or none */
  function drawBalls(q: SumQuestion, show: SumStep['show']): void {
    balls.replaceChildren();
    if (show === 'none') { balls.setAttribute('aria-label', 'no balls shown'); return; }
    if (show === 'bundles') {
      if (q.op === '+') balls.append(bundle(q.a), el('span', { class: 'mx-plus', text: '+' }), bundle(q.b, 'new'));
      /* take the tens and ones away from the first number, where it has
         enough ones; past a ten, show what is left and what went */
      else if (q.a % 10 >= q.b % 10) balls.append(bundle(q.a, '', q.b));
      else balls.append(bundle(q.answer), bundle(q.b, '', q.b));
      balls.setAttribute('aria-label', `${q.a} ${q.op === '+' ? 'and' : 'take away'} ${q.b}, in tens and ones`);
      return;
    }
    if (q.op === '+') {
      if (show === 'all') for (let i = 0; i < q.a; i += 1) balls.append(ball());
      else balls.append(el('span', { class: 'mx-big', text: String(q.a) }));
      balls.append(el('span', { class: 'mx-plus', text: '+' }));
      for (let i = 0; i < q.b; i += 1) balls.append(ball('new'));
    } else {
      for (let i = 0; i < q.a; i += 1) balls.append(ball(i >= q.a - q.b ? 'offside' : ''));
    }
    balls.setAttribute('aria-label', `${q.a} ${q.op === '+' ? 'and' : 'take away'} ${q.b}`);
  }

  return {
    node,
    ask: async (step: SumStep): Promise<boolean> => {
      const q = sumQuestion(step, last);
      last = q;
      const us = kit.us();
      const name = us.kind === 'you' ? 'Your team' : us.name;
      team.replaceChildren(shirt(us, 40), el('span', { text: name }));
      drawBalls(q, step.show);
      sum.textContent = `${q.a} ${q.op === '+' ? '+' : '−'} ${q.b} = ?`;
      const season = step.max > 20;
      const text = season
        ? q.op === '+'
          ? `${name} have scored ${q.a} goals this season. They score ${q.b} more! How many goals now?`
          : `${name} scored ${q.a} goals this season, but ${q.b} were ruled out! How many goals count?`
        : q.op === '+'
          ? `${name} ${q.a === 1 ? 'has 1 goal' : `have ${q.a} goals`}. They score ${q.b} more! How many goals now?`
          : `${name} scored ${q.a}, but ${q.b} ${q.b === 1 ? 'was' : 'were'} offside! How many goals count?`;
      story.textContent = text;
      say(text);

      const picked = await kit.choices.ask(choices(q.answer, 0, step.max));
      kit.choices.reveal(q.answer, picked);
      sum.textContent = `${q.a} ${q.op === '+' ? '+' : '−'} ${q.b} = ${q.answer}`;
      const sentence = q.op === '+' ? `${q.a} and ${q.b} make ${q.answer}.` : `${q.a} take away ${q.b} is ${q.answer}.`;
      /* to 100, the way to get there: the tens of the second number, then its ones */
      const tens = q.b - (q.b % 10);
      const ones = q.b % 10;
      const split = !season || !tens || !ones ? sentence
        : q.op === '+'
          ? `${q.a} and ${tens} is ${q.a + tens}, and ${ones} more is ${q.answer}.`
          : `${q.a} take away ${tens} is ${q.a - tens}, take away ${ones} more is ${q.answer}.`;
      if (picked === q.answer) {
        sfx.cheer();
        kit.note(`Yes! ${sentence}`, true);
        /* his goal, called by the commentator, then the sum said */
        narrate('goal', us, () => say(sentence), kit.life.later);
        await kit.wait(3200);
        return true;
      }
      sfx.wrong();
      /* every ball back on the board, to count together */
      drawBalls(q, season ? 'bundles' : 'all');
      kit.note(split);
      say(season ? split : `Let's count. ${sentence}`);
      await kit.wait(3200);
      return false;
    },
  };
}
