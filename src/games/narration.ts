/* The commentator in the football games, the way it sounds at home.
 *
 * A goal is "Goooool do Brasil!" and a save is "Defendeu o goleiro!", shouted
 * in Portuguese by a Portuguese voice. He asked for it, and it is the sound of
 * football in his family. It comes after the kick, as the celebration, and
 * the word he read is said straight after it in English, as before.
 *
 * With no Portuguese voice on the device and no recording of the line, the
 * English voice cannot say it, so it calls the moment in English instead. A
 * grown-up can choose English or no commentator in the setup panel. The
 * lines themselves are in src/content/commentary.ts. */

import { pick } from '../lib/random';
import { canSpeak, say } from '../lib/speech';
import { hasClip } from '../lib/audio';
import { read, write } from '../lib/storage';
import {
  EN_CLOSE, EN_OWN_GOALS, EN_POSTS, EN_SAVES, PT_CHAMPIONS, PT_CLOSE, PT_OWN_GOALS, PT_POSTS, PT_SAVES, enChampion, enGoal, ptGoals,
} from '../content/commentary';
import { real, type Team } from './teams';

export type Narration = 'pt' | 'en' | 'off';
export type Moment = 'goal' | 'save' | 'champion' | 'post' | 'close' | 'own-goal';

const KEY = 'football-narration';
const PT = 'pt-BR';

export const narrationChoice = (): Narration => {
  const v = read<string>(KEY, 'pt');
  return v === 'en' || v === 'off' ? v : 'pt';
};
export const setNarration = (v: Narration): void => write(KEY, v);

/** the same moment, whoever it was for */
const SAME: Record<'save' | 'post' | 'close' | 'own-goal', { pt: string[]; en: string[] }> = {
  save: { pt: PT_SAVES, en: EN_SAVES },
  post: { pt: PT_POSTS, en: EN_POSTS },
  close: { pt: PT_CLOSE, en: EN_CLOSE },
  'own-goal': { pt: PT_OWN_GOALS, en: EN_OWN_GOALS },
};

/** what the commentator shouts: a goal or the cup for `team`, or a moment
    that is the same whoever it was for */
export function callFor(moment: Moment, team: Team, lang: 'pt' | 'en'): string {
  if (moment !== 'goal' && moment !== 'champion') return pick(SAME[moment][lang]);
  if (lang === 'pt') return pick(moment === 'champion' ? PT_CHAMPIONS : ptGoals(team.pt));
  if (moment === 'champion') return enChampion(real(team) ? team.name : undefined);
  return enGoal(real(team) ? team.name : undefined);
}

/**
 * Shout the moment, then whatever comes next: the word he read, or what
 * the game has to say. `then` runs once the call is
 * over — or after a short wait, since some speech engines never say they
 * have finished — so the word is never lost.
 */
export function narrate(moment: Moment, team: Team, then: () => void, later: (fn: () => void, ms: number) => void): void {
  const choice = narrationChoice();
  if (choice === 'off') { then(); return; }
  let done = false;
  const next = (): void => { if (!done) { done = true; then(); } };
  /* in Portuguese when there is a recording of the line or a voice to say it,
     and in English otherwise */
  const pt = choice === 'pt' ? callFor(moment, team, 'pt') : '';
  if (pt && (hasClip(pt) || canSpeak(PT))) say(pt, { lang: PT, onEnd: next });
  else say(callFor(moment, team, 'en'), { onEnd: next });
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
