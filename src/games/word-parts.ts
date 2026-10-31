/* Word Parts — endings and fronts.
 *
 * After the sounds come the parts of a word that change it: jump, jumping,
 * jumped. He hears one of a word's endings and picks it; says what the -ed
 * says (jumped ends in t, played in d, landed in id); picks how a word is
 * spelt with its ending on, the rules one at a time (hop → hopping,
 * smile → smiling, cry → cried) and then together; and last, the endings
 * and fronts that change what a word means (careful, careless; unhappy,
 * replay, preheat).
 *
 * After every answer the word is shown with its part marked, and why it is
 * spelt or said that way. The words, the rules and the questions are in
 * src/content/word-parts.ts. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { settings } from '../lib/settings';
import { TOP_LEVEL } from '../content/index';
import { marked } from '../lib/highlight';
import { tonesFor } from '../lib/colour';
import { PART_STEPS, partQuestion, partSpan, type PartQuestion, type PartStep } from '../content/word-parts';
import { mountMaths, type Kit } from './maths-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<PartStep>({
    id: 'word-parts',
    title: 'Word',
    swash: 'Parts',
    tagline: 'jump, jumping, jumped: the endings and fronts of words.',
    steps: PART_STEPS,
    face: '🧩',
    cheer: 'Good reading!',
    build,
  }, root);
}

const topLevel = (): number => (settings().levels.length ? Math.max(...settings().levels) : TOP_LEVEL);

/* an ending and a front in colours of their own, an underline and a wash behind dark letters */
const ENDING_TONES = tonesFor(28);
const FRONT_TONES = tonesFor(205);

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const card = el('div', { class: 'wp-card' });
  const again = el('button', { class: 'btn ghost small', type: 'button', text: '🔊 Say it again' });
  const node = el('div', { class: 'mx-stage' }, ask, card, again);
  let recent: string[] = [];

  /** the word with its part marked: all that changed for a spelling (hop|ping),
      only the ed for what the ed says (hopp|ed) */
  function showWord(q: PartQuestion): void {
    const span = q.task === 'ed' ? { at: q.word.length - 2, len: 2 } : partSpan(q);
    card.replaceChildren(el('span', { class: 'wp-word' },
      marked(q.word, [span], { tones: q.front ? FRONT_TONES : ENDING_TONES })));
  }

  /** what he is asked, before he answers */
  function setUp(q: PartQuestion): void {
    again.hidden = true;
    if (q.task === 'find') {
      ask.textContent = 'Listen. Which one did I say?';
      card.replaceChildren(el('span', { class: 'wp-ear', text: '👂', 'aria-hidden': 'true' }));
      again.hidden = false;
      again.onclick = () => { sfx.tap(); say(q.word); };
      say(q.word);
    } else if (q.task === 'ed') {
      ask.textContent = `What does the ed say at the end?`;
      showWord(q);
      again.hidden = false;
      again.onclick = () => { sfx.tap(); say(q.word); };
    } else if (q.task === 'spell') {
      ask.textContent = 'Put them together. Which is right?';
      card.replaceChildren(el('span', { class: 'wp-sum' },
        el('span', { class: 'wp-base', text: q.base }), el('span', { class: 'wp-plus', text: '+' }),
        el('span', { class: 'wp-part', text: q.part })));
    } else {
      ask.textContent = 'Which word means:';
      card.replaceChildren(el('span', { class: 'wp-means', text: q.means ?? '' }));
    }
  }

  return {
    node,
    ask: async (step: PartStep): Promise<boolean> => {
      const q = partQuestion(step, topLevel(), recent);
      recent = [...recent, q.word, q.base].slice(-6);
      card.dataset.answer = q.answer;
      setUp(q);

      const picked = await kit.choices.askWords(q.options);
      kit.choices.revealWord(q.answer, picked);
      again.hidden = true;
      const ok = picked === q.answer;
      showWord(q);
      if (ok) sfx.cheer(); else sfx.wrong();
      kit.note(ok ? `Yes! ${q.why}` : q.why, ok);
      /* a letter on its own is said as its name, so the ed question says the word */
      say(q.task === 'ed' ? q.word : q.why);
      await kit.wait(ok ? 2600 : 4000);
      return ok;
    },
  };
}
