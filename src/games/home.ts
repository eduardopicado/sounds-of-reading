/* The home screen: seven tiles, and the one place a parent sets up the week.
 *
 * The child can read simple words, so each tile says what it is as well as
 * showing a picture. Nothing here needs an adult to explain it. */

import { el } from '../lib/dom';
import { pick } from '../lib/random';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { LEVELS, PRACTICE_SOUNDS, sound, type Level, type Sound } from '../content/index';
import { chip, confetti } from '../ui/components';
import { settings, updateSettings } from '../lib/settings';

export interface Tile { path: string; name: string; emoji: string; what: string; tone: string }

export const TILES: Tile[] = [
  { path: 'memory-match', name: 'Memory Match', emoji: '🃏', what: 'Find the pairs', tone: '#E4572E' },
  { path: 'bingo', name: 'Bingo', emoji: '🎯', what: 'Find the word you hear', tone: '#3D8FCB' },
  { path: 'sound-sort', name: 'Sound Sort', emoji: '🗂️', what: 'Drop it in the right bin', tone: '#79D3B0' },
  { path: 'word-builder', name: 'Word Builder', emoji: '🧱', what: 'Swap a part, make a word', tone: '#F3B229' },
  { path: 'roll-and-read', name: 'Roll & Read', emoji: '🎲', what: 'Roll it, read it out loud', tone: '#A87FD1' },
  { path: 'real-or-silly', name: 'Real or Silly?', emoji: '🤪', what: 'Is it a word or not?', tone: '#EF7A5A' },
  { path: 'sentence-smash', name: 'Sentence Smash', emoji: '💥', what: 'Build a silly sentence', tone: '#2FB5B5' },
];

export function mount(root: HTMLElement): () => void {
  const tiles = el('div', { class: 'tiles' });
  for (const tile of TILES) {
    tiles.append(el('a', {
      class: 'tile-link', href: '#/' + tile.path, vars: { '--tone': tile.tone },
      dataset: { game: tile.path },
      on: { click: () => sfx.tap() },
    },
      el('span', { class: 'emoji', text: tile.emoji, 'aria-hidden': 'true' }),
      el('span', { class: 'name', text: tile.name }),
      el('span', { class: 'what', text: tile.what }),
    ));
  }

  /* ── this week's sounds ─────────────────────────────────────────────── */

  const summary = el('p', { class: 'now' });
  const levelRow = el('div', { class: 'row' });
  const soundRow = el('div', { class: 'row' });
  const toggleRow = el('div', { class: 'row' });

  const inLevels = (): Sound[] => {
    const levels = settings().levels;
    return levels.length ? PRACTICE_SOUNDS.filter((s) => levels.includes(s.level)) : PRACTICE_SOUNDS;
  };

  function describe(): string {
    const { levels, sounds } = settings();
    const levelText = levels.length ? `Level ${levels.join(', ')}` : 'All levels';
    if (!sounds.length) return `${levelText} — every sound`;
    const labels = sounds.map((id) => { try { return sound(id).label; } catch { return id; } });
    const shown = labels.slice(0, 6).join(', ');
    return `${levelText} — ${shown}${labels.length > 6 ? ` and ${labels.length - 6} more` : ''}`;
  }

  function draw(): void {
    summary.textContent = describe();

    levelRow.replaceChildren(el('span', { class: 'lbl', text: 'Levels' }));
    levelRow.append(chip('All', settings().levels.length === 0, () => {
      updateSettings({ levels: [], sounds: [] });
      draw();
    }));
    for (const lv of LEVELS) {
      levelRow.append(chip(String(lv.n), settings().levels.includes(lv.n), () => {
        const levels = settings().levels;
        const next = (levels.includes(lv.n) ? levels.filter((x) => x !== lv.n) : [...levels, lv.n].sort()) as Level[];
        const stillThere = next.length ? PRACTICE_SOUNDS.filter((s) => next.includes(s.level)) : PRACTICE_SOUNDS;
        updateSettings({
          levels: next,
          sounds: settings().sounds.filter((id) => stillThere.some((s) => s.id === id)),
        });
        draw();
      }, undefined, lv.blurb.split(' ').slice(0, 3).join(' ')));
    }

    const pool = inLevels();
    soundRow.replaceChildren(el('span', { class: 'lbl', text: 'Sounds' }));
    soundRow.append(chip('All', settings().sounds.length === 0, () => {
      updateSettings({ sounds: [] });
      draw();
    }));
    const merge = settings().mergeTh;
    let shownTh = false;
    for (const s of pool) {
      if (merge && s.group === 'th') {
        if (shownTh) continue;
        shownTh = true;
        const on = settings().sounds.includes('th-voiced') || settings().sounds.includes('th-unvoiced');
        soundRow.append(chip('th', on, () => {
          const without = settings().sounds.filter((id) => id !== 'th-voiced' && id !== 'th-unvoiced');
          updateSettings({ sounds: on ? without : [...without, 'th-voiced', 'th-unvoiced'] });
          draw();
        }, s.tones.light));
        continue;
      }
      soundRow.append(chip(s.label, settings().sounds.includes(s.id), () => {
        const list = settings().sounds;
        updateSettings({ sounds: list.includes(s.id) ? list.filter((x) => x !== s.id) : [...list, s.id] });
        draw();
      }, s.tones.light));
    }

    toggleRow.replaceChildren(el('span', { class: 'lbl', text: 'Options' }));
    toggleRow.append(
      chip('Merge the two th sounds', settings().mergeTh, () => {
        updateSettings({ mergeTh: !settings().mergeTh });
        draw();
      }),
      chip(settings().speech ? '🔊 Words spoken' : '🔇 Words silent', settings().speech, () => {
        updateSettings({ speech: !settings().speech });
        draw();
      }),
      chip(settings().sfx ? '🎵 Game sounds' : '🔕 No game sounds', settings().sfx, () => {
        updateSettings({ sfx: !settings().sfx });
        draw();
      }),
    );
  }

  const week = el('div', { class: 'week' },
    el('h2', { text: "This week's sounds" }),
    summary,
    levelRow, soundRow, toggleRow,
  );

  /* a small piece of fun: one sound gets to be today's, and says hello */
  const pool = inLevels();
  const star = pool.length ? pick(pool) : PRACTICE_SOUNDS[0];
  const starBtn = el('button', {
    class: 'btn', type: 'button',
    vars: { '--mustard': star.tones.light, '--mustard-dark': star.tones.deep },
    'aria-label': `Today's sound is ${star.label} as in ${star.asIn}`,
  }, `Today's sound: ${star.label} · ${star.asIn}`);
  starBtn.addEventListener('click', () => {
    say(star.asIn);
    sfx.right();
    confetti(14);
  });

  const node = el('div', { class: 'wrap wide' },
    el('div', { style: { textAlign: 'center', marginBottom: '14px' } },
      el('h1', {}, 'Sounds of ', el('span', { class: 'swash', text: 'Reading' })),
      el('p', { class: 'tag', text: 'Pick a game.' }),
    ),
    el('div', { style: { textAlign: 'center', marginBottom: '14px' } }, starBtn),
    tiles,
    week,
  );

  draw();
  root.append(node);
  return () => undefined;
}
