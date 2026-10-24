/* Trace It — write the letter the way school teaches it.
 *
 * Neat handwriting is mostly habit: starting each letter in the right place
 * and moving the right way, until the hand does it without thinking. So the
 * game is strict about exactly those two things and forgiving about wobble
 * (src/lib/strokes.ts does the judging).
 *
 * Each letter sits on the four writing lines with a green numbered dot where
 * each stroke starts and an arrow the way it goes. He watches it written
 * once, then traces it: first over a solid track, then over dots, and in Pro
 * mode a third time with only the start dot. A stroke that starts in the
 * wrong place or goes the wrong way is wiped with a word about why.
 *
 * It works with a finger or any stylus, including ones that are not an Apple
 * Pencil: nothing reads pressure or tilt, only where the pointer is. One
 * pointer draws at a time, so a hand resting on the glass does not scribble;
 * if the resting hand landed first, a pen, or a finger nearer the start dot,
 * takes over from it.
 *
 * The letters come in the families the school teaches together, and any
 * family prints as a practice sheet for paper and pencil.
 *
 * Or whole sight words, his teacher's "write sight words with chalk": the
 * switch at the top turns from letters to the school's sight words up to his
 * level, traced letter after letter and stroke by stroke. And as on her list
 * of ideas, the writing need not be in pencil: crayon, paint, chalk on a
 * blackboard, or a finger through sand. The grain of chalk, crayon and sand
 * is a little texture painted once into the page, so drawing stays as quick
 * as it is in pencil. */

import { el, prefersReducedMotion } from '../lib/dom';
import { lifetime } from '../lib/life';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { awardFace } from '../lib/stickers';
import { pro, settings } from '../lib/settings';
import { read, write } from '../lib/storage';
import { shuffle } from '../lib/random';
import { judge, type Point } from '../lib/strokes';
import { FAMILIES, GLYPHS, exampleFor, family } from '../content/handwriting';
import { sightSetsUpTo, sightWordsIn } from '../content/sight';
import { celebrate, counter, kindSwitch, resultsTray, scoreLine, topbar } from '../ui/components';
import { SLOPE, WORD_GAP, arrow, layout, startDot, strokeShape, svg, viewBox, writingLines, type Layout } from '../ui/writing';

/** how near the line counts as on it, in letter units (a letter body is 50) */
const TOL = 12;
/** on your own there is no track to follow, so a little more room */
const OWN_TOL = 16;
/** a touch that moves less than this is a resting hand, not a stroke */
const STILL = 6;

interface Go { name: string; track: 'solid' | 'dots' | 'none' }
const GOES: Go[] = [
  { name: 'Trace it', track: 'solid' },
  { name: 'Follow the dots', track: 'dots' },
  { name: 'On your own', track: 'none' },
];

type Kind = 'letters' | 'sight';

/** what he writes with, each with its own page: paper, a blackboard, sand */
type Tool = 'pencil' | 'crayon' | 'paint' | 'chalk' | 'sand';
const TOOLS: [Tool, string][] = [['pencil', 'Pencil'], ['crayon', 'Crayon'], ['paint', 'Paint'], ['chalk', 'Chalk'], ['sand', 'Sand']];
const isTool = (v: unknown): v is Tool => TOOLS.some(([t]) => t === v);

/** a sight word he can trace: every letter has its strokes, and it fits the board */
const traceable = (text: string): boolean => text.length >= 2 && text.length <= 6 && [...text].every((ch) => GLYPHS.has(ch));

/**
 * A small square of grain, as a picture: the colour with specks left out
 * (chalk, crayon) or specks of a second colour (sand). Painted once, then
 * repeated along every stroke, which costs nothing while he draws.
 */
function grain(colour: string, amount: number, seed: number, speck?: string): string {
  const size = 24;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) return '';
  g.fillStyle = colour;
  g.fillRect(0, 0, size, size);
  let s = seed;
  const next = (): number => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < size * size * amount; i += 1) {
    const x = Math.floor(next() * size);
    const y = Math.floor(next() * size);
    if (speck) { g.fillStyle = speck; g.fillRect(x, y, 1, 1); } else g.clearRect(x, y, 1, 1);
  }
  try { return canvas.toDataURL('image/png'); } catch { return ''; }
}

/** the textures, as patterns the strokes are painted with */
function textures(): SVGDefsElement {
  const pattern = (id: string, url: string): SVGPatternElement =>
    svg('pattern', { id, patternUnits: 'userSpaceOnUse', width: 12, height: 12 },
      url ? svg('image', { href: url, width: 12, height: 12 }) : null);
  return svg('defs', {},
    pattern('tr-tex-chalk', grain('#FFFFFF', 0.28, 7)),
    pattern('tr-tex-crayon', grain('#D9432F', 0.18, 11)),
    pattern('tr-tex-sand', grain('#7A5228', 0.5, 13, '#9C6E3A')));
}

const WHY: Record<string, string> = {
  start: 'Start at the green dot.',
  direction: 'Other way! Follow the arrow.',
  short: 'Keep going, all the way to the end.',
  off: 'Nearly! Stay on the track.',
};

export function mount(root: HTMLElement): () => void {
  /* ── setup: which letters, how many, and the printed sheet ─────────── */

  const famSel = el('select', { 'aria-label': 'Which letters' },
    ...FAMILIES.map((f) => el('option', { value: f.id, text: f.name })));
  famSel.value = FAMILIES.some((f) => f.id === read('trace-family', '')) ? read('trace-family', '') : FAMILIES[0].id;
  const lenSel = el('select', { 'aria-label': 'How many letters' },
    el('option', { value: '6', text: '6 letters' }),
    el('option', { value: 'all', text: 'All of them' }),
  );
  const fitLength = (): void => { lenSel.value = family(famSel.value).items.length > 10 ? '6' : 'all'; };
  fitLength();
  famSel.addEventListener('change', () => { write('trace-family', famSel.value); fitLength(); start(); });
  lenSel.addEventListener('change', () => start());
  const wordLenSel = el('select', { 'aria-label': 'How many words' },
    el('option', { value: '4', text: '4 words', selected: 'selected' }),
    el('option', { value: '8', text: '8 words' }),
  );
  wordLenSel.addEventListener('change', () => start());
  const printBtn = el('button', { class: 'btn ghost small', type: 'button', text: '🖨 Print a practice sheet',
    on: { click: () => printSheet() } });
  const letterRow = el('div', { class: 'row' }, el('span', { class: 'lbl', text: 'Letters' }), famSel, lenSel);
  const wordRow = el('div', { class: 'row' }, el('span', { class: 'lbl', text: 'Sight words' }), wordLenSel);
  const printRow = el('div', { class: 'row' }, printBtn);
  const panel = el('div', { class: 'panel', hidden: 'hidden' }, letterRow, wordRow, printRow);

  /* letters, or whole sight words: remembered on this device */
  let kind: Kind = read<string>('trace-kind', 'letters') === 'sight' ? 'sight' : 'letters';
  const kindNode = kindSwitch<Kind>([['letters', '✏️ Letters'], ['sight', '👀 Sight words']], kind, (v) => {
    kind = v;
    write('trace-kind', v);
    start();
  }, 'Letters or words');

  /* what he writes with */
  let tool: Tool = isTool(read<string>('trace-tool', 'pencil')) ? read<Tool>('trace-tool', 'pencil') : 'pencil';
  const toolButtons = TOOLS.map(([t, name]) => el('button', {
    class: 'tr-tool', type: 'button', 'aria-pressed': String(t === tool), dataset: { tool: t },
    on: { click: () => pickTool(t) },
  }, el('span', { class: 'tr-swatch', 'aria-hidden': 'true' }), name));
  const tools = el('div', { class: 'tr-tools', role: 'group', 'aria-label': 'Write with' }, ...toolButtons);

  /* ── the board ───────────────────────────────────────────────────────── */

  const pos = counter('Letter');
  const totalEl = el('span', { text: '0' });
  const stepEl = el('span', { class: 'tr-step' });

  const example = el('p', { class: 'tr-example' });
  const hint = el('p', { class: 'tr-how' });
  const note = el('p', { class: 'tr-note', 'aria-live': 'polite' });

  const lines = writingLines();
  const tracks = svg('g', { class: 'tr-tracks' });
  const done = svg('g', { class: 'tr-done' });
  const show = svg('g', { class: 'tr-show' });
  const guide = svg('g', { class: 'tr-guide' });
  const ink = svg('path', { class: 'tr-ink', d: '' });
  const letters = svg('g', { transform: SLOPE }, tracks, done, show, guide, ink);
  const pad = svg('svg', { class: 'tr-pad', role: 'img', 'aria-label': 'Writing lines' }, textures(), lines, letters);

  const showBtn = el('button', { class: 'btn ghost small', type: 'button', text: '▶ Show me',
    on: { click: () => demo() } });
  const board = el('div', { class: 'tr-board', dataset: { tool } }, example, tools, pad, note,
    el('div', { class: 'row tr-actions' }, showBtn));

  function pickTool(t: Tool): void {
    tool = t;
    write('trace-tool', t);
    sfx.tap();
    board.dataset.tool = t;
    for (const b of toolButtons) b.setAttribute('aria-pressed', String(b.dataset.tool === t));
  }

  const resultList = el('ul', { class: 'tr-results' });
  const printAgain = el('button', { class: 'btn ghost', type: 'button', text: '🖨 Print a practice sheet', on: { click: () => printSheet() } });
  const results = resultsTray('Letters you wrote', resultList,
    el('button', { class: 'btn', type: 'button', text: 'Write again', on: { click: () => start() } }),
    printAgain,
  );

  const node = el('div', { class: 'wrap' },
    topbar({
      title: 'Trace', swash: 'It',
      tagline: 'Start at the green dot and follow the arrow.',
      onSetup: (open) => { panel.hidden = !open; },
    }),
    kindNode, panel,
    scoreLine(el('span', {}, pos.node, ' of ', totalEl), stepEl),
    hint, board, results.node,
  );

  /* the printed sheet lives outside the app, so print styles can show only it */
  const sheet = el('div', { class: 'tr-print', 'aria-hidden': 'true' });

  /* ── state ───────────────────────────────────────────────────────────── */

  let queue: string[] = [];
  let index = 0;
  let go = 0;
  let lay: Layout | null = null;
  let strokeAt = 0;
  let misses = 0;
  let log: { item: string; ok: boolean }[] = [];
  let busy = false;
  /* everything it plans goes through its lifetime, which leaving ends */
  const life = lifetime();
  const later = life.later;
  const goes = (): Go[] => GOES.slice(0, pro() ? 3 : 2);

  /* ── drawing ─────────────────────────────────────────────────────────── */

  function drawLetter(): void {
    if (!lay) return;
    const g = goes()[go];
    pad.setAttribute('viewBox', viewBox(lay.width, 150));
    pad.dataset.stroke = String(strokeAt);
    pad.dataset.go = String(go);
    pad.setAttribute('aria-label', `Writing lines with the ${kind === 'sight' ? 'word' : 'letter'} ${queue[index]} to trace`);
    stepEl.textContent = g.name;
    tracks.replaceChildren(...lay.strokes.map((s, i) =>
      strokeShape(s, `tr-track ${g.track}`, { 'data-i': i })));
    done.replaceChildren(...lay.strokes.slice(0, strokeAt).map((s) => strokeShape(s, 'tr-inked')));
    const s = lay.strokes[strokeAt];
    guide.replaceChildren();
    if (s) {
      guide.append(startDot(s));
      const a = g.track === 'none' ? null : arrow(s);
      if (a) guide.append(a);
    }
    ink.setAttribute('d', '');
  }

  /** writes the letter out once, stroke by stroke, for him to watch */
  function demo(): void {
    if (!lay) return;
    show.replaceChildren();
    if (prefersReducedMotion()) return;
    let delay = 0;
    for (const s of lay.strokes) {
      const shape = strokeShape(s, 'tr-demo', s.dot ? {} : { pathLength: 1 });
      shape.style.animationDelay = `${delay}ms`;
      show.append(shape);
      delay += s.dot ? 350 : 800;
    }
    later(() => show.replaceChildren(), delay + 500);
  }

  /* ── one letter ──────────────────────────────────────────────────────── */

  function showItem(): void {
    const item = queue[index];
    lay = kind === 'sight' ? layout(item, WORD_GAP) : layout(item);
    go = 0;
    strokeAt = 0;
    misses = 0;
    busy = false;
    pos.set(index + 1);
    note.textContent = '';
    note.className = 'tr-note';
    if (kind === 'sight') {
      /* the word itself, said once: he is writing a word he knows by sight */
      example.replaceChildren(el('span', { class: 'tr-big', text: item }));
      drawLetter();
      demo();
      say(item);
      return;
    }
    const word = exampleFor(item[item.length - 1]);
    example.replaceChildren(
      el('span', { class: 'tr-big', text: [...item].join(' ') }),
      word ? el('span', { class: 'tr-as' }, ' as in ', el('span', { class: 'tr-pic', text: word.picture ?? '', 'aria-hidden': 'true' }), ' ', word.text) : '',
    );
    drawLetter();
    demo();
    if (word) say(word.text);
  }

  function next(): void {
    if (index >= queue.length) { finish(); return; }
    showItem();
  }

  function strokeDone(): void {
    if (!lay) return;
    strokeAt += 1;
    if (strokeAt < lay.strokes.length) {
      sfx.land();
      note.textContent = '';
      drawLetter();
      return;
    }
    /* the whole letter */
    busy = true;
    sfx.right();
    pad.classList.add('good');
    note.className = 'tr-note good';
    note.textContent = go === goes().length - 1 ? 'Beautiful!' : 'Yes! Again, a bit harder.';
    drawLetter();
    later(() => {
      pad.classList.remove('good');
      busy = false;
      note.className = 'tr-note';
      note.textContent = '';
      go += 1;
      strokeAt = 0;
      if (go < goes().length) { drawLetter(); return; }
      log.push({ item: queue[index], ok: misses === 0 });
      index += 1;
      next();
    }, 900);
  }

  function strokeMissed(why: string): void {
    misses += 1;
    sfx.wrong();
    note.className = 'tr-note oops';
    note.textContent = WHY[why] ?? WHY.off;
    ink.classList.add('wrong');
    later(() => { ink.classList.remove('wrong'); ink.setAttribute('d', ''); }, 450);
  }

  /* ── the pen ─────────────────────────────────────────────────────────── */

  let active: number | null = null;
  let activeType = '';
  let trace: Point[] = [];

  /** a screen point in letter units, through the slope */
  function toLetter(x: number, y: number): Point | null {
    const m = letters.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(x, y).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  const pathLength = (pts: Point[]): number =>
    pts.reduce((sum, p, i) => (i ? sum + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);

  function drawInk(): void {
    ink.setAttribute('d', trace.length
      ? `M${trace.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L')}${trace.length === 1 ? ' l0.1 0' : ''}`
      : '');
  }

  function begin(e: PointerEvent): void {
    if (busy || !lay || !lay.strokes[strokeAt]) return;
    const p = toLetter(e.clientX, e.clientY);
    if (!p) return;
    if (active !== null && e.pointerId !== active) {
      /* someone is already drawing. A pen always wins over a touch, and a
         second touch wins over a first that has not moved and is further
         from the start dot: that one was the side of his hand. */
      const target = lay.strokes[strokeAt].points[0];
      const far = (q: Point | undefined): number => (q ? Math.hypot(q.x - target.x, q.y - target.y) : Infinity);
      const penTakes = e.pointerType === 'pen' && activeType !== 'pen';
      const nearerTouch = pathLength(trace) < STILL && far(p) < far(trace[0]);
      if (!penTakes && !nearerTouch) return;
    }
    active = e.pointerId;
    activeType = e.pointerType;
    try { pad.setPointerCapture(e.pointerId); } catch { /* a pointer the page did not start */ }
    trace = [p];
    ink.classList.remove('wrong');
    drawInk();
    e.preventDefault();
  }

  function move(e: PointerEvent): void {
    if (e.pointerId !== active) return;
    /* a fast pen moves further than one event a frame; the in-between points
       keep a quick curve from turning into a straight line */
    const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    for (const ev of events.length ? events : [e]) {
      const p = toLetter(ev.clientX, ev.clientY);
      const last = trace[trace.length - 1];
      if (p && (!last || Math.hypot(p.x - last.x, p.y - last.y) >= 1.5)) trace.push(p);
    }
    drawInk();
    e.preventDefault();
  }

  function end(e: PointerEvent): void {
    if (e.pointerId !== active) return;
    active = null;
    if (e.type === 'pointercancel' || !lay) { trace = []; drawInk(); return; }
    const s = lay.strokes[strokeAt];
    const pts = trace;
    trace = [];
    if (!s) return;
    /* a touch that never moved is a resting hand, unless this stroke is a dot */
    if (!s.dot && pathLength(pts) < STILL) { ink.setAttribute('d', ''); return; }
    const verdict = judge(s.points, pts, goes()[go].track === 'none' ? OWN_TOL : TOL);
    if (verdict.ok) {
      ink.setAttribute('d', '');
      strokeDone();
    } else {
      strokeMissed(verdict.why ?? 'off');
    }
  }

  pad.addEventListener('pointerdown', begin);
  pad.addEventListener('pointermove', move);
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
  /* no page scroll, zoom, magnifier or text selection while writing */
  const stopTouch = (e: TouchEvent): void => { if (e.cancelable) e.preventDefault(); };
  pad.addEventListener('touchstart', stopTouch, { passive: false });
  pad.addEventListener('touchmove', stopTouch, { passive: false });

  /* ── the printed sheet ───────────────────────────────────────────────── */

  function printSheet(): void {
    const f = family(famSel.value);
    const rows = f.items.map((item) => {
      const lay2 = layout(item);
      const step = lay2.width + 30;
      const copies = 4;
      const cell = (i: number): SVGGElement => {
        const g = svg('g', { transform: `translate(${i * step} 0) ${SLOPE}` });
        for (const s of lay2.strokes) g.append(strokeShape(s, i === 0 ? 'pr-model' : 'pr-dots'));
        /* numbered starts on the model; a dot needs no number, and on paper
           it would sit on top of the one below it */
        if (i === 0) {
          const placed: { x: number; y: number }[] = [];
          for (const s of lay2.strokes) {
            if (s.dot) continue;
            const p = s.points[0];
            const shift = placed.filter((q) => Math.hypot(q.x - p.x, q.y - p.y) < 16).length * 18;
            placed.push(p);
            g.append(startDot(s, s.n, shift));
          }
        }
        return g;
      };
      const width = step * (copies + 2);
      return svg('svg', { class: 'pr-row', viewBox: `-14 -16 ${width} 182`, preserveAspectRatio: 'xMinYMid meet' },
        /* the lines run on across the page, for his own letters after the dotted ones */
        writingLines(-14, width * 6), ...Array.from({ length: copies }, (_, i) => cell(i)));
    });
    sheet.replaceChildren(
      el('div', { class: 'pr-head' },
        el('span', { text: 'Name ______________________' }),
        el('span', { text: 'Date ____________' })),
      el('h2', { text: f.name }),
      el('p', { text: `${f.how} Trace the dotted letters, then write your own on the rest of the line.` }),
      ...rows.map((r) => el('div', { class: 'pr-line' }, r)),
    );
    try { window.print(); } catch { /* no printer: the sheet is there for next time */ }
  }

  /* ── the round ───────────────────────────────────────────────────────── */

  function start(): void {
    life.clear();
    const sight = kind === 'sight';
    letterRow.hidden = sight;
    printRow.hidden = sight;
    printAgain.hidden = sight;
    wordRow.hidden = !sight;
    results.node.querySelector('h2')?.firstChild?.replaceWith(sight ? 'Words you wrote' : 'Letters you wrote');
    pos.node.firstChild?.replaceWith(sight ? 'Word ' : 'Letter ');
    if (sight) {
      hint.textContent = 'Sight words: write the whole word, one letter at a time.';
      /* his own level's words, a few at a time, any order */
      const words = sightWordsIn(sightSetsUpTo(settings().levels)).map((w) => w.text).filter(traceable);
      queue = shuffle(words).slice(0, Number(wordLenSel.value));
    } else {
      const f = family(famSel.value);
      hint.textContent = `${f.name}: ${f.how}`;
      const n = lenSel.value === 'all' ? f.items.length : Number(lenSel.value);
      /* a random few, but in the family's own order: c before a */
      const keep = new Set(shuffle([...f.items.keys()]).slice(0, n));
      queue = f.items.filter((_, i) => keep.has(i));
    }
    index = 0; log = []; active = null; trace = [];
    totalEl.textContent = String(queue.length);
    results.hide();
    board.hidden = false;
    next();
  }

  function finish(): void {
    lay = null;
    board.hidden = true;
    resultList.replaceChildren(...log.map((entry) =>
      el('li', { class: entry.ok ? '' : 'miss' }, el('span', { class: 'tr-big', text: kind === 'sight' ? entry.item : [...entry.item].join(' ') }),
        entry.ok ? '' : el('span', { class: 'mk', text: 'again' }))));
    /* writing earns a sticker of its own: it practises no one sound */
    results.show(awardFace('trace-it', '✏️'));
    stepEl.textContent = '';
    celebrate(log.every((e) => e.ok) ? 'Beautiful writing!' : 'Good writing!');
  }

  root.append(node);
  document.body.append(sheet);
  start();
  return () => {
    life.end();
    sheet.remove();
  };
}
