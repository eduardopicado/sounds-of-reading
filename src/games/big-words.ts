/* Big Words — two-syllable words, read a part at a time.
 *
 * After one-syllable words comes chunking: sun·set, rab·bit, rain·bow.
 * Kindergarten and Year 1 read a word shown in its two parts and pick its
 * picture, then the same with the word whole, so he finds the parts himself;
 * then he hears a word and builds it from its two parts. Year 2 taps where a
 * word splits — between the two consonants, rab|bit — and builds words from
 * parts that look alike.
 *
 * The words, their parts and their levels come from the content file
 * (src/content/big-words.ts); only words he can read at the week's levels
 * are asked. It uses the maths frame for its round, steps and sticker. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { settings } from '../lib/settings';
import { BIG_STEPS, bigQuestion, type BigQuestion, type BigStep } from '../content/big-words';
import { mountMaths, type Kit } from './maths-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<BigStep>({
    id: 'big-words',
    title: 'Big',
    swash: 'Words',
    tagline: 'Read long words in two parts: sun·set, rab·bit.',
    steps: BIG_STEPS,
    face: '🐘',
    cheer: 'Good reading!',
    build,
  }, root);
}

const topLevel = (): number => (settings().levels.length ? Math.max(...settings().levels) : 8);

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const word = el('div', { class: 'bw-word' });
  const answers = el('div', { class: 'bw-answers' });
  const again = el('button', { class: 'btn ghost small', type: 'button', text: '🔊 Say it again' });
  const node = el('div', { class: 'mx-stage' }, ask, word, again, answers);
  let recent: string[] = [];

  async function finish(ok: boolean, q: BigQuestion): Promise<boolean> {
    const [a, b] = q.word.parts;
    if (ok) sfx.cheer(); else sfx.wrong();
    /* the parts, then the word: the way to read it */
    word.replaceChildren(el('span', { class: 'bw-part one', text: a }), el('span', { class: 'bw-dot', text: '·' }),
      el('span', { class: 'bw-part two', text: b }));
    kit.note(`${ok ? 'Yes! ' : ''}${a} · ${b}: ${q.word.text}`, ok);
    say(`${a}, ${b}, ${q.word.text}`);
    await kit.wait(ok ? 2400 : 3600);
    return ok;
  }

  /** pick the picture of the word on the screen */
  function pictures(q: BigQuestion): Promise<boolean> {
    const [a, b] = q.word.parts;
    ask.textContent = 'Read it. Which picture is it?';
    word.replaceChildren(...(q.task === 'parts'
      ? [el('span', { class: 'bw-part one', text: a }), el('span', { class: 'bw-dot', text: '·' }), el('span', { class: 'bw-part two', text: b })]
      : [el('span', { class: 'bw-part', text: q.word.text })]));
    return new Promise((resolve) => {
      answers.replaceChildren(...q.pictures.map((w) => {
        const btn = el('button', { class: 'bw-pic', type: 'button', 'aria-label': w.text, dataset: { word: w.text } },
          el('span', { text: w.picture ?? '', 'aria-hidden': 'true' }));
        btn.addEventListener('click', async () => {
          answers.querySelectorAll('button').forEach((x) => { (x as HTMLButtonElement).disabled = true; });
          sfx.tap();
          const ok = w === q.word;
          answers.querySelector(`[data-word="${q.word.text}"]`)!.classList.add('right');
          if (!ok) btn.classList.add('wrong');
          resolve(await finish(ok, q));
        });
        return btn;
      }));
    });
  }

  /** hear it, tap its two parts in order */
  function buildIt(q: BigQuestion): Promise<boolean> {
    ask.textContent = 'Listen, then build the word from its two parts.';
    const slots = [el('span', { class: 'bw-slot' }), el('span', { class: 'bw-slot' })];
    word.replaceChildren(slots[0], el('span', { class: 'bw-dot', text: '·' }), slots[1]);
    again.hidden = false;
    again.onclick = () => { sfx.tap(); say(q.word.text); };
    say(q.word.text);
    const taken: string[] = [];
    return new Promise((resolve) => {
      answers.replaceChildren(...q.tiles.map((t) => {
        const btn = el('button', { class: 'bw-tile', type: 'button', text: t, dataset: { part: t } });
        btn.addEventListener('click', async () => {
          sfx.tap();
          btn.disabled = true;
          slots[taken.length].textContent = t;
          taken.push(t);
          if (taken.length < 2) return;
          answers.querySelectorAll('button').forEach((x) => { (x as HTMLButtonElement).disabled = true; });
          again.hidden = true;
          const ok = taken[0] === q.word.parts[0] && taken[1] === q.word.parts[1];
          resolve(await finish(ok, q));
        });
        return btn;
      }));
    });
  }

  /** tap the gap where the word splits */
  function split(q: BigQuestion): Promise<boolean> {
    ask.textContent = 'Where does it split into two parts? Tap the gap.';
    answers.replaceChildren();
    const letters = [...q.word.text];
    return new Promise((resolve) => {
      const gaps: HTMLButtonElement[] = [];
      const row: HTMLElement[] = [];
      letters.forEach((ch, i) => {
        row.push(el('span', { class: 'bw-letter', text: ch }));
        if (i === letters.length - 1) return;
        const gap = el('button', { class: 'bw-gap', type: 'button', 'aria-label': `split after ${letters.slice(0, i + 1).join('')}`, dataset: { at: String(i + 1) } }) as HTMLButtonElement;
        gap.addEventListener('click', async () => {
          gaps.forEach((g) => { g.disabled = true; });
          sfx.tap();
          const ok = i + 1 === q.word.parts[0].length;
          gap.classList.add(ok ? 'right' : 'wrong');
          resolve(await finish(ok, q));
        });
        gaps.push(gap);
        row.push(gap);
      });
      word.replaceChildren(el('span', { class: 'bw-split' }, ...row));
    });
  }

  return {
    node,
    ask: async (step: BigStep): Promise<boolean> => {
      const q = bigQuestion(step, topLevel(), recent);
      recent = [...recent, q.word.text].slice(-4);
      again.hidden = true;
      word.dataset.word = q.word.text;
      word.dataset.split = String(q.word.parts[0].length);
      if (q.task === 'parts' || q.task === 'whole') return pictures(q);
      if (q.task === 'split') return split(q);
      return buildIt(q);
    },
  };
}
