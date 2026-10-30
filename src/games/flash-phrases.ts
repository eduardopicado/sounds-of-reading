/* Flash Phrases — read it at a glance.
 *
 * A child who can read every word can still read slowly, one word at a
 * time, sounding each out again. Reading faster is seeing a whole phrase at
 * once: "a big dog", not "a… big… dog". So a phrase at his level flashes up
 * for a moment and goes, too quickly to sound out, and he picks the one he
 * read from three that look alike: "a big dog", "a big dot", "a bag dog".
 * Only reading every word tells them apart.
 *
 * As in Flash Count, each step starts with a long look and closes in, a
 * little shorter for every one he gets right in a row, and a miss gives the
 * long look back. The phrases grow from two words to six, then come quicker.
 * The answers only appear once the phrase has gone, so it has to have been
 * read, not looked back at. A miss shows the phrase again with the word he
 * misread marked: dog, not dot.
 *
 * The phrases, each at the level of its hardest word, are in words.ts; the
 * lookalikes and the timing are in src/content/flash-phrases.ts. */

import { el, prefersReducedMotion } from '../lib/dom';
import { shuffle } from '../lib/random';
import { settings } from '../lib/settings';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import type { FlashPhrase } from '../content/index';
import { PHRASE_STEPS, difference, lookalikePhrases, phrasePool, phraseMs, type PhraseStep } from '../content/flash-phrases';
import { mountMaths, type Kit } from './maths-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<PhraseStep>({
    id: 'flash-phrases',
    title: 'Flash',
    swash: 'Phrases',
    tagline: 'It flashes up and goes. Did you read it?',
    steps: PHRASE_STEPS,
    face: '📸',
    build,
  }, root);
}

/** a moment to look at the card before the phrase comes */
const READY_MS = 700;

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask', text: 'Get ready…' });
  const card = el('div', { class: 'fp-card', role: 'img' });
  const node = el('div', { class: 'mx-stage fp-stage' }, ask, card);
  const recent: string[] = [];
  /* right answers in a row at the current step: each one shortens the look */
  let streak = 0;
  let streakStep: PhraseStep | null = null;

  /** the phrase on the card, a word at a time, the misread one marked */
  function show(text: string, marked = -1): void {
    card.classList.remove('gone');
    card.replaceChildren(...text.split(' ').map((w, i) =>
      el('span', { class: i === marked ? 'fp-word misread' : 'fp-word', text: w })));
    card.setAttribute('aria-label', text);
  }

  function next(step: PhraseStep): FlashPhrase {
    const pool = phrasePool(step, settings().levels);
    const fresh = pool.filter((p) => !recent.includes(p.text));
    const phrase = shuffle(fresh.length ? fresh : pool)[0];
    recent.push(phrase.text);
    if (recent.length > 8) recent.shift();
    return phrase;
  }

  return {
    node,
    ask: async (step: PhraseStep): Promise<boolean> => {
      const phrase = next(step);
      const options = shuffle([phrase.text, ...lookalikePhrases(phrase, 2)]);
      node.dataset.answer = phrase.text;
      ask.textContent = 'Get ready…';
      card.classList.add('gone');
      card.replaceChildren(el('span', { class: 'fp-ready', text: '👀' }));
      card.setAttribute('aria-label', 'Get ready');
      await kit.wait(READY_MS);

      /* a long first look at each step, closing in as he gets them right */
      if (streakStep !== step) { streakStep = step; streak = 0; }
      const ms = phraseMs(step, streak, prefersReducedMotion());
      card.dataset.ms = String(ms);
      ask.textContent = 'Read it!';
      show(phrase.text);
      await kit.wait(ms);
      card.classList.add('gone');
      card.replaceChildren(el('span', { class: 'mx-big', text: '?' }));
      card.setAttribute('aria-label', 'gone');
      ask.textContent = 'Which one did you read?';

      const picked = await kit.choices.askWords(options);
      kit.choices.revealWord(phrase.text, picked);
      if (picked === phrase.text) {
        show(phrase.text);
        sfx.right();
        kit.note(`Yes! “${phrase.text}”, read in a flash.`, true);
        say(phrase.text);
        streak += 1;
        await kit.wait(1800);
        return true;
      }
      /* the word he misread, marked, and the long look back next time */
      sfx.wrong();
      streak = 0;
      const d = difference(phrase.text, picked);
      show(phrase.text, d ? phrase.text.split(' ').indexOf(d.right) : -1);
      kit.note(d ? `It said “${phrase.text}”: ${d.right}, not ${d.wrong}.` : `It said “${phrase.text}”.`);
      say(`It said: ${phrase.text}.`);
      await kit.wait(3400);
      return false;
    },
  };
}
