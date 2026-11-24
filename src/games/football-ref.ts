/* Football Ref — be the referee: what happens when the ball goes out, a free
 * kick or a penalty, the referee's signals, yellow and red cards, and
 * offside, the hardest, last (src/content/football-rules.ts has the rules).
 *
 * The pitch is drawn in his team's shirts against the side he plays
 * against, the same in every football game (teams.ts). Once he has
 * answered, the line that decides offside is drawn on it: the last
 * defender's, or halfway.
 *
 * In English or Portuguese, switched with the flags: lateral, escanteio,
 * tiro de meta, pênalti, impedimento. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { CALLS, FOOTBALL_STEPS, footballQuestion, type Call, type FootballQuestion, type FootballStep } from '../content/football-rules';
import type { Both } from '../content/pt';
import { mountMaths, type Kit } from './maths-kit';
import { pitchPicture, signalPicture } from './football-art';
import { langSwitch, speak, speakTurn, talkMs } from './lang-kit';

export const REF_LANG = 'football-lang';

export function mount(root: HTMLElement): () => void {
  return mountMaths<FootballStep>({
    id: 'football-ref',
    title: 'Football',
    swash: 'Ref',
    tagline: 'Be the referee: throw-in or corner, penalty, offside?',
    steps: FOOTBALL_STEPS,
    face: '🟨',
    cheer: 'Good refereeing!',
    build,
  }, root);
}

function build(kit: Kit) {
  const langs = langSwitch(REF_LANG);
  const lang = () => langs.lang();
  const ask = el('p', { class: 'mx-ask' });
  const card = el('div', { class: 'fr-card' });
  const what = el('p', { class: 'fr-what', hidden: 'hidden' });
  const node = el('div', { class: 'mx-stage fr-stage' }, langs.node, what, card, ask);
  let last: FootballQuestion | undefined;
  /** redraws the words on screen in the chosen language */
  let retext: () => void = () => undefined;
  langs.onChange(() => retext());

  return {
    node,
    ask: async (step: FootballStep): Promise<boolean> => {
      const q = footballQuestion(step, last);
      last = q;
      /* what the tests look for, the way the other games' cards say it */
      card.dataset.answer = q.answer;
      card.dataset.kind = q.kind;
      card.dataset.task = q.task;
      const draw = (answered: boolean): void => {
        if (q.scene) card.replaceChildren(pitchPicture(q.scene, kit.us(), kit.rival(), answered));
        else if (q.signal) card.replaceChildren(signalPicture(q.signal));
        else card.replaceChildren(el('div', { class: 'fr-cards', 'aria-hidden': 'true', text: '🟨 🟥' }));
      };
      draw(false);
      what.hidden = !q.what;
      const label = (c: string): string => CALLS[c as Call][lang()];
      retext = () => {
        ask.textContent = q.ask[lang()];
        if (q.what) what.textContent = q.what[lang()];
        kit.choices.relabel(label);
      };
      const lines: Both[] = q.what ? [q.what, q.ask] : [q.ask];
      speakTurn(lines, lang());
      const asked = kit.choices.askWords(q.options, label);
      retext();
      const picked = await asked;
      kit.choices.revealWord(q.answer, picked);
      const ok = picked === q.answer;
      /* now the line that decides it */
      draw(true);
      if (ok) sfx.cheer(); else sfx.wrong();
      retext = () => {
        ask.textContent = q.ask[lang()];
        if (q.what) what.textContent = q.what[lang()];
        kit.choices.relabel(label);
        kit.note(`${ok ? (lang() === 'pt' ? 'Isso! ' : 'Yes! ') : ''}${q.why[lang()]}`, ok);
      };
      retext();
      await kit.said((end) => speak(q.why, lang(), end), ok ? 2600 : 4200, talkMs([q.why]));
      return ok;
    },
  };
}
