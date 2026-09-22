/* The home screen: seven tiles, and the one place a parent sets up the week.
 *
 * The child can read simple words, so each tile says what it is as well as
 * showing a picture. Nothing here needs an adult to explain it. */

import { el } from '../lib/dom';
import { pick } from '../lib/random';
import { describeVoice, englishVoices, onVoicesChanged, onlyCompactVoices, say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { LEVELS, PRACTICE_SOUNDS, sound, type Level, type Sound } from '../content/index';
import { chip, confetti } from '../ui/components';
import { clearStickers, stickers } from '../lib/stickers';
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

  /* the sticker book: the one thing that joins the seven games together */
  const book = el('div', { class: 'sticker-book' });
  function drawBook(): void {
    const earned = stickers();
    if (!earned.length) {
      book.replaceChildren(el('span', { class: 'empty', text: 'Finish a round in any game to win your first sticker.' }));
      return;
    }
    book.replaceChildren();
    /* newest last, so the one just won lands at the end */
    for (const sticker of earned.slice(-24)) {
      let label = sticker.sound;
      try { label = sound(sticker.sound).label; } catch { /* a removed sound */ }
      book.append(el('span', { class: 'sticker', text: sticker.face, title: label, 'aria-label': `${label} sticker` }));
    }
  }
  drawBook();

  const bookTray = el('div', { class: 'tray' },
    el('h2', {}, 'Your stickers'),
    book,
    el('div', { class: 'row', style: { marginTop: '10px' } },
      el('button', {
        class: 'btn ghost small', type: 'button', text: 'Start a new sticker book',
        on: { click: () => { clearStickers(); drawBook(); } },
      })),
  );

  /* ── which voice reads the words ────────────────────────────────────── */

  const voiceRow = el('div', { class: 'row' });

  function drawVoices(): void {
    const voices = englishVoices();
    voiceRow.replaceChildren(el('span', { class: 'lbl', text: 'Reading voice' }));
    if (!voices.length) {
      voiceRow.append(el('span', { class: 'tag', text: 'This device has no English voice installed, so words are shown but not spoken.' }));
      return;
    }

    const select = el('select', { 'aria-label': 'Which voice reads the words' },
      el('option', { value: '', text: 'Best available (' + describeVoice(voices[0]) + ')' }),
      ...voices.map((v) => el('option', {
        value: v.voiceURI,
        text: describeVoice(v),
        selected: settings().voiceURI === v.voiceURI ? 'selected' : undefined,
      })),
    );
    select.addEventListener('change', () => {
      updateSettings({ voiceURI: select.value || null });
      say('rain, sheep, quick');
    });

    voiceRow.append(select, el('button', {
      class: 'btn ghost small', type: 'button', text: '🔊 Try it',
      on: { click: () => say('rain, sheep, quick') },
    }));

    /* Apple installs only its basic voices. The better ones are a free
       download, but nothing a web page does can trigger it — so say where. */
    if (onlyCompactVoices()) {
      voiceRow.append(el('p', { class: 'tag', style: { width: '100%', margin: '6px 0 0' },
        text: 'These are the standard voices. An iPad can download clearer ones under Settings › Accessibility › Spoken Content › Voices › English — though Safari does not always offer a downloaded voice to a web page, so it may not appear here even once installed.' }));
    }
  }

  drawVoices();
  /* Voices arrive asynchronously everywhere, and on iOS the downloaded ones
     only appear once the first tap has unlocked speech — so this redraws
     whenever the list actually grows, not just at load. */
  const stopWatchingVoices = onVoicesChanged(drawVoices);

  const week = el('div', { class: 'week' },
    el('h2', { text: "This week's sounds" }),
    summary,
    levelRow, soundRow, toggleRow, voiceRow,
  );

  /* a small piece of fun: one sound gets to be today's, and says hello */
  const pool = inLevels();
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

  const node = el('div', { class: 'wrap wide' },
    el('div', { style: { textAlign: 'center', marginBottom: '14px' } },
      el('h1', {}, 'Sounds of ', el('span', { class: 'swash', text: 'Reading' })),
      el('p', { class: 'tag', text: 'Pick a game.' }),
    ),
    el('div', { style: { textAlign: 'center', marginBottom: '14px' } }, starBtn),
    tiles,
    bookTray,
    week,
  );

  draw();
  root.append(node);
  return stopWatchingVoices;
}
