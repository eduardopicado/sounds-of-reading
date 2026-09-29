/* Pass and Shoot — say each sound as the ball goes down the line.
 *
 * Every other game hands him a whole word. This one hands him its sounds,
 * one to a player, sh · i · p, and the ball has to travel along them left to
 * right before anyone can shoot. That is blending, done the way teachers do
 * it: say each sound, then push them together into a word.
 *
 * The app does not say the sounds. The device voice cannot say "sh" on its
 * own — it says "ess aitch", or nothing — so each player lights up as the
 * ball reaches him and the sound is his to say, out loud, which is what the
 * classroom asks of him anyway.
 *
 * Then the check. Three pictures appear in the goal: ship, shop, chip. He
 * shoots at the word he made. The two wrong ones are the nearest words that
 * have a picture, so only a word actually blended finds the net, and the
 * word is only spoken once the ball has gone in, when it can only confirm.
 *
 * His players wear the kit he picked in Penalty Shootout; the keeper is a
 * different team each match. */

import { el, replay } from '../lib/dom';
import { pick, shuffle } from '../lib/random';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { marked } from '../lib/highlight';
import { read, write } from '../lib/storage';
import { award } from '../lib/stickers';
import { pro } from '../lib/settings';
import { coachPick, mark } from '../lib/coach';
import { LEVELS, picturable, realWords, sound, type Level, type Word } from '../content/index';
import { nearWords } from '../content/near-words';
import { pieces, type Piece } from '../content/graphemes';
import { confetti, counter, createSetup, scoreLine, topbar } from '../ui/components';
import { TEAMS, YOU, label, player, teamById, type Team } from './teams';

/** how long the goal or the save stays on screen before the next word */
const LINGER_MS = 2200;

export function mount(root: HTMLElement): () => void {
  const lenSel = el('select', { 'aria-label': 'How many words' },
    el('option', { value: '6', text: '6 words' }),
    el('option', { value: '8', text: '8 words', selected: 'selected' }),
    el('option', { value: '12', text: '12 words' }),
  );
  lenSel.addEventListener('change', () => start());

  /* the same side he plays for in Penalty Shootout, and the same memory */
  const teamSel = el('select', { 'aria-label': 'Your team' },
    el('option', { value: YOU.id, text: label(YOU) }),
    el('optgroup', { label: 'Countries' },
      ...TEAMS.filter((t) => t.kind === 'country').map((t) => el('option', { value: t.id, text: label(t) }))),
    el('optgroup', { label: 'Clubs' },
      ...TEAMS.filter((t) => t.kind === 'club').map((t) => el('option', { value: t.id, text: label(t) }))),
  );
  teamSel.value = teamById(read<string>('shootout-team', YOU.id))?.id ?? YOU.id;
  teamSel.addEventListener('change', () => { write('shootout-team', teamSel.value); start(); });

  const setup = createSetup({
    extra: [el('div', { class: 'row' }, el('span', { class: 'lbl', text: 'This game' }), teamSel, lenSel)],
    onChange: () => start(),
  });

  const goals = counter('Goals');
  const totalEl = el('span', { text: '0' });

  const cue = el('p', { class: 'ps-cue', 'aria-live': 'polite' });

  /* ── the pitch: the goal at the top, the line of players across the middle ── */

  /* four pictures; Pro mode uses the fourth, and the rest of the time it hides */
  const targets = [0, 1, 2, 3].map((i) => {
    const btn = el('button', { class: 'ps-target', type: 'button', disabled: 'disabled' });
    btn.addEventListener('click', () => shoot(i));
    return btn;
  });
  /* the same goal and keeper as Penalty Shootout, pictures where the words were */
  const targetRow = el('div', { class: 'pk-spots waiting' }, ...targets);
  const keeper = el('div', { class: 'pk-keeper', 'aria-hidden': 'true' });
  const goal = el('div', { class: 'pk-goal' }, targetRow, keeper);

  const line = el('div', { class: 'ps-line' });
  const ball = el('div', { class: 'ps-ball', 'aria-hidden': 'true', text: '⚽' });
  const made = el('div', { class: 'ps-made', 'aria-live': 'polite' });
  const banner = el('div', { class: 'pk-banner', hidden: 'hidden', role: 'status' });
  const pitch = el('div', { class: 'ps-pitch' }, goal, line, ball, made, banner);

  const resultList = el('ul', {});
  const prize = el('span', { class: 'sticker fresh', hidden: 'hidden' });
  const resultTitle = el('span', {});
  const results = el('div', { class: 'tray results', hidden: 'hidden' },
    el('h2', {}, resultTitle, ' ', prize), resultList,
    el('div', { class: 'row', style: { marginTop: '14px' } },
      el('button', { class: 'btn', type: 'button', text: 'Play again', on: { click: () => start() } })),
  );

  const empty = el('p', { class: 'tag', hidden: 'hidden',
    text: 'Not enough words with pictures here yet. Try adding a level or another sound.' });

  const node = el('div', { class: 'wrap' },
    topbar({
      title: 'Pass and', swash: 'Shoot',
      tagline: 'Say each sound as you pass. Then shoot at the word you made.',
      onSetup: (open) => setup.open(open),
    }),
    setup.node,
    scoreLine(el('span', {}, goals.node, ' of ', totalEl)),
    empty, cue, pitch, results,
  );

  /* ── state ───────────────────────────────────────────────────────────── */

  let queue: Word[] = [];
  let current: Word | null = null;
  let cut: Piece[] = [];
  let players: HTMLButtonElement[] = [];
  let passed = 0;
  let options: Word[] = [];
  let busy = false;
  let scored = 0;
  let log: { word: Word; ok: boolean }[] = [];
  let us: Team = YOU;
  let rival: Team = YOU;
  let timers: number[] = [];

  const later = (fn: () => void, ms: number): void => { timers.push(window.setTimeout(fn, ms)); };
  const clearTimers = (): void => { for (const t of timers) window.clearTimeout(t); timers = []; };

  function levelsUpTo(): Level[] {
    const chosen = setup.filter().levels;
    if (!chosen.length) return [];
    const top = Math.max(...chosen);
    return LEVELS.map((l) => l.n).filter((n) => n <= top);
  }
  /* a word needs a picture to be shot at, and a clean cut to be passed along */
  const playable = (): Word[] => picturable(realWords(setup.filter())).filter((w) => pieces(w));

  /** near words with pictures unlike the answer's and unlike each other:
      two of them, or three in Pro mode */
  function decoys(word: Word): Word[] {
    const want = pro() ? 3 : 2;
    const out: Word[] = [];
    const seen = new Set([word.picture]);
    for (const w of nearWords(word, picturable(realWords({ levels: levelsUpTo() })), 10, { picture: true })) {
      if (seen.has(w.picture)) continue;
      seen.add(w.picture);
      out.push(w);
      if (out.length === want) break;
    }
    return out;
  }

  /* ── moving the ball ─────────────────────────────────────────────────── */

  /** the ball to a player's right foot, ready to go on down the line, or just
      under a picture in the net — measured, so it lands wherever the layout
      puts them */
  function ballTo(target: Element, where: 'feet' | 'net', instant = false): void {
    const p = pitch.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    const x = r.left + r.width / 2 + (where === 'feet' ? Math.min(26, r.width / 3) : 0);
    const y = where === 'feet' ? r.bottom - 14 : r.bottom + 8;
    if (instant) ball.style.transition = 'none';
    ball.style.translate = `${x - p.left - 22}px ${y - p.top - 22}px`;
    if (instant) { void ball.offsetWidth; ball.style.transition = ''; }
  }

  function resetKeeper(): void {
    keeper.style.transition = 'none';
    keeper.style.translate = '';
    keeper.style.rotate = '';
    void keeper.offsetWidth;
    keeper.style.transition = '';
  }

  /** a full dive to either post, a hop for the pictures between */
  function dive(to: number): void {
    const k = keeper.getBoundingClientRect();
    const s = targets[to].getBoundingClientRect();
    const last = options.length - 1;
    const middle = to !== 0 && to !== last;
    keeper.style.translate = `${s.left + s.width / 2 - (k.left + k.width / 2)}px ${middle ? -14 : 0}px`;
    keeper.style.rotate = to === 0 ? '-55deg' : to === last ? '55deg' : '0deg';
  }

  /* ── one word ────────────────────────────────────────────────────────── */

  function drawLine(word: Word): void {
    cut = pieces(word) ?? [];
    passed = 0;
    line.replaceChildren();
    line.style.setProperty('--n', String(cut.length));
    players = cut.map((piece, i) => {
      const card = el('span', { class: 'ps-sound', text: piece.text });
      const btn = el('button', { class: 'ps-player', type: 'button', 'aria-label': `Pass to ${piece.text}` },
        card, player(us, 64, 'kicker'));
      btn.addEventListener('click', () => pass(i));
      line.append(btn);
      return btn;
    });
  }

  function next(): void {
    const word = queue.pop();
    if (!word) { finish(); return; }
    current = word;
    busy = false;
    banner.hidden = true;
    made.replaceChildren();
    resetKeeper();
    keeper.replaceChildren(player(rival, 84, 'keeper'));
    targetRow.classList.add('waiting');
    for (const t of targets) { t.disabled = true; t.className = 'ps-target'; }
    drawLine(word);
    cue.textContent = 'Pass along the line. Say each sound!';
    pitch.dataset.phase = 'pass';
    /* the ball starts at the first player's feet */
    ballTo(players[0], 'feet', true);
  }

  /** a pass to player i: only ever the next one along, so it reads left to right */
  function pass(i: number): void {
    if (busy || !current || pitch.dataset.phase !== 'pass') return;
    if (i !== passed) {
      replay(players[passed], 'nudge');
      return;
    }
    sfx.tap();
    const piece = cut[i];
    const btn = players[i];
    btn.classList.add('lit');
    /* the sound the word is practising lights in its own colour; the rest in
       one plain colour, since the content only vouches for that one */
    if (piece.target) {
      const s = sound(current.sound);
      btn.style.setProperty('--wash', s.tones.wash);
      btn.style.setProperty('--line', s.tones.deep);
    }
    ballTo(btn, 'feet');
    passed += 1;
    if (passed === cut.length) later(readyToShoot, 420);
  }

  function readyToShoot(): void {
    if (!current) return;
    options = shuffle([current, ...decoys(current)]);
    targetRow.style.gridTemplateColumns = `repeat(${options.length}, 1fr)`;
    targets.forEach((t, i) => {
      const w = options[i];
      t.hidden = !w;
      t.textContent = w?.picture ?? '';
      if (w) t.setAttribute('aria-label', w.text);
      t.disabled = !w;
    });
    targetRow.classList.remove('waiting');
    cue.textContent = 'What word did you make? Shoot at it!';
    pitch.dataset.phase = 'shoot';
  }

  function shoot(i: number): void {
    if (busy || !current || pitch.dataset.phase !== 'shoot') return;
    busy = true;
    pitch.dataset.phase = 'shot';
    for (const t of targets) t.disabled = true;
    const word = current;
    const answer = options.indexOf(word);
    const right = i === answer;
    sfx.kick();
    ballTo(targets[i], 'net');
    dive(right ? pick(options.map((_, x) => x).filter((x) => x !== i)) : i);
    if (right) { scored += 1; goals.set(scored); }
    log.push({ word, ok: right });
    mark(word, right);

    later(() => {
      targets[answer].classList.add('answer');
      if (!right) targets[i].classList.add('wrong');
      banner.textContent = right ? 'GOAL!' : 'Saved!';
      banner.classList.toggle('good', right);
      banner.hidden = false;
      /* the sounds pushed together: the word, whole, under the line */
      made.replaceChildren(marked(word.text, word.spans, { tones: sound(word.sound).tones }));
      if (right) sfx.cheer();
      else sfx.wrong();
      say(word.text);
    }, 450);
    later(next, 450 + LINGER_MS);
  }

  /* ── the round ───────────────────────────────────────────────────────── */

  function start(): void {
    clearTimers();
    const pool = playable();
    queue = coachPick(pool, Number(lenSel.value));
    us = teamById(teamSel.value) ?? YOU;
    rival = pick(TEAMS.filter((t) => t !== YOU && t !== us && t !== rival));
    scored = 0; log = []; current = null; busy = false;
    goals.set(0);
    totalEl.textContent = String(queue.length);
    results.hidden = true;
    const none = queue.length === 0;
    empty.hidden = !none;
    pitch.hidden = none;
    cue.hidden = none;
    if (!none) next();
  }

  function finish(): void {
    current = null;
    pitch.dataset.phase = 'over';
    pitch.hidden = true;
    cue.hidden = true;
    resultTitle.textContent = scored === log.length ? `Every one a goal! ${scored} of ${log.length}` : `${scored} goals from ${log.length}`;
    resultList.replaceChildren();
    for (const entry of log) {
      const li = el('li', { class: entry.ok ? '' : 'miss' });
      li.append(el('span', { class: 'mk-pic', text: entry.word.picture ?? '' }), ' ');
      li.append(marked(entry.word.text, entry.word.spans, { tones: sound(entry.word.sound).tones }));
      if (!entry.ok) li.append(el('span', { class: 'mk', text: 'saved' }));
      resultList.append(li);
    }
    const sticker = award(log.map((e) => e.word.sound));
    prize.hidden = !sticker;
    prize.textContent = sticker?.face ?? '';
    results.hidden = false;
    sfx.whistle();
    later(() => { sfx.win(); confetti(); }, 350);
    say(scored === log.length ? 'Every one a goal!' : 'Good passing!');
  }

  /* a turned phone moves every player; put the ball back at the right feet */
  function onResize(): void {
    if (!players.length) return;
    const at = pitch.dataset.phase === 'pass' ? players[Math.max(0, passed - 1)] : players[players.length - 1];
    if (at) ballTo(at, 'feet', true);
  }
  window.addEventListener('resize', onResize);

  root.append(node);
  start();
  return () => { clearTimers(); window.removeEventListener('resize', onResize); };
}
