/* Fact Family Formation — adding and taking away undo each other.
 *
 * Three players line up in a formation: the whole team at the front, its
 * two parts behind. 3, 5 and 8 are one family, and every fact in it uses the
 * same three numbers: 3 + 5 = 8, 5 + 3 = 8, 8 − 5 = 3, 8 − 3 = 5. Knowing one
 * fact gives him the other three, which is how the Year 1 and 2 syllabus
 * wants adding and taking away learnt: related, not separately.
 *
 * Year 1 turns a fact around and takes it back within 10, then any fact of
 * a family to 20. Year 2 finds a number missing from the middle of a fact
 * (? + 7 = 15), and does the same with families of tens to 100. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { FACT_STEPS, choices, factQuestion, factText, type FactQuestion, type FactStep } from '../content/maths';
import { mountMaths, type Kit } from './maths-kit';
import { kit as shirt } from './teams';

export function mount(root: HTMLElement): () => void {
  return mountMaths<FactStep>({
    id: 'fact-family',
    title: 'Fact Family',
    swash: 'Formation',
    tagline: 'Three numbers, one family. Know one fact, and you know them all.',
    steps: FACT_STEPS,
    face: '👨‍👩‍👦',
    build,
  }, root);
}

/** a fact read aloud: "8 take away 5 equals what?" */
const spoken = (text: string): string =>
  text.replace('−', 'take away').replace('+', 'plus').replace('=', 'equals').replace('?', 'what');

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const formation = el('div', { class: 'ff-formation', role: 'img' });
  const known = el('p', { class: 'ff-known' });
  const asked = el('p', { class: 'mx-sum' });
  const node = el('div', { class: 'mx-stage' }, ask, formation, known, asked);
  let last: FactQuestion | undefined;

  function player(n: number | '?', whole: boolean): HTMLElement {
    return el('div', { class: whole ? 'ff-player whole' : 'ff-player' },
      shirt(kit.us(), whole ? 96 : 80), el('span', { class: 'ff-number', text: String(n) }));
  }

  return {
    node,
    ask: async (step: FactStep): Promise<boolean> => {
      const q = factQuestion(step, last);
      last = q;
      /* in "missing" the formation shows the family with the missing part
         blank; otherwise it shows the whole family */
      const hidden = q.known ? undefined : q.answer;
      const show = (n: number): number | '?' => (n === hidden ? '?' : n);
      formation.replaceChildren(
        player(show(q.whole), true),
        el('div', { class: 'ff-parts' }, player(show(q.a), false), player(show(q.b), false)));
      formation.setAttribute('aria-label', `A family: ${q.a} and ${q.b} make ${q.whole}`);
      formation.dataset.answer = String(q.answer);
      known.textContent = q.known ? `${factText(q.known)}, so…` : '';
      asked.textContent = factText(q.asked, q.gap);
      ask.textContent = q.known ? 'Finish the fact from the same family.' : 'What number is missing?';
      say(q.known ? `${spoken(factText(q.known))}. So ${spoken(factText(q.asked, q.gap))}?` : `${spoken(factText(q.asked, q.gap))}?`);

      const unit = step.tens ? 10 : 1;
      const picked = await kit.choices.ask(choices(q.answer, unit, step.max, 4, unit));
      kit.choices.reveal(q.answer, picked);
      asked.textContent = factText(q.asked);
      formation.querySelectorAll('.ff-number').forEach((n, i) => { n.textContent = String([q.whole, q.a, q.b][i]); });
      const how = `${q.a} and ${q.b} make ${q.whole}, so ${factText(q.asked)}.`;
      if (picked === q.answer) {
        sfx.cheer();
        kit.note(`Yes! ${factText(q.asked)}`, true);
        say(`Yes! ${spoken(factText(q.asked)).replace('equals', 'is')}`);
        await kit.wait(2400);
        return true;
      }
      sfx.wrong();
      formation.classList.add('explain');
      kit.note(how);
      say(spoken(how).replace(/equals/g, 'is'));
      await kit.wait(3800);
      formation.classList.remove('explain');
      return false;
    },
  };
}
