/* Bingo — the app calls a word, the child finds it written on the card.
 *
 * The caller speaks the word and shows its picture but hides the spelling, so
 * finding it is real reading rather than matching shapes. Every word called is
 * drawn from the child's own card, so the game is always winnable — the queue
 * is the card, shuffled. */

import { el, replay } from '../lib/dom';
import { shuffle } from '../lib/random';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { setMarked } from '../lib/highlight';
import { picturable, realWords, sound, type Word } from '../content/index';
import { createSetup, topbar, winOverlay } from '../ui/components';

interface Cell {
  word?: Word;
  free: boolean;
  marked: boolean;
  node: HTMLButtonElement;
}

export function mount(root: HTMLElement): () => void {
  const sizeSel = el('select', { 'aria-label': 'Card size' },
    el('option', { value: '3', text: '3 × 3 card', selected: 'selected' }),
    el('option', { value: '4', text: '4 × 4 card' }),
  );
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

  const setup = createSetup({ extra: [extra], onChange: () => deal() });

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
    setup.node, caller, grid,
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
    size = Number(sizeSel.value);
    const freeIndex = size === 3 ? 4 : -1;
    const need = size * size - (size === 3 ? 1 : 0);

    /* pictures matter here: the caller shows one instead of the spelling */
    let pool = shuffle(picturable(realWords(setup.filter())));
    if (pool.length < need) {
      /* top up from words without a picture rather than leave the card short */
      const extra = shuffle(realWords(setup.filter())).filter((w) => !pool.includes(w));
      pool = [...pool, ...extra];
    }
    const chosen: Word[] = [];
    const usedText = new Set<string>();
    for (const w of pool) {
      if (chosen.length >= need) break;
      if (usedText.has(w.text)) continue;
      usedText.add(w.text);
      chosen.push(w);
    }

    cells = [];
    grid.replaceChildren();
    grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    if (chosen.length < need) {
      grid.append(el('p', { class: 'tag', style: { textAlign: 'center' }, text: 'Not enough words for a card yet — try adding a level or another sound.' }));
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
      const word = chosen[next];
      next += 1;
      const s = sound(word.sound);
      const node = el('button', { class: 'cell', type: 'button', 'aria-label': word.text, vars: { '--tone': s.tones.deep } });
      setMarked(node, word.text, word.spans, { tones: s.tones });
      const cell: Cell = { word, free: false, marked: false, node };
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
    if (!next?.word) { callBtn.disabled = true; return; }
    current = next;
    calls += 1;
    const s = sound(next.word.sound);
    caller.style.setProperty('--tone', s.tones.deep);
    hint.textContent = 'Find this word on your card';
    pic.textContent = next.word.picture ?? '🔊';
    replay(pic, 'pop');
    setMarked(reveal, next.word.text, next.word.spans, { tones: s.tones });
    reveal.classList.add('hidden');
    showBtn.textContent = 'Show the word';
    againBtn.disabled = false;
    showBtn.disabled = false;
    called.add(next.word.text);
    say(next.word.text);

    calledList.querySelector('.empty')?.remove();
    calledList.append(el('span', { class: 'tokn', text: next.word.text, vars: { '--tone': s.tones.light } }));
    if (!queue.length) callBtn.disabled = true;
  }

  function tap(cell: Cell): void {
    if (won || cell.marked || !cell.word) return;
    if (!called.has(cell.word.text)) {
      sfx.wrong();
      replay(cell.node, 'nope');
      return;
    }
    cell.marked = true;
    cell.node.classList.add('marked');
    sfx.land();
    say(cell.word.text);
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
    window.setTimeout(() => win.show(`You filled ${what} in ${calls} words.`), 450);
  }

  callBtn.addEventListener('click', call);
  againBtn.addEventListener('click', () => { if (current?.word) say(current.word.text); });
  showBtn.addEventListener('click', () => {
    const hidden = reveal.classList.toggle('hidden');
    showBtn.textContent = hidden ? 'Show the word' : 'Hide the word';
  });

  root.append(node);
  deal();
  return () => win.hide();
}
