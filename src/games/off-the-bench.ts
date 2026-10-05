/* Off the Bench — how many more players to make the team?
 *
 * Seven are on the pitch and the team needs ten. How many come off the
 * bench? That is the part–whole idea at the heart of the Kindergarten and
 * Year 1 syllabus: 7 and 3 make 10. Knowing the pairs that make 10 by heart
 * is what later lets him add 8 + 5 by going through 10.
 *
 * The players stand in rows of five, the way a ten frame is drawn at school,
 * so "7" looks like a full row and two more. The gaps are drawn as empty
 * circles to begin with; a later step takes them away, so he has to see the
 * missing ones in his head. A wrong answer counts the gaps out loud. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { BENCH_STEPS, benchQuestion, choices, type BenchQuestion, type BenchStep } from '../content/maths';
import { mountMaths, type Kit } from './maths-kit';
import { player } from './teams';

export function mount(root: HTMLElement): () => void {
  return mountMaths<BenchStep>({
    id: 'off-the-bench',
    title: 'Off the',
    swash: 'Bench',
    tagline: 'How many more players to make the team?',
    steps: BENCH_STEPS,
    face: '🧤',
    football: true,
    build,
  }, root);
}

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const pitch = el('div', { class: 'mx-pitch', role: 'img' });
  const node = el('div', { class: 'mx-stage' }, ask, pitch);
  let last: BenchQuestion | undefined;

  function draw(q: BenchQuestion, step: BenchStep): HTMLElement[] {
    pitch.replaceChildren();
    pitch.style.setProperty('--cols', '5');
    /* twenty is two ten frames, with a gap between them */
    pitch.classList.toggle('twenty', q.target === 20);
    pitch.setAttribute('aria-label', `${q.on} players on the pitch`);
    const spots: HTMLElement[] = [];
    for (let i = 0; i < q.target; i += 1) {
      const spot = el('div', { class: 'mx-spot' });
      if (i < q.on) spot.append(player(kit.us(), 44, 'kicker'));
      else spot.classList.add(step.spots ? 'gap' : 'hidden-gap');
      pitch.append(spot);
      spots.push(spot);
    }
    return spots;
  }

  return {
    node,
    ask: async (step: BenchStep): Promise<boolean> => {
      const q = benchQuestion(step, last);
      last = q;
      const spots = draw(q, step);
      const text = `${q.on} ${q.on === 1 ? 'player is' : 'players are'} on. How many more to make ${q.target}?`;
      ask.textContent = text;
      say(text);
      const picked = await kit.choices.ask(choices(q.need, 0, q.target));
      kit.choices.reveal(q.need, picked);
      const gaps = spots.slice(q.on);
      if (picked === q.need) {
        /* on they run */
        sfx.whistle();
        for (const g of gaps) { g.classList.remove('gap', 'hidden-gap'); g.classList.add('arrived'); g.append(player(kit.us(), 44, 'kicker')); }
        kit.note(`Yes! ${q.on} and ${q.need} make ${q.target}.`, true);
        say(`Yes! ${q.on} and ${q.need} make ${q.target}.`);
        await kit.wait(1700);
        return true;
      }
      /* count the gaps with him, one by one */
      sfx.wrong();
      kit.note(`Let's count the gaps.`);
      for (const [i, g] of gaps.entries()) {
        g.classList.remove('hidden-gap');
        g.classList.add('gap', 'counted');
        g.textContent = String(i + 1);
      }
      say(`Let's count the gaps. ${gaps.map((_, i) => i + 1).join(', ')}. ${q.on} and ${q.need} make ${q.target}.`);
      kit.note(`${q.on} and ${q.need} make ${q.target}.`);
      await kit.wait(3200);
      return false;
    },
  };
}
