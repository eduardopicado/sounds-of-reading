/* The pieces every game is built from: the header, the setup panel, chips,
 * the win overlay. One copy, so the games cannot drift apart the way the
 * prototypes did. */

import { el, prefersReducedMotion } from '../lib/dom';
import { go } from '../lib/router';
import { sfx } from '../lib/sfx';
import { LEVELS, PRACTICE_SOUNDS, SIGHT_SETS, type Level, type SightWord, type Sound } from '../content/index';
import { TRICKY, sightSetsUpTo, sightWordsIn } from '../content/sight';
import { settings, updateSettings } from '../lib/settings';
import { read, write } from '../lib/storage';
import { say } from '../lib/speech';

/* ── header ───────────────────────────────────────────────────────────── */

export interface TopbarOptions {
  title: string;
  /** the word drawn in mustard with the tomato underline */
  swash: string;
  tagline: string;
  onSetup?: (open: boolean) => void;
}

export function topbar(o: TopbarOptions): HTMLElement {
  const back = el('button', {
    class: 'icon-btn', type: 'button', 'aria-label': 'Back to the games', text: '←',
    on: { click: () => go('home') },
  });
  const titles = el('div', { class: 'titles' },
    el('h1', {}, o.title + ' ', el('span', { class: 'swash', text: o.swash }),
      /* so he knows why it is harder today, and can be proud of it */
      settings().pro ? el('span', { class: 'pro-badge', text: 'PRO' }) : null),
    el('p', { class: 'tag', text: o.tagline }),
  );
  const bar = el('div', { class: 'topbar' }, back, titles);
  if (o.onSetup) {
    let open = false;
    const gear = el('button', {
      class: 'icon-btn', type: 'button', text: '⚙', 'aria-label': 'Set up this game',
      'aria-pressed': 'false',
      on: {
        click: () => {
          open = !open;
          gear.setAttribute('aria-pressed', String(open));
          o.onSetup?.(open);
        },
      },
    });
    bar.append(gear);
  } else {
    bar.append(el('span', { class: 'icon-btn', style: { visibility: 'hidden' }, 'aria-hidden': 'true' }));
  }
  return bar;
}

/* ── chips ────────────────────────────────────────────────────────────── */

export function chip(label: string, pressed: boolean, onToggle: () => void, tone?: string, sub?: string): HTMLButtonElement {
  const node = el('button', {
    class: 'chip', type: 'button', 'aria-pressed': String(pressed),
    vars: tone ? { '--tone': tone } : undefined,
    on: { click: () => { sfx.tap(); onToggle(); } },
  }, label, sub ? el('span', { class: 'sub', text: sub }) : null);
  return node;
}

/* ── a button that asks twice ─────────────────────────────────────────── */

/**
 * For the few buttons that throw something away (the sticker book, the
 * Roll & Read tally). They sit where a six-year-old taps freely, and one tap
 * used to wipe weeks of stickers. The first tap only asks; a second within a
 * few seconds does it. No dialog, which iOS styles as an alarming system box.
 */
export function confirmButton(label: string, ask: string, onConfirm: () => void, className = 'btn ghost small'): HTMLButtonElement {
  let armed = 0;
  const btn = el('button', { class: className, type: 'button', text: label });
  const disarm = (): void => {
    window.clearTimeout(armed);
    armed = 0;
    btn.textContent = label;
    btn.classList.remove('asking');
  };
  btn.addEventListener('click', () => {
    if (!armed) {
      btn.textContent = ask;
      btn.classList.add('asking');
      armed = window.setTimeout(disarm, 4000);
      return;
    }
    disarm();
    onConfirm();
  });
  return btn;
}

/* ── the setup panel ──────────────────────────────────────────────────── */

export interface Filter { sounds: string[]; levels: Level[] }

export interface SetupOptions {
  /** rows of per-game controls, shown under the sound and level pickers */
  extra?: HTMLElement[];
  /** called whenever the filter or a per-game control changes */
  onChange: () => void;
  /** some games practise one sound at a time and cannot take an empty pick */
  minSounds?: number;
  /** a game that can play the school's sight words instead of this week's
      sounds: its id, under which this device remembers which it was last */
  sight?: string;
}

/** phonics: words he sounds out, this week's sounds; sight: the school's sight words */
export type WordKind = 'phonics' | 'sight';

export interface Setup {
  node: HTMLElement;
  open: (on: boolean) => void;
  /** the sounds and levels this game is actually using right now */
  filter: () => Filter;
  /** sounds available under the current levels, after the th merge */
  available: () => Sound[];
  /** which words the game is playing: always phonics for a game without the switch */
  kind: () => WordKind;
  /** the sight words in the sets chosen, each once */
  sightWords: () => SightWord[];
  /** the sight word sets chosen, in the order they are taught */
  sightSets: () => string[];
  /** the Phonics / Sight words switch, for the game to put on its screen; null without one */
  switchNode: HTMLElement | null;
}

/** the two th sounds become one option when the parent has merged them */
function mergedSounds(pool: Sound[]): Sound[] {
  if (!settings().mergeTh) return pool;
  const out: Sound[] = [];
  let seenTh = false;
  for (const s of pool) {
    if (s.group === 'th') {
      if (seenTh) continue;
      seenTh = true;
      out.push({ ...s, label: 'th', asIn: 'them / thin' });
      continue;
    }
    out.push(s);
  }
  return out;
}

export function createSetup(o: SetupOptions): Setup {
  /* starts from this week's sounds; changing it here is for this session only */
  let levels: Level[] = [...settings().levels];
  let sounds: string[] = [...settings().sounds];

  const levelRow = el('div', { class: 'row' });
  const soundRow = el('div', { class: 'row' });

  const soundsInLevels = (): Sound[] => {
    const inPlay = levels.length ? PRACTICE_SOUNDS.filter((s) => levels.includes(s.level)) : PRACTICE_SOUNDS;
    return mergedSounds(inPlay);
  };

  /** expands a merged th pick back into both ids for the content queries */
  const expand = (ids: string[]): string[] => {
    if (!settings().mergeTh) return ids;
    const out = new Set(ids);
    if (ids.includes('th-voiced') || ids.includes('th-unvoiced')) {
      out.add('th-voiced');
      out.add('th-unvoiced');
    }
    return [...out];
  };

  function drawLevels(): void {
    levelRow.replaceChildren(el('span', { class: 'lbl', text: 'Levels' }));
    levelRow.append(chip('All', levels.length === 0, () => {
      levels = [];
      drawLevels(); drawSounds(); o.onChange();
    }));
    for (const lv of LEVELS) {
      levelRow.append(chip(String(lv.n), levels.includes(lv.n), () => {
        levels = levels.includes(lv.n) ? levels.filter((x) => x !== lv.n) : [...levels, lv.n].sort((a, b) => a - b);
        /* a pick that leaves no sounds is no pick at all */
        if (!soundsInLevels().length) levels = levels.filter((x) => x !== lv.n);
        sounds = sounds.filter((id) => soundsInLevels().some((s) => s.id === id));
        drawLevels(); drawSounds(); o.onChange();
      }, undefined, lv.blurb.split(' ').slice(0, 3).join(' ')));
    }
  }

  function drawSounds(): void {
    const pool = soundsInLevels();
    soundRow.replaceChildren(el('span', { class: 'lbl', text: 'Sounds' }));
    soundRow.append(chip('All', sounds.length === 0, () => {
      sounds = [];
      drawSounds(); o.onChange();
    }));
    for (const s of pool) {
      soundRow.append(chip(s.label, sounds.includes(s.id), () => {
        const next = sounds.includes(s.id) ? sounds.filter((x) => x !== s.id) : [...sounds, s.id];
        if (next.length < (o.minSounds ?? 0)) return;
        sounds = next;
        drawSounds(); o.onChange();
      }, s.tones.light));
    }
  }

  /* what is in play, in one line, with the chips folded away under it: most
     days the week's sounds are right and only the game's own options matter */
  const now = el('span', { class: 'setup-now' });
  function drawNow(): void {
    const same = levels.join() === settings().levels.join() && sounds.join() === settings().sounds.join();
    const levelText = levels.length ? `Level ${levels.join(', ')}` : 'All levels';
    const soundText = sounds.length
      ? soundsInLevels().filter((s) => sounds.includes(s.id)).map((s) => s.label).join(', ')
      : 'every sound';
    now.textContent = `${same ? 'This week’s sounds' : 'Just for this game'}: ${levelText}, ${soundText}`;
  }
  const redraw = (): void => { drawLevels(); drawSounds(); drawNow(); };
  /* the chips redraw their own rows; the line above them follows */
  levelRow.addEventListener('click', drawNow);
  soundRow.addEventListener('click', drawNow);

  drawLevels();
  drawSounds();
  drawNow();

  const pickers = el('div', { class: 'setup-sounds', hidden: 'hidden' }, levelRow, soundRow,
    el('div', { class: 'row' },
      el('button', {
        class: 'btn ghost small', type: 'button', text: 'Use this week’s sounds',
        on: {
          click: () => {
            levels = [...settings().levels];
            sounds = [...settings().sounds];
            redraw(); o.onChange();
          },
        },
      }),
      el('button', {
        class: 'btn ghost small', type: 'button', text: 'Make this the week’s sounds',
        on: { click: () => { updateSettings({ levels: [...levels], sounds: [...sounds] }); drawNow(); } },
      }),
    ));
  const toggle = el('button', {
    class: 'btn ghost small', type: 'button', text: 'Change', 'aria-expanded': 'false',
    on: {
      click: () => {
        pickers.hidden = !pickers.hidden;
        toggle.setAttribute('aria-expanded', String(!pickers.hidden));
        toggle.textContent = pickers.hidden ? 'Change' : 'Done';
      },
    },
  });

  const soundsRow = el('div', { class: 'row setup-sounds-row' }, el('span', { class: 'lbl', text: 'Sounds' }), now, toggle);

  /* the sight word sets, for a game with the switch: the school's sets up to
     this week's level to start with, changed here for this session only */
  let kind: WordKind = o.sight && read<string>(`words:${o.sight}`, 'phonics') === 'sight' ? 'sight' : 'phonics';
  let sets = sightSetsUpTo(settings().levels);
  const setRow = el('div', { class: 'row setup-sight-row' });
  function drawSets(): void {
    setRow.replaceChildren(el('span', { class: 'lbl', text: 'Sight words' }));
    for (const name of SIGHT_SETS) {
      setRow.append(chip(name, sets.includes(name), () => {
        sets = sets.includes(name) ? sets.filter((x) => x !== name) : [...sets, name];
        /* never leave him with nothing to play */
        if (!sets.length) sets = [name];
        drawSets(); o.onChange();
      }, TRICKY.light));
    }
  }

  let switchNode: HTMLElement | null = null;
  function showKind(): void {
    soundsRow.hidden = kind === 'sight';
    if (kind === 'sight') pickers.hidden = true;
    setRow.hidden = kind !== 'sight';
  }
  if (o.sight) {
    const game = o.sight;
    drawSets();
    switchNode = kindSwitch([['phonics', '🔤 Phonics'], ['sight', '👀 Sight words']], kind, (value) => {
      kind = value;
      write(`words:${game}`, kind);
      showKind();
      o.onChange();
    });
  }

  const panel = el('div', { class: 'panel', hidden: 'hidden' }, ...(o.extra ?? []),
    soundsRow, pickers, ...(o.sight ? [setRow] : []));
  showKind();

  return {
    node: panel,
    open: (on) => { panel.hidden = !on; },
    filter: () => ({ sounds: expand(sounds), levels }),
    available: soundsInLevels,
    kind: () => kind,
    sightWords: () => sightWordsIn(sets),
    sightSets: () => SIGHT_SETS.filter((name) => sets.includes(name)),
    switchNode,
  };
}

/* ── a two-way switch ─────────────────────────────────────────────────── */

/**
 * One pill with two halves, at the top of a game that can play two kinds of
 * thing: phonics or sight words, letters or whole words. Always on show, so
 * it is clear which is on.
 */
export function kindSwitch<T extends string>(choices: readonly (readonly [T, string])[], value: T, onPick: (value: T) => void,
  label = 'Which words'): HTMLElement {
  let now = value;
  const buttons = choices.map(([v, text]) => el('button', {
    type: 'button', class: 'kind-btn', text, 'aria-pressed': String(v === now), dataset: { kind: v },
    on: {
      click: () => {
        if (v === now) return;
        sfx.tap();
        now = v;
        for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.kind === now));
        node.dataset.kind = now;
        onPick(v);
      },
    },
  }));
  const node = el('div', { class: 'kind-switch', role: 'group', 'aria-label': label, dataset: { kind: now } }, ...buttons);
  return node;
}

/* ── win overlay ──────────────────────────────────────────────────────── */

export interface OverlayOptions {
  title: string;
  onAgain: () => void;
  againLabel?: string;
  extraAction?: HTMLElement;
}

export interface Overlay {
  node: HTMLElement;
  /** `sticker` is the emoji just earned, shown big above the message */
  show: (text: string, sticker?: string | null) => void;
  hide: () => void;
}

export function winOverlay(o: OverlayOptions): Overlay {
  const text = el('p', {});
  const prize = el('div', { class: 'prize', hidden: 'hidden' });
  const actions = el('div', { class: 'actions' },
    el('button', {
      class: 'btn', type: 'button', text: o.againLabel ?? 'Play again',
      on: { click: () => { node.classList.remove('show'); o.onAgain(); } },
    }),
    o.extraAction ?? null,
    el('button', { class: 'btn ghost on-paper', type: 'button', text: 'Pick another game', on: { click: () => go('home') } }),
  );
  const node = el('div', { class: 'overlay' },
    el('div', { class: 'overlay-card' }, prize, el('h3', { text: o.title }), text, actions),
  );
  return {
    node,
    show: (message: string, sticker?: string | null) => {
      text.textContent = message;
      prize.hidden = !sticker;
      prize.textContent = sticker ?? '';
      node.classList.add('show');
      sfx.win();
      confetti();
    },
    hide: () => node.classList.remove('show'),
  };
}

/* ── confetti ─────────────────────────────────────────────────────────── */

const CONFETTI_COLOURS = ['#F3B229', '#E4572E', '#79D3B0', '#3D8FCB', '#FFF6E7'];

export function confetti(count = 26): void {
  if (prefersReducedMotion()) return;
  const layer = el('div', { class: 'confetti', 'aria-hidden': 'true' });
  for (let i = 0; i < count; i += 1) {
    layer.append(el('i', {
      style: {
        left: `${Math.random() * 100}%`,
        background: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
      },
      vars: {
        '--dur': `${1.8 + Math.random() * 1.6}s`,
        '--delay': `${Math.random() * .5}s`,
        '--spin': `${360 + Math.random() * 720}deg`,
      },
    }));
  }
  document.body.append(layer);
  window.setTimeout(() => layer.remove(), 4200);
}

/* ── a tiny helper the games share ────────────────────────────────────── */

export const scoreLine = (...parts: (Node | string)[]): HTMLElement => el('div', { class: 'score' }, ...parts);

export function counter(label: string, initial = '0'): { node: HTMLElement; set: (v: string | number) => void } {
  const b = el('b', { text: String(initial) });
  return { node: el('span', {}, label + ' ', b), set: (v) => { b.textContent = String(v); } };
}

/* ── the end of a round ───────────────────────────────────────────────── */

export interface ResultsTray {
  node: HTMLElement;
  /** show it, with the sticker just won — none for a round that won none */
  show: (sticker?: { face: string } | null) => void;
  hide: () => void;
}

/**
 * The tray at the end of a round, the same in every game that has one: a
 * heading with the sticker beside it, what happened, and what to do next.
 * One copy, so a fix to it — the sticker it shows, say — is made once.
 */
export function resultsTray(title: string | Node, body: Node, ...actions: HTMLElement[]): ResultsTray {
  const prize = el('span', { class: 'sticker fresh', hidden: 'hidden' });
  const node = el('div', { class: 'tray results', hidden: 'hidden' },
    el('h2', {}, title, ' ', prize), body,
    el('div', { class: 'row', style: { marginTop: '14px' } }, ...actions));
  return {
    node,
    show: (sticker) => {
      prize.hidden = !sticker;
      prize.textContent = sticker?.face ?? '';
      node.hidden = false;
    },
    hide: () => { node.hidden = true; },
  };
}

/** a round is over: the fanfare, the confetti, and a word for him */
export function celebrate(line?: string): void {
  sfx.win();
  confetti();
  if (line) say(line);
}
