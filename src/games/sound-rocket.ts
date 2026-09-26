/* Sound Rocket — catch the words with the sound, dodge the rest.
 *
 * The first arcade game. A rocket at the bottom follows his finger; words
 * drift down from the top; the sound to catch is shown above. Catching a word
 * with the sound scores. Catching one without it costs a shield, and three
 * lost shields end the round. A word with the sound that drifts past costs
 * nothing, so the pressure falls on reading carefully, not on reflexes.
 *
 * Why it is shaped this way:
 *
 * The rocket follows the finger rather than being steered. A six-year-old
 * with a joystick is fighting the controls; with his finger he just points at
 * the word he has read. Reading is the game, not aiming.
 *
 * The words drift, they do not fall. Reading a moving word is much harder
 * than reading a still one, and he should lose to a wrong read, not to a word
 * he never had time to read. The speed rises with the score, so the game gets
 * harder as he gets better, but it starts slow.
 *
 * Losing is quick to recover from: one tap and he is flying again, with his
 * best score for that sound shown and kept on the device. That is what makes
 * losing part of the fun rather than the end of it.
 *
 * Every word a child sees here comes from words.ts, and the letters that make
 * the sound are lit from its explicit positions when he catches one. The
 * dodge words are real words from other sounds, with any word that contains
 * a spelling of the target sound thrown out — "bed" must never be the wrong
 * answer when the sound is e. */

import { el, prefersReducedMotion, replay } from '../lib/dom';
import { pick, shuffle } from '../lib/random';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { read, write } from '../lib/storage';
import { setMarked } from '../lib/highlight';
import { mightContain, realWords, sound, type Level, type Sound, type Word } from '../content/index';
import { createSetup, topbar } from '../ui/components';
import { award } from '../lib/stickers';

const SHIELDS = 3;
/** below this many words with the sound, a round would repeat itself */
const MIN_TARGETS = 6;
/** how many catches earn a sticker at the end of a round */
const STICKER_AT = 5;

type State = 'ready' | 'playing' | 'paused' | 'over';

interface Drop {
  node: HTMLElement;
  word: Word;
  target: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
}

const bestKey = 'rocket-best';
const bestFor = (id: string): number => read<Record<string, number>>(bestKey, {})[id] ?? 0;
function saveBest(id: string, score: number): void {
  const all = read<Record<string, number>>(bestKey, {});
  all[id] = score;
  write(bestKey, all);
}

export function mount(root: HTMLElement): () => void {
  /* ── setup: which sound to catch ─────────────────────────────────────── */

  const targetSel = el('select', { 'aria-label': 'Which sound to catch' });
  const extra = el('div', { class: 'row' },
    el('span', { class: 'lbl', text: 'Catch' }), targetSel,
  );
  targetSel.addEventListener('change', () => reset());

  const setup = createSetup({
    extra: [extra],
    onChange: () => { fillTargets(); reset(); },
  });

  const levels = (): Level[] => setup.filter().levels;
  const enough = (s: Sound): boolean => realWords({ sounds: [s.id], levels: levels() }).length >= MIN_TARGETS;

  /** only offer sounds with enough words to fill a round */
  function fillTargets(): void {
    const keep = targetSel.value;
    const usable = setup.available().filter(enough);
    targetSel.replaceChildren(...usable.map((s) =>
      el('option', { value: s.id, text: `${s.label} — ${s.asIn}` })));
    if (usable.some((s) => s.id === keep)) { targetSel.value = keep; return; }
    /* start on one of this week's sounds when there is a usable one */
    const chosen = setup.filter().sounds.filter((id) => usable.some((s) => s.id === id));
    if (chosen.length) targetSel.value = pick(chosen);
  }

  /* ── the screen ──────────────────────────────────────────────────────── */

  const targetLabel = el('span', { class: 'rk-target' });
  const scoreEl = el('b', { text: '0' });
  const bestEl = el('span', { class: 'rk-best' });
  const shieldsEl = el('span', { class: 'rk-shields', role: 'img', 'aria-label': 'Shields left' });
  const pauseBtn = el('button', {
    class: 'icon-btn', type: 'button', text: '⏸', 'aria-label': 'Pause',
    on: { click: () => (state === 'playing' ? pause() : state === 'paused' ? resume() : undefined) },
  });

  const hud = el('div', { class: 'rk-hud' },
    targetLabel,
    el('span', { class: 'rk-score' }, 'Caught ', scoreEl),
    shieldsEl, bestEl, pauseBtn,
  );

  const rocket = el('div', { class: 'rk-rocket', 'aria-hidden': 'true', text: '🚀' });
  const overlay = el('div', { class: 'rk-overlay' });
  const sky = el('div', { class: 'rk-sky', role: 'application', 'aria-label': 'Sound Rocket play area' },
    rocket, overlay);

  const node = el('div', { class: 'wrap' },
    topbar({
      title: 'Sound', swash: 'Rocket',
      tagline: 'Catch the words with the sound. Dodge the rest.',
      /* the panel pushes the sky down while it is open; fit it again once
         it has gone, so the sky is sized for the screen he plays on */
      onSetup: (open) => { setup.open(open); if (open && state === 'playing') pause(); if (!open) measure(); },
    }),
    setup.node,
    hud,
    sky,
  );

  /* ── state ───────────────────────────────────────────────────────────── */

  let state: State = 'ready';
  let target: Sound | null = null;
  let targets: Word[] = [];
  let dodges: Word[] = [];
  let drops: Drop[] = [];
  let caught: Word[] = [];
  let score = 0;
  let shields = SHIELDS;
  let skyW = 0;
  let skyH = 0;
  let rocketX = 0;
  let aimX = 0;
  let spawnIn = 0;
  let last = 0;
  let raf = 0;
  let targetBag: Word[] = [];
  let dodgeBag: Word[] = [];

  const reduced = prefersReducedMotion();
  const ROCKET_W = 64;
  const ROCKET_H = 64;

  /* The sky runs from wherever the header leaves it to the bottom of what is
     actually visible. A fixed share of vh overshoots on an iPhone: Safari
     sizes vh as if its toolbar were hidden, so the bottom of the sky — where
     the rocket lives — sat under the address bar. svh is the height with the
     toolbars showing, and the safe-area inset keeps it off the home bar when
     it runs from the home screen. A browser without svh ignores this and
     keeps the stylesheet's height. */
  function fit(): void {
    const top = Math.round(sky.getBoundingClientRect().top + window.scrollY);
    sky.style.height = `clamp(300px, calc(100svh - ${top}px - env(safe-area-inset-bottom, 0px) - 12px), 820px)`;
  }

  function measure(): void {
    fit();
    const r = sky.getBoundingClientRect();
    skyW = r.width;
    skyH = r.height;
    rocketX = Math.min(Math.max(rocketX || skyW / 2, ROCKET_W / 2), skyW - ROCKET_W / 2);
    aimX = Math.min(Math.max(aimX || rocketX, ROCKET_W / 2), skyW - ROCKET_W / 2);
    placeRocket();
  }

  /* Position goes through the `translate` property, never `transform`. CSS
     applies translate, then rotate, then scale, then transform — so a
     position in `transform` gets turned by the rocket's tilt and stretched by
     the catch animation, and the rocket is drawn a long way from where it is
     hit-tested. `translate` comes first and is left alone by both. */
  function placeRocket(): void {
    rocket.style.translate = `${rocketX - ROCKET_W / 2}px 0`;
  }

  /** drift speed in px/s — slow at first, faster as he scores. Measured in
      screen-heights so a word takes the same time to cross an iPad and a
      phone: about eight seconds to start, closing to about four. */
  function speed(): number {
    const base = skyH / 8;
    const cap = skyH / (reduced ? 6 : 4.2);
    return Math.min(base * (1 + score * 0.05), cap);
  }

  /** seconds until the next word appears */
  const interval = (): number => Math.max(0.95, 2.4 - score * 0.06);

  function drawShields(): void {
    shieldsEl.replaceChildren(...Array.from({ length: SHIELDS }, (_, i) =>
      el('span', { class: i < shields ? 'on' : 'off', text: '🛡️' })));
    shieldsEl.setAttribute('aria-label', `${shields} shields left`);
  }

  function drawTarget(): void {
    if (!target) { targetLabel.textContent = ''; return; }
    targetLabel.replaceChildren(
      'Catch ',
      el('span', { class: 'rk-sound', vars: { '--wash': target.tones.wash, '--deep': target.tones.deep }, text: target.label }),
      ` like ${target.asIn}`,
    );
    bestEl.textContent = `Best ${bestFor(target.id)}`;
  }

  function showOverlay(...children: (Node | string)[]): void {
    overlay.replaceChildren(...children);
    overlay.hidden = false;
  }

  /* ── rounds ──────────────────────────────────────────────────────────── */

  function reset(): void {
    stop();
    for (const d of drops) d.node.remove();
    drops = [];
    target = targetSel.value ? sound(targetSel.value) : null;
    const lv = levels();
    if (target) {
      targets = realWords({ sounds: [target.id], levels: lv });
      const others = setup.available().filter((s) => s.id !== target!.id).map((s) => s.id);
      dodges = realWords({ sounds: others, levels: lv }).filter((w) => !mightContain(w.text, target!));
    } else {
      targets = []; dodges = [];
    }
    score = 0; shields = SHIELDS; caught = []; targetBag = []; dodgeBag = [];
    scoreEl.textContent = '0';
    drawShields();
    drawTarget();
    state = 'ready';
    pauseBtn.disabled = true;

    if (!target || !dodges.length) {
      showOverlay(el('p', { class: 'tag', text: 'Turn on a few more sounds in setup to play.' }));
      return;
    }
    showOverlay(
      el('p', { class: 'rk-big' }, 'Catch ',
        el('span', { class: 'rk-sound', vars: { '--wash': target.tones.wash, '--deep': target.tones.deep }, text: target.label })),
      el('p', { class: 'tag', text: `Words with ${target.label} in them, like ${target.asIn}. Dodge the others!` }),
      el('button', { class: 'btn', type: 'button', text: '🚀 Launch', on: { click: () => start() } }),
    );
  }

  function start(): void {
    if (!target) return;
    overlay.hidden = true;
    measure();
    state = 'playing';
    pauseBtn.disabled = false;
    pauseBtn.textContent = '⏸';
    spawnIn = 0.4;
    say(target.asIn);
    sfx.tap();
    run();
  }

  function pause(): void {
    if (state !== 'playing') return;
    state = 'paused';
    stop();
    pauseBtn.textContent = '▶';
    pauseBtn.setAttribute('aria-label', 'Carry on');
    showOverlay(
      el('p', { class: 'rk-big', text: 'Paused' }),
      el('button', { class: 'btn', type: 'button', text: '▶ Carry on', on: { click: () => resume() } }),
    );
  }

  function resume(): void {
    if (state !== 'paused') return;
    overlay.hidden = true;
    state = 'playing';
    pauseBtn.textContent = '⏸';
    pauseBtn.setAttribute('aria-label', 'Pause');
    run();
  }

  function gameOver(): void {
    state = 'over';
    stop();
    pauseBtn.disabled = true;
    sfx.over();
    const id = target?.id ?? '';
    const best = bestFor(id);
    const record = score > best;
    if (record) saveBest(id, score);
    const sticker = score >= STICKER_AT ? award(caught.map((w) => w.sound)) : null;
    drawTarget();

    showOverlay(
      el('p', { class: 'rk-big', text: record && score > 0 ? '⭐ New best!' : 'Game over' }),
      el('p', { class: 'rk-final' }, 'You caught ', el('b', { text: String(score) })),
      sticker ? el('p', { class: 'tag' }, 'New sticker ', el('span', { class: 'sticker fresh', text: sticker.face })) : '',
      el('button', { class: 'btn', type: 'button', text: '🚀 Go again', on: { click: () => { reset(); start(); } } }),
    );
    say(record && score > 0 ? `New best! ${score}!` : `You caught ${score}!`);
  }

  /* ── the loop ────────────────────────────────────────────────────────── */

  function run(): void {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop(): void {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  /** draw from a shuffled bag, refilling when empty, so words do not repeat
      until every one has had a turn */
  function draw(pool: Word[], bag: Word[]): Word {
    if (!bag.length) bag.push(...shuffle(pool));
    return bag.pop() ?? pick(pool);
  }

  /** half with the sound, half without, and not a word already on screen */
  function nextWord(): { word: Word; target: boolean } {
    const isTarget = Math.random() < 0.5;
    const onScreen = new Set(drops.map((d) => d.word.text));
    let word = isTarget ? draw(targets, targetBag) : draw(dodges, dodgeBag);
    for (let i = 0; i < 4 && onScreen.has(word.text); i += 1) {
      word = isTarget ? draw(targets, targetBag) : draw(dodges, dodgeBag);
    }
    return { word, target: isTarget };
  }

  function spawn(): void {
    const { word, target: isTarget } = nextWord();
    const node = el('div', { class: 'rk-drop', dataset: { target: String(isTarget) }, text: word.text });
    sky.insertBefore(node, rocket);
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    /* keep clear of the last word so two never stack on top of each other */
    const prev = drops[drops.length - 1];
    let x = Math.random() * Math.max(1, skyW - w);
    for (let i = 0; i < 6 && prev && prev.y < h * 2 && Math.abs(x - prev.x) < Math.max(w, prev.w); i += 1) {
      x = Math.random() * Math.max(1, skyW - w);
    }
    const drop: Drop = { node, word, target: isTarget, x, y: -h, w, h };
    node.style.translate = `${x}px ${drop.y}px`;
    drops.push(drop);
  }

  function frame(now: number): void {
    if (state !== 'playing') return;
    /* a long gap (a tab switch, a slow frame) must not teleport the words */
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    rocketX += (aimX - rocketX) * Math.min(1, dt * 14);
    placeRocket();

    spawnIn -= dt;
    if (spawnIn <= 0) { spawn(); spawnIn = interval(); }

    const v = speed();
    const rocketTop = skyH - ROCKET_H - 8;
    const rLeft = rocketX - ROCKET_W / 2;
    const rRight = rocketX + ROCKET_W / 2;

    for (const d of [...drops]) {
      d.y += v * dt;
      d.node.style.translate = `${d.x}px ${d.y}px`;
      const bottom = d.y + d.h;
      const overlaps = d.x < rRight && d.x + d.w > rLeft;
      if (bottom >= rocketTop + 10 && d.y < rocketTop + ROCKET_H * 0.5 && overlaps) {
        hit(d);
        if (state !== 'playing') return;
        continue;
      }
      if (d.y > skyH) remove(d);
    }
    raf = requestAnimationFrame(frame);
  }

  function remove(d: Drop): void {
    d.node.remove();
    drops = drops.filter((x) => x !== d);
  }

  function hit(d: Drop): void {
    drops = drops.filter((x) => x !== d);
    if (d.target && target) {
      score += 1;
      scoreEl.textContent = String(score);
      caught.push(d.word);
      sfx.zap();
      /* the letters that made the sound light up as it is caught */
      setMarked(d.node, d.word.text, d.word.spans, { tones: target.tones });
      d.node.classList.add('caught');
      replay(rocket, 'boost');
      window.setTimeout(() => d.node.remove(), 450);
      return;
    }
    shields -= 1;
    drawShields();
    sfx.crack();
    d.node.classList.add('bad');
    if (!reduced) replay(sky, 'shake');
    window.setTimeout(() => d.node.remove(), 350);
    if (shields <= 0) gameOver();
  }

  /* ── controls ────────────────────────────────────────────────────────── */

  /* the rocket sits under his finger: no aiming, no steering */
  function aimAt(clientX: number): void {
    const r = sky.getBoundingClientRect();
    aimX = Math.min(Math.max(clientX - r.left, ROCKET_W / 2), r.width - ROCKET_W / 2);
  }
  sky.addEventListener('pointerdown', (e) => { if (state === 'playing') aimAt(e.clientX); });
  sky.addEventListener('pointermove', (e) => { if (state === 'playing') aimAt(e.clientX); });

  /* arrow keys for anyone with a keyboard */
  function onKey(e: KeyboardEvent): void {
    if (state !== 'playing') return;
    if (e.key === 'ArrowLeft') { aimX = Math.max(ROCKET_W / 2, aimX - 48); e.preventDefault(); }
    if (e.key === 'ArrowRight') { aimX = Math.min(skyW - ROCKET_W / 2, aimX + 48); e.preventDefault(); }
    if (e.key === ' ' || e.key === 'p') { pause(); e.preventDefault(); }
  }
  /* switching away mid-round pauses rather than losing shields unseen */
  function onHidden(): void { if (document.hidden) pause(); }
  function onResize(): void { measure(); }

  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onHidden);
  window.addEventListener('resize', onResize);

  root.append(node);
  fillTargets();
  measure();
  reset();
  /* the reading font can arrive after the first layout and move the sky */
  void document.fonts?.ready.then(() => { if (sky.isConnected) measure(); });

  return () => {
    stop();
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onHidden);
    window.removeEventListener('resize', onResize);
  };
}
