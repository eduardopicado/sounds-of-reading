/* Memory Match — flip two cards, keep them if they share the sound.
 *
 * Two modes, as in the prototype: a word with its picture, or two different
 * words that use the same sound (rain / day). Matched sounds collect in the
 * rail along the bottom, which is the bit that makes it feel like a game
 * rather than a drill. */

import { el, replay } from '../lib/dom';
import { shuffle, spreadAcross } from '../lib/random';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { setMarked } from '../lib/highlight';
import { picturable, realWords, sound, type Sound, type Word } from '../content/index';
import { createSetup, counter, scoreLine, topbar, winOverlay } from '../ui/components';
import { award } from '../lib/stickers';

interface Card {
  pairId: number;
  soundId: string;
  word: Word;
  /** picture cards show the emoji instead of the word */
  asPicture: boolean;
}

export function mount(root: HTMLElement): () => void {
  const modeSel = el('select', { 'aria-label': 'Matching mode' },
    el('option', { value: 'pic', text: 'Word and picture' }),
    el('option', { value: 'sound', text: 'Two words, same sound' }),
  );
  const pairsSel = el('select', { 'aria-label': 'How many pairs' },
    el('option', { value: '4', text: '4 pairs' }),
    el('option', { value: '6', text: '6 pairs', selected: 'selected' }),
    el('option', { value: '8', text: '8 pairs' }),
  );
  const extra = el('div', { class: 'row' },
    el('span', { class: 'lbl', text: 'This game' }), modeSel, pairsSel,
  );
  modeSel.addEventListener('change', () => deal());
  pairsSel.addEventListener('change', () => deal());

  const setup = createSetup({ extra: [extra], onChange: () => deal() });
  const found = counter('Matched');
  const totalEl = el('span', { text: '0' });
  const flips = counter('Flips');
  const board = el('div', { class: 'board' });
  const rail = el('div', { class: 'tokens' });
  const win = winOverlay({ title: 'All matched!', onAgain: () => deal() });

  const node = el('div', { class: 'wrap' },
    topbar({
      title: 'Memory', swash: 'Match',
      tagline: 'Flip two cards. Keep them if they share the sound.',
      onSetup: (open) => setup.open(open),
    }),
    setup.node,
    scoreLine(el('span', {}, found.node, ' of ', totalEl), flips.node),
    board,
    el('div', { class: 'tray' }, el('h2', { text: 'Sounds collected' }), rail),
    el('div', { class: 'row', style: { justifyContent: 'center', marginTop: '14px' } },
      el('button', { class: 'btn', type: 'button', text: 'New game', on: { click: () => deal() } }),
    ),
    win.node,
  );

  let deck: Card[] = [];
  let first: { card: Card; node: HTMLElement } | null = null;
  let busy = false;
  let matched = 0;
  let moves = 0;
  let target = 0;
  let practised: string[] = [];

  function chooseWords(mode: string): { soundId: string; a: Word; b?: Word }[] {
    const filter = setup.filter();
    const pool = realWords(filter);
    const wanted = Number(pairsSel.value);
    const bySound = new Map<string, Word[]>();
    for (const w of mode === 'pic' ? picturable(pool) : pool) {
      if (!bySound.has(w.sound)) bySound.set(w.sound, []);
      bySound.get(w.sound)!.push(w);
    }
    const groups = [...bySound.values()].filter((g) => g.length >= (mode === 'pic' ? 1 : 2));
    if (!groups.length) return [];
    if (mode === 'pic') {
      return spreadAcross(groups, wanted).map((w) => ({ soundId: w.sound, a: w }));
    }
    /* same-sound mode needs two different words from one sound */
    const out: { soundId: string; a: Word; b: Word }[] = [];
    const pools = groups.map((g) => shuffle(g));
    for (let round = 0; out.length < wanted; round += 1) {
      let took = false;
      for (const p of pools) {
        if (out.length >= wanted) break;
        if (p.length < 2) continue;
        const a = p.pop()!;
        const b = p.pop()!;
        out.push({ soundId: a.sound, a, b });
        took = true;
      }
      if (!took) break;
    }
    return out;
  }

  function cardFace(card: Card): HTMLElement {
    const s: Sound = sound(card.soundId);
    const front = el('div', { class: 'face front', vars: { '--tone': s.tones.deep } });
    if (card.asPicture) {
      front.append(el('div', { class: 'pic', text: card.word.picture ?? '❓' }));
    } else {
      const word = el('div', { class: 'word' });
      setMarked(word, card.word.text, card.word.spans, { tones: s.tones });
      front.append(word);
    }
    return front;
  }

  function deal(): void {
    const mode = modeSel.value;
    const picks = chooseWords(mode);
    deck = [];
    picks.forEach((pick, i) => {
      deck.push({ pairId: i, soundId: pick.soundId, word: pick.a, asPicture: false });
      deck.push(mode === 'pic'
        ? { pairId: i, soundId: pick.soundId, word: pick.a, asPicture: true }
        : { pairId: i, soundId: pick.soundId, word: pick.b!, asPicture: false });
    });
    deck = shuffle(deck);

    first = null; busy = false; matched = 0; moves = 0;
    practised = [];
    target = picks.length;
    found.set(0); flips.set(0); totalEl.textContent = String(target);
    rail.replaceChildren(el('span', { class: 'empty', text: 'Match a pair to collect its sound.' }));
    win.hide();

    board.replaceChildren();
    if (!target) {
      board.append(el('p', { class: 'tag', style: { textAlign: 'center' }, text: 'No words for those sounds yet — try adding a level or another sound.' }));
      return;
    }
    deck.forEach((card, i) => {
      const button = el('button', {
        class: 'card', type: 'button', 'aria-label': 'Face down card',
        dataset: { i: String(i) },
      }, el('div', { class: 'inner' }, el('div', { class: 'face back' }), cardFace(card)));
      button.addEventListener('click', () => flip(button, card));
      board.append(button);
    });
  }

  function flip(button: HTMLElement, card: Card): void {
    if (busy || button.classList.contains('flipped') || button.classList.contains('done')) return;
    button.classList.add('flipped');
    button.setAttribute('aria-label', card.asPicture ? `picture of ${card.word.text}` : card.word.text);
    sfx.tap();
    say(card.word.text);

    if (!first) { first = { card, node: button }; return; }

    moves += 1;
    flips.set(moves);
    const second = { card, node: button };

    if (first.card.pairId === second.card.pairId) {
      busy = true;
      window.setTimeout(() => {
        first?.node.classList.add('done');
        second.node.classList.add('done');
        collect(card.soundId);
        practised.push(card.soundId);
        matched += 1;
        found.set(matched);
        sfx.right();
        first = null; busy = false;
        if (matched === target) {
          window.setTimeout(() => {
            win.show(`You found all ${target} pairs in ${moves} flips.`, award(practised)?.face);
            say('Well done!');
          }, 350);
        }
      }, 400);
    } else {
      busy = true;
      sfx.wrong();
      replay(first.node, 'wrong');
      replay(second.node, 'wrong');
      const pair = [first, second];
      window.setTimeout(() => {
        for (const item of pair) {
          item.node.classList.remove('flipped', 'wrong');
          item.node.setAttribute('aria-label', 'Face down card');
        }
        first = null; busy = false;
      }, 950);
    }
  }

  function collect(soundId: string): void {
    rail.querySelector('.empty')?.remove();
    const s = sound(soundId);
    rail.append(el('span', { class: 'tokn', text: s.label, vars: { '--tone': s.tones.light } }));
  }

  root.append(node);
  deal();
  return () => win.hide();
}
