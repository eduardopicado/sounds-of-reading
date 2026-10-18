/* Word Search — find the hidden words in a grid of letters.
 *
 * Finding a word in a grid is reading it letter by letter, in order, again
 * and again: the first letter, then is the next one right, then the next. So
 * it suits his tricky words, which have to be known by their letters rather
 * than sounded out, and it is how he meets words he cannot sound out yet —
 * countries, cities, planets — with a picture or a flag beside each one and
 * the word said when he taps it.
 *
 * He drags across a word from its first letter to its last, or taps the
 * first letter and then the last. A found word is circled and said aloud,
 * and its tricky letters or its sound light up in the list; until then the
 * grid is plain letters, so the colours give nothing away.
 *
 * The grids start small, with every word going across; then down too, and
 * bigger. Years 3–4 add slants and backwards words. A grid found with no help
 * moves him up a step. The grid prints as a sheet for paper and pencil. */

import { el } from '../lib/dom';
import { lifetime } from '../lib/life';
import { read, write } from '../lib/storage';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { awardFace } from '../lib/stickers';
import { marked } from '../lib/highlight';
import { tonesFor, type Tones } from '../lib/colour';
import { settings } from '../lib/settings';
import { ALL_SIGHT_WORDS, realWords, sound, uniqueWords, type Span } from '../content/index';
import {
  SEARCH_STEPS, THEMES, cellsOf, lineCells, makeGrid, pickWords, wordAt, type Cell, type Grid, type Placed,
} from '../content/word-search';
import { celebrate, chip, counter, resultsTray, scoreLine, topbar } from '../ui/components';
import { svg } from '../ui/writing';

const LIST_KEY = 'search-list';
/* the progress card on the grown-ups page reads every ladder from here */
const STEP_KEY = 'maths-step:word-search';

/** a word to find, as the list shows it */
interface Entry {
  text: string;
  shown: string;
  picture?: string;
  /** the letters to light up once it is found, and their colour */
  spans?: Span[];
  tones?: Tones;
}

/* the same tone Tricky Words uses for the letters that lie */
const TRICKY = tonesFor(350);

/** the circles round found words, one colour each */
const RINGS = ['#F3B229', '#79D3B0', '#7FA8F0', '#EF7A5A', '#B38FE0', '#4FB0C6', '#E58FB3', '#9CCB5B'];

interface ListChoice { id: string; name: string; picture: string; entries: () => Entry[] }

/** his tricky words, from the school's sets up to the level he is on */
function trickyEntries(): Entry[] {
  const levels = settings().levels;
  const upTo = levels.length ? Math.max(...levels) : 8;
  return ALL_SIGHT_WORDS.filter((w) => w.level !== null && w.level <= upTo)
    .map((w) => ({ text: w.text, shown: w.text, spans: w.spans, tones: TRICKY }));
}

/** this week's sounds, as every reading game takes them */
function soundEntries(): Entry[] {
  const { sounds, levels } = settings();
  return uniqueWords(realWords({ sounds, levels }))
    .map((w) => ({ text: w.text, shown: w.text, picture: w.picture, spans: w.spans, tones: sound(w.sound).tones }));
}

const LISTS: ListChoice[] = [
  { id: 'tricky', name: 'Tricky words', picture: '🧠', entries: trickyEntries },
  { id: 'sounds', name: "This week's sounds", picture: '🔤', entries: soundEntries },
  ...THEMES.map((t) => ({ id: t.id, name: t.name, picture: t.picture, entries: (): Entry[] => t.words })),
];

const savedStep = (): number => Math.min(SEARCH_STEPS.length - 1, Math.max(0, read<number>(STEP_KEY, 0) || 0));
const savedList = (): ListChoice => LISTS.find((l) => l.id === read<string>(LIST_KEY, 'tricky')) ?? LISTS[0];

const same = (a: Cell, b: Cell): boolean => a[0] === b[0] && a[1] === b[1];

export function mount(root: HTMLElement): () => void {
  const life = lifetime();
  let list = savedList();
  let stepAt = savedStep();

  /* ── setup: which words, how big a grid, and the printed sheet ──────── */

  const listRow = el('div', { class: 'row' });
  function drawLists(): void {
    listRow.replaceChildren(el('span', { class: 'lbl', text: 'Words' }));
    for (const l of LISTS) {
      listRow.append(chip(`${l.picture} ${l.name}`, l.id === list.id, () => {
        list = l;
        write(LIST_KEY, l.id);
        drawLists();
        start();
      }));
    }
  }
  const stepSel = el('select', { 'aria-label': 'Grid' },
    ...SEARCH_STEPS.map((s, i) => el('option', { value: String(i), text: `${i + 1}. ${s.name}` })));
  stepSel.addEventListener('change', () => {
    stepAt = Number(stepSel.value);
    write(STEP_KEY, stepAt);
    start();
  });
  const printBtn = el('button', { class: 'btn ghost small', type: 'button', text: '🖨 Print this puzzle', on: { click: () => printSheet() } });
  const panel = el('div', { class: 'panel', hidden: 'hidden' },
    listRow,
    el('div', { class: 'row' }, el('span', { class: 'lbl', text: 'Grid' }), stepSel),
    el('div', { class: 'row' }, printBtn),
  );

  /* ── the board ──────────────────────────────────────────────────────── */

  const found = counter('Found');
  const totalEl = el('span', { text: '0' });
  const told = el('p', { class: 'ws-told' });
  const gridEl = el('div', { class: 'ws-grid', role: 'group', 'aria-label': 'The letters' });
  const marks = svg('svg', { class: 'ws-marks', 'aria-hidden': 'true' });
  const wrapEl = el('div', { class: 'ws-wrap' }, gridEl, marks);
  const listEl = el('ul', { class: 'ws-list' });
  const helpBtn = el('button', { class: 'btn ghost', type: 'button', text: '👀 Help me find one', on: { click: () => help() } });
  const board = el('div', { class: 'ws-board' }, wrapEl,
    el('div', { class: 'ws-side' }, el('h2', { class: 'ws-find', text: 'Find these words' }), listEl, helpBtn));

  const resultList = el('ul', { class: 'ws-results' });
  const results = resultsTray('Every word found', resultList,
    el('button', { class: 'btn', type: 'button', text: 'Next grid', on: { click: () => start() } }),
    el('button', { class: 'btn ghost', type: 'button', text: '🖨 Print one', on: { click: () => { start(); printSheet(); } } }),
  );

  const node = el('div', { class: 'wrap' },
    topbar({
      title: 'Word', swash: 'Search',
      tagline: 'Find the hidden words. Drag across a word, or tap its first and last letter.',
      onSetup: (open) => { panel.hidden = !open; },
    }),
    panel,
    scoreLine(el('span', {}, found.node, ' of ', totalEl), el('span', { class: 'ws-step' })),
    told, board, results.node,
  );

  /* the printed sheet lives outside the app, so print styles can show only it */
  const sheet = el('div', { class: 'tr-print ws-print', 'aria-hidden': 'true' });

  /* ── the round ──────────────────────────────────────────────────────── */

  let grid: Grid | null = null;
  let entries = new Map<string, Entry>();
  let done = new Set<string>();
  let hints = 0;
  let cells: HTMLButtonElement[] = [];
  const selection = svg('line', { class: 'ws-sel' });

  function start(): void {
    life.clear();
    const step = SEARCH_STEPS[stepAt];
    stepSel.value = String(stepAt);
    /* a list with nothing that fits (this week's sounds, all two letters
       long) falls back to his tricky words rather than an empty grid */
    let pool = list.entries();
    let words = pickWords(pool.map((e) => e.text), step.count, step.size);
    if (!words.length) {
      pool = LISTS[0].entries();
      words = pickWords(pool.map((e) => e.text), step.count, step.size);
    }
    entries = new Map(pool.filter((e) => words.includes(e.text)).map((e) => [e.text, e]));
    grid = makeGrid(words, step);
    done = new Set();
    hints = 0;
    pending = null;
    found.set(0);
    totalEl.textContent = String(grid.placed.length);
    node.querySelector('.ws-step')!.textContent = `${list.picture} ${list.name} · ${step.name}`;
    told.textContent = step.told;
    results.hide();
    board.hidden = false;
    drawGrid(grid);
    drawList(grid);
  }

  function drawGrid(g: Grid): void {
    gridEl.style.setProperty('--n', String(g.size));
    gridEl.dataset.size = String(g.size);
    cells = [];
    gridEl.replaceChildren();
    for (let y = 0; y < g.size; y += 1) {
      for (let x = 0; x < g.size; x += 1) {
        const letter = g.letters[y][x];
        const b = el('button', {
          class: 'ws-cell', type: 'button', text: letter, dataset: { at: `${x},${y}` },
          'aria-label': `${letter}, row ${y + 1}, letter ${x + 1}`,
        }) as HTMLButtonElement;
        /* a keyboard press is a tap; a finger is handled by the pointer events */
        b.addEventListener('click', (e) => { if (e.detail === 0) tap([x, y]); });
        cells.push(b);
        gridEl.append(b);
      }
    }
    marks.setAttribute('viewBox', `0 0 ${g.size} ${g.size}`);
    marks.replaceChildren(selection);
    hideSelection();
  }

  function drawList(g: Grid): void {
    listEl.replaceChildren(...g.placed.map((p) => {
      const e = entries.get(p.text)!;
      const word = el('span', { class: 'ws-word', text: e.shown });
      /* a word he cannot read yet is said when he taps it */
      return el('li', { dataset: { word: p.text, from: p.from.join(), to: p.to.join() } },
        el('button', { class: 'ws-say', type: 'button', 'aria-label': `Say ${e.shown}`, on: { click: () => say(e.shown) } },
          e.picture ? el('span', { class: 'ws-pic', text: e.picture, 'aria-hidden': 'true' }) : '', word));
    }));
  }

  /* ── choosing letters: a drag, or two taps ──────────────────────────── */

  let dragFrom: Cell | null = null;
  let dragTo: Cell | null = null;
  let moved = false;
  /** the first letter, tapped, waiting for the last */
  let pending: Cell | null = null;

  const cellAt = (e: PointerEvent): Cell | null => {
    if (!grid) return null;
    const box = gridEl.getBoundingClientRect();
    const x = Math.floor(((e.clientX - box.left) / box.width) * grid.size);
    const y = Math.floor(((e.clientY - box.top) / box.height) * grid.size);
    const clamp = (v: number): number => Math.min(grid!.size - 1, Math.max(0, v));
    return [clamp(x), clamp(y)];
  };

  /** the nearest straight line from a cell towards where the finger is */
  function snap(from: Cell, to: Cell): Cell {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    if (!dx && !dy) return from;
    const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
    const [sx, sy] = [Math.round(Math.cos(angle)), Math.round(Math.sin(angle))];
    let n = Math.max(Math.abs(dx), Math.abs(dy));
    const inside = (k: number): boolean => {
      const [x, y] = [from[0] + sx * k, from[1] + sy * k];
      return x >= 0 && y >= 0 && x < grid!.size && y < grid!.size;
    };
    while (n > 0 && !inside(n)) n -= 1;
    return [from[0] + sx * n, from[1] + sy * n];
  }

  function showSelection(from: Cell, to: Cell): void {
    selection.setAttribute('x1', String(from[0] + 0.5));
    selection.setAttribute('y1', String(from[1] + 0.5));
    selection.setAttribute('x2', String(to[0] + 0.5));
    selection.setAttribute('y2', String(to[1] + 0.5));
    selection.classList.remove('miss');
    selection.style.display = '';
  }
  function hideSelection(): void { selection.style.display = 'none'; }

  gridEl.addEventListener('pointerdown', (e) => {
    const c = cellAt(e);
    if (!c || !grid || done.size === grid.placed.length) return;
    e.preventDefault();
    try { gridEl.setPointerCapture(e.pointerId); } catch { /* an old browser: the drag still works over the grid */ }
    dragFrom = c;
    dragTo = c;
    moved = false;
    showSelection(c, c);
  });
  gridEl.addEventListener('pointermove', (e) => {
    if (!dragFrom) return;
    const c = cellAt(e);
    if (!c) return;
    dragTo = snap(dragFrom, c);
    if (!same(dragTo, dragFrom)) moved = true;
    showSelection(dragFrom, dragTo);
  });
  const endDrag = (): void => {
    if (!dragFrom || !dragTo) return;
    const [from, to] = [dragFrom, dragTo];
    dragFrom = null;
    if (moved) { pending = null; markPending(); choose(from, to); } else tap(from);
  };
  gridEl.addEventListener('pointerup', endDrag);
  gridEl.addEventListener('pointercancel', () => { dragFrom = null; hideSelection(); });

  function markPending(): void {
    for (const c of cells) c.classList.remove('first');
    if (pending && grid) cells[pending[1] * grid.size + pending[0]].classList.add('first');
  }

  /** a tap: the first letter, or the last one when the first is waiting */
  function tap(c: Cell): void {
    if (pending && !same(pending, c)) {
      const from = pending;
      pending = null;
      markPending();
      choose(from, c);
      return;
    }
    sfx.tap();
    pending = pending && same(pending, c) ? null : c;
    markPending();
    if (pending) showSelection(c, c); else hideSelection();
  }

  /** is there a hidden word from here to there? */
  function choose(from: Cell, to: Cell): void {
    if (!grid) return;
    const p = lineCells(from, to) ? wordAt(grid, from, to) : undefined;
    if (p && !done.has(p.text)) { findWord(p); return; }
    if (p) { hideSelection(); return; }
    /* not a word: the line shows red for a moment, and nothing is lost */
    sfx.wrong();
    if (lineCells(from, to)) showSelection(from, to);
    selection.classList.add('miss');
    life.later(hideSelection, 500);
  }

  function findWord(p: Placed): void {
    if (!grid) return;
    hideSelection();
    done.add(p.text);
    found.set(done.size);
    sfx.right();
    const e = entries.get(p.text)!;
    say(e.shown);
    marks.insertBefore(svg('line', {
      class: 'ws-ring', x1: p.from[0] + 0.5, y1: p.from[1] + 0.5, x2: p.to[0] + 0.5, y2: p.to[1] + 0.5,
      stroke: RINGS[(done.size - 1) % RINGS.length], 'data-word': p.text,
    }), selection);
    for (const [x, y] of cellsOf(p)) cells[y * grid.size + x].classList.add('in');
    const li = listEl.querySelector<HTMLElement>(`li[data-word="${p.text}"]`);
    if (li) {
      li.classList.add('found');
      /* now its sound, or the letters that lie, light up */
      const word = li.querySelector('.ws-word')!;
      if (e.spans?.length && e.tones) word.replaceChildren(marked(e.shown, e.spans, { tones: e.tones }));
    }
    if (done.size === grid.placed.length) life.later(finish, 900);
  }

  /** the first letter of a word still hidden, lit up for a moment */
  function help(): void {
    if (!grid) return;
    const left = grid.placed.filter((p) => !done.has(p.text));
    if (!left.length) return;
    const p = left[Math.floor(Math.random() * left.length)];
    hints += 1;
    const cell = cells[p.from[1] * grid.size + p.from[0]];
    cell.classList.remove('hint');
    void cell.offsetWidth;
    cell.classList.add('hint');
    life.later(() => cell.classList.remove('hint'), 2600);
    say(`Look for ${entries.get(p.text)!.shown}. It starts here.`);
  }

  function finish(): void {
    if (!grid) return;
    board.hidden = true;
    resultList.replaceChildren(...grid.placed.map((p) => {
      const e = entries.get(p.text)!;
      return el('li', {}, e.picture ? el('span', { class: 'ws-pic', text: e.picture, 'aria-hidden': 'true' }) : '',
        e.spans?.length && e.tones ? marked(e.shown, e.spans, { tones: e.tones }) : e.shown);
    }));
    /* found with no help: the next grid is a step up */
    const up = !hints && stepAt < SEARCH_STEPS.length - 1;
    if (up) {
      stepAt += 1;
      write(STEP_KEY, stepAt);
      resultList.append(el('li', { class: 'ws-next', text: `Next: ${SEARCH_STEPS[stepAt].name}` }));
    }
    results.show(awardFace('word-search', '🔎'));
    celebrate(hints ? 'Every word found!' : 'Every word, and no help!');
  }

  /* ── the printed sheet ──────────────────────────────────────────────── */

  function printSheet(): void {
    if (!grid) return;
    const g = grid;
    const table = el('table', { class: 'ws-ptable' }, ...g.letters.map((row) =>
      el('tr', {}, ...row.map((letter) => el('td', { text: letter })))));
    sheet.replaceChildren(
      el('div', { class: 'pr-head' },
        el('span', { text: 'Name ______________________' }),
        el('span', { text: 'Date ____________' })),
      el('h2', { text: `Word search: ${list.name}` }),
      el('p', { text: `${SEARCH_STEPS[stepAt].told} Circle each word, then tick it off the list.` }),
      table,
      el('ul', { class: 'ws-plist' }, ...g.placed.map((p) => {
        const e = entries.get(p.text)!;
        return el('li', {}, el('span', { class: 'ws-box', text: '☐' }), e.picture ? `${e.picture} ` : '', e.shown);
      })),
    );
    try { window.print(); } catch { /* no printer: the sheet is there for next time */ }
  }

  drawLists();
  root.append(node);
  document.body.append(sheet);
  start();
  return () => {
    life.end();
    sheet.remove();
  };
}
