/* Keepy-Uppy Count — counting on, back, and in steps.
 *
 * Every touch of the ball is a number: 2, 4, 6, 8. One touch has a gap, and
 * he says what goes in it to keep the ball up. Counting on and back in ones
 * from any number is Kindergarten; counting by 2s, 5s and 10s from 0 is Year
 * 1, the start of multiplying; Year 2 counts by 10s from any number (23, 33,
 * 43), the odd numbers, by 3s, and back in 10s and 5s.
 *
 * The numbers bounce in one at a time and are read out with the gap, so he
 * hears the rhythm before he answers. A wrong answer writes the step on every
 * jump: +2, +2, +2. */

import { el, prefersReducedMotion } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { SKIP_STEPS, skipChoices, skipQuestion, type SkipQuestion, type SkipStep } from '../content/maths';
import { mountMaths, type Kit } from './maths-kit';
import { player } from './teams';

export function mount(root: HTMLElement): () => void {
  return mountMaths<SkipStep>({
    id: 'keepy-uppy',
    title: 'Keepy-Uppy',
    swash: 'Count',
    tagline: 'Every touch is a number. What goes in the gap?',
    steps: SKIP_STEPS,
    face: '🦶',
    build,
  }, root);
}

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const touches = el('div', { class: 'ku-touches', role: 'img' });
  const juggler = el('div', { class: 'ku-juggler', 'aria-hidden': 'true' });
  const node = el('div', { class: 'mx-stage' }, ask, el('div', { class: 'ku-pitch' }, touches, juggler));
  let last: SkipQuestion | undefined;

  /** the gap, or the number, as said aloud */
  const spoken = (q: SkipQuestion, fill: boolean): string =>
    q.seq.map((n, i) => (i === q.gap && !fill ? 'what?' : String(n))).join(', ');

  function steps(q: SkipQuestion, step: SkipStep): void {
    const sign = step.dir === 1 ? '+' : '−';
    for (const hop of touches.querySelectorAll('.ku-hop')) hop.textContent = `${sign}${q.by}`;
    touches.classList.add('show-hops');
  }

  return {
    node,
    ask: async (step: SkipStep): Promise<boolean> => {
      const q = skipQuestion(step, last);
      last = q;
      juggler.replaceChildren(player(kit.us(), 70, 'kicker'));
      touches.replaceChildren();
      touches.classList.remove('show-hops');
      touches.dataset.answer = String(q.seq[q.gap]);
      ask.textContent = 'Keep it up!';
      const balls: HTMLElement[] = [];
      /* one bounce at a time; the gap is a ball with a question mark */
      const beat = prefersReducedMotion() ? 120 : 520;
      for (const [i, n] of q.seq.entries()) {
        if (i) touches.append(el('span', { class: 'ku-hop', 'aria-hidden': 'true' }));
        const ball = el('span', { class: `ku-ball${i === q.gap ? ' gap' : ''}`, text: i === q.gap ? '?' : String(n) });
        touches.append(ball);
        balls.push(ball);
        sfx.tap();
        await kit.wait(beat);
      }
      touches.setAttribute('aria-label', spoken(q, false));
      ask.textContent = 'What number goes in the gap?';
      say(`${spoken(q, false)} What number goes in the gap?`);

      const answer = q.seq[q.gap];
      const picked = await kit.choices.ask(skipChoices(q));
      kit.choices.reveal(answer, picked);
      balls[q.gap].textContent = String(answer);
      balls[q.gap].classList.remove('gap');
      balls[q.gap].classList.add(picked === answer ? 'right' : 'filled');
      const how = step.by.length === 1 && step.by[0] === 1
        ? `${step.dir === 1 ? 'Counting on' : 'Counting back'}: ${spoken(q, true)}.`
        : `${step.dir === 1 ? 'Up' : 'Back'} in ${q.by}s: ${spoken(q, true)}.`;
      if (picked === answer) {
        sfx.cheer();
        juggler.classList.add('trick');
        kit.note(`Keepy-uppy! ${answer}!`, true);
        say(`Yes! ${spoken(q, true)}`);
        await kit.wait(2400);
        juggler.classList.remove('trick');
        return true;
      }
      sfx.wrong();
      steps(q, step);
      kit.note(how);
      say(how);
      await kit.wait(3600);
      return false;
    },
  };
}
