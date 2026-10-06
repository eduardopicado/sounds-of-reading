/* What the two jiu-jitsu games share: the language flags, speaking in the
 * chosen language, and his belt.
 *
 * The flags sit big on the game itself, not in setup, because switching is
 * part of playing: 🇦🇺 English and 🇧🇷 Português. Everything the games show
 * and say comes in both (src/content/bjj.ts), and a switch mid-question
 * changes the words in place rather than starting again.
 *
 * Portuguese is spoken by the device's Portuguese voice. On a device without
 * one, the words on screen still switch and the speech stays in English, the
 * same fallback as the football commentator. */

import { el } from '../lib/dom';
import { read, write } from '../lib/storage';
import { canSpeak, say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import type { Both, Lang } from '../content/bjj';
import { BELTS, type Gi } from './bjj-art';

const LANG_KEY = 'bjj-lang';
const BELT_KEY = 'bjj-belt';
const PT = 'pt-BR';

export const BLUE_GI = '#2F6FC4';

export interface LangSwitch {
  node: HTMLElement;
  lang: () => Lang;
  /** called after every switch */
  onChange: (fn: () => void) => void;
}

export function langSwitch(): LangSwitch {
  let lang: Lang = read<string>(LANG_KEY, 'en') === 'pt' ? 'pt' : 'en';
  const listeners: (() => void)[] = [];
  const button = (value: Lang, flag: string, text: string): HTMLButtonElement => {
    const b = el('button', { class: 'bj-flag', type: 'button', 'aria-label': text },
      el('span', { class: 'bj-flag-icon', text: flag, 'aria-hidden': 'true' }), el('span', { text })) as HTMLButtonElement;
    b.addEventListener('click', () => {
      if (lang === value) return;
      lang = value;
      write(LANG_KEY, lang);
      sfx.tap();
      paint();
      for (const fn of listeners) fn();
    });
    return b;
  };
  const en = button('en', '🇦🇺', 'English');
  const pt = button('pt', '🇧🇷', 'Português');
  const paint = (): void => {
    en.setAttribute('aria-pressed', String(lang === 'en'));
    pt.setAttribute('aria-pressed', String(lang === 'pt'));
  };
  paint();
  return {
    node: el('div', { class: 'bj-langs', role: 'group', 'aria-label': 'Language' }, en, pt),
    lang: () => lang,
    onChange: (fn) => { listeners.push(fn); },
  };
}

/** say this in the chosen language, or in English where no Portuguese voice is installed */
export function speak(text: Both, lang: Lang, onEnd?: () => void): void {
  if (lang === 'pt' && canSpeak(PT)) say(text.pt, { lang: PT, onEnd });
  else say(text.en, { onEnd });
}

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
