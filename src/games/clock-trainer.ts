/* Short Hand, Long Hand — the clock's two scales, one at a time.
 *
 * A clock has two scales on one face: hours 1 to 12, and minutes 0 to 59
 * around the outside. A six-year-old reads the long hand against the hour
 * numbers and says 3:25 is "3:5". This game keeps the two apart. Hours are
 * red and minutes are blue; the minutes have their own ring of numbers with
 * the elapsed minutes filled in; the short hand's "hour zone" is shaded, so
 * at 3:50 the hour is still 3 although the hand is nearly at the 4; and the
 * long hand counts in fives, with the little steps after them.
 *
 * Three ways to play:
 *   Play            drag the hands, see the time in digits and words, and
 *                   why; watch a whole hour go by in jumps of five minutes
 *   Set the clock   make the clock say a time, with a hint that names what
 *                   is wrong: the hour zone, or how to count the minutes
 *   Read the clock  three times to choose from, the wrong two being the
 *                   mistakes children make (src/content/maths.ts)
 * at five levels: o'clock, half past, quarters, fives, any minute. A right
 * answer first time wins a star, and every five stars a sticker.
 *
 * Ported from a single-page trainer (docs/original-games/clock-trainer):
 * the teaching and the behaviour are kept; the look, the fonts, speech,
 * storage and timers are the app's. The minute numbers and the hour zone are
 * the scaffolds a grown-up fades, so their switches are behind the ⚙. */

import { el } from '../lib/dom';
import { lifetime } from '../lib/life';
import { read, write } from '../lib/storage';
import { say } from '../lib/speech';
import { settings } from '../lib/settings';
import { sfx } from '../lib/sfx';
import { awardFace } from '../lib/stickers';
import {
  HANDS_STEPS, clockHour, handsChoices, handsTarget, hourExplained, minuteExplained, minuteHint, moveMinute,
  sameTime, timeWords, type ClockTime,
} from '../content/maths';
import { confetti, counter, scoreLine, topbar } from '../ui/components';
import { svg } from '../ui/writing';

export const ID = 'clock-trainer';
const FACE = '🕰️';
/** a sticker for every this many stars */
const STARS_PER_STICKER = 5;
/** the long hand's jumps when watching an hour go by */
const WATCH_MS = 600;

type Mode = 'explore' | 'make' | 'quiz';

interface Saved { stars?: number; ring?: boolean; zone?: boolean }

/* ── the face ────────────────────────────────────────────────────────── */

const C = 200;
/** a point at radius r, deg degrees clockwise from the top */
const pol = (r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
};
const pad = (m: number): string => String(m).padStart(2, '0');

/** the time in digits, the hour red and the minutes blue */
function digits(t: ClockTime, big = false): HTMLElement {
  return el('span', { class: big ? 'ct-digits big' : 'ct-digits' },
    el('span', { class: 'ct-hc', text: String(clockHour(t.h)) }),
    el('span', { class: 'ct-colon', text: ':' }),
    el('span', { class: 'ct-mc', text: pad(t.m) }));
}

/** a sentence with "short hand" in red and "long hand" in blue */
function paint(text: string): Node[] {
  return text.split(/(short hand|long hand|blue number)/).filter(Boolean).map((part) =>
    part === 'short hand' ? el('span', { class: 'ct-hc', text: part })
      : part === 'long hand' || part === 'blue number' ? el('span', { class: 'ct-mc', text: part })
        : document.createTextNode(part));
}

export function mount(root: HTMLElement): () => void {
  const life = lifetime();
  const saved = read<Saved>(ID, {});
  const stepKey = `maths-step:${ID}`;
  const savedLevel = Number(read<number>(stepKey, 0));
  let level = Number.isInteger(savedLevel) ? Math.min(HANDS_STEPS.length - 1, Math.max(0, savedLevel)) : 0;
  let mode: Mode = 'explore';
  let t: ClockTime = { h: 3, m: 25 };
  let target: ClockTime | null = null;
  let ring = saved.ring !== false;
  let zoneOn = saved.zone !== false;
  let stars = typeof saved.stars === 'number' && saved.stars > 0 ? Math.floor(saved.stars) : 0;
  let locked = false;
  let first = true;
  let done = false;
  let watching = false;

  const save = (): void => { write(ID, { stars, ring, zone: zoneOn }); };

  /* ── the clock, drawn once ─────────────────────────────────────────── */

  const clock = svg('svg', { class: 'ct-clock', viewBox: '0 0 400 400', role: 'img', 'aria-label': 'Clock you can move' });
  const ringG = svg('g', { class: 'ct-ringg' });
  const arc = svg('path', { class: 'ct-arc' });
  ringG.append(svg('circle', { cx: C, cy: C, r: 174, class: 'ct-ring' }), arc);
  const minNums: SVGElement[] = [];
  for (let i = 0; i < 12; i += 1) {
    const [x, y] = pol(175, i * 30);
    const n = svg('text', { x, y: y + 1, class: 'ct-minnum' });
    n.textContent = String(i * 5);
    minNums.push(n);
    ringG.append(n);
  }
  const zone = svg('path', { class: 'ct-zone' });
  clock.append(ringG, svg('circle', { cx: C, cy: C, r: 150, class: 'ct-face' }), zone);
  for (let i = 0; i < 60; i += 1) {
    const big = i % 5 === 0;
    const [x1, y1] = pol(big ? 133 : 140, i * 6);
    const [x2, y2] = pol(147, i * 6);
    clock.append(svg('line', { x1, y1, x2, y2, class: big ? 'ct-tick big' : 'ct-tick' }));
  }
  for (let i = 1; i <= 12; i += 1) {
    const [x, y] = pol(110, i * 30);
    const n = svg('text', { x, y: y + 2, class: 'ct-hournum' });
    n.textContent = String(i);
    clock.append(n);
  }
  const hourHand = svg('line', { x1: C, y1: C, x2: C, y2: C - 80, class: 'ct-hhand' });
  const minuteHand = svg('line', { x1: C, y1: C, x2: C, y2: C - 143, class: 'ct-mhand' });
  clock.append(hourHand, minuteHand, svg('circle', { cx: C, cy: C, r: 10, class: 'ct-pin' }));

  const hourAngle = (): number => (t.h % 12) * 30 + t.m * 0.5;

  /* ── the Play screen ───────────────────────────────────────────────── */

  const readDigits = el('div', { class: 'ct-readout-digits' });
  const readWords = el('div', { class: 'ct-words' });
  const sayBtn = el('button', { class: 'btn ghost small on-paper', type: 'button', text: '🔊 Say it out loud' });
  sayBtn.addEventListener('click', () => { sfx.tap(); say(timeWords(t.h, t.m)); });
  const exH = el('p', {});
  const exM = el('p', {});
  const chips = el('div', { class: 'ct-chips' });
  const exSum = el('p', { class: 'ct-sum' });
  const watchBtn = el('button', { class: 'btn ct-wide', type: 'button', text: 'Watch one whole hour go by' });
  const explore = el('div', { class: 'ct-pane' },
    el('div', { class: 'ct-readout' }, readDigits, el('div', {}, readWords, sayBtn)),
    el('div', { class: 'ct-card h' }, el('h2', { text: 'Short hand tells the hour' }), exH),
    el('div', { class: 'ct-card m' }, el('h2', { text: 'Long hand tells the minutes' }), exM, chips, exSum),
    watchBtn,
    el('p', { class: 'tag ct-tip', text: 'Drag the hands with your finger. The red numbers belong to the short hand. The blue numbers around the outside belong to the long hand.' }));

  function explain(): void {
    readDigits.replaceChildren(digits(t, true));
    readWords.textContent = timeWords(t.h, t.m);
    exH.textContent = hourExplained(t);
    const ex = minuteExplained(t.m);
    exM.textContent = ex.text;
    const last = ex.fives[ex.fives.length - 1];
    chips.replaceChildren(
      ...ex.fives.map((k) => el('span', { class: k === last && !ex.extra ? 'ct-chip last' : 'ct-chip', text: String(k) })),
      ...(ex.extra ? [el('span', { class: 'ct-chip extra last', text: `+${ex.extra}` })] : []));
    exSum.textContent = ex.total;
  }

  /* ── the games ─────────────────────────────────────────────────────── */

  const levelBtns = HANDS_STEPS.map((s, i) => {
    const b = el('button', { class: 'ct-level', type: 'button', text: s.name, dataset: { level: String(i) } });
    b.addEventListener('click', () => {
      sfx.tap();
      level = i;
      write(stepKey, level);
      drawLevels();
      newRound();
    });
    return b;
  });
  const levels = el('div', { class: 'ct-levels', role: 'group', 'aria-label': 'How hard' }, ...levelBtns);
  const ask = el('p', { class: 'ct-ask' });
  const choices = el('div', { class: 'ct-choices', hidden: 'hidden' });
  const checkBtn = el('button', { class: 'btn ct-wide', type: 'button', text: 'Check my clock' });
  const fb = el('div', { class: 'ct-fb', 'aria-live': 'polite' });
  const nextBtn = el('button', { class: 'btn ghost ct-wide', type: 'button', text: 'Next one', hidden: 'hidden' });
  const game = el('div', { class: 'ct-pane', hidden: 'hidden' }, levels, ask, choices, checkBtn, fb, nextBtn);

  const drawLevels = (): void => {
    levelBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === level)));
  };

  function feedback(kind: '' | 'good' | 'hint', ...parts: (Node | string)[]): void {
    fb.className = kind ? `ct-fb ${kind}` : 'ct-fb';
    fb.replaceChildren(...parts);
  }

  const starCount = counter('⭐ Stars', String(stars));
  const starsEl = starCount.node;
  starsEl.classList.add('ct-stars');

  function star(): void {
    stars += 1;
    starCount.set(stars);
    save();
    starsEl.classList.remove('pop');
    void starsEl.offsetWidth;
    starsEl.classList.add('pop');
    if (stars % STARS_PER_STICKER === 0) {
      awardFace(ID, FACE);
      fb.append(el('p', { class: 'ct-prize', text: `${stars} stars! A sticker for your book: ${FACE}` }));
      sfx.win();
      confetti(18);
    }
  }

  /** the long hand moves in fives while setting the clock, until "any minute" */
  const snap = (): number => (mode === 'make' && level <= 3 ? 5 : 1);

  function newRound(): void {
    target = handsTarget(HANDS_STEPS[level], target ?? undefined);
    first = true;
    done = false;
    nextBtn.hidden = true;
    if (mode === 'make') {
      t = { h: 0, m: 0 };
      locked = false;
      ask.replaceChildren('Can you make the clock say ', digits(target, true));
      choices.hidden = true;
      checkBtn.hidden = false;
      feedback('', ...paint('First put the short hand in the right zone. Then move the long hand.'));
    } else {
      t = { ...target };
      locked = true;
      ask.textContent = 'What time is it?';
      checkBtn.hidden = true;
      buildChoices(target);
      feedback('', ...paint('Look at the short hand first, then the long hand.'));
    }
    lockUI();
    render();
  }

  function buildChoices(want: ClockTime): void {
    choices.hidden = false;
    choices.replaceChildren(...handsChoices(want, HANDS_STEPS[level]).map((c) => {
      const b = el('button', {
        class: 'ct-choice', type: 'button', 'aria-label': `${clockHour(c.h)} ${pad(c.m)}`,
        dataset: { time: `${clockHour(c.h)}:${pad(c.m)}`, ok: c.ok ? '1' : '0' },
      }, digits(c));
      b.addEventListener('click', () => {
        if (done) return;
        if (c.ok) {
          done = true;
          b.classList.add('right');
          sfx.cheer();
          feedback('good', 'Yes! It is ', digits(want), '. We say ', el('b', { text: timeWords(want.h, want.m) }), '.');
          if (first) star();
          nextBtn.hidden = false;
          nextBtn.focus();
        } else {
          /* that one is out, and the helpers come back on to show why */
          first = false;
          b.disabled = true;
          sfx.wrong();
          ring = true;
          zoneOn = true;
          drawHelpers();
          render();
          feedback('hint', ...paint('Not that one. Which zone is the short hand in? That is the hour. Then read the blue number next to the long hand.'));
        }
      });
      return b;
    }));
  }

  checkBtn.addEventListener('click', () => {
    if (done || !target) return;
    const want = target;
    if (sameTime(t, want)) {
      done = true;
      locked = true;
      lockUI();
      sfx.cheer();
      feedback('good', 'You did it! That is ', digits(want), '. We say ', el('b', { text: timeWords(want.h, want.m) }), '.');
      if (first) star();
      nextBtn.hidden = false;
      nextBtn.focus();
      return;
    }
    first = false;
    sfx.wrong();
    if (clockHour(t.h) !== clockHour(want.h)) {
      const hour = clockHour(want.h);
      feedback('hint', ...paint(`Look at the short hand. Put it in the ${hour} zone: past the ${hour}, before the ${clockHour(want.h + 1)}.`));
    } else {
      feedback('hint', 'The hour is right! ', ...paint(minuteHint(want.m)));
    }
  });
  nextBtn.addEventListener('click', () => { sfx.tap(); newRound(); });

  /* ── the hours and minutes buttons ─────────────────────────────────── */

  const stepBtn = (text: string, label: string, cls: string, fn: () => void): HTMLButtonElement => {
    const b = el('button', { class: `ct-step ${cls}`, type: 'button', text, 'aria-label': label }) as HTMLButtonElement;
    b.addEventListener('click', () => {
      if (locked) return;
      sfx.tap();
      fn();
      render();
    });
    return b;
  };
  const hDown = stepBtn('−1', 'One hour back', 'h', () => { t = { h: (t.h + 11) % 12, m: t.m }; });
  const hUp = stepBtn('+1', 'One hour forward', 'h', () => { t = { h: (t.h + 1) % 12, m: t.m }; });
  const m5Down = stepBtn('−5', 'Five minutes back', 'm', () => { t = moveMinute(t, t.m - 5); });
  const m1Down = stepBtn('−1', 'One minute back', 'm', () => { t = moveMinute(t, t.m - 1); });
  const m1Up = stepBtn('+1', 'One minute forward', 'm', () => { t = moveMinute(t, t.m + 1); });
  const m5Up = stepBtn('+5', 'Five minutes forward', 'm', () => { t = moveMinute(t, t.m + 5); });
  /* each set of buttons stays together when the row has to wrap */
  const steps = el('div', { class: 'ct-steps' },
    el('span', { class: 'ct-group' }, el('span', { class: 'ct-lab ct-hc-on-deep', text: 'Hours' }), hDown, hUp),
    el('span', { class: 'ct-group' }, el('span', { class: 'ct-lab ct-mc-on-deep', text: 'Minutes' }), m5Down, m1Down, m1Up, m5Up));

  function lockUI(): void {
    clock.classList.toggle('locked', locked);
    steps.hidden = mode === 'quiz';
    for (const b of [hUp, hDown, m1Up, m1Down, m5Up, m5Down]) b.disabled = locked;
    m1Up.hidden = m1Down.hidden = snap() === 5;
  }

  /* ── the helpers, a grown-up's to fade ─────────────────────────────── */

  const ringBtn = el('button', { class: 'chip', type: 'button', text: 'Minute numbers' });
  const zoneBtn = el('button', { class: 'chip', type: 'button', text: 'Hour zone' });
  const drawHelpers = (): void => {
    ringBtn.setAttribute('aria-pressed', String(ring));
    zoneBtn.setAttribute('aria-pressed', String(zoneOn));
  };
  ringBtn.addEventListener('click', () => { sfx.tap(); ring = !ring; save(); drawHelpers(); render(); });
  zoneBtn.addEventListener('click', () => { sfx.tap(); zoneOn = !zoneOn; save(); drawHelpers(); render(); });
  drawHelpers();
  const panel = el('div', { class: 'panel', hidden: 'hidden' },
    el('div', { class: 'row' }, el('span', { class: 'lbl', text: 'Helpers' }), ringBtn, zoneBtn),
    el('p', { class: 'tag', text: 'The blue minute numbers and the shaded hour zone help while the clock is new. Switch them off once it makes sense; a wrong answer in Read the clock brings them back for that question.' }));

  /* ── drawing ───────────────────────────────────────────────────────── */

  function render(): void {
    hourHand.setAttribute('transform', `rotate(${hourAngle()} ${C} ${C})`);
    minuteHand.setAttribute('transform', `rotate(${t.m * 6} ${C} ${C})`);
    ringG.style.display = ring ? '' : 'none';
    zone.style.display = zoneOn ? '' : 'none';
    const [x1, y1] = pol(147, (t.h % 12) * 30);
    const [x2, y2] = pol(147, (t.h % 12) * 30 + 30);
    zone.setAttribute('d', `M${C} ${C} L${x1} ${y1} A147 147 0 0 1 ${x2} ${y2} Z`);
    if (t.m === 0) arc.setAttribute('d', '');
    else {
      const [ex, ey] = pol(174, t.m * 6);
      arc.setAttribute('d', `M${C} ${C - 174} A174 174 0 ${t.m > 30 ? 1 : 0} 1 ${ex} ${ey}`);
    }
    const on = Math.floor(t.m / 5);
    minNums.forEach((n, k) => n.setAttribute('class', k === on ? 'ct-minnum on' : 'ct-minnum'));
    clock.setAttribute('aria-label', `Clock showing ${timeWords(t.h, t.m)}`);
    clock.dataset.time = `${clockHour(t.h)}:${pad(t.m)}`;
    if (mode === 'explore') explain();
  }

  /* ── dragging the hands ────────────────────────────────────────────── */

  let drag: 'h' | 'm' | null = null;
  const pointer = (ev: PointerEvent): { ang: number; r: number } => {
    const box = clock.getBoundingClientRect();
    const x = ((ev.clientX - box.left) / box.width) * 400 - C;
    const y = ((ev.clientY - box.top) / box.height) * 400 - C;
    let ang = (Math.atan2(x, -y) * 180) / Math.PI;
    if (ang < 0) ang += 360;
    return { ang, r: Math.hypot(x, y) };
  };
  const apart = (a: number, b: number): number => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
  function move(ev: PointerEvent): void {
    const p = pointer(ev);
    if (drag === 'm') {
      const s = snap();
      t = moveMinute(t, Math.round(p.ang / 6 / s) * s);
    } else {
      /* the short hand jumps zone to zone and keeps the minutes */
      t = { h: Math.floor(p.ang / 30) % 12, m: t.m };
    }
    render();
  }
  clock.addEventListener('pointerdown', (ev) => {
    if (locked) return;
    const p = pointer(ev);
    const dH = apart(p.ang, hourAngle());
    const dM = apart(p.ang, t.m * 6);
    /* the nearer hand by angle; where they overlap, near the middle is the short hand */
    drag = p.r < 96 && dH < 40 ? 'h' : dM <= dH ? 'm' : 'h';
    try { clock.setPointerCapture(ev.pointerId); } catch { /* not every browser */ }
    ev.preventDefault();
    move(ev);
  });
  clock.addEventListener('pointermove', (ev) => { if (drag && !locked) move(ev); });
  const drop = (): void => { drag = null; };
  clock.addEventListener('pointerup', drop);
  clock.addEventListener('pointercancel', drop);

  /* ── watching an hour go by ────────────────────────────────────────── */

  watchBtn.addEventListener('click', () => {
    if (watching) return;
    sfx.tap();
    watching = true;
    t = { h: t.h, m: 0 };
    locked = true;
    lockUI();
    render();
    let jumps = 0;
    const tick = (): void => {
      t = moveMinute(t, t.m + 5);
      jumps += 1;
      render();
      if (jumps < 12) { life.later(tick, WATCH_MS); return; }
      watching = false;
      locked = false;
      lockUI();
      exH.textContent = `See? The long hand went all the way around, and the short hand moved to the next number. Now it points right at the ${clockHour(t.h)}.`;
    };
    life.later(tick, WATCH_MS);
  });

  /* ── the three ways to play ────────────────────────────────────────── */

  const tabs = (['explore', 'make', 'quiz'] as Mode[]).map((m) => {
    const b = el('button', { class: 'ct-tab', type: 'button', dataset: { mode: m },
      text: m === 'explore' ? 'Play' : m === 'make' ? 'Set the clock' : 'Read the clock' });
    b.addEventListener('click', () => { sfx.tap(); setMode(m); });
    return b;
  });

  function setMode(m: Mode): void {
    /* an hour being watched stops where it is */
    life.clear();
    watching = false;
    mode = m;
    locked = false;
    tabs.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    explore.hidden = m !== 'explore';
    game.hidden = m === 'explore';
    sayBtn.hidden = !settings().speech;
    if (m === 'explore') { lockUI(); render(); } else { drawLevels(); newRound(); }
  }

  const node = el('div', { class: 'wrap wide ct' },
    topbar({ title: 'Short Hand,', swash: 'Long Hand', tagline: 'The short hand tells the hour. The long hand tells the minutes.', onSetup: (open) => { panel.hidden = !open; } }),
    panel,
    scoreLine(starsEl),
    el('div', { class: 'ct-tabs', role: 'group', 'aria-label': 'What to do' }, ...tabs),
    el('div', { class: 'ct-stage' },
      el('div', { class: 'ct-clockcol' }, el('div', { class: 'ct-clockcard' }, clock), steps),
      el('div', { class: 'ct-side' }, explore, game)));

  root.append(node);
  setMode('explore');
  return life.end;
}
