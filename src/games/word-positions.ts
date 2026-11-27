/* Word Positions — naming, doing and describing words, as positions on the
 * team (src/content/english.ts): naming words play in defence, doing words
 * in midfield, describing words up front.
 *
 * He taps the naming word in a sentence, then the doing word, then the
 * describing word; then says where a word plays; then taps every naming
 * word in a sentence that has more than one. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { KIND_NAME, POSITION, WORD_STEPS, wordQuestion, type Kind, type WordQuestion, type WordStep } from '../content/english';
import { mountMaths, type Kit } from './maths-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<WordStep>({
    id: 'word-positions',
    title: 'Word',
    swash: 'Positions',
    tagline: 'Naming words in defence, doing words in midfield, describing words up front.',
    steps: WORD_STEPS,
    face: '🧱',
    cheer: 'Good word sorting!',
    build,
  }, root);
}

const ICON: Record<Kind, string> = { n: '🛡️', v: '⚙️', d: '⚡' };

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const line = el('div', { class: 'ew-sentence' });
  const team = el('div', { class: 'ew-team', 'aria-hidden': 'true' },
    ...(['n', 'v', 'd'] as Kind[]).map((k) => el('span', { class: `ew-pos ${k}`, text: `${ICON[k]} ${POSITION[k]}: ${KIND_NAME[k]}s` })));
  const node = el('div', { class: 'mx-stage ew-stage' }, team, ask, line);
  let last = '';

  async function finish(q: WordQuestion, ok: boolean): Promise<boolean> {
    for (const b of line.querySelectorAll<HTMLElement>('.ew-word')) {
      const i = Number(b.dataset.at);
      b.classList.toggle('right', q.answer.includes(i));
    }
    const said = ok ? `Yes! ${q.why}` : q.why;
    if (ok) sfx.cheer(); else sfx.wrong();
    kit.note(said, ok);
    await kit.say(said, ok ? 2400 : 3800);
    return ok;
  }

  /** the sentence as words to tap; `many` lets him pick several, then Done */
  function words(q: WordQuestion, many: boolean): Promise<number[]> {
    const t = q.sentence;
    return new Promise((resolve) => {
      const picked = new Set<number>();
      const buttons = t.words.map((w, i) => {
        const b = el('button', { class: 'ew-word', type: 'button', text: w, dataset: { at: String(i) } }) as HTMLButtonElement;
        b.addEventListener('click', () => {
          sfx.tap();
          if (!many) {
            for (const x of buttons) x.disabled = true;
            if (!q.answer.includes(i)) b.classList.add('wrong');
            resolve([i]);
            return;
          }
          if (picked.has(i)) picked.delete(i); else picked.add(i);
          b.classList.toggle('on', picked.has(i));
        });
        return b;
      });
      line.replaceChildren(...buttons, el('span', { class: 'ew-end', text: t.end }));
      if (many) {
        const done = el('button', { class: 'ew-done', type: 'button', text: 'Done ✓' }) as HTMLButtonElement;
        done.addEventListener('click', () => {
          for (const x of [...buttons, done]) x.disabled = true;
          for (const b of buttons) if (picked.has(Number(b.dataset.at)) && !q.answer.includes(Number(b.dataset.at))) b.classList.add('wrong');
          resolve([...picked].sort((a, b) => a - b));
        });
        line.append(el('div', { class: 'ew-done-row' }, done));
      }
    });
  }

  return {
    node,
    ask: async (step: WordStep): Promise<boolean> => {
      let q = wordQuestion(step.task);
      for (let i = 0; i < 20 && q.ask + q.sentence.words.join(' ') === last; i += 1) q = wordQuestion(step.task);
      last = q.ask + q.sentence.words.join(' ');
      node.dataset.task = q.task;
      node.dataset.answer = q.answer.join(',');
      node.dataset.kind = q.kind;
      ask.textContent = q.ask;
      say(q.ask);
      if (q.task === 'position') {
        const t = q.sentence;
        line.replaceChildren(...t.words.map((w, i) => el('span', { class: `ew-word still${i === q.at ? ' marked' : ''}`, text: w, dataset: { at: String(i) } })),
          el('span', { class: 'ew-end', text: t.end }));
        const picked = await kit.choices.askWords(['n', 'v', 'd'], (k) => `${ICON[k as Kind]} ${POSITION[k as Kind]}`);
        kit.choices.revealWord(q.kind, picked);
        return finish(q, picked === q.kind);
      }
      const picked = await words(q, q.task === 'every');
      return finish(q, picked.join(',') === q.answer.join(','));
    },
  };
}
