/* His name: said after a round's praise, on his scoreboard, and on the home
 * screen.
 *
 * A grown-up types it, and a nickname if he has one, in Grown-ups; it stays
 * on this device. A name with a recording is said in it: Lucas and Luquinhas
 * are recorded in the Brazilian voice (tools/make-audio.ts), as he says them
 * at home. Any other name is said by the device voice, which is fine for a
 * name nobody recorded. */

import { hasClip } from './audio';
import { settings } from './settings';
import { say, type SayOptions } from './speech';

/** the names the app has recordings of, in Portuguese */
export const RECORDED_NAMES = ['Lucas', 'Luquinhas'];

/** his name, or empty if none was given: for writing it */
export const childName = (): string => settings().name || settings().nickname;

/** the one to say this time: his name or his nickname, either, when he has both */
export function nameToSay(): string {
  const { name, nickname } = settings();
  if (name && nickname) return Math.random() < 0.5 ? name : nickname;
  return name || nickname;
}

/** says his name: the recording where there is one, the device voice otherwise */
export function sayName(options: SayOptions = {}): void {
  const n = nameToSay();
  if (!n) { options.onEnd?.(); return; }
  if (hasClip(n)) say(n, { ...options, lang: 'pt-BR' });
  else say(n, options);
}

/** a word of praise, then his name: "Every one right! … Lucas!" */
export function praise(line: string, options: SayOptions = {}): void {
  say(line, { ...options, onEnd: () => sayName(options) });
}
