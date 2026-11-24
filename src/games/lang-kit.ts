/* The 🇦🇺 English / 🇧🇷 Português switch, for the games that speak both:
 * the jiu-jitsu games and the geography games.
 *
 * The flags sit big on the game itself, not in setup, because switching is
 * part of playing, and a switch mid-question changes the words in place
 * rather than starting again. Each family of games remembers its own choice.
 *
 * Portuguese is a recording where one was made (tools/make-audio.ts), and
 * otherwise the device's Portuguese voice. With neither, the words on screen
 * still switch and the speech stays in English, the same fallback as the
 * football commentator. */

import { el } from '../lib/dom';
import { read, write } from '../lib/storage';
import { canSpeak, say, sayInTurn } from '../lib/speech';
import { hasClip } from '../lib/audio';
import { sfx } from '../lib/sfx';
import type { Both, Lang } from '../content/pt';

const PT = 'pt-BR';

/** where the geography games remember their language */
export const GEO_LANG = 'geo-lang';

export interface LangSwitch {
  node: HTMLElement;
  lang: () => Lang;
  /** called after every switch */
  onChange: (fn: () => void) => void;
}

/** the switch, remembering the choice under this key */
export function langSwitch(key: string): LangSwitch {
  let lang: Lang = read<string>(key, 'en') === 'pt' ? 'pt' : 'en';
  const listeners: (() => void)[] = [];
  const button = (value: Lang, flag: string, text: string): HTMLButtonElement => {
    const b = el('button', { class: 'bj-flag', type: 'button', 'aria-label': text },
      el('span', { class: 'bj-flag-icon', text: flag, 'aria-hidden': 'true' }), el('span', { text })) as HTMLButtonElement;
    b.addEventListener('click', () => {
      if (lang === value) return;
      lang = value;
      write(key, lang);
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

/** say this in the chosen language, or in English where there is neither a
    recording of it nor a Portuguese voice installed */
export function speak(text: Both, lang: Lang, onEnd?: () => void): void {
  if (lang === 'pt' && (hasClip(text.pt) || canSpeak(PT))) say(text.pt, { lang: PT, onEnd });
  else say(text.en, { onEnd });
}

/** about as long as saying these takes, at the slowest voice, for waiting on
    a voice that never says it has finished: the longer language of each */
export function talkMs(lines: readonly Both[]): number {
  return lines.reduce((ms, l) => ms + 1500 + 95 * Math.max(l.en.length, l.pt.length), 0);
}

/** several phrases, one after another, in the chosen language: Portuguese
    where every phrase is recorded or there is a Portuguese voice, English
    otherwise (sayInTurn: never two voices in one sentence) */
export function speakTurn(lines: readonly Both[], lang: Lang, onEnd?: () => void): void {
  if (lang === 'pt' && (lines.every((l) => hasClip(l.pt)) || canSpeak(PT))) sayInTurn(lines.map((l) => l.pt), { lang: PT, onEnd });
  else sayInTurn(lines.map((l) => l.en), { onEnd });
}
