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
 * every ball back and counts them with him. */

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

  /** the balls on the board: all, only the added ones, or none */
  function drawBalls(q: SumQuestion, show: SumStep['show']): void {
    balls.replaceChildren();
    if (show === 'none') { balls.setAttribute('aria-label', 'no balls shown'); return; }
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
      const text = q.op === '+'
        ? `${name} ${q.a === 1 ? 'has 1 goal' : `have ${q.a} goals`}. They score ${q.b} more! How many goals now?`
        : `${name} scored ${q.a}, but ${q.b} ${q.b === 1 ? 'was' : 'were'} offside! How many goals count?`;
      story.textContent = text;
      say(text);

      const picked = await kit.choices.ask(choices(q.answer, 0, step.max));
      kit.choices.reveal(q.answer, picked);
      sum.textContent = `${q.a} ${q.op === '+' ? '+' : '−'} ${q.b} = ${q.answer}`;
      const sentence = q.op === '+' ? `${q.a} and ${q.b} make ${q.answer}.` : `${q.a} take away ${q.b} is ${q.answer}.`;
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
      drawBalls(q, 'all');
      kit.note(sentence);
      say(`Let's count. ${sentence}`);
      await kit.wait(3200);
      return false;
    },
  };
}
