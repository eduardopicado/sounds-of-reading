/* Sentence Smash — pick one phrase from each row, hear the silly sentence.
 *
 * This is where the contrast rule was learned: it first shipped with mustard
 * and mint letters on cream and was unreadable. Letters are dark ink; the
 * sound colour is a thick underline and a wash behind them, and the column
 * colour is a block on the left edge of the chip. Nothing coloured carries
 * text. */

import { el, replay } from '../lib/dom';
import { pick, shuffle } from '../lib/random';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { marked } from '../lib/highlight';
import { phrases, sound, type Phrase, type Slot } from '../content/index';
import { createSetup, topbar } from '../ui/components';

const ORDER: Slot[] = ['who', 'did', 'what', 'where'];
const NAMES: Record<Slot, string> = { who: 'Who?', did: 'Did what?', what: 'To what?', where: 'Where?' };
/* column colours: these only ever sit behind dark ink or as a solid pip */
const COLOURS: Record<Slot, string> = { who: '#E8A317', did: '#3FA07A', what: '#5AA0DC', where: '#A87FD1' };

export function mount(root: HTMLElement): () => void {
  const hintSel = el('select', { 'aria-label': 'Underline the sound' },
    el('option', { value: 'on', text: 'Underline the sound', selected: 'selected' }),
    el('option', { value: 'off', text: 'Plain words' }),
  );
  const extra = el('div', { class: 'row' },
    el('span', { class: 'lbl', text: 'This game' }), hintSel,
    el('button', { class: 'btn ghost small', type: 'button', text: 'New words', on: { click: () => deal() } }),
  );
  hintSel.addEventListener('change', () => { drawCols(); drawSentence(); });

  const setup = createSetup({ extra: [extra], onChange: () => deal() });

  const sentenceEl = el('div', { class: 'sentence' });
  const readBtn = el('button', { class: 'btn', type: 'button', text: '🔊 Read my sentence' });
  const surpriseBtn = el('button', { class: 'btn ghost on-paper', type: 'button', text: '🎲 Surprise me' });
  const keepBtn = el('button', { class: 'btn ghost on-paper', type: 'button', text: '⭐ Keep it' });
  const strip = el('div', { class: 'strip' }, sentenceEl,
    el('div', { class: 'actions' }, readBtn, surpriseBtn, keepBtn));
  const cols = el('div', { class: 'cols' });
  const savedList = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } });

  const node = el('div', { class: 'wrap' },
    topbar({
      title: 'Sentence', swash: 'Smash',
      tagline: 'Pick a word from each row. Read your silly sentence out loud.',
      onSetup: (open) => setup.open(open),
    }),
    setup.node, strip, cols,
    el('div', { class: 'tray' }, el('h2', { text: 'Sentences you kept' }), savedList),
  );

  let options: Record<Slot, Phrase[]> = { who: [], did: [], what: [], where: [] };
  const chosen: Partial<Record<Slot, Phrase>> = {};

  function deal(): void {
    const filter = setup.filter();
    for (const slot of ORDER) {
      let pool = phrases(filter).filter((p) => p.slot === slot);
      /* a narrow pick can leave a column with nothing; widen rather than show an empty row */
      if (pool.length < 3) pool = phrases({ levels: filter.levels }).filter((p) => p.slot === slot);
      if (pool.length < 3) pool = phrases().filter((p) => p.slot === slot);
      options[slot] = shuffle(pool).slice(0, 6);
      delete chosen[slot];
    }
    drawCols();
    drawSentence();
  }

  const showHint = () => hintSel.value === 'on';

  function drawCols(): void {
    cols.replaceChildren();
    for (const slot of ORDER) {
      const box = el('div', { class: 'col', vars: { '--col-edge': COLOURS[slot] } },
        el('h3', {}, el('span', { class: 'pip' }), NAMES[slot]));
      const opts = el('div', { class: 'opts' });
      for (const phrase of options[slot]) {
        const s = sound(phrase.sound);
        const button = el('button', {
          class: 'opt' + (chosen[slot]?.text === phrase.text ? ' picked' : ''),
          type: 'button', 'aria-label': phrase.text,
        });
        button.append(marked(phrase.text, phrase.spans, { show: showHint(), tones: s.tones }));
        button.addEventListener('click', () => {
          chosen[slot] = phrase;
          sfx.tap();
          say(phrase.text);
          drawCols();
          drawSentence();
        });
        opts.append(button);
      }
      box.append(opts);
      cols.append(box);
    }
  }

  function drawSentence(): void {
    sentenceEl.replaceChildren();
    for (const slot of ORDER) {
      const phrase = chosen[slot];
      if (!phrase) {
        sentenceEl.append(el('span', { class: 'slot-word', text: NAMES[slot] }));
        continue;
      }
      const s = sound(phrase.sound);
      const span = el('span', {
        class: 'slot-word filled',
        vars: { '--col': COLOURS[slot] + '3D', '--col-edge': COLOURS[slot] },
      });
      span.append(marked(phrase.text, phrase.spans, { show: showHint(), tones: s.tones }));
      sentenceEl.append(span);
    }
    if (ORDER.every((slot) => chosen[slot])) sentenceEl.append(el('span', { text: '!' }));
  }

  const fullSentence = (): string | null =>
    ORDER.every((slot) => chosen[slot]) ? ORDER.map((slot) => chosen[slot]!.text).join(' ') + '!' : null;

  readBtn.addEventListener('click', () => {
    const sentence = fullSentence();
    if (!sentence) { say('Pick one word from every row first'); return; }
    replay(strip, 'read');
    sfx.land();
    say(sentence);
  });

  surpriseBtn.addEventListener('click', () => {
    for (const slot of ORDER) if (options[slot].length) chosen[slot] = pick(options[slot]);
    drawCols();
    drawSentence();
    const sentence = fullSentence();
    if (sentence) { sfx.land(); say(sentence); }
  });

  keepBtn.addEventListener('click', () => {
    const sentence = fullSentence();
    if (!sentence) return;
    savedList.querySelector('.empty')?.remove();
    const row = el('div', { class: 'saved-row' }, el('span', { text: sentence }));
    row.append(
      el('button', { type: 'button', text: '🔊', 'aria-label': 'Read it again', on: { click: () => say(sentence) } }),
      el('button', {
        type: 'button', text: '✕', 'aria-label': 'Remove',
        on: {
          click: () => {
            row.remove();
            if (!savedList.querySelector('.saved-row')) {
              savedList.replaceChildren(el('span', { class: 'empty', text: 'Build one and tap Keep it.' }));
            }
          },
        },
      }),
    );
    savedList.append(row);
    sfx.right();
  });

  savedList.replaceChildren(el('span', { class: 'empty', text: 'Build one and tap Keep it.' }));
  root.append(node);
  deal();
  return () => undefined;
}
