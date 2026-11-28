/* Opposites and Same — opposites, words that mean the same, and two words
 * that make one (src/content/english.ts). Every word one he can read. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { WORDS_STEPS, wordsQuestion, type WordsStep } from '../content/english';
import { mountMaths, type Kit } from './maths-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<WordsStep>({
    id: 'opposites',
    title: 'Opposites',
    swash: 'and Same',
    tagline: 'Hot and cold, fast and quick, and foot + ball = football.',
    steps: WORDS_STEPS,
    face: '🔁',
    cheer: 'Good word work!',
    build,
  }, root);
}

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const shown = el('p', { class: 'ew-shown' });
  const node = el('div', { class: 'mx-stage ew-stage' }, ask, shown);
  let last = '';

  return {
    node,
    ask: async (step: WordsStep): Promise<boolean> => {
      let q = wordsQuestion(step.task);
      for (let i = 0; i < 20 && q.ask === last; i += 1) q = wordsQuestion(step.task);
      last = q.ask;
      node.dataset.task = q.task;
      node.dataset.answer = q.answer;
      ask.textContent = q.ask;
      shown.textContent = q.shown ?? '';
      say(q.ask);
      const label = q.task === 'which' ? (k: string) => (k === 'same' ? '🟰 Same' : '↔️ Opposites') : undefined;
      const picked = await kit.choices.askWords(q.options, label);
      kit.choices.revealWord(q.answer, picked);
      const ok = picked === q.answer;
      if (q.task === 'join') shown.textContent = `${q.shown!.replace(' + ?', '')} + ${q.answer} = ${q.shown!.replace(' + ?', '')}${q.answer}`;
      const said = ok ? `Yes! ${q.why}` : q.why;
      if (ok) sfx.cheer(); else sfx.wrong();
      kit.note(said, ok);
      await kit.say(said, ok ? 2200 : 3600);
      return ok;
    },
  };
}
