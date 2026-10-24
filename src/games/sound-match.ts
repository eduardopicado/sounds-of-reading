/* Memory Match — flip two cards, keep them if they share the sound.
 *
 * Two modes, as in the prototype: a word with its picture, or two different
 * words that use the same sound (rain / day). Matched sounds collect in the
 * rail along the bottom, which is the bit that makes it feel like a game
 * rather than a drill.
 *
 * Or the school's sight words: two cards with the same word are a pair. The
 * board is dealt in lookalikes (there, their, where), so a match takes
 * reading the whole word, and nothing is said until he has made the pair:
 * there and their sound the same, and hearing them would only mislead. */

import { el, replay } from '../lib/dom';
import { lifetime } from '../lib/life';
import { shuffle, spreadAcross } from '../lib/random';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { setMarked } from '../lib/highlight';
import { fitsAnother, picturable, realWords, sound, uniqueWords, type SightWord, type Word } from '../content/index';
import { TRICKY, sightBoard } from '../content/sight';
import { createSetup, counter, scoreLine, topbar, winOverlay } from '../ui/components';
import { award, awardFace } from '../lib/stickers';
import { pro } from '../lib/settings';

interface Card {
  pairId: number;
  /** the sound a phonics card shares; empty for a sight word */
  soundId: string;
  word: { text: string; picture?: string; spans: Word['spans'] };
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

  const setup = createSetup({ extra: [extra], onChange: () => deal(), sight: 'memory-match' });
  const sightMode = (): boolean => setup.kind() === 'sight';
  const found = counter('Matched');
  const totalEl = el('span', { text: '0' });
  const flips = counter('Flips');
  const board = el('div', { class: 'board' });
  const rail = el('div', { class: 'tokens' });
  const railTitle = el('h2', { text: 'Sounds collected' });
  const win = winOverlay({ title: 'All matched!', onAgain: () => deal() });
  const bar = topbar({
    title: 'Memory', swash: 'Match',
    tagline: 'Flip two cards. Keep them if they share the sound.',
    onSetup: (open) => setup.open(open),
  });
  const tagline = bar.querySelector('.titles .tag');

  const node = el('div', { class: 'wrap' },
    bar,
    setup.switchNode, setup.node,
    scoreLine(el('span', {}, found.node, ' of ', totalEl), flips.node),
    board,
    el('div', { class: 'tray' }, railTitle, rail),
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
    const tones = card.soundId ? sound(card.soundId).tones : TRICKY;
    const front = el('div', { class: 'face front', vars: { '--tone': tones.deep } });
    if (card.asPicture) {
      front.append(el('div', { class: 'pic', text: card.word.picture ?? '❓' }));
    } else if (!card.soundId) {
      /* a sight word plain: the tricky bit lights up once the pair is made */
      front.append(el('div', { class: 'word', text: card.word.text }));
    } else {
      const word = el('div', { class: 'word' });
      setMarked(word, card.word.text, card.word.spans, { tones });
      front.append(word);
    }
    return front;
  }

  /** sight words: the same word twice is a pair, dealt among its lookalikes */
  function chooseSight(): { soundId: string; a: SightWord }[] {
    return sightBoard(setup.sightWords(), Number(pairsSel.value), { twins: true }).map((a) => ({ soundId: '', a }));
  }

  function deal(): void {
    life.clear();
    const sight = sightMode();
    modeSel.hidden = sight;
    railTitle.textContent = sight ? 'Words collected' : 'Sounds collected';
    if (tagline) tagline.textContent = sight ? 'Flip two cards. Keep them if they are the same word.' : 'Flip two cards. Keep them if they share the sound.';
    const mode = sight ? 'same' : modeSel.value;
    const picks = sight ? chooseSight() : chooseWords(mode);
    deck = [];
    picks.forEach((pick, i) => {
      deck.push({ pairId: i, soundId: pick.soundId, word: pick.a, asPicture: false });
      deck.push(mode === 'pic' ? { pairId: i, soundId: pick.soundId, word: pick.a, asPicture: true }
        : mode === 'same' ? { pairId: i, soundId: '', word: pick.a, asPicture: false }
          : { pairId: i, soundId: pick.soundId, word: (pick as { b: Word }).b, asPicture: false });
    });
    deck = shuffle(deck);

    first = null; busy = false; matched = 0; moves = 0;
    practised = [];
    target = picks.length;
    found.set(0); flips.set(0); totalEl.textContent = String(target);
    rail.replaceChildren(el('span', { class: 'empty', text: sight ? 'Match a pair to collect its word.' : 'Match a pair to collect its sound.' }));
    win.hide();

    board.replaceChildren();
    if (!target) {
      board.append(el('p', { class: 'tag', style: { textAlign: 'center' }, text: sight
        ? 'No sight words picked yet — try adding a set.'
        : 'No words for those sounds yet — try adding a level or another sound.' }));
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
    /* a sight word is said once it is matched: there and their would sound
       like a pair before he had read them */
    if (card.soundId) say(card.word.text);

    if (!first) { first = { card, node: button }; return; }

    moves += 1;
    flips.set(moves);
    const second = { card, node: button };

    /* in same-sound mode any two words with the sound are a pair, not only
       the two that were dealt together */
    const pair = !sightMode() && modeSel.value === 'sound'
      ? first.card.soundId === second.card.soundId
      : first.card.pairId === second.card.pairId;
    if (pair) {
      busy = true;
      if (!card.soundId) say(card.word.text);
      life.later(() => {
        first?.node.classList.add('done');
        second.node.classList.add('done');
        if (!card.soundId) {
          /* now the part of it that lies lights up */
          for (const n of [first?.node, second.node]) {
            const w = n?.querySelector('.face.front .word');
            if (w) setMarked(w, card.word.text, card.word.spans, { tones: TRICKY });
          }
        }
        collect(card);
        if (card.soundId) practised.push(card.soundId);
        matched += 1;
        found.set(matched);
        sfx.right();
        first = null; busy = false;
        if (matched === target) {
          life.later(() => {
            /* sight words practise no sound, so their sticker is the game's own */
            const prize = practised.length ? award(practised)?.face : awardFace('memory-match', '🃏').face;
            win.show(`You found all ${target} pairs in ${moves} flips.`, prize);
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

  function collect(card: Card): void {
    rail.querySelector('.empty')?.remove();
    if (!card.soundId) {
      rail.append(el('span', { class: 'tokn', text: card.word.text, vars: { '--tone': TRICKY.light } }));
      return;
    }
    const s = sound(card.soundId);
    rail.append(el('span', { class: 'tokn', text: s.label, vars: { '--tone': s.tones.light } }));
  }

  root.append(node);
  deal();
  return () => { life.end(); win.hide(); };
}
