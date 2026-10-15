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
import { played } from '../lib/played';
import { settings } from '../lib/settings';
import { closeMove, maybeLevelUp, undoMove, unseenMove, weakSounds } from '../lib/coach';
import { GAMES, SECTIONS, type Game, type Section } from './catalog';

export type { Section } from './catalog';

/** a sound's label, or nothing much for one that has since been removed */
const soundLabel = (id: string | undefined): string => {
  try { return id ? sound(id).label : 'A'; } catch { return 'A'; }
};

/* ── the coach's picks ────────────────────────────────────────────────── */

export interface Pick { tile: Game; why: string }

/** a number for today, the same all day, so the picks do not reshuffle every
    time he comes back to the home screen */
function today(): number {
  const d = new Date();
  return d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
}

const nth = <T>(list: T[], seed: number): T => list[((seed % list.length) + list.length) % list.length];

/**
 * Three games for today, so the tiles are not a wall to choose from: a reading
 * game (aimed at the sounds that need practice, which the coach steers the
 * words towards), a maths or jiu-jitsu game he has not finished a round of
 * yet — or has not played for longest — and something different, a
 * handwriting game. Only what the app already keeps is used: the coach's
 * notes and the sticker book.
 */
export function coachPicks(seed = today()): Pick[] {
  const of = (section: Section): Game[] => GAMES.filter((t) => t.section === section);
  const labels = (ids: string[]): string => ids.map((id) => { try { return sound(id).label; } catch { return id; } }).join(', ');

  const weak = weakSounds();
  const reading: Pick = {
    tile: nth(of('reading'), seed),
    why: weak.length ? `Practise ${labels(weak.slice(0, 3))}` : "This week's sounds",
  };

  /* when he last finished a round of each one, whatever the score */
  const last = played();
  const numbers = [...of('maths'), ...of('bjj')];
  const fresh = numbers.filter((t) => !(t.path in last));
  const maths: Pick = fresh.length
    ? { tile: nth(fresh, seed * 7 + 3), why: 'Not tried yet' }
    : { tile: [...numbers].sort((a, b) => (last[a.path] ?? 0) - (last[b.path] ?? 0))[0], why: 'Not played for a while' };

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
  const tileLink = (tile: Game): HTMLElement => el('a', {
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
      ...GAMES.filter((t) => t.section === section.id).map(tileLink)),
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
    const label = sticker.game ? `${GAMES.find((t) => t.path === sticker.game)?.name ?? 'Game'}` : soundLabel(sticker.sound);
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
