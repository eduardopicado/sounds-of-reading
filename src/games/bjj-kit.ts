/* What the jiu-jitsu games share: the language flags (lang-kit.ts), with
 * their own remembered choice, and his belt. Everything the games show and
 * say comes in both languages (src/content/bjj.ts). */

import { el } from '../lib/dom';
import { read, write } from '../lib/storage';
import { langSwitch as langSwitchFor, type LangSwitch } from './lang-kit';
import { BELTS, type Gi } from './bjj-art';

export { speak, type LangSwitch } from './lang-kit';

const BELT_KEY = 'bjj-belt';

export const BLUE_GI = '#2F6FC4';

/** the language switch the jiu-jitsu games share */
export const langSwitch = (): LangSwitch => langSwitchFor('bjj-lang');

/** his belt, chosen in setup and remembered */
export function beltSelect(onChange?: () => void): HTMLSelectElement {
  const sel = el('select', { 'aria-label': 'Belt' },
    ...Object.keys(BELTS).map((b) => el('option', { value: b, text: `Belt: ${b}` }))) as HTMLSelectElement;
  const saved = read<string>(BELT_KEY, 'white');
  sel.value = saved in BELTS ? saved : 'white';
  sel.addEventListener('change', () => { write(BELT_KEY, sel.value); onChange?.(); });
  return sel;
}

export const blueGi = (belt: HTMLSelectElement): Gi => ({ gi: BLUE_GI, belt: BELTS[belt.value] ?? BELTS.white });
