/* "This week's sounds", once, for every game.
 *
 * The prototypes gave each game its own sound picker, so setting up a week of
 * practice meant seven visits. Here one setting lives on the home screen and
 * every game starts from it; a game may still override it for one session
 * without touching what the parent chose. */

import type { Level } from '../content/index';
import { read, write } from './storage';
import { setPreferredVoice, setSpeechEnabled } from './speech';
import { setSfxEnabled } from './sfx';

export interface Settings {
  /** sound ids. Empty means every sound in the chosen levels. */
  sounds: string[];
  /** levels in play. Empty means all eight. */
  levels: Level[];
  /** the teacher lists the two th sounds apart; a parent may merge them */
  mergeTh: boolean;
  speech: boolean;
  sfx: boolean;
  /** a voice the parent picked by hand; null means choose the best installed */
  voiceURI: string | null;
  /** every game a notch harder: more choices, less time, fewer helps */
  pro: boolean;
  /** the coach favours the sounds he is missing, and moves him up a level
      when the one he is on is mastered — see src/lib/coach.ts */
  coach: boolean;
}

const DEFAULTS: Settings = {
  sounds: [],
  levels: [4, 5],
  mergeTh: false,
  speech: true,
  sfx: true,
  voiceURI: null,
  pro: false,
  coach: true,
};

/** is Pro mode on? A one-word question every game asks */
export const pro = (): boolean => current.pro;

let current: Settings = { ...DEFAULTS, ...read<Partial<Settings>>('settings', {}) };
const listeners = new Set<(s: Settings) => void>();

setSpeechEnabled(current.speech);
setSfxEnabled(current.sfx);
setPreferredVoice(current.voiceURI);

export const settings = (): Settings => current;

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch };
  write('settings', current);
  if (patch.speech !== undefined) setSpeechEnabled(patch.speech);
  if (patch.sfx !== undefined) setSfxEnabled(patch.sfx);
  if (patch.voiceURI !== undefined) setPreferredVoice(patch.voiceURI);
  for (const fn of listeners) fn(current);
}

export function onSettingsChange(fn: (s: Settings) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetSettings(): void {
  current = { ...DEFAULTS };
  write('settings', current);
  for (const fn of listeners) fn(current);
}
