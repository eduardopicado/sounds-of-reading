/* Build the Word — hear it, then spell it.
 *
 * Reading goes from letters to sounds; spelling goes back the other way,
 * and it is the harder direction. Hearing "rain" does not say whether it is
 * ai or ay, and only a word built by hand, sound by sound, practises that
 * choice.
 *
 * He hears the word and sees its picture. A slot waits for each sound, and
 * the tiles are the right ones mixed with the wrong ones he is most likely
 * to reach for: ay for ai, e for i, d for b (src/content/spelling.ts). He
 * taps them into the slots in order; a tile in the wrong place bounces back
 * out, the right ones stay and go green, so a second try is a smaller job,
 * not the same one again. Two misses and the word is shown to him.
 *
 * Sound tiles come first — one tile per sound, the way he sounds it out.
 * Letter tiles are the next step, where sh is two tiles and he has to know
 * that; Pro mode starts there.
 *
 * Or the school's sight words, built the way his teacher does it with fridge
 * magnets: letter tiles only, since the whole point of "said" is that it is
 * not built from its sounds. The wrong tiles are the letters he would reach
 * for if he trusted the sound, an e for said and a u for come, and they can
 * never spell a word that sounds the same: no i among the tiles for there,
 * or he could build their (src/content/sight.ts). */

import { el, replay } from '../lib/dom';
import { lifetime } from '../lib/life';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { marked } from '../lib/highlight';
import { pro } from '../lib/settings';
import { coachPick, mark } from '../lib/coach';
import { award, awardFace } from '../lib/stickers';
import { REAL_WORDS, SIGHT_SETS, picturable, realWords, sound, type SightWord, type Span, type Word } from '../content/index';
import { answerFor, tilesFor, type TileMode } from '../content/spelling';
import { TRICKY, buildable, magnetFor, sightTiles, sightWordsIn } from '../content/sight';
import type { Tones } from '../lib/colour';
import { shuffle } from '../lib/random';
import { celebrate, counter, createSetup, resultsTray, scoreLine, topbar } from '../ui/components';

/** the longest word for letter tiles: more slots than this do not fit a phone */
const MAX_LETTERS = 7;

interface Tile { text: string; node: HTMLButtonElement; placed: number | null }

/** a word to build: a phonics word with its picture and sound, or a sight word */
interface Item { text: string; spans: Span[]; tones: Tones; picture?: string; word?: Word; sight?: SightWord }

/* the words a heard sight word must never be built as: every sight word, and
   the phonics words too (right, for write) */
const EVERY_WORD: readonly { text: string }[] = [...sightWordsIn(SIGHT_SETS), ...REAL_WORDS];


export function mount(root: HTMLElement): () => void {
  const lenSel = el('select', { 'aria-label': 'How many words' },
    el('option', { value: '6', text: '6 words' }),
    el('option', { value: '10', text: '10 words' }),
  );
  const modeSel = el('select', { 'aria-label': 'Which tiles' },
    el('option', { value: 'sounds', text: 'Sound tiles (sh · i · p)' }),
    el('option', { value: 'letters', text: 'Letter tiles (s · h · i · p)' }),
  );
  modeSel.value = pro() ? 'letters' : 'sounds';
  lenSel.addEventListener('change', () => start());
  modeSel.addEventListener('change', () => start());
  const setup = createSetup({
    extra: [el('div', { class: 'row' }, el('span', { class: 'lbl', text: 'This game' }), modeSel, lenSel)],
    onChange: () => start(),
    sight: 'build-the-word',
  });
  const sightMode = (): boolean => setup.kind() === 'sight';

  const pos = counter('Word');
  const totalEl = el('span', { text: '0' });
  const firstTry = counter('Right first try');

  const pic = el('div', { class: 'bw-pic', 'aria-hidden': 'true' });
  const hear = el('button', { class: 'btn ghost small', type: 'button', text: '🔊 Say it again',
    on: { click: () => { if (current) say(current.text); } } });
  const slotsEl = el('div', { class: 'bw-slots' });
  const tray = el('div', { class: 'bw-tray' });
  const note = el('p', { class: 'bw-note', 'aria-live': 'polite' });
  const board = el('div', { class: 'bw-board' }, pic, hear, slotsEl, note, tray);

  const resultList = el('ul', {});
  const results = resultsTray('Words you built', resultList,
    el('button', { class: 'btn', type: 'button', text: 'Play again', on: { click: () => start() } }),
  );
  const empty = el('p', { class: 'tag', hidden: 'hidden' });
  const bar = topbar({
    title: 'Build the', swash: 'Word',
    tagline: 'Listen, then build the word, one sound at a time.',
    onSetup: (open) => setup.open(open),
  });
  const tagline = bar.querySelector('.titles .tag');

  const node = el('div', { class: 'wrap' },
    bar,
    setup.switchNode, setup.node,
    scoreLine(el('span', {}, pos.node, ' of ', totalEl), firstTry.node),
    empty, board, results.node,
  );

  let queue: Item[] = [];
  let index = 0;
  let current: Item | null = null;
  let answer: string[] = [];
  let slots: (Tile | null)[] = [];
  let slotNodes: HTMLButtonElement[] = [];
  let tiles: Tile[] = [];
  let locked: boolean[] = [];
  let misses = 0;
  let firsts = 0;
  let busy = false;
  let log: { item: Item; ok: boolean }[] = [];
  /* everything it plans goes through its lifetime, which leaving ends */
  const life = lifetime();
  const later = life.later;

  /* sight words are built from letters, always */
  const mode = (): TileMode => (sightMode() ? 'letters' : modeSel.value as TileMode);
  /* one wrong tile per two right ones, at least two; one more in Pro */
  const wrongCount = (n: number): number => Math.max(2, Math.ceil(n / 2)) + (pro() ? 1 : 0);

  function playable(): Word[] {
    return picturable(realWords(setup.filter())).filter((w) => {
      const a = answerFor(w, mode());
      return a && (mode() === 'sounds' || a.length <= MAX_LETTERS);
    });
  }

  const phonicsItem = (w: Word): Item => ({ text: w.text, spans: w.spans, tones: sound(w.sound).tones, picture: w.picture, word: w });
  const sightItem = (w: SightWord): Item => ({ text: w.text, spans: w.spans, tones: TRICKY, sight: w });

  /* ── drawing ─────────────────────────────────────────────────────────── */

  function drawSlots(): void {
    slotsEl.style.setProperty('--n', String(answer.length));
    slotsEl.classList.toggle('letters', mode() === 'letters');
    slotNodes.forEach((btn, i) => {
      const t = slots[i];
      btn.textContent = t?.text ?? '';
      btn.classList.toggle('filled', !!t);
      btn.classList.toggle('locked', locked[i]);
      btn.setAttribute('aria-label', t ? `Slot ${i + 1}: ${t.text}${locked[i] ? '' : ', tap to take it back'}` : `Slot ${i + 1}, empty`);
    });
    for (const t of tiles) t.node.hidden = t.placed !== null;
  }

  /* ── one word ────────────────────────────────────────────────────────── */

  function showWord(): void {
    const item = queue[index];
    const set = item.sight
      ? sightTiles(item.sight, wrongCount(item.text.length), EVERY_WORD)
      : tilesFor(item.word!, mode(), wrongCount(answerFor(item.word!, mode())?.length ?? 3));
    if (!set) { index += 1; next(); return; }
    current = item;
    answer = set.answer;
    misses = 0;
    busy = false;
    locked = answer.map(() => false);
    slots = answer.map(() => null);
    pos.set(index + 1);
    /* a sight word has no picture: he has only what he hears */
    pic.textContent = item.picture ?? (item.sight ? '👂' : '🔤');
    note.textContent = '';
    note.className = 'bw-note';

    slotsEl.replaceChildren();
    slotNodes = answer.map((_, i) => {
      const btn = el('button', { class: 'bw-slot', type: 'button' });
      btn.addEventListener('click', () => takeBack(i));
      slotsEl.append(btn);
      return btn;
    });

    tray.replaceChildren();
    tiles = set.tiles.map((text) => {
      const node = item.sight
        ? el('button', { class: 'bw-tile magnet', type: 'button', text, vars: { '--magnet': magnetFor(text) } })
        : el('button', { class: 'bw-tile', type: 'button', text });
      const tile: Tile = { text, node, placed: null };
      tile.node.addEventListener('click', () => place(tile));
      tray.append(tile.node);
      return tile;
    });
    drawSlots();
    board.dataset.word = String(index);
    /* hearing it is the question */
    say(item.text);
  }

  function next(): void {
    if (index >= queue.length) { finish(); return; }
    showWord();
  }

  /** a tile into the first empty slot */
  function place(tile: Tile): void {
    if (busy || tile.placed !== null) return;
    const at = slots.findIndex((s) => s === null);
    if (at < 0) return;
    sfx.tap();
    tile.placed = at;
    slots[at] = tile;
    drawSlots();
    if (slots.every(Boolean)) later(check, 250);
  }

  /** a tile back out of its slot, unless it is already locked in as right */
  function takeBack(i: number): void {
    const tile = slots[i];
    if (busy || !tile || locked[i]) return;
    tile.placed = null;
    slots[i] = null;
    drawSlots();
  }

  function check(): void {
    const item = current;
    if (!item) return;
    busy = true;
    const right = slots.every((t, i) => t?.text === answer[i]);
    if (right) {
      locked = answer.map(() => true);
      drawSlots();
      slotsEl.classList.add('done');
      const ok = misses === 0;
      if (ok) { firsts += 1; firstTry.set(firsts); }
      if (item.word) mark(item.word, ok);
      log.push({ item, ok });
      sfx.right();
      note.className = 'bw-note good';
      /* for a sight word, this is where the part that lies lights up */
      note.replaceChildren(marked(item.text, item.spans, { tones: item.tones }), ' ✓');
      say(item.text);
      later(() => { slotsEl.classList.remove('done'); index += 1; next(); }, 1400);
      return;
    }

    misses += 1;
    if (misses === 1 && item.word) mark(item.word, false);
    sfx.wrong();
    /* the right ones stay and lock; the wrong ones bounce back to the tray */
    slots.forEach((t, i) => {
      if (!t) return;
      if (t.text === answer[i]) { locked[i] = true; return; }
      replay(slotNodes[i], 'nope');
    });
    later(() => {
      slots.forEach((t, i) => {
        if (t && !locked[i]) { t.placed = null; slots[i] = null; }
      });
      if (misses >= 2) { showAnswer(item); return; }
      note.className = 'bw-note';
      note.textContent = 'Nearly! The green ones are right. Listen again and try the rest.';
      drawSlots();
      busy = false;
      say(item.text);
    }, 600);
  }

  /** two misses: build it for him, so the round ends on the right spelling */
  function showAnswer(item: Item): void {
    const free = [...tiles];
    answer.forEach((text, i) => {
      if (locked[i]) return;
      const t = free.find((x) => x.text === text && x.placed === null && !slots.includes(x));
      if (t) { t.placed = i; slots[i] = t; }
      locked[i] = true;
    });
    drawSlots();
    log.push({ item, ok: false });
    note.className = 'bw-note';
    note.replaceChildren('It is spelled ', marked(item.text, item.spans, { tones: item.tones }), '.');
    say(item.text);
    later(() => { index += 1; next(); }, 2200);
  }

  /* ── the round ───────────────────────────────────────────────────────── */

  function start(): void {
    life.clear();
    const sight = sightMode();
    modeSel.hidden = sight;
    if (tagline) tagline.textContent = sight ? 'Listen, then build the word from the letters.' : 'Listen, then build the word, one sound at a time.';
    empty.textContent = sight
      ? 'No sight words to build here yet. Try adding another set.'
      : 'Not enough words with pictures here yet. Try adding a level or another sound.';
    queue = sight
      ? shuffle(setup.sightWords().filter(buildable)).slice(0, Number(lenSel.value)).map(sightItem)
      : coachPick(playable(), Number(lenSel.value)).map(phonicsItem);
    index = 0; firsts = 0; log = []; current = null;
    firstTry.set(0);
    totalEl.textContent = String(queue.length);
    results.hide();
    const none = !queue.length;
    empty.hidden = !none;
    board.hidden = none;
    if (!none) next();
  }

  function finish(): void {
    current = null;
    board.hidden = true;
    resultList.replaceChildren();
    for (const entry of log) {
      const li = el('li', { class: entry.ok ? '' : 'miss' });
      if (entry.item.picture) li.append(el('span', { class: 'mk-pic', text: entry.item.picture }), ' ');
      li.append(marked(entry.item.text, entry.item.spans, { tones: entry.item.tones }));
      if (!entry.ok) li.append(el('span', { class: 'mk', text: 'again' }));
      resultList.append(li);
    }
    const practised = log.flatMap((e) => (e.item.word ? [e.item.word.sound] : []));
    /* sight words practise no sound, so their sticker is the game's own */
    const sticker = practised.length ? award(practised) : awardFace('build-the-word', '🔤');
    results.show(sticker);
    celebrate(firsts === log.length ? 'Every one right!' : 'Good spelling!');
  }

  root.append(node);
  start();
  return life.end;
}
