/* The home screen: today's picks, the game tiles, and the sticker book.
 *
 * The child can read simple words, so each tile says what it is as well as
 * showing a picture. Nothing here needs an adult to explain it. The settings
 * live on their own page (src/games/grown-ups.ts), behind a button that has
 * to be held for three seconds, so a tap about cannot change his week. */

import { el } from '../lib/dom';
import { pick } from '../lib/random';
import { go } from '../lib/router';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { PRACTICE_SOUNDS, sound, type Sound } from '../content/index';
import { confetti } from '../ui/components';
import { stickers } from '../lib/stickers';
import { settings } from '../lib/settings';
import { closeMove, maybeLevelUp, undoMove, unseenMove, weakSounds } from '../lib/coach';

export type Section = 'reading' | 'writing' | 'maths' | 'bjj';

export interface Tile { path: string; name: string; emoji: string; what: string; tone: string; section: Section }

export const SECTIONS: { id: Section; title: string }[] = [
  { id: 'reading', title: 'Reading and spelling' },
  { id: 'writing', title: 'Handwriting' },
  { id: 'maths', title: 'Maths' },
  { id: 'bjj', title: 'Jiu-jitsu 🥋' },
];

export const TILES: Tile[] = [
  { path: 'memory-match', name: 'Memory Match', emoji: '🃏', what: 'Find the pairs', tone: '#E4572E', section: 'reading' },
  { path: 'bingo', name: 'Bingo', emoji: '🎯', what: 'Find the word you hear', tone: '#3D8FCB', section: 'reading' },
  { path: 'sound-sort', name: 'Sound Sort', emoji: '🗂️', what: 'Drop it in the right bin', tone: '#79D3B0', section: 'reading' },
  { path: 'word-builder', name: 'Word Builder', emoji: '🧱', what: 'Swap a part, make a word', tone: '#F3B229', section: 'reading' },
  { path: 'roll-and-read', name: 'Roll & Read', emoji: '🎲', what: 'Roll it, read it out loud', tone: '#A87FD1', section: 'reading' },
  { path: 'real-or-silly', name: 'Real or Silly?', emoji: '🤪', what: 'Is it a word or not?', tone: '#EF7A5A', section: 'reading' },
  { path: 'sentence-smash', name: 'Sentence Smash', emoji: '💥', what: 'Build a silly sentence', tone: '#2FB5B5', section: 'reading' },
  { path: 'same-sound', name: 'Same Sound, Two Ways', emoji: '🪞', what: 'Hear it, then spell it', tone: '#C77DBB', section: 'reading' },
  { path: 'tricky-words', name: 'Tricky Words', emoji: '🧠', what: 'Look, then find it again', tone: '#E8705A', section: 'reading' },
  { path: 'sound-rocket', name: 'Sound Rocket', emoji: '🚀', what: 'Catch the sound, dodge the rest', tone: '#5B8DEF', section: 'reading' },
  { path: 'penalty-shootout', name: 'Penalty Shootout', emoji: '⚽', what: 'Read the word, beat the keeper', tone: '#4CAF6E', section: 'reading' },
  { path: 'pass-and-shoot', name: 'Pass and Shoot', emoji: '🥅', what: 'Say each sound, then shoot', tone: '#E0A43A', section: 'reading' },
  { path: 'be-the-commentator', name: 'Be the Commentator', emoji: '🎙️', what: 'Read it like you mean it', tone: '#D9534F', section: 'reading' },
  { path: 'build-the-word', name: 'Build the Word', emoji: '🔤', what: 'Hear it, then spell it', tone: '#6C8CD5', section: 'reading' },
  { path: 'coach-says', name: 'Coach Says', emoji: '📣', what: 'Read it, then do it', tone: '#E07A3C', section: 'reading' },
  { path: 'trace-it', name: 'Trace It', emoji: '✏️', what: 'Start at the dot, follow the arrow', tone: '#4FB0C6', section: 'writing' },
  { path: 'tall-small-tail', name: 'Tall, Small, Tail', emoji: '🦒', what: 'Where does it sit on the lines?', tone: '#B5895A', section: 'writing' },
  { path: 'flash-count', name: 'Flash Count', emoji: '⚡', what: 'Look quickly: how many?', tone: '#F08A4B', section: 'maths' },
  { path: 'off-the-bench', name: 'Off the Bench', emoji: '🧤', what: 'How many more make 10?', tone: '#3FA07A', section: 'maths' },
  { path: 'scoreboard-sums', name: 'Scoreboard Sums', emoji: '🏟️', what: 'Goals in, goals out', tone: '#5AA0DC', section: 'maths' },
  { path: 'number-line-penalty', name: 'Number Line Penalty', emoji: '🥅', what: 'Kick it to the number', tone: '#A87FD1', section: 'maths' },
  { path: 'team-buses', name: 'Team Buses', emoji: '🚌', what: 'Ten fans fill a bus', tone: '#E4B73E', section: 'maths' },
  { path: 'keepy-uppy', name: 'Keepy-Uppy Count', emoji: '🤹', what: 'Count in 2s, 5s and 10s', tone: '#7CB342', section: 'maths' },
  { path: 'training-drills', name: 'Training Drills', emoji: '🏋️', what: 'Equal groups and rows', tone: '#D9822B', section: 'maths' },
  { path: 'half-time-oranges', name: 'Half-Time Oranges', emoji: '🍊', what: 'Halves, quarters, eighths', tone: '#F28C28', section: 'maths' },
  { path: 'jump-line', name: 'Jump Line', emoji: '🐸', what: 'Make the jumps, find the answer', tone: '#4FA3A5', section: 'maths' },
  { path: 'match-clock', name: 'Match Clock', emoji: '⏰', what: 'What time is kick-off?', tone: '#7A8CC4', section: 'maths' },
  { path: 'fan-survey', name: 'Fan Survey', emoji: '📊', what: 'Count the votes, read the graph', tone: '#C46AA0', section: 'maths' },
  { path: 'fact-family', name: 'Fact Family Formation', emoji: '👨‍👩‍👦', what: 'Know one fact, know them all', tone: '#5C8D4E', section: 'maths' },
  { path: 'kit-shapes', name: 'Kit and Ball Shapes', emoji: '🔷', what: 'Circles, cones and hexagons', tone: '#5B7FD1', section: 'maths' },
  { path: 'coach-whiteboard', name: "Coach's Whiteboard", emoji: '📋', what: 'Left, right, and turns', tone: '#6E7D8C', section: 'maths' },
  { path: 'refs-call', name: "Ref's Call", emoji: '🥋', what: 'Jiu-jitsu points', tone: '#3E6FB0', section: 'bjj' },
  { path: 'match-maths', name: 'Match Maths', emoji: '🏅', what: 'Add up the jiu-jitsu match', tone: '#2F6FC4', section: 'bjj' },
];

/* ── the coach's picks ────────────────────────────────────────────────── */

export interface Pick { tile: Tile; why: string }

/** a number for today, the same all day, so the picks do not reshuffle every
    time he comes back to the home screen */
function today(): number {
  const d = new Date();
  return d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
}

const nth = <T>(list: T[], seed: number): T => list[((seed % list.length) + list.length) % list.length];

/**
 * Three games for today, so 32 tiles are not a wall to choose from: a reading
 * game (aimed at the sounds that need practice, which the coach steers the
 * words towards), a maths or jiu-jitsu game he has not finished a round of
 * yet — or has not played for longest — and something different, a
 * handwriting game. Only what the app already keeps is used: the coach's
 * notes and the sticker book.
 */
export function coachPicks(seed = today()): Pick[] {
  const of = (section: Section): Tile[] => TILES.filter((t) => t.section === section);
  const labels = (ids: string[]): string => ids.map((id) => { try { return sound(id).label; } catch { return id; } }).join(', ');

  const weak = weakSounds();
  const reading: Pick = {
    tile: nth(of('reading'), seed),
    why: weak.length ? `Practise ${labels(weak.slice(0, 3))}` : "This week's sounds",
  };

  /* a maths game's sticker carries the game's own id, so it says when he
     last finished a round of it */
  const lastWon = new Map<string, number>();
  for (const s of stickers()) lastWon.set(s.sound, Math.max(lastWon.get(s.sound) ?? 0, s.at));
  const numbers = [...of('maths'), ...of('bjj')];
  const fresh = numbers.filter((t) => !lastWon.has(t.path));
  const maths: Pick = fresh.length
    ? { tile: nth(fresh, seed * 7 + 3), why: 'Not tried yet' }
    : { tile: [...numbers].sort((a, b) => (lastWon.get(a.path) ?? 0) - (lastWon.get(b.path) ?? 0))[0], why: 'Not played for a while' };

  const writing: Pick = { tile: nth(of('writing'), seed * 3 + 1), why: 'Something different' };
  return [reading, maths, writing];
}

/* ── hold to open ─────────────────────────────────────────────────────── */

const HOLD_MS = 3000;

/** a button that only works when held down for three seconds, with a bar
    that fills while it is held; a tap just says what to do */
function holdButton(label: string, onDone: () => void): { node: HTMLButtonElement; stop: () => void } {
  let timer = 0;
  const hint = el('span', { class: 'hold-hint', text: 'Hold for 3 seconds' });
  const node = el('button', { class: 'hold-btn', type: 'button', vars: { '--hold': `${HOLD_MS}ms` } },
    el('span', { class: 'hold-fill', 'aria-hidden': 'true' }), el('span', { class: 'hold-label', text: label }), hint);
  const stop = (): void => {
    window.clearTimeout(timer);
    timer = 0;
    node.classList.remove('holding');
  };
  const start = (): void => {
    if (timer) return;
    node.classList.add('holding');
    hint.textContent = 'Keep holding…';
    timer = window.setTimeout(() => { stop(); onDone(); }, HOLD_MS);
  };
  const letGo = (): void => {
    if (timer) hint.textContent = 'Hold for 3 seconds';
    stop();
  };
  node.addEventListener('pointerdown', (e) => { e.preventDefault(); start(); });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel']) node.addEventListener(type, letGo);
  node.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); start(); } });
  node.addEventListener('keyup', letGo);
  /* iOS opens its callout menu on a long press; the page must not */
  node.addEventListener('contextmenu', (e) => e.preventDefault());
  return { node, stop };
}

export function mount(root: HTMLElement): () => void {
  const tileLink = (tile: Tile): HTMLElement => el('a', {
    class: 'tile-link', href: '#/' + tile.path, vars: { '--tone': tile.tone },
    dataset: { game: tile.path },
    on: { click: () => sfx.tap() },
  },
    el('span', { class: 'emoji', text: tile.emoji, 'aria-hidden': 'true' }),
    el('span', { class: 'name', text: tile.name }),
    el('span', { class: 'what', text: tile.what }),
  );

  const sections = SECTIONS.flatMap((section) => [
    el('h2', { class: 'tiles-head', text: section.title }),
    el('div', { class: 'tiles', dataset: { section: section.id } },
      ...TILES.filter((t) => t.section === section.id).map(tileLink)),
  ]);

  /* ── today's picks ──────────────────────────────────────────────────── */

  const picks = el('div', { class: 'picks' },
    ...coachPicks().map(({ tile, why }) => el('a', {
      class: 'pick-link', href: '#/' + tile.path, vars: { '--tone': tile.tone },
      dataset: { game: tile.path },
      on: { click: () => sfx.tap() },
    },
      el('span', { class: 'emoji', text: tile.emoji, 'aria-hidden': 'true' }),
      el('span', { class: 'name', text: tile.name }),
      el('span', { class: 'why', text: why }),
    )));

  /* a small piece of fun: one sound gets to be today's, and says hello */
  const levels = settings().levels;
  const pool: Sound[] = levels.length ? PRACTICE_SOUNDS.filter((s) => levels.includes(s.level)) : PRACTICE_SOUNDS;
  const star = pool.length ? pick(pool) : PRACTICE_SOUNDS[0];
  const starBtn = el('button', {
    class: 'btn', type: 'button',
    vars: { '--mustard': star.tones.light, '--mustard-dark': star.tones.deep },
  }, `Today's sound: ${star.label} · ${star.asIn}`);
  starBtn.addEventListener('click', () => {
    say(star.asIn);
    sfx.right();
    confetti(14);
  });

  /* when the coach has moved the week up, say so where the parent will see
     it first, and make it one tap to put back */
  const moved = maybeLevelUp() ?? unseenMove();
  const moveNote = el('div', { class: 'coach-move', role: 'status', hidden: 'hidden' });
  function drawMove(): void {
    const m = unseenMove();
    moveNote.hidden = !m;
    if (!m) return;
    const top = Math.max(...m.from);
    moveNote.replaceChildren(
      el('p', {}, `🎉 Level ${top} mastered! The coach has moved this week up to levels ${m.to.join(' and ')}.`),
      el('div', { class: 'row' },
        el('button', { class: 'btn small', type: 'button', text: 'Great, keep it', on: { click: () => { closeMove(); drawMove(); } } }),
        el('button', { class: 'btn ghost small', type: 'button', text: 'Undo', on: { click: () => { undoMove(); drawMove(); } } }),
      ),
    );
  }
  if (moved) drawMove();

  /* the sticker book: the one thing that joins the games together */
  const book = el('div', { class: 'sticker-book' });
  const earned = stickers();
  if (!earned.length) {
    book.append(el('span', { class: 'empty', text: 'Finish a round in any game to win your first sticker.' }));
  }
  /* newest last, so the one just won lands at the end */
  for (const sticker of earned.slice(-24)) {
    let label = sticker.sound;
    try { label = sound(sticker.sound).label; } catch { /* a removed sound, or a maths game */ }
    book.append(el('span', { class: 'sticker', text: sticker.face, title: label, 'aria-label': `${label} sticker` }));
  }
  const bookTray = el('div', { class: 'tray' }, el('h2', {}, 'Your stickers'), book);

  const grownUps = holdButton('⚙ Grown-ups', () => { sfx.tap(); go('grown-ups'); });

  const node = el('div', { class: 'wrap wide' },
    el('div', { style: { textAlign: 'center', marginBottom: '14px' } },
      el('h1', {}, 'Sounds of ', el('span', { class: 'swash', text: 'Reading' })),
      el('p', { class: 'tag', text: 'Pick a game.' }),
    ),
    el('div', { style: { textAlign: 'center', marginBottom: '14px' } }, starBtn),
    moveNote,
    el('h2', { class: 'tiles-head', text: "Coach's picks for today" }),
    picks,
    ...sections,
    bookTray,
    el('div', { class: 'grown-ups-row' }, grownUps.node),
  );

  root.append(node);
  return grownUps.stop;
}
