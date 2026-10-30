/* Foosball Line-Up — counting the players on a real table's rods.
 *
 * A real foosball table, seen from above: eight rods across it, his team's
 * and the other side's in between each other, and on his side a goalie, a
 * defence of 2, a midfield of 5 and an attack of 3. That is 11, like a
 * real team.
 *
 * He counts the players on a rod, then two rods together (counting on from
 * the bigger one), then finds how many of his 11 are hiding under a towel
 * (what is left to make 11). Year 2 counts the club's spare rods, equal
 * groups of 2, 3 or 5; Years 3–4 count a tournament, two teams to a table
 * and so many tables.
 *
 * After every answer the working out is said and shown: the players
 * numbered, the towel lifted, the spare rods counted in steps. The
 * questions and the sentences are in src/content/maths.ts. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import {
  LINEUP_STEPS, LINEUP_TABLE, lineupAsk, lineupChoices, lineupQuestion, lineupWhy,
  type LineupKind, type LineupQuestion, type LineupStep,
} from '../content/maths';
import { mountMaths, type Kit } from './maths-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<LineupStep>({
    id: 'foosball-line-up',
    title: 'Foosball',
    swash: 'Line-Up',
    tagline: 'A goalie, 2, 5 and 3. How many players?',
    steps: LINEUP_STEPS,
    face: '🎛️',
    football: true,
    build,
  }, root);
}

const PLAYERS: Record<LineupKind, number> = { goalie: 1, defence: 2, midfield: 5, attack: 3 };

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const field = el('div', { class: 'lu-field', role: 'img' });
  const node = el('div', { class: 'mx-stage' }, ask, field);
  let last: LineupQuestion | undefined;

  /** a rod: its bar across the table and its players, in their side's shirts */
  function rod(kind: LineupKind, shirt: string, cls: string): HTMLElement {
    const men = Array.from({ length: PLAYERS[kind] }, () =>
      el('span', { class: 'lu-man', 'aria-hidden': 'true', vars: { '--shirt': shirt } }));
    return el('div', { class: `lu-rod ${cls}`, dataset: { kind } },
      el('span', { class: 'lu-bar', 'aria-hidden': 'true' }), el('span', { class: 'lu-men' }, ...men));
  }

  /** the whole table, his goal on the left: the rods that glow, and the one under a towel */
  function table(q: LineupQuestion): HTMLElement[] {
    const us = kit.us().colours[0];
    const them = kit.rival().colours[0];
    const rods = LINEUP_TABLE.map((r, i) => {
      const g = rod(r.kind, r.ours ? us : them, r.ours ? 'ours' : 'theirs');
      g.classList.toggle('lit', q.lit.includes(i));
      if (q.hidden === i) {
        g.classList.add('hidden');
        g.append(el('span', { class: 'lu-towel', 'aria-hidden': 'true', text: '?' }));
      }
      return g;
    });
    field.replaceChildren(el('div', { class: 'lu-table' },
      el('span', { class: 'lu-goal', 'aria-hidden': 'true' }), ...rods, el('span', { class: 'lu-goal', 'aria-hidden': 'true' })));
    return rods;
  }

  /** the club's spare rods, all of one kind, side by side */
  function rack(q: LineupQuestion): HTMLElement[] {
    const rods = Array.from({ length: q.rods! }, () => rod(q.kind as LineupKind, kit.us().colours[0], 'ours spare'));
    rods.forEach((r) => r.append(el('span', { class: 'lu-count' })));
    field.replaceChildren(el('div', { class: 'lu-rack' }, ...rods));
    return rods;
  }

  /** the players on these rods numbered, one by one, carrying on from rod to rod */
  const number = (...these: HTMLElement[]): void => {
    let n = 0;
    for (const r of these) r.querySelectorAll('.lu-man').forEach((m) => { n += 1; m.textContent = String(n); });
  };
  const size = (r: HTMLElement): number => r.querySelectorAll('.lu-man').length;

  return {
    node,
    ask: async (step: LineupStep): Promise<boolean> => {
      const q = lineupQuestion(step, last);
      last = q;
      field.classList.remove('counting');
      field.dataset.answer = String(q.answer);
      let rods: HTMLElement[] = [];
      if (q.task === 'spares') rods = rack(q);
      else {
        rods = table(q);
        if (q.task === 'tournament') {
          field.append(el('div', { class: 'lu-tables', 'aria-hidden': 'true' },
            ...Array.from({ length: q.tables! }, (_, i) => el('span', { class: 'lu-chip', text: `Table ${i + 1}` }))));
        }
      }
      const text = lineupAsk(q);
      field.setAttribute('aria-label', text);
      ask.textContent = text;
      say(text);

      const picked = await kit.choices.ask(lineupChoices(q));
      kit.choices.reveal(q.answer, picked);
      const ok = picked === q.answer;

      /* the working out, on the table */
      /* two rods: counted on from the bigger one, as the sentence says; a
         tournament: one table's players counted */
      if (q.task === 'rod' || q.task === 'tournament') number(...q.lit.map((i) => rods[i]));
      if (q.task === 'two') number(...q.lit.map((i) => rods[i]).sort((a, b) => size(b) - size(a)));
      if (q.task === 'hiding') {
        const hid = rods[q.hidden!];
        hid.classList.remove('hidden');
        hid.querySelector('.lu-towel')?.remove();
        number(hid);
      }
      if (q.task === 'spares') {
        const each = PLAYERS[q.kind as LineupKind];
        rods.forEach((r, i) => { r.querySelector('.lu-count')!.textContent = String((i + 1) * each); });
      }
      field.classList.add('counting');
      const why = lineupWhy(q);
      if (ok) {
        sfx.cheer();
        kit.note(`Yes! ${why}`, true);
        say(`Yes! ${why}`);
        await kit.wait(3000);
        return true;
      }
      sfx.wrong();
      kit.note(why);
      say(why);
      await kit.wait(4200);
      return false;
    },
  };
}
