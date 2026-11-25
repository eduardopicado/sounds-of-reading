/* Punctuation Ref — he is the referee, and each sentence breaks one rule
 * (src/content/punctuation.ts).
 *
 * He taps the word that needs a capital, picks the mark that ends the
 * sentence, taps the gap where the list's comma goes, picks the short way to
 * write "do not" and the way to write Sam's hat, and at the top picks the
 * one sentence of three that is right. After each call the sentence is
 * shown and said back the right way, with the rule. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import {
  MARK_NAME, PUNCTUATION_STEPS, punctuationQuestion, wordsOf,
  type Mark, type PunctuationQuestion, type PunctuationStep,
} from '../content/punctuation';
import { mountMaths, type Kit } from './maths-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<PunctuationStep>({
    id: 'punctuation-ref',
    title: 'Punctuation',
    swash: 'Ref',
    tagline: 'Every sentence breaks a rule. Blow the whistle and fix it.',
    steps: PUNCTUATION_STEPS,
    face: '🟨',
    cheer: 'Good refereeing!',
    build,
  }, root);
}

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const line = el('div', { class: 'pr-sentence', 'aria-live': 'polite' });
  const node = el('div', { class: 'mx-stage pr-stage' }, ask, line);
  let last = '';

  async function finish(q: PunctuationQuestion, ok: boolean): Promise<boolean> {
    line.replaceChildren(el('span', { class: `pr-right ${ok ? 'good' : ''}`, text: q.right }));
    line.dataset.shown = 'right';
    if (ok) sfx.cheer(); else sfx.whistle();
    const said = ok ? `Yes! ${q.why}` : q.why;
    kit.note(said, ok);
    /* the sentence said back the right way, after the rule (not for "which is
       right", whose sentence is the answer itself) */
    const back = q.task === 'short' || q.task === 'check' ? '' : ` ${q.right}`;
    await kit.say(`${said}${back}`, ok ? 2400 : 3800);
    return ok;
  }

  /** the sentence as words to tap */
  function tapWords(q: PunctuationQuestion): Promise<string> {
    const words = wordsOf(q.shown);
    const end = q.shown.at(-1)!;
    return new Promise((resolve) => {
      line.replaceChildren(...words.map((w, i) => {
        const b = el('button', { class: 'pr-word', type: 'button', text: w, dataset: { at: String(i) } });
        b.addEventListener('click', () => {
          sfx.tap();
          for (const x of line.querySelectorAll<HTMLButtonElement>('button')) x.disabled = true;
          resolve(String(i));
        });
        return b;
      }), el('span', { class: 'pr-end', text: end }));
    });
  }

  /** the sentence with a gap to tap between each pair of words */
  function tapGaps(q: PunctuationQuestion): Promise<string> {
    const words = wordsOf(q.shown);
    const end = q.shown.at(-1)!;
    return new Promise((resolve) => {
      const parts: HTMLElement[] = [];
      words.forEach((w, i) => {
        parts.push(el('span', { class: 'pr-plain', text: w }));
        if (i < words.length - 1) {
          const g = el('button', { class: 'pr-gap', type: 'button', 'aria-label': `After ${w}`, dataset: { at: String(i) } });
          g.addEventListener('click', () => {
            sfx.tap();
            for (const x of line.querySelectorAll<HTMLButtonElement>('button')) x.disabled = true;
            resolve(String(i));
          });
          parts.push(g);
        }
      });
      line.replaceChildren(...parts, el('span', { class: 'pr-end', text: end }));
    });
  }

  return {
    node,
    ask: async (step: PunctuationStep): Promise<boolean> => {
      let q = punctuationQuestion(step.task);
      for (let i = 0; i < 20 && q.right === last; i += 1) q = punctuationQuestion(step.task);
      last = q.right;
      node.dataset.task = step.task;
      node.dataset.answer = q.answer;
      line.dataset.shown = 'question';
      ask.textContent = q.ask;
      say(q.ask);
      if (q.tap) {
        const picked = await (q.tap === 'word' ? tapWords(q) : tapGaps(q));
        const sel = q.tap === 'word' ? '.pr-word' : '.pr-gap';
        line.querySelector(`${sel}[data-at="${q.answer}"]`)?.classList.add('right');
        if (picked !== q.answer) line.querySelector(`${sel}[data-at="${picked}"]`)?.classList.add('wrong');
        await kit.wait(700);
        return finish(q, picked === q.answer);
      }
      if (q.task === 'stop-or-ask' || q.task === 'ends') {
        line.replaceChildren(el('span', { class: 'pr-plain', text: q.shown }), el('span', { class: 'pr-box', 'aria-hidden': 'true' }));
      } else {
        line.replaceChildren(...(q.shown ? [el('span', { class: 'pr-plain', text: q.shown })] : []));
      }
      const label = q.task === 'stop-or-ask' || q.task === 'ends' ? (m: string) => `${m}  ${MARK_NAME[m as Mark]}` : undefined;
      const picked = await kit.choices.askWords(q.options, label);
      kit.choices.revealWord(q.answer, picked);
      return finish(q, picked === q.answer);
    },
  };
}
