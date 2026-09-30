/* The commentator in the football games, the way it sounds at home.
 *
 * A goal is "Goooool do Brasil!" and a save is "Defendeu o goleiro!", shouted
 * in Portuguese by a Portuguese voice. He asked for it, and it is the sound of
 * football in his family. It comes after the kick, as the celebration, and
 * the word he read is said straight after it in English, as before.
 *
 * With no Portuguese voice on the device, the English voice cannot say these
 * lines, so it calls the moment in English instead. A grown-up can choose
 * English or no commentator in the setup panel. */

import { pick } from '../lib/random';
import { canSpeak, say } from '../lib/speech';
import { read, write } from '../lib/storage';
import type { Team } from './teams';

export type Narration = 'pt' | 'en' | 'off';
export type Moment = 'goal' | 'save';

const KEY = 'football-narration';
const PT = 'pt-BR';

export const narrationChoice = (): Narration => {
  const v = read<string>(KEY, 'pt');
  return v === 'en' || v === 'off' ? v : 'pt';
};
export const setNarration = (v: Narration): void => write(KEY, v);

/** what the commentator shouts: a goal for `team`, or a save */
export function callFor(moment: Moment, team: Team, lang: 'pt' | 'en'): string {
  if (lang === 'pt') {
    if (moment === 'save') return pick(['Defendeu o goleiro!', 'Que defesa!', 'Pegou o goleiro!']);
    return team.pt
      ? pick([`Goooool ${team.pt}!`, `É gol ${team.pt}!`, `Golaço ${team.pt}!`])
      : pick(['Goooool!', 'Golaço!', 'É gol!']);
  }
  if (moment === 'save') return pick(['What a save!', 'Saved by the keeper!']);
  return team.kind === 'you' ? 'Goooal!' : `Goooal for ${team.name}!`;
}

/**
 * Shout the moment, then say the word he read. `then` runs once the call is
 * over — or after a short wait, since some speech engines never say they
 * have finished — so the word is never lost.
 */
export function narrate(moment: Moment, team: Team, then: () => void, later: (fn: () => void, ms: number) => void): void {
  const choice = narrationChoice();
  const lang = choice === 'pt' && !canSpeak(PT) ? 'en' : choice;
  if (lang === 'off') { then(); return; }
  let done = false;
  const next = (): void => { if (!done) { done = true; then(); } };
  say(callFor(moment, team, lang), { lang: lang === 'pt' ? PT : undefined, onEnd: next });
  later(next, 2400);
}

/** the setup row: who does the commentary */
export function narrationSelect(onChange?: () => void): HTMLSelectElement {
  const sel = document.createElement('select');
  sel.setAttribute('aria-label', 'Commentator');
  for (const [value, text] of [['pt', 'Commentator: Português'], ['en', 'Commentator: English'], ['off', 'No commentator']]) {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = text;
    sel.append(o);
  }
  sel.value = narrationChoice();
  sel.addEventListener('change', () => { setNarration(sel.value as Narration); onChange?.(); });
  return sel;
}
