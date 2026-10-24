/* Roll & Read — tap the die, read the words it lands on aloud.
 *
 * The parent taps ✅ or 🔁 for each word, and the bar chart underneath builds
 * up over a session. That chart is the most useful signal in the whole app:
 * it is the only place a parent can see which sounds are actually sticking.
 *
 * The die area has a fixed height. In the prototype the rotating cube could
 * drift over the Roll button and swallow taps.
 *
 * Or the school's sight words, as flash cards: each face of the die is one
 * of the sets, and the chart is kept word by word, since with sight words
 * what a parent wants to know is which ones are not sticking yet. */

import { el } from '../lib/dom';
import { lifetime } from '../lib/life';
import { shuffle } from '../lib/random';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { marked } from '../lib/highlight';
import { read, write } from '../lib/storage';
import { realWords, sound, type Sound, type Span } from '../content/index';
import { TRICKY, sightWordsIn } from '../content/sight';
import type { Tones } from '../lib/colour';
import { confetti, confirmButton, createSetup, topbar } from '../ui/components';
import { award, awardFace } from '../lib/stickers';

const POSITIONS = ['front', 'right', 'back', 'left', 'top', 'bottom'] as const;
/** where the cube has to stop for each face to be the one looking at you */
const REST: Record<string, { x: number; y: number }> = {
  front: { x: -18, y: 0 },
  right: { x: -18, y: -90 },
  back: { x: -18, y: -180 },
  left: { x: -18, y: 90 },
  top: { x: -108, y: 0 },
  bottom: { x: 72, y: 0 },
};

interface Tally { good: number; bad: number }

/** a face of the die: a sound, or one of the sight word sets */
interface Face { id: string; label: string; tones: Tones; sound?: Sound }
/** a word to read: the tally is kept under its sound, or for a sight word under itself */
interface Entry { text: string; spans: Span[]; tones: Tones; key: string }

/** a sight word set on a die face: Level 3 is 3, the extra set a star */
const faceLabel = (set: string): string => set.replace('Level ', '').replace('More', '★');

export function mount(root: HTMLElement): () => void {
  const life = lifetime();
  const countSel = el('select', { 'aria-label': 'Words per roll' },
    el('option', { value: '1', text: '1 word' }),
    el('option', { value: '3', text: '3 words', selected: 'selected' }),
    el('option', { value: '5', text: '5 words' }),
  );
  const hintSel = el('select', { 'aria-label': 'Underline the sound' },
    el('option', { value: 'on', text: 'Underline the sound', selected: 'selected' }),
    el('option', { value: 'off', text: 'Plain words' }),
  );
  const extra = el('div', { class: 'row' },
    el('span', { class: 'lbl', text: 'This game' }), countSel, hintSel,
    confirmButton('Clear tally', 'Tap again to clear it', () => { tally = {}; saveTally(); drawBars(); }),
  );
  const hintOn = hintSel.querySelector('option[value="on"]')!;
  hintSel.addEventListener('change', () => {
    const on = hintSel.value === 'on';
    for (const card of wordsEl.querySelectorAll('.wcard')) card.classList.toggle('plain', !on);
    redrawWords();
  });

  const setup = createSetup({ extra: [extra], onChange: () => setDie(), sight: 'roll-and-read' });
  const sightMode = (): boolean => setup.kind() === 'sight';

  const cube = el('div', { class: 'cube', role: 'button', tabindex: '0', 'aria-label': 'Roll the sound die' });
  for (const pos of POSITIONS) cube.append(el('div', { class: `face f-${pos}` }));
  const diceArea = el('div', { class: 'dice-area' }, cube);
  const diceHint = el('div', { class: 'dice-hint', text: 'Tap the die to roll' });
  const rollBtn = el('button', { class: 'btn', type: 'button', text: 'Roll the die' });
  const wordsEl = el('div', { class: 'words' });
  const barsEl = el('div', { class: 'bars' });
  const barsTitle = el('h2', { text: 'How the sounds are going' });

  const node = el('div', { class: 'wrap' },
    topbar({
      title: 'Roll &', swash: 'Read',
      tagline: 'Roll the die. Read the words out loud.',
      onSetup: (open) => setup.open(open),
    }),
    setup.switchNode, setup.node, diceArea, diceHint,
    el('div', { style: { textAlign: 'center', marginTop: '10px' } }, rollBtn),
    wordsEl,
    el('div', { class: 'tray' }, barsTitle, barsEl),
  );

  /* the sounds' tally and the sight words' are kept apart */
  const tallyKey = (): string => (sightMode() ? 'roll-tally-sight' : 'roll-tally');
  let faces: Face[] = [];
  let pools = new Map<string, Entry[]>();
  let tally: Record<string, Tally> = read(tallyKey(), {});
  let rolling = false;
  let shown: Entry[] = [];

  const saveTally = () => write(tallyKey(), tally);

  function refill(face: Face): void {
    pools.set(face.id, face.sound
      ? shuffle(realWords({ sounds: [face.id], levels: setup.filter().levels }))
        .map((w) => ({ text: w.text, spans: w.spans, tones: face.tones, key: face.id }))
      : shuffle(sightWordsIn([face.id])).map((w) => ({ text: w.text, spans: w.spans, tones: TRICKY, key: w.text })));
  }

  function setDie(): void {
    const sight = sightMode();
    tally = read(tallyKey(), {});
    barsTitle.textContent = sight ? 'How the sight words are going' : 'How the sounds are going';
    hintOn.textContent = sight ? 'Mark the tricky bit' : 'Underline the sound';
    cube.setAttribute('aria-label', sight ? 'Roll the sight word die' : 'Roll the sound die');
    let picked: Face[];
    if (sight) {
      picked = setup.sightSets().map((set) => ({ id: set, label: faceLabel(set), tones: TRICKY }));
    } else {
      const chosen = setup.filter().sounds;
      const pool = setup.available();
      picked = (chosen.length ? chosen.map(sound) : pool).map((s) => ({ id: s.id, label: s.label, tones: s.tones, sound: s }));
    }
    /* a die has six faces, so take six — repeating if the parent picked fewer */
    faces = [];
    for (let i = 0; i < 6; i += 1) faces.push(picked[i % Math.max(picked.length, 1)]);
    faces = faces.filter(Boolean);
    POSITIONS.forEach((pos, i) => {
      const face = cube.querySelector(`.f-${pos}`);
      if (face && faces[i]) face.textContent = faces[i].label;
    });
    pools = new Map();
    for (const f of faces) refill(f);
    wordsEl.replaceChildren();
    diceHint.textContent = 'Tap the die to roll';
    drawBars();
  }

  function roll(): void {
    if (rolling || !faces.length) return;
    rolling = true;
    rollBtn.disabled = true;
    wordsEl.replaceChildren();
    diceHint.textContent = 'rolling…';
    sfx.roll();

    const index = Math.floor(Math.random() * faces.length);
    const face = faces[index];
    const rest = REST[POSITIONS[index]];
    const extraX = 360 * (1 + Math.floor(Math.random() * 2));
    const extraY = 360 * (2 + Math.floor(Math.random() * 2));
    cube.style.transform = `rotateX(${rest.x - extraX}deg) rotateY(${rest.y - extraY}deg)`;

    life.later(() => {
      rolling = false;
      rollBtn.disabled = false;
      if (face.sound) {
        diceHint.textContent = `Read these ${face.label} words out loud`;
        showWords(face);
        say(face.label);
      } else {
        diceHint.textContent = `Read these ${face.id} sight words out loud`;
        showWords(face);
      }
    }, 1200);
  }

  function showWords(face: Face): void {
    const wanted = Number(countSel.value);
    let pool = pools.get(face.id) ?? [];
    if (pool.length < wanted) { refill(face); pool = pools.get(face.id) ?? []; }
    shown = pool.splice(0, wanted);
    redrawWords();
  }

  function redrawWords(): void {
    const underline = hintSel.value === 'on';
    wordsEl.replaceChildren();
    for (const entry of shown) {
      const wordBtn = el('button', { class: 'w', type: 'button' });
      wordBtn.append(marked(entry.text, entry.spans, { show: underline, tones: entry.tones }));
      wordBtn.addEventListener('click', () => say(entry.text));
      const ok = el('button', { class: 'mini ok', type: 'button', text: '✅', 'aria-label': `${entry.text}: read it` });
      const no = el('button', { class: 'mini no', type: 'button', text: '🔁', 'aria-label': `${entry.text}: tricky` });
      const card = el('div', { class: 'wcard', vars: { '--tone': entry.tones.deep } }, wordBtn, ok, no);
      ok.addEventListener('click', () => score(card, entry, true));
      no.addEventListener('click', () => score(card, entry, false));
      wordsEl.append(card);
    }
  }

  function score(card: HTMLElement, entry: Entry, good: boolean): void {
    if (card.dataset.scored) return;
    card.dataset.scored = '1';
    card.classList.add(good ? 'got' : 'tricky');
    tally[entry.key] ??= { good: 0, bad: 0 };
    tally[entry.key][good ? 'good' : 'bad'] += 1;
    saveTally();
    if (good) sfx.right(); else { sfx.tap(); say(entry.text); }
    /* every tenth word read for a sound earns its sticker; sight words
       practise no sound, so every tenth of them earns the game's own */
    const sight = sightMode();
    const t = tally[entry.key];
    const read = sight ? Object.values(tally).reduce((n, x) => n + x.good + x.bad, 0) : t.good + t.bad;
    if (read % 10 === 0) {
      if (sight) awardFace('roll-and-read', '🎲'); else award([entry.key]);
      sfx.win();
      confetti(16);
    }
    drawBars();
  }

  function drawBars(): void {
    const used = Object.entries(tally).filter(([, t]) => t.good + t.bad > 0);
    if (!used.length) {
      barsEl.replaceChildren(el('span', { class: 'empty', text: 'Roll a few times and this fills in.' }));
      return;
    }
    barsEl.replaceChildren();
    const sight = sightMode();
    /* sight words, the ones read wrong most first: those are the ones to practise */
    const rows = sight
      ? used.sort(([a, x], [b, y]) => y.bad / (y.good + y.bad) - x.bad / (x.good + x.bad) || a.localeCompare(b))
      : used;
    for (const [id, t] of rows) {
      let label: string;
      let light: string;
      if (sight) { label = id; light = TRICKY.light; } else {
        let s: Sound;
        try { s = sound(id); } catch { continue; }
        label = s.label; light = s.tones.light;
      }
      const total = t.good + t.bad;
      barsEl.append(el('div', { class: 'bar' },
        el('span', { class: 'k', text: label, vars: { '--x': '0' }, style: { background: light } }),
        el('span', { class: 'track' },
          el('span', { class: 'good', style: { width: `${(t.good / total) * 100}%` } }),
          el('span', { class: 'bad', style: { width: `${(t.bad / total) * 100}%` } }),
        ),
        el('span', { class: 'n', text: `${t.good}/${total}` }),
      ));
    }
  }

  rollBtn.addEventListener('click', roll);
  cube.addEventListener('click', roll);
  cube.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); roll(); }
  });
  countSel.addEventListener('change', () => { if (shown.length) redrawWords(); });

  root.append(node);
  setDie();
  return life.end;
}
