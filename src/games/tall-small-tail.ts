/* Tall, Small, Tail — where letters sit on the lines, and which way b faces.
 *
 * Two things make a child's writing look untidy long after the letters are
 * formed well: letters that are all the same height, and letters that face
 * the wrong way. This game is about both, and it needs no pencil.
 *
 * First, a letter appears on the writing lines and he says which kind it is:
 * tall (it reaches the head line: b d f h k l t), small (it stays between the
 * waist and the base) or tail (it hangs down to the tail line: g j p q y).
 *
 * Then a hunt: a grid of b, d, p and q, and he finds every b. A wrong tap
 * gets the rhyme that settles it — b is bat then ball, the stick first; d is
 * drum then stick, the round part first — which is also the order the pencil
 * goes in Trace It. */

import { el, replay } from '../lib/dom';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { pro } from '../lib/settings';
import { pick, shuffle } from '../lib/random';
import { HEIGHTS, MIRRORS, heightOf, type Height } from '../content/handwriting';
import { confetti, counter, scoreLine, topbar } from '../ui/components';
import { letterCard } from '../ui/writing';

const KINDS: { h: Height; label: string; face: string; why: string }[] = [
  { h: 'tall', label: 'Tall', face: '🦒', why: 'reaches up to the top line' },
  { h: 'small', label: 'Small', face: '🐭', why: 'stays between the middle line and the bottom line' },
  { h: 'tail', label: 'Tail', face: '🐒', why: 'has a tail that hangs below the line' },
];

const HINT: Record<string, string> = {
  b: 'b is bat, then ball 🏏⚾: the stick comes first.',
  d: 'd is drum, then stick 🥁: the round part comes first.',
  p: 'p goes down to the tail, then round.',
  q: 'q is round like a, then down the tail.',
};

const ROUND = 10;

export function mount(root: HTMLElement): () => void {
  const partSel = el('select', { 'aria-label': 'Which part' },
    el('option', { value: 'both', text: 'Tall, small, tail — then find the b' }),
    el('option', { value: 'heights', text: 'Tall, small, tail only' }),
    el('option', { value: 'mirrors', text: 'Find the b (b d p q) only' }),
  );
  partSel.addEventListener('change', () => start());
  const panel = el('div', { class: 'panel', hidden: 'hidden' },
    el('div', { class: 'row' }, el('span', { class: 'lbl', text: 'This game' }), partSel));

  const pos = counter('Letter');
  const totalEl = el('span', { text: '0' });
  const right = counter('Right first try');

  /* part one: the letter and the three kinds */
  const card = el('div', { class: 'ts-card' });
  const kinds = el('div', { class: 'ts-kinds' },
    ...KINDS.map((k) => el('button', {
      class: 'ts-kind', type: 'button', dataset: { h: k.h },
      on: { click: () => answer(k.h) },
    }, el('span', { class: 'ts-face', text: k.face, 'aria-hidden': 'true' }), k.label)));
  const note = el('p', { class: 'ts-note', 'aria-live': 'polite' });
  const heights = el('div', { class: 'ts-board' }, card, kinds, note);

  /* part two: the hunt */
  const huntTitle = el('h2', { class: 'ts-hunt-title' });
  const grid = el('div', { class: 'ts-grid' });
  const huntNote = el('p', { class: 'ts-note', 'aria-live': 'polite' });
  const hunt = el('div', { class: 'ts-board', hidden: 'hidden' }, huntTitle, grid, huntNote);

  const summary = el('p', {});
  const results = el('div', { class: 'tray results', hidden: 'hidden' },
    el('h2', { text: 'Well spotted' }), summary,
    el('div', { class: 'row', style: { marginTop: '14px' } },
      el('button', { class: 'btn', type: 'button', text: 'Play again', on: { click: () => start() } })),
  );

  const score = scoreLine(el('span', {}, pos.node, ' of ', totalEl), right.node);
  const node = el('div', { class: 'wrap' },
    topbar({
      title: 'Tall, Small,', swash: 'Tail',
      tagline: 'Where does each letter sit on the lines?',
      onSetup: (open) => { panel.hidden = !open; },
    }),
    panel, score, heights, hunt, results,
  );

  let queue: string[] = [];
  let index = 0;
  let firsts = 0;
  let missed = false;
  let busy = false;
  let missedLetters: string[] = [];
  let huntMisses = 0;
  let huntTarget = '';
  let timers: number[] = [];
  const later = (fn: () => void, ms: number): void => { timers.push(window.setTimeout(fn, ms)); };

  /* ── tall, small or tail ─────────────────────────────────────────────── */

  /** ten letters, with at least three of each kind so it is never a guess */
  function letters(): string[] {
    const each = (Object.keys(HEIGHTS) as Height[]).flatMap((h) => shuffle([...HEIGHTS[h]]).slice(0, 3));
    const rest = shuffle([...'abcdefghijklmnopqrstuvwxyz'].filter((l) => !each.includes(l)));
    return shuffle([...each, ...rest.slice(0, ROUND - each.length)]);
  }

  function showLetter(): void {
    const ch = queue[index];
    missed = false;
    busy = false;
    pos.set(index + 1);
    card.replaceChildren(letterCard(ch, { minWidth: 150, label: `The letter ${ch} on the writing lines` }));
    card.dataset.h = '';
    card.dataset.letter = ch;
    note.textContent = '';
    note.className = 'ts-note';
    for (const b of kinds.querySelectorAll('button')) b.classList.remove('right', 'nope');
  }

  function answer(h: Height): void {
    if (busy || !queue.length) return;
    const ch = queue[index];
    const truth = heightOf(ch);
    const kind = KINDS.find((k) => k.h === truth);
    const btn = kinds.querySelector<HTMLButtonElement>(`[data-h="${h}"]`);
    if (h !== truth) {
      missed = true;
      sfx.wrong();
      if (btn) replay(btn, 'nope');
      note.className = 'ts-note';
      note.textContent = `Look again: does ${ch} reach the top line, or hang below it?`;
      return;
    }
    busy = true;
    if (!missed) { firsts += 1; right.set(firsts); } else missedLetters.push(ch);
    sfx.right();
    btn?.classList.add('right');
    card.dataset.h = truth;
    note.className = 'ts-note good';
    note.textContent = `${ch} is ${truth}: it ${kind?.why ?? ''}.`;
    later(() => {
      index += 1;
      if (index < queue.length) showLetter();
      else if (partSel.value === 'both') startHunt();
      else finish();
    }, 1300);
  }

  /* ── find the b ──────────────────────────────────────────────────────── */

  function startHunt(): void {
    busy = false;
    heights.hidden = true;
    hunt.hidden = false;
    score.hidden = true;
    huntTarget = pro() ? pick(MIRRORS) : pick(['b', 'd']);
    const size = pro() ? 16 : 12;
    const targets = pro() ? 5 : 4;
    const others = MIRRORS.filter((m) => m !== huntTarget);
    const tiles = shuffle([
      ...Array.from({ length: targets }, () => huntTarget),
      ...Array.from({ length: size - targets }, (_, i) => others[i % others.length]),
    ]);
    huntTitle.textContent = `Find every ${huntTarget}`;
    huntNote.textContent = '';
    huntNote.className = 'ts-note';
    grid.replaceChildren(...tiles.map((ch) => {
      const b = el('button', { class: 'ts-tile', type: 'button', text: ch, dataset: { ch } });
      b.addEventListener('click', () => tap(b, ch));
      return b;
    }));
    say(`Find every ${huntTarget}`);
  }

  function tap(b: HTMLButtonElement, ch: string): void {
    if (b.classList.contains('found') || busy) return;
    if (ch !== huntTarget) {
      huntMisses += 1;
      sfx.wrong();
      replay(b, 'nope');
      huntNote.className = 'ts-note';
      huntNote.textContent = `That one is ${ch}. ${HINT[huntTarget]}`;
      return;
    }
    sfx.land();
    b.classList.add('found');
    b.setAttribute('aria-pressed', 'true');
    const left = grid.querySelectorAll(`[data-ch="${huntTarget}"]:not(.found)`).length;
    huntNote.className = left ? 'ts-note' : 'ts-note good';
    huntNote.textContent = left ? `${left} more to find.` : `You found every ${huntTarget}!`;
    if (!left) { busy = true; later(finish, 1000); }
  }

  /* ── the round ───────────────────────────────────────────────────────── */

  function start(): void {
    for (const t of timers) window.clearTimeout(t);
    timers = [];
    index = 0; firsts = 0; huntMisses = 0; missedLetters = []; huntTarget = '';
    right.set(0);
    results.hidden = true;
    hunt.hidden = true;
    heights.hidden = false;
    score.hidden = false;
    if (partSel.value === 'mirrors') { queue = []; startHunt(); return; }
    queue = letters();
    totalEl.textContent = String(queue.length);
    showLetter();
  }

  function finish(): void {
    busy = true;
    heights.hidden = true;
    hunt.hidden = true;
    const bits: string[] = [];
    if (queue.length) {
      bits.push(`${firsts} of ${queue.length} letters right first try.`);
      if (missedLetters.length) bits.push(`Look again at ${missedLetters.join(', ')}.`);
    }
    if (huntTarget && partSel.value !== 'heights') {
      bits.push(huntMisses ? `You found every ${huntTarget}, with ${huntMisses} wrong ${huntMisses === 1 ? 'tap' : 'taps'}.` : `Every ${huntTarget} found with no wrong taps!`);
    }
    summary.textContent = bits.join(' ');
    results.hidden = false;
    sfx.win();
    confetti();
    say('Well spotted!');
  }

  root.append(node);
  start();
  return () => { for (const t of timers) window.clearTimeout(t); };
}
