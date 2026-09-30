/* Penalty Shootout — read the word, beat the keeper.
 *
 * Football because it is what he and his friends play at lunch, and a
 * shootout because it is the part of football that is one decision at a time.
 *
 * Every kick is a reading question. A picture says which word to hit, and
 * three words sit in the goal: fish, with dish and fist beside it. The other
 * two are the closest real words he can read at his level, one letter off
 * where possible (src/content/near-words.ts), because that is where a guess
 * from the first letter or the shape falls over.
 *
 * Then the ends swap and he is in goal. This time the word is said, not
 * pictured, so the save is listening and reading together: hear "ship", find
 * ship, dive. A word said out loud can have a twin — pair, pear — so the
 * goal never holds two words that sound alike.
 *
 * Nothing is timed. The keeper waits for his kick and the ball waits for his
 * dive; the only pressure is the scoreboard. It is a real match and he can
 * lose it, but every kick is still a word read, and the next match is one
 * tap away. */

import { el } from '../lib/dom';
import { pick, shuffle } from '../lib/random';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { marked, setMarked } from '../lib/highlight';
import { pro, settings } from '../lib/settings';
import { coachPick, mark } from '../lib/coach';
import { award } from '../lib/stickers';
import { LEVELS, picturable, realWords, sound, type Level, type Word } from '../content/index';
import { nearWords } from '../content/near-words';
import { confetti, createSetup, topbar } from '../ui/components';
import { read, write } from '../lib/storage';
import { TEAMS, YOU, kit, label, player, teamById, type Team } from './teams';
import { narrate, narrationSelect } from './narration';

type Phase = 'kickoff' | 'shoot' | 'save' | 'over';

interface Kick { word: Word; phase: 'shoot' | 'save'; ok: boolean }


/** after the kicks each, how many sudden-death rounds before it is called a draw */
const SUDDEN_DEATH = 5;
/** how long the goal or the save is left on screen before the next kick:
    long enough for the commentator's shout and then the word */
const LINGER_MS = 3300;
/** a hedge for speech engines that never report the end of a word */
const HEARD_BY_MS = 2600;

export function mount(root: HTMLElement): () => void {
  const kicksSel = el('select', { 'aria-label': 'Kicks each' },
    el('option', { value: '3', text: '3 kicks each' }),
    el('option', { value: '5', text: '5 kicks each', selected: 'selected' }),
  );
  kicksSel.addEventListener('change', () => newMatch());

  /* who he plays for, and who against. Both are remembered on this device:
     a boy who supports Palmeiras supports Palmeiras every time. */
  const teamOptions = (first?: HTMLOptionElement) => [
    ...(first ? [first] : []),
    el('optgroup', { label: 'Countries' },
      ...TEAMS.filter((t) => t.kind === 'country').map((t) => el('option', { value: t.id, text: label(t) }))),
    el('optgroup', { label: 'Clubs' },
      ...TEAMS.filter((t) => t.kind === 'club').map((t) => el('option', { value: t.id, text: label(t) }))),
  ];
  const ourSel = el('select', { 'aria-label': 'Your team' },
    ...teamOptions(el('option', { value: YOU.id, text: label(YOU) })));
  const theirSel = el('select', { 'aria-label': 'Play against' },
    ...teamOptions(el('option', { value: 'any', text: 'Anyone' })));
  ourSel.value = teamById(read<string>('shootout-team', YOU.id))?.id ?? YOU.id;
  theirSel.value = teamById(read<string>('shootout-rival', 'any'))?.id ?? 'any';
  ourSel.addEventListener('change', () => { write('shootout-team', ourSel.value); newMatch(); });
  theirSel.addEventListener('change', () => { write('shootout-rival', theirSel.value); newMatch(); });

  const setup = createSetup({
    extra: [
      el('div', { class: 'row' }, el('span', { class: 'lbl', text: 'Teams' }), ourSel, theirSel),
      el('div', { class: 'row' }, el('span', { class: 'lbl', text: 'This game' }), kicksSel, narrationSelect()),
    ],
    onChange: () => newMatch(),
  });

  /* ── the scoreboard ──────────────────────────────────────────────────── */

  const ourDots = el('span', { class: 'pk-dots' });
  const theirDots = el('span', { class: 'pk-dots' });
  const ourScore = el('b', { text: '0' });
  const theirScore = el('b', { text: '0' });
  const ourName = el('span', { class: 'pk-name' });
  const theirName = el('span', { class: 'pk-name' });
  const board = el('div', { class: 'pk-board' },
    el('div', { class: 'pk-team' }, ourName, ourDots, ourScore),
    el('div', { class: 'pk-team' }, theirName, theirDots, theirScore),
  );

  /* ── the question above the pitch ───────────────────────────────────── */

  const cueText = el('span', { class: 'pk-cue-text' });
  const cuePic = el('span', { class: 'pic', hidden: 'hidden' });
  const hearBtn = el('button', {
    class: 'btn ghost small', type: 'button', text: '🔊 Say it',
    on: { click: () => { if (current) say(current.text); } },
  });
  const cue = el('div', { class: 'pk-cue', 'aria-live': 'polite' }, cueText, cuePic, hearBtn);

  /* ── the pitch ───────────────────────────────────────────────────────── */

  /* four spots; Pro mode uses the fourth, and the rest of the time it hides */
  const spots = [0, 1, 2, 3].map((i) => {
    const btn = el('button', { class: 'pk-spot', type: 'button', disabled: 'disabled' });
    btn.addEventListener('click', () => choose(i));
    return btn;
  });
  const keeper = el('div', { class: 'pk-keeper', 'aria-hidden': 'true' });
  const spotRow = el('div', { class: 'pk-spots' }, ...spots);
  const goal = el('div', { class: 'pk-goal' }, spotRow, keeper);

  const ball = el('div', { class: 'pk-ball', 'aria-hidden': 'true', text: '⚽' });
  const taker = el('div', { class: 'pk-taker', 'aria-hidden': 'true' });
  const box = el('div', { class: 'pk-box' }, taker, ball);
  const banner = el('div', { class: 'pk-banner', hidden: 'hidden', role: 'status' });

  const matchup = el('p', { class: 'pk-big' });
  const kickoffBtn = el('button', { class: 'btn', type: 'button', text: 'Kick off ⚽', on: { click: () => kickOff() } });
  const kickoff = el('div', { class: 'pk-overlay' },
    matchup,
    el('p', { class: 'pk-how', text: 'Read the word and score. Then go in goal and save one.' }),
    kickoffBtn,
  );

  const pitch = el('div', { class: 'pk-pitch' }, goal, box, banner, kickoff);

  /* ── the end ─────────────────────────────────────────────────────────── */

  const resultTitle = el('span', {});
  const prize = el('span', { class: 'sticker fresh', hidden: 'hidden' });
  const resultList = el('ul', {});
  const results = el('div', { class: 'tray results', hidden: 'hidden' },
    el('h2', {}, resultTitle, ' ', prize), resultList,
    el('div', { class: 'row', style: { marginTop: '14px' } },
      el('button', { class: 'btn', type: 'button', text: 'Rematch', on: { click: () => newMatch() } })),
  );

  const empty = el('p', { class: 'tag', hidden: 'hidden',
    text: 'Not enough words with pictures here yet. Try adding a level or another sound.' });

  const node = el('div', { class: 'wrap' },
    topbar({
      title: 'Penalty', swash: 'Shootout',
      tagline: 'Read the word. Beat the keeper.',
      onSetup: (open) => setup.open(open),
    }),
    setup.node, board, empty, cue, pitch, results,
  );

  /* ── state ───────────────────────────────────────────────────────────── */

  let phase: Phase = 'kickoff';
  let kicksEach = 5;
  let rounds = 0;
  let ours: boolean[] = [];
  let theirs: boolean[] = [];
  let log: Kick[] = [];
  let current: Word | null = null;
  let options: Word[] = [];
  let busy = false;
  let us: Team = YOU;
  let rival: Team = YOU;
  let shootBag: Word[] = [];
  let saveBag: Word[] = [];
  let timers: number[] = [];

  const later = (fn: () => void, ms: number): void => { timers.push(window.setTimeout(fn, ms)); };
  const clearTimers = (): void => { for (const t of timers) window.clearTimeout(t); timers = []; };
  const count = (xs: boolean[]): number => xs.filter(Boolean).length;
  /* with speech off, the save shows the picture instead — still reading,
     just a different way into the word */
  const listening = (): boolean => settings().speech;

  /** every level up to the highest one chosen: a level 5 child can read level 1 words */
  function levelsUpTo(): Level[] {
    const chosen = setup.filter().levels;
    if (!chosen.length) return [];
    const top = Math.max(...chosen);
    return LEVELS.map((l) => l.n).filter((n) => n <= top);
  }
  const lookalikes = (): Word[] => realWords({ levels: levelsUpTo() });
  const shootWords = (): Word[] => picturable(realWords(setup.filter()));
  const saveWords = (): Word[] => (listening() ? realWords(setup.filter()) : shootWords());

  /** the next word from a shuffled bag, refilled when it runs out */
  function draw(bag: Word[], fill: () => Word[]): Word {
    /* a dozen at a time, so the coach can tilt each dozen towards the sounds
       he is missing */
    if (!bag.length) bag.push(...coachPick(fill(), 12));
    return bag.pop() as Word;
  }

  /* ── the scoreboard ──────────────────────────────────────────────────── */

  function drawBoard(): void {
    const slots = Math.max(kicksEach, ours.length, theirs.length);
    const dots = (results: boolean[]) => Array.from({ length: slots }, (_, i) => {
      const r = results[i];
      return el('span', {
        class: `pk-dot${r === undefined ? '' : r ? ' goal' : ' miss'}`,
        text: r === undefined ? '' : r ? '⚽' : '✕',
      });
    });
    ourDots.replaceChildren(...dots(ours));
    theirDots.replaceChildren(...dots(theirs));
    ourScore.textContent = String(count(ours));
    theirScore.textContent = String(count(theirs));
  }

  /* ── moving things ───────────────────────────────────────────────────── */

  /** back to the spot with no flight in between */
  function resetBall(): void {
    ball.style.transition = 'none';
    ball.style.translate = '';
    ball.style.scale = '';
    void ball.offsetWidth;
    ball.style.transition = '';
  }

  function resetKeeper(): void {
    keeper.style.transition = 'none';
    keeper.style.translate = '';
    keeper.style.rotate = '';
    void keeper.offsetWidth;
    keeper.style.transition = '';
  }

  /* Both go by `translate`, measured from where they stand to the spot, so
     the flight lands in the right place whatever size the screen is. The ball
     ends in the net just under the word rather than on it, so the word it
     was kicked at can still be read. */
  function flyBall(to: number): void {
    const b = ball.getBoundingClientRect();
    const s = spots[to].getBoundingClientRect();
    ball.style.translate = `${s.left + s.width / 2 - (b.left + b.width / 2)}px ${s.bottom + 22 - (b.top + b.height / 2)}px`;
    ball.style.scale = '0.62';
  }

  /** across to the spot: a full dive to either post, a hop for the middle ones */
  function dive(to: number): void {
    const k = keeper.getBoundingClientRect();
    const s = spots[to].getBoundingClientRect();
    const last = options.length - 1;
    const middle = to !== 0 && to !== last;
    keeper.style.translate = `${s.left + s.width / 2 - (k.left + k.width / 2)}px ${middle ? -18 : 0}px`;
    keeper.style.rotate = to === 0 ? '-55deg' : to === last ? '55deg' : '0deg';
  }

  function showBanner(text: string, good: boolean): void {
    banner.textContent = text;
    banner.classList.toggle('good', good);
    banner.hidden = false;
  }

  /* ── one kick ────────────────────────────────────────────────────────── */

  function setSpots(word: Word, near: Word[]): void {
    options = shuffle([word, ...near]);
    const long = options.some((w) => w.text.length > (options.length > 3 ? 5 : 6));
    spotRow.style.gridTemplateColumns = `repeat(${options.length}, 1fr)`;
    spots.forEach((btn, i) => {
      const w = options[i];
      btn.hidden = !w;
      btn.className = `pk-spot${long ? ' long' : ''}`;
      btn.textContent = w?.text ?? '';
      btn.disabled = true;
    });
  }

  function ready(): void {
    busy = false;
    spots.forEach((btn, i) => { btn.disabled = i >= options.length; });
    pitch.dataset.ready = '1';
  }

  /** the wrong words in the goal: two, or three in Pro mode */
  const decoyCount = (): number => (pro() ? 3 : 2);

  function startShoot(): void {
    phase = 'shoot';
    pitch.dataset.phase = phase;
    delete pitch.dataset.ready;
    banner.hidden = true;
    resetBall();
    resetKeeper();
    const word = draw(shootBag, shootWords);
    current = word;
    setSpots(word, nearWords(word, lookalikes(), decoyCount(), { picture: true }));
    keeper.replaceChildren(player(rival, 84, 'keeper'));
    taker.replaceChildren(player(us, 64, 'kicker'));
    ball.classList.add('mine');
    cueText.textContent = 'Your kick! Shoot at';
    cuePic.textContent = word.picture ?? '';
    cuePic.hidden = false;
    ready();
  }

  function startSave(): void {
    phase = 'save';
    pitch.dataset.phase = phase;
    delete pitch.dataset.ready;
    banner.hidden = true;
    resetBall();
    resetKeeper();
    const word = draw(saveBag, saveWords);
    current = word;
    const heard = listening();
    setSpots(word, nearWords(word, lookalikes(), decoyCount(), { picture: !heard }));
    keeper.replaceChildren(player(us, 84, 'keeper'));
    taker.replaceChildren(player(rival, 64, 'kicker'));
    ball.classList.remove('mine');
    if (heard) {
      cueText.textContent = `You're in goal! Listen, then dive to the word.`;
      cuePic.hidden = true;
      /* the dive waits until the word has been said: a tap before it would be
         a guess, and a guess is not a save */
      let done = false;
      const heardIt = () => { if (!done && current === word) { done = true; ready(); } };
      later(() => say(word.text, { onEnd: heardIt }), 450);
      later(heardIt, 450 + HEARD_BY_MS);
    } else {
      cueText.textContent = `You're in goal! Dive to the word for`;
      cuePic.textContent = word.picture ?? '';
      cuePic.hidden = false;
      ready();
    }
  }

  /** light up the word that was the answer, and cross the wrong pick */
  function reveal(answer: number, picked: number): void {
    const word = options[answer];
    const s = sound(word.sound);
    setMarked(spots[answer], word.text, word.spans, { tones: s.tones });
    spots[answer].classList.add('answer');
    if (picked !== answer) spots[picked].classList.add('wrong');
  }

  function choose(i: number): void {
    if (busy || !current || (phase !== 'shoot' && phase !== 'save')) return;
    busy = true;
    for (const btn of spots) btn.disabled = true;
    delete pitch.dataset.ready;
    const word = current;
    const answer = options.indexOf(word);
    const right = i === answer;
    const kind = phase;
    sfx.kick();

    if (kind === 'shoot') {
      /* the keeper guesses wrong when he reads it right, and reads his mind
         when he does not */
      flyBall(i);
      dive(right ? pick(options.map((_, x) => x).filter((x) => x !== i)) : i);
      ours.push(right);
    } else {
      dive(i);
      flyBall(answer);
      theirs.push(!right);
    }
    log.push({ word, phase: kind, ok: right });
    mark(word, right);

    later(() => {
      reveal(answer, i);
      drawBoard();
      if (kind === 'shoot') showBanner(right ? 'GOAL!' : 'Saved!', right);
      else showBanner(right ? 'SAVED!' : `${rival.short} score`, right);
      if (right) sfx.cheer();
      else sfx.wrong();
      /* the commentator calls it — his goal, or his save — and then the word
         is said, now that it can only confirm */
      const moment = (kind === 'shoot') === right ? 'goal' : 'save';
      const scorer = kind === 'shoot' ? us : rival;
      narrate(moment, scorer, () => say(word.text), later);
    }, 480);

    later(() => {
      if (kind === 'shoot') { startSave(); return; }
      rounds += 1;
      if (decided()) finish();
      else startShoot();
    }, 480 + LINGER_MS);
  }

  /** over when the kicks each are taken and someone is ahead, or sudden death runs out */
  function decided(): boolean {
    if (rounds < kicksEach) return false;
    if (count(ours) !== count(theirs)) return true;
    return rounds >= kicksEach + SUDDEN_DEATH;
  }

  /* ── the match ───────────────────────────────────────────────────────── */

  function newMatch(): void {
    clearTimers();
    kicksEach = Number(kicksSel.value);
    rounds = 0; ours = []; theirs = []; log = [];
    current = null; busy = false;
    shootBag = []; saveBag = [];
    us = teamById(ourSel.value) ?? YOU;
    /* a named opponent if he chose one, and never his own side */
    const chosen = teamById(theirSel.value);
    rival = chosen && chosen !== us
      ? chosen
      : pick(TEAMS.filter((t) => t !== YOU && t !== us && t !== rival));
    ourName.replaceChildren(kit(us, 24), el('span', { class: 'pk-label', text: label(us, true) }));
    theirName.replaceChildren(kit(rival, 24), el('span', { class: 'pk-label', text: label(rival, true) }));
    drawBoard();

    const none = shootWords().length === 0;
    empty.hidden = !none;
    pitch.hidden = none;
    cue.hidden = true;
    results.hidden = true;
    if (none) return;

    phase = 'kickoff';
    pitch.dataset.phase = phase;
    delete pitch.dataset.ready;
    banner.hidden = true;
    resetBall();
    resetKeeper();
    keeper.replaceChildren(player(rival, 84, 'keeper'));
    taker.replaceChildren();
    for (const btn of spots) { btn.textContent = ''; btn.className = 'pk-spot'; btn.disabled = true; }
    spotRow.classList.add('waiting');
    matchup.replaceChildren(
      el('span', { class: 'pk-side' }, kit(us, 44), label(us)),
      el('span', { class: 'pk-v', text: 'v' }),
      el('span', { class: 'pk-side' }, kit(rival, 44), label(rival)),
    );
    kickoff.hidden = false;
  }

  function kickOff(): void {
    kickoff.hidden = true;
    spotRow.classList.remove('waiting');
    cue.hidden = false;
    sfx.whistle();
    startShoot();
  }

  function finish(): void {
    phase = 'over';
    pitch.dataset.phase = phase;
    current = null;
    const a = count(ours);
    const b = count(theirs);
    const won = a > b;
    const level = a === b;
    cue.hidden = true;
    pitch.hidden = true;
    resultTitle.textContent = won
      ? `You win ${a}–${b}! 🏆`
      : level ? `${a}–${b}. Still level, so you share the cup!` : `${rival.name} win ${b}–${a} this time`;
    resultList.replaceChildren();
    for (const kick of log) {
      const s = sound(kick.word.sound);
      const li = el('li', { class: kick.ok ? '' : 'miss' });
      li.append(marked(kick.word.text, kick.word.spans, { tones: s.tones }));
      li.append(el('span', { class: 'mk', text: kick.phase === 'shoot' ? (kick.ok ? '⚽' : 'missed') : (kick.ok ? '🧤' : 'let in') }));
      resultList.append(li);
    }
    /* a sticker for a win or a draw — the words were read either way, but a
       win should feel like one */
    const sticker = won || level ? award(log.map((k) => k.word.sound)) : null;
    prize.hidden = !sticker;
    prize.textContent = sticker?.face ?? '';
    results.hidden = false;
    sfx.whistle();
    if (won || level) {
      later(() => { sfx.win(); confetti(); }, 350);
      say(won ? 'You win!' : 'What a match!');
    } else {
      later(() => sfx.over(), 350);
      say('Good game!');
    }
  }

  /* ── flicking the ball ───────────────────────────────────────────────── */

  /* A flick up from the ball shoots, aimed by which way it leans. Tapping a
     word does the same, so this is the fun way in, never the only one. */
  let flickFrom: { x: number; y: number } | null = null;
  ball.addEventListener('pointerdown', (e) => {
    if (phase !== 'shoot' || busy) return;
    flickFrom = { x: e.clientX, y: e.clientY };
    try { ball.setPointerCapture(e.pointerId); } catch { /* not every browser */ }
  });
  ball.addEventListener('pointerup', (e) => {
    const from = flickFrom;
    flickFrom = null;
    if (!from || phase !== 'shoot' || busy) return;
    const up = from.y - e.clientY;
    if (up < 30) return;
    /* the lean, from hard left to hard right, spread across however many
       words are in the goal */
    const lean = Math.max(-0.9, Math.min(0.9, (e.clientX - from.x) / up));
    choose(Math.round(((lean + 0.9) / 1.8) * (options.length - 1)));
  });
  ball.addEventListener('pointercancel', () => { flickFrom = null; });

  root.append(node);
  newMatch();
  return () => clearTimers();
}
