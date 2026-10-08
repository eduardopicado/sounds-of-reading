/* The grown-ups' corner: everything a parent sets, and how it is going.
 *
 * It used to sit under the game tiles on the home screen, one long panel of
 * chips that a child scrolled into and could change by accident. Now it is
 * its own page, reached from the home screen by holding a button for three
 * seconds (src/games/home.ts) — not a lock, just enough that a six-year-old
 * tapping about does not change his week. Grouped into cards, one question
 * each: which sounds this week, how it is going, how hard, how it sounds. */

import { el } from '../lib/dom';
import { read } from '../lib/storage';
import { describeVoice, englishVoices, onVoicesChanged, onlyCompactVoices, say } from '../lib/speech';
import { LEVELS, PRACTICE_SOUNDS, sound, type Level, type Sound } from '../content/index';
import {
  BENCH_STEPS, BOARD_STEPS, BUS_STEPS, CLOCK_STEPS, DRILL_STEPS, FACT_STEPS, FLASH_STEPS, FRACTION_STEPS,
  JUMP_STEPS, LINE_STEPS, SHAPE_STEPS, SKIP_STEPS, SUM_STEPS, SURVEY_STEPS, type Step,
} from '../content/maths';
import { MATCH_STEPS, REF_STEPS } from '../content/bjj';
import { SAYS_STEPS } from '../content/coach-says';
import { chip, confirmButton, topbar } from '../ui/components';
import { clearStickers } from '../lib/stickers';
import { settings, updateSettings } from '../lib/settings';
import { strongSounds, weakSounds } from '../lib/coach';
import { TILES } from './home';

/** each game's ladder of steps, for the progress card; a test checks every
    maths and jiu-jitsu tile has one */
export const LADDERS: Record<string, readonly Step[]> = {
  'coach-says': SAYS_STEPS,
  'flash-count': FLASH_STEPS,
  'off-the-bench': BENCH_STEPS,
  'scoreboard-sums': SUM_STEPS,
  'number-line-penalty': LINE_STEPS,
  'team-buses': BUS_STEPS,
  'keepy-uppy': SKIP_STEPS,
  'training-drills': DRILL_STEPS,
  'half-time-oranges': FRACTION_STEPS,
  'jump-line': JUMP_STEPS,
  'match-clock': CLOCK_STEPS,
  'fan-survey': SURVEY_STEPS,
  'fact-family': FACT_STEPS,
  'kit-shapes': SHAPE_STEPS,
  'coach-whiteboard': BOARD_STEPS,
  'refs-call': REF_STEPS,
  'match-maths': MATCH_STEPS,
};

const card = (title: string, cls: string, ...children: (Node | null)[]): HTMLElement =>
  el('section', { class: `gu-card ${cls}` }, el('h2', { text: title }), ...children);

const labelOf = (id: string): string => { try { return sound(id).label; } catch { return id; } };

export function mount(root: HTMLElement): () => void {
  /* ── this week's sounds ─────────────────────────────────────────────── */

  const summary = el('p', { class: 'now' });
  const levelRow = el('div', { class: 'row' });
  const soundRows = el('div', { class: 'sound-groups' });
  const thRow = el('div', { class: 'row' });

  const inLevels = (): Sound[] => {
    const levels = settings().levels;
    return levels.length ? PRACTICE_SOUNDS.filter((s) => levels.includes(s.level)) : PRACTICE_SOUNDS;
  };

  function describe(): string {
    const { levels, sounds } = settings();
    const levelText = levels.length ? `Level ${levels.join(', ')}` : 'All levels';
    if (!sounds.length) return `${levelText} — every sound`;
    const labels = sounds.map(labelOf);
    const shown = labels.slice(0, 6).join(', ');
    return `${levelText} — ${shown}${labels.length > 6 ? ` and ${labels.length - 6} more` : ''}`;
  }

  function soundChip(s: Sound): HTMLButtonElement {
    const merge = settings().mergeTh;
    if (merge && s.group === 'th') {
      const on = settings().sounds.includes('th-voiced') || settings().sounds.includes('th-unvoiced');
      return chip('th', on, () => {
        const without = settings().sounds.filter((id) => id !== 'th-voiced' && id !== 'th-unvoiced');
        updateSettings({ sounds: on ? without : [...without, 'th-voiced', 'th-unvoiced'] });
        draw();
      }, s.tones.light);
    }
    return chip(s.label, settings().sounds.includes(s.id), () => {
      const list = settings().sounds;
      updateSettings({ sounds: list.includes(s.id) ? list.filter((x) => x !== s.id) : [...list, s.id] });
      draw();
    }, s.tones.light);
  }

  function drawWeek(): void {
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

    /* the sounds of the levels in play, one line per level, so the list
       reads like the school's sheet rather than one long jumble */
    soundRows.replaceChildren(
      el('span', { class: 'lbl', text: 'Sounds' }),
      el('div', { class: 'row' }, chip('All', settings().sounds.length === 0, () => {
        updateSettings({ sounds: [] });
        draw();
      }), el('span', { class: 'tag', text: 'or only the ones picked below' })),
    );
    const pool = inLevels();
    for (const lv of LEVELS) {
      const mine = pool.filter((s) => s.level === lv.n);
      if (!mine.length) continue;
      const row = el('div', { class: 'row sound-group' }, el('span', { class: 'group-name', text: `Level ${lv.n}` }));
      let shownTh = false;
      for (const s of mine) {
        if (settings().mergeTh && s.group === 'th') {
          if (shownTh) continue;
          shownTh = true;
        }
        row.append(soundChip(s));
      }
      soundRows.append(row);
    }

    thRow.replaceChildren(chip('Merge the two th sounds', settings().mergeTh, () => {
      updateSettings({ mergeTh: !settings().mergeTh });
      draw();
    }, undefined, 'them and thin as one'));
  }

  /* ── how it is going ────────────────────────────────────────────────── */

  const reportEl = el('p', { class: 'coach-report' });
  const mathsList = el('div', { class: 'maths-progress' });

  function drawReport(): void {
    const good = strongSounds().map(labelOf);
    const hard = weakSounds().map(labelOf);
    if (!good.length && !hard.length) {
      reportEl.textContent = 'The coach is still watching. After a few games it will say which sounds are going well and which need practice.';
    } else {
      reportEl.replaceChildren(
        good.length ? el('span', {}, el('b', { text: 'Going well: ' }), good.join(', '), '. ') : '',
        hard.length ? el('span', {}, el('b', { text: 'Needs practice: ' }), hard.join(', '), '.') : '',
      );
    }

    /* each maths game remembers the step reached (src/games/maths-kit.ts) */
    const played: HTMLElement[] = [];
    const untried: string[] = [];
    for (const tile of TILES) {
      const ladder = LADDERS[tile.path];
      if (!ladder) continue;
      const at = read<number | null>(`maths-step:${tile.path}`, null);
      if (typeof at !== 'number') { untried.push(tile.name); continue; }
      const step = Math.min(ladder.length - 1, Math.max(0, at));
      played.push(el('div', { class: 'mp-row', dataset: { game: tile.path } },
        el('span', { class: 'mp-name', text: `${tile.emoji} ${tile.name}` }),
        el('span', { class: 'mp-bar', 'aria-hidden': 'true' },
          el('i', { style: { width: `${Math.round(((step + 1) / ladder.length) * 100)}%` } })),
        el('span', { class: 'mp-step', text: `${ladder[step].name} · step ${step + 1} of ${ladder.length}` })));
    }
    mathsList.replaceChildren(
      el('span', { class: 'lbl', text: 'The step reached in each game' }),
      ...(played.length ? played : [el('p', { class: 'tag', text: 'No games with steps played yet.' })]),
      untried.length && played.length ? el('p', { class: 'tag', text: `Not tried yet: ${untried.join(', ')}.` }) : '',
    );
  }

  /* ── how hard ───────────────────────────────────────────────────────── */

  const challengeRow = el('div', { class: 'row' });
  function drawChallenge(): void {
    challengeRow.replaceChildren(
      chip('🏆 Pro mode', settings().pro, () => {
        updateSettings({ pro: !settings().pro });
        draw();
      }, undefined, 'harder games'),
      chip('🧑‍🏫 Coach', settings().coach, () => {
        updateSettings({ coach: !settings().coach });
        draw();
      }, undefined, 'picks words and levels'),
    );
  }

  /* ── how it sounds ──────────────────────────────────────────────────── */

  const soundRow = el('div', { class: 'row' });
  const voiceRow = el('div', { class: 'row' });

  function drawSound(): void {
    soundRow.replaceChildren(
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

    /* We used to send the parent to Settings to download a better voice.
       An iPad with three Karens installed offers this page exactly one, the
       super-compact build, so that errand does not work — it just costs
       several hundred megabytes. Say what is true instead. */
    if (onlyCompactVoices()) {
      voiceRow.append(el('p', { class: 'tag', style: { width: '100%', margin: '6px 0 0' },
        text: 'These are the only voices Safari offers a web page. Downloading better ones in Settings does not change this list, so the words a child reads are recorded in advance instead.' }));
    }
  }

  function draw(): void {
    drawWeek();
    drawReport();
    drawChallenge();
    drawSound();
  }

  drawVoices();
  /* Voices arrive asynchronously everywhere, and on iOS the downloaded ones
     only appear once the first tap has unlocked speech — so this redraws
     whenever the list actually grows, not just at load. */
  const stopWatchingVoices = onVoicesChanged(drawVoices);

  const node = el('div', { class: 'wrap grown-ups' },
    topbar({ title: 'Grown-ups', swash: 'corner', tagline: 'Set up the week and see how it is going.' }),
    card("This week's sounds", 'week', summary, levelRow, soundRows, thRow,
      el('p', { class: 'tag', text: 'Every reading game starts from these. A game’s ⚙ can change them for one session.' })),
    card('How it is going', 'progress', reportEl, mathsList),
    card('Challenge', 'challenge', challengeRow,
      el('p', { class: 'tag', text: 'Pro mode makes every game a notch harder. The coach gives more practice to the sounds that need it, and moves the week up a level when one is mastered.' })),
    card('Sound', 'sound', soundRow, voiceRow),
    card('Stickers', 'stickers',
      el('div', { class: 'row' },
        confirmButton('Start a new sticker book', 'Tap again to clear every sticker', () => { clearStickers(); }))),
  );

  draw();
  root.append(node);
  return stopWatchingVoices;
}
