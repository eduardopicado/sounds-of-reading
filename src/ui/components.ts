/* The pieces every game is built from: the header, the setup panel, chips,
 * the win overlay. One copy, so the eight games cannot drift apart the way the
 * prototypes did. */

import { el, prefersReducedMotion } from '../lib/dom';
import { go } from '../lib/router';
import { sfx } from '../lib/sfx';
import { LEVELS, PRACTICE_SOUNDS, type Level, type Sound } from '../content/index';
import { settings, updateSettings } from '../lib/settings';

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
    el('h1', {}, o.title + ' ', el('span', { class: 'swash', text: o.swash })),
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

/* ── the setup panel ──────────────────────────────────────────────────── */

export interface Filter { sounds: string[]; levels: Level[] }

export interface SetupOptions {
  /** rows of per-game controls, shown under the sound and level pickers */
  extra?: HTMLElement[];
  /** called whenever the filter or a per-game control changes */
  onChange: () => void;
  /** some games practise one sound at a time and cannot take an empty pick */
  minSounds?: number;
}

export interface Setup {
  node: HTMLElement;
  open: (on: boolean) => void;
  /** the sounds and levels this game is actually using right now */
  filter: () => Filter;
  /** sounds available under the current levels, after the th merge */
  available: () => Sound[];
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
        levels = levels.includes(lv.n) ? levels.filter((x) => x !== lv.n) : [...levels, lv.n].sort();
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

  drawLevels();
  drawSounds();

  const panel = el('div', { class: 'panel', hidden: 'hidden' }, levelRow, soundRow, ...(o.extra ?? []));
  panel.append(el('div', { class: 'row' },
    el('button', {
      class: 'btn ghost small', type: 'button', text: 'Use this week’s sounds',
      on: {
        click: () => {
          levels = [...settings().levels];
          sounds = [...settings().sounds];
          drawLevels(); drawSounds(); o.onChange();
        },
      },
    }),
    el('button', {
      class: 'btn ghost small', type: 'button', text: 'Make this the week’s sounds',
      on: { click: () => updateSettings({ levels: [...levels], sounds: [...sounds] }) },
    }),
  ));

  return {
    node: panel,
    open: (on) => { panel.hidden = !on; },
    filter: () => ({ sounds: expand(sounds), levels }),
    available: soundsInLevels,
  };
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
