/* Bingo — the app calls a word, the child finds it written on the card.
 *
 * The caller speaks the word and shows its picture but hides the spelling, so
 * finding it is real reading rather than matching shapes. Every word called is
 * drawn from the child's own card, so the game is always winnable — the queue
 * is the card, shuffled.
 *
 * Or the school's sight words, the way his teacher plays it: a sight word has
 * no picture, so the caller only says it. The card is dealt in little groups
 * of lookalikes (there, where, here), and never with two words that sound the
 * same, since "there" would then have two right answers. */

import { el, replay } from '../lib/dom';
import { lifetime } from '../lib/life';
import { shuffle } from '../lib/random';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { setMarked } from '../lib/highlight';
import { picturable, realWords, sound, type Span, type Word } from '../content/index';
import { TRICKY, sightBoard } from '../content/sight';
import type { Tones } from '../lib/colour';
import { createSetup, topbar, winOverlay } from '../ui/components';
import { award, awardFace } from '../lib/stickers';
import { pro } from '../lib/settings';
import { mark } from '../lib/coach';

/** a word on the card: a phonics word, with its sound, or a sight word */
interface Entry { text: string; spans: Span[]; tones: Tones; picture?: string; word?: Word }

interface Cell {
  entry?: Entry;
  free: boolean;
  marked: boolean;
  node: HTMLButtonElement;
}

const phonics = (w: Word): Entry => ({ text: w.text, spans: w.spans, tones: sound(w.sound).tones, picture: w.picture, word: w });

export function mount(root: HTMLElement): () => void {
  const life = lifetime();
  const sizeSel = el('select', { 'aria-label': 'Card size' },
    el('option', { value: '3', text: '3 × 3 card' }),
    el('option', { value: '4', text: '4 × 4 card' }),
  );
  /* Pro starts on the big card */
  sizeSel.value = pro() ? '4' : '3';
  const goalSel = el('select', { 'aria-label': 'How to win' },
    el('option', { value: 'line', text: 'Win on a line', selected: 'selected' }),
    el('option', { value: 'full', text: 'Win on a full card' }),
  );
  const extra = el('div', { class: 'row' },
    el('span', { class: 'lbl', text: 'This game' }), sizeSel, goalSel,
    el('button', { class: 'btn ghost small', type: 'button', text: '🖨 Print card', on: { click: () => window.print() } }),
  );
  sizeSel.addEventListener('change', () => deal());
  goalSel.addEventListener('change', () => deal());

  const setup = createSetup({ extra: [extra], onChange: () => deal(), sight: 'bingo' });

  const hint = el('div', { class: 'hint', text: 'Ready when you are' });
  const pic = el('div', { class: 'pic', text: '🎲' });
  const reveal = el('div', { class: 'reveal hidden' });
  const callBtn = el('button', { class: 'btn', type: 'button', text: 'Call a word' });
  const againBtn = el('button', { class: 'btn ghost on-paper', type: 'button', text: '🔊 Again', disabled: 'disabled' });
  const showBtn = el('button', { class: 'btn ghost on-paper', type: 'button', text: 'Show the word', disabled: 'disabled' });
  const caller = el('div', { class: 'caller' }, hint, pic, reveal,
    el('div', { class: 'actions' }, callBtn, againBtn, showBtn));

  const grid = el('div', { class: 'card-grid' });
  const calledList = el('div', { class: 'tokens' });
  const win = winOverlay({ title: 'Bingo!', onAgain: () => deal(), againLabel: 'New card' });

  const node = el('div', { class: 'wrap' },
    topbar({
      title: 'Sound', swash: 'Bingo',
      tagline: 'Listen to the word. Find it on your card. Tap it.',
      onSetup: (open) => setup.open(open),
    }),
    setup.switchNode, setup.node, caller, grid,
    el('div', { class: 'tray no-print' }, el('h2', { text: 'Words called' }), calledList),
    win.node,
  );

  let cells: Cell[] = [];
  let queue: Cell[] = [];
  let current: Cell | null = null;
  let called = new Set<string>();
  let calls = 0;
  let won = false;
  let size = 3;

  function deal(): void {
    life.clear();
    size = Number(sizeSel.value);
    const freeIndex = size === 3 ? 4 : -1;
    const need = size * size - (size === 3 ? 1 : 0);

    const chosen: Entry[] = [];
    if (setup.kind() === 'sight') {
      for (const w of sightBoard(setup.sightWords(), need)) chosen.push({ text: w.text, spans: w.spans, tones: TRICKY });
    } else {
      /* pictures matter here: the caller shows one instead of the spelling */
      let pool = shuffle(picturable(realWords(setup.filter())));
      if (pool.length < need) {
        /* top up from words without a picture rather than leave the card short */
        const extra = shuffle(realWords(setup.filter())).filter((w) => !pool.includes(w));
        pool = [...pool, ...extra];
      }
      const usedText = new Set<string>();
      for (const w of pool) {
        if (chosen.length >= need) break;
        if (usedText.has(w.text)) continue;
        usedText.add(w.text);
        chosen.push(phonics(w));
      }
    }

    cells = [];
    grid.replaceChildren();
    grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    if (chosen.length < need) {
      grid.append(el('p', { class: 'tag', style: { textAlign: 'center' }, text: setup.kind() === 'sight'
        ? 'Not enough sight words for a card yet — try adding another set.'
        : 'Not enough words for a card yet — try adding a level or another sound.' }));
      callBtn.disabled = true;
      return;
    }

    let next = 0;
    for (let i = 0; i < size * size; i += 1) {
      if (i === freeIndex) {
        const node = el('button', { class: 'cell free marked', type: 'button', text: '⭐', 'aria-label': 'Free space' });
        cells.push({ free: true, marked: true, node });
        grid.append(node);
        continue;
      }
      const entry = chosen[next];
      next += 1;
      const node = el('button', { class: 'cell', type: 'button', 'aria-label': entry.text, vars: { '--tone': entry.tones.deep } });
      /* a sight word's tricky bit lights up once he has found it, not before */
      if (entry.word) setMarked(node, entry.text, entry.spans, { tones: entry.tones });
      else node.textContent = entry.text;
      const cell: Cell = { entry, free: false, marked: false, node };
      node.addEventListener('click', () => tap(cell));
      cells.push(cell);
      grid.append(node);
    }

    queue = shuffle(cells.filter((c) => !c.free));
    current = null; called = new Set(); calls = 0; won = false;
    calledList.replaceChildren(el('span', { class: 'empty', text: 'No words yet.' }));
    pic.textContent = '🎲';
    reveal.replaceChildren();
    reveal.classList.add('hidden');
    hint.textContent = 'Ready when you are';
    caller.style.removeProperty('--tone');
    callBtn.disabled = false;
    againBtn.disabled = true;
    showBtn.disabled = true;
    showBtn.textContent = 'Show the word';
    win.hide();
  }

  function call(): void {
    if (won) return;
    const next = queue.pop();
    if (!next?.entry) { callBtn.disabled = true; return; }
    current = next;
    calls += 1;
    const entry = next.entry;
    caller.style.setProperty('--tone', entry.tones.deep);
    hint.textContent = 'Find this word on your card';
    /* a sight word has no picture: the caller only says it */
    pic.textContent = entry.picture ?? '🔊';
    replay(pic, 'pop');
    setMarked(reveal, entry.text, entry.spans, { tones: entry.tones });
    reveal.classList.add('hidden');
    showBtn.textContent = 'Show the word';
    againBtn.disabled = false;
    showBtn.disabled = false;
    called.add(entry.text);
    say(entry.text);

    calledList.querySelector('.empty')?.remove();
    calledList.append(el('span', { class: 'tokn', text: entry.text, vars: { '--tone': entry.tones.light } }));
    if (!queue.length) callBtn.disabled = true;
  }

  function tap(cell: Cell): void {
    const entry = cell.entry;
    if (won || cell.marked || !entry) return;
    if (!called.has(entry.text)) {
      sfx.wrong();
      replay(cell.node, 'nope');
      /* the word he was listening for is the one he missed */
      if (current?.entry?.word) mark(current.entry.word, false);
      return;
    }
    if (entry.word) mark(entry.word, true);
    else setMarked(cell.node, entry.text, entry.spans, { tones: entry.tones });
    cell.marked = true;
    cell.node.classList.add('marked');
    sfx.land();
    say(entry.text);
    checkWin();
  }

  function lines(): number[][] {
    const out: number[][] = [];
    for (let r = 0; r < size; r += 1) out.push([...Array(size)].map((_, c) => r * size + c));
    for (let c = 0; c < size; c += 1) out.push([...Array(size)].map((_, r) => r * size + c));
    out.push([...Array(size)].map((_, i) => i * size + i));
    out.push([...Array(size)].map((_, i) => i * size + (size - 1 - i)));
    return out;
  }

  function checkWin(): void {
    if (goalSel.value === 'full') {
      if (cells.every((c) => c.marked)) {
        for (const c of cells) c.node.classList.add('win');
        finish('the whole card');
      }
      return;
    }
    for (const line of lines()) {
      if (line.every((i) => cells[i]?.marked)) {
        for (const i of line) cells[i].node.classList.add('win');
        finish('a line');
        return;
      }
    }
  }

  function finish(what: string): void {
    won = true;
    callBtn.disabled = true;
    say('Bingo! Well done!');
    const practised = cells.flatMap((c) => (c.marked && c.entry?.word ? [c.entry.word.sound] : []));
    /* sight words practise no sound, so their sticker is the game's own */
    const prize = practised.length ? award(practised)?.face : awardFace('bingo', '🎯').face;
    life.later(() => win.show(`You filled ${what} in ${calls} words.`, prize), 450);
  }

  callBtn.addEventListener('click', call);
  againBtn.addEventListener('click', () => { if (current?.entry) say(current.entry.text); });
  showBtn.addEventListener('click', () => {
    const hidden = reveal.classList.toggle('hidden');
    showBtn.textContent = hidden ? 'Show the word' : 'Hide the word';
  });

  root.append(node);
  deal();
  return () => { life.end(); win.hide(); };
}
