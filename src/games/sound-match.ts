/* Memory Match — flip two cards, keep them if they share the sound.
 *
 * Two modes, as in the prototype: a word with its picture, or two different
 * words that use the same sound (rain / day). Matched sounds collect in the
 * rail along the bottom, which is the bit that makes it feel like a game
 * rather than a drill. */

import { el, replay } from '../lib/dom';
import { lifetime } from '../lib/life';
import { shuffle, spreadAcross } from '../lib/random';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { setMarked } from '../lib/highlight';
import { fitsAnother, picturable, realWords, sound, uniqueWords, type Sound, type Word } from '../content/index';
import { createSetup, counter, scoreLine, topbar, winOverlay } from '../ui/components';
import { award } from '../lib/stickers';
import { pro } from '../lib/settings';

interface Card {
  pairId: number;
  soundId: string;
  word: Word;
  /** picture cards show the emoji instead of the word */
  asPicture: boolean;
}

export function mount(root: HTMLElement): () => void {
  const life = lifetime();
  const modeSel = el('select', { 'aria-label': 'Matching mode' },
    el('option', { value: 'pic', text: 'Word and picture' }),
    el('option', { value: 'sound', text: 'Two words, same sound' }),
  );
  const pairsSel = el('select', { 'aria-label': 'How many pairs' },
    el('option', { value: '4', text: '4 pairs' }),
    el('option', { value: '6', text: '6 pairs' }),
    el('option', { value: '8', text: '8 pairs' }),
  );
  /* Pro starts with the most to remember */
  pairsSel.value = pro() ? '8' : '6';
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
    const pool = uniqueWords(shuffle(realWords(filter)));
    const wanted = Number(pairsSel.value);
    const bySound = new Map<string, Word[]>();
    for (const w of mode === 'pic' ? picturable(pool) : pool) {
      if (!bySound.has(w.sound)) bySound.set(w.sound, []);
      bySound.get(w.sound)!.push(w);
    }

    if (mode === 'pic') {
      /* a picture on the board belongs to one word only: with sit and desk
         both drawn as a chair, the right chair for "sit" was a coin toss */
      const out: { soundId: string; a: Word }[] = [];
      const pictures = new Set<string>();
      for (const w of spreadAcross([...bySound.values()], pool.length)) {
        if (out.length >= wanted) break;
        if (!w.picture || pictures.has(w.picture)) continue;
        pictures.add(w.picture);
        out.push({ soundId: w.sound, a: w });
      }
      return out;
    }

    /* Same-sound mode: two words that share a sound match, whichever two.
       The sounds on the board must not overlap either — with a and t both in
       play, cat and tap share a t and are not a pair — so every word is
       checked against the other sounds dealt, and a sound left with fewer
       than two clean words drops out. */
    const sounds = shuffle([...bySound.keys()].filter((id) => bySound.get(id)!.length >= 2)).slice(0, wanted);
    const dealt = sounds.map(sound);
    const clean = new Map(sounds.map((id) => [id,
      bySound.get(id)!.filter((w) => !dealt.some((o) => fitsAnother(w, o)))]));
    const out: { soundId: string; a: Word; b: Word }[] = [];
    for (let round = 0; out.length < wanted; round += 1) {
      let took = false;
      for (const id of sounds) {
        if (out.length >= wanted) break;
        const words = clean.get(id)!;
        if (words.length < 2) continue;
        out.push({ soundId: id, a: words.pop()!, b: words.pop()! });
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
    life.clear();
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
        dataset: { i: String(i), sound: card.soundId },
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

    /* in same-sound mode any two words with the sound are a pair, not only
       the two that were dealt together */
    const pair = modeSel.value === 'sound'
      ? first.card.soundId === second.card.soundId
      : first.card.pairId === second.card.pairId;
    if (pair) {
      busy = true;
      life.later(() => {
        first?.node.classList.add('done');
        second.node.classList.add('done');
        collect(card.soundId);
        practised.push(card.soundId);
        matched += 1;
        found.set(matched);
        sfx.right();
        first = null; busy = false;
        if (matched === target) {
          life.later(() => {
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
      const both = [first, second];
      life.later(() => {
        for (const item of both) {
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
  return () => { life.end(); win.hide(); };
}
