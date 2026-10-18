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
 * the same way: 38 and 20 is 58, and 5 more is 63.
 *
 * Years 3 and 4 count the crowd at the ground instead, to 1000 and then
 * 10 000: fans coming through the gates, and fans going home at half-time.
 * At first the fans come in crates of a hundred, racks of ten and loose
 * ones; then it is in his head. A wrong answer splits the second number into
 * hundreds, tens and ones, and the wrong choices are the slips made with
 * big numbers: forgetting to carry, taking the smaller digit from the
 * bigger, a ten or a hundred out. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { SUM_STEPS, bigSumChoices, choices, crosses, lineText, sumQuestion, sumWhy, type SumQuestion, type SumStep } from '../content/maths';
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

  /** a number as racks of ten and loose ones, and crates of a hundred when
      `crates`; the last `cross` of each are offside */
  function bundle(n: number, cls = '', cross = 0, crates = false): HTMLElement {
    const g = el('span', { class: crates ? 'mx-group big' : 'mx-group' });
    const hundreds = crates ? Math.floor(n / 100) : 0;
    const tens = Math.floor((n - hundreds * 100) / 10);
    const ones = n % 10;
    for (let i = 0; i < hundreds; i += 1) {
      g.append(el('span', { class: `mx-hundred ${cls}${i >= hundreds - Math.floor(cross / 100) ? ' offside' : ''}`, text: '100', 'aria-hidden': 'true' }));
    }
    if (crates) cross %= 100;
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

  /** the balls on the board: all, only the added ones, tens and ones,
      hundreds too, or none */
  function drawBalls(q: SumQuestion, show: SumStep['show']): void {
    balls.replaceChildren();
    if (show === 'none') { balls.setAttribute('aria-label', 'no balls shown'); return; }
    if (show === 'bundles' || show === 'blocks') {
      const crates = show === 'blocks';
      if (q.op === '+') balls.append(bundle(q.a, '', 0, crates), el('span', { class: 'mx-plus', text: '+' }), bundle(q.b, 'new', 0, crates));
      /* take them away from the first number, where it has enough in each
         place; past a ten or a hundred, show what is left and what went */
      else if (!crosses(q.a, q.b, '-')) balls.append(bundle(q.a, '', q.b, crates));
      else balls.append(bundle(q.answer, '', 0, crates), bundle(q.b, '', q.b, crates));
      balls.setAttribute('aria-label', `${q.a} ${q.op === '+' ? 'and' : 'take away'} ${q.b}, in ${crates ? 'hundreds, ' : ''}tens and ones`);
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
      const [a, b, answer] = [q.a, q.b, q.answer].map((v) => lineText(v));
      sum.textContent = `${a} ${q.op === '+' ? '+' : '−'} ${b} = ?`;
      const season = step.max > 20;
      const crowd = step.max >= 1000;
      const fans = us.kind === 'you' ? 'fans' : `${us.name} fans`;
      const text = crowd
        ? q.op === '+'
          ? `${a} ${fans} are at the ground. ${b} more come through the gates! How many fans now?`
          : `${a} ${fans} came to the game. ${b} went home at half-time. How many are still there?`
        : season
        ? q.op === '+'
          ? `${name} have scored ${q.a} goals this season. They score ${q.b} more! How many goals now?`
          : `${name} scored ${q.a} goals this season, but ${q.b} were ruled out! How many goals count?`
        : q.op === '+'
          ? `${name} ${q.a === 1 ? 'has 1 goal' : `have ${q.a} goals`}. They score ${q.b} more! How many goals now?`
          : `${name} scored ${q.a}, but ${q.b} ${q.b === 1 ? 'was' : 'were'} offside! How many goals count?`;
      story.textContent = text;
      say(text);

      const picked = await kit.choices.ask(step.big ? bigSumChoices(q, step.max) : choices(q.answer, 0, step.max));
      kit.choices.reveal(q.answer, picked);
      sum.textContent = `${a} ${q.op === '+' ? '+' : '−'} ${b} = ${answer}`;
      const sentence = q.op === '+' ? `${a} and ${b} make ${answer}.` : `${a} take away ${b} is ${answer}.`;
      /* to 100 and beyond, the way to get there: the second number a place at a time */
      const split = season ? sumWhy(q) : sentence;
      if (picked === q.answer) {
        sfx.cheer();
        kit.note(`Yes! ${sentence}`, true);
        /* his goal, called by the commentator, then the sum said */
        narrate('goal', us, () => say(sentence), kit.life.later);
        await kit.wait(3200);
        return true;
      }
      sfx.wrong();
      /* every ball back on the board, to count together; to 10 000 there are too many */
      drawBalls(q, step.max === 10000 ? 'none' : crowd ? 'blocks' : season ? 'bundles' : 'all');
      kit.note(split);
      say(season ? split : `Let's count. ${sentence}`);
      await kit.wait(3200);
      return false;
    },
  };
}
