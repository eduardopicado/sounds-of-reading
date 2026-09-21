/* Roll & Read — tap the die, read the words it lands on aloud.
 *
 * The parent taps ✅ or 🔁 for each word, and the bar chart underneath builds
 * up over a session. That chart is the most useful signal in the whole app:
 * it is the only place a parent can see which sounds are actually sticking.
 *
 * The die area has a fixed height. In the prototype the rotating cube could
 * drift over the Roll button and swallow taps. */

import { el } from '../lib/dom';
import { shuffle } from '../lib/random';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { marked } from '../lib/highlight';
import { read, write } from '../lib/storage';
import { realWords, sound, type Sound, type Word } from '../content/index';
import { createSetup, topbar } from '../ui/components';

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

export function mount(root: HTMLElement): () => void {
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
    el('button', { class: 'btn ghost small', type: 'button', text: 'Clear tally', on: { click: () => { tally = {}; saveTally(); drawBars(); } } }),
  );
  hintSel.addEventListener('change', () => {
    const on = hintSel.value === 'on';
    for (const card of wordsEl.querySelectorAll('.wcard')) card.classList.toggle('plain', !on);
    redrawWords();
  });

  const setup = createSetup({ extra: [extra], onChange: () => setDie() });

  const cube = el('div', { class: 'cube', role: 'button', tabindex: '0', 'aria-label': 'Roll the sound die' });
  for (const pos of POSITIONS) cube.append(el('div', { class: `face f-${pos}` }));
  const diceArea = el('div', { class: 'dice-area' }, cube);
  const diceHint = el('div', { class: 'dice-hint', text: 'Tap the die to roll' });
  const rollBtn = el('button', { class: 'btn', type: 'button', text: 'Roll the die' });
  const wordsEl = el('div', { class: 'words' });
  const barsEl = el('div', { class: 'bars' });

  const node = el('div', { class: 'wrap' },
    topbar({
      title: 'Roll &', swash: 'Read',
      tagline: 'Roll the die. Read the words out loud.',
      onSetup: (open) => setup.open(open),
    }),
    setup.node, diceArea, diceHint,
    el('div', { style: { textAlign: 'center', marginTop: '10px' } }, rollBtn),
    wordsEl,
    el('div', { class: 'tray' }, el('h2', { text: 'How the sounds are going' }), barsEl),
  );

  let faces: Sound[] = [];
  let pools = new Map<string, Word[]>();
  let tally: Record<string, Tally> = read('roll-tally', {});
  let rolling = false;
  let shown: { word: Word; sound: Sound }[] = [];

  const saveTally = () => write('roll-tally', tally);

  function refill(id: string): void {
    pools.set(id, shuffle(realWords({ sounds: [id], levels: setup.filter().levels })));
  }

  function setDie(): void {
    const chosen = setup.filter().sounds;
    const pool = setup.available();
    const picked = chosen.length ? chosen.map(sound) : pool;
    /* a die has six faces, so take six — repeating if the parent picked fewer */
    faces = [];
    for (let i = 0; i < 6; i += 1) faces.push(picked[i % Math.max(picked.length, 1)] ?? pool[0]);
    faces = faces.filter(Boolean);
    POSITIONS.forEach((pos, i) => {
      const face = cube.querySelector(`.f-${pos}`);
      if (face && faces[i]) face.textContent = faces[i].label;
    });
    pools = new Map();
    for (const f of faces) refill(f.id);
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

    window.setTimeout(() => {
      rolling = false;
      rollBtn.disabled = false;
      diceHint.textContent = `Read these ${face.label} words out loud`;
      showWords(face);
      say(face.label);
    }, 1200);
  }

  function showWords(face: Sound): void {
    const wanted = Number(countSel.value);
    let pool = pools.get(face.id) ?? [];
    if (pool.length < wanted) { refill(face.id); pool = pools.get(face.id) ?? []; }
    shown = pool.splice(0, wanted).map((word) => ({ word, sound: face }));
    redrawWords();
  }

  function redrawWords(): void {
    const underline = hintSel.value === 'on';
    wordsEl.replaceChildren();
    for (const entry of shown) {
      const wordBtn = el('button', { class: 'w', type: 'button' });
      wordBtn.append(marked(entry.word.text, entry.word.spans, { show: underline, tones: entry.sound.tones }));
      wordBtn.addEventListener('click', () => say(entry.word.text));
      const ok = el('button', { class: 'mini ok', type: 'button', text: '✅', 'aria-label': `${entry.word.text}: read it` });
      const no = el('button', { class: 'mini no', type: 'button', text: '🔁', 'aria-label': `${entry.word.text}: tricky` });
      const card = el('div', { class: 'wcard', vars: { '--tone': entry.sound.tones.deep } }, wordBtn, ok, no);
      ok.addEventListener('click', () => score(card, entry, true));
      no.addEventListener('click', () => score(card, entry, false));
      wordsEl.append(card);
    }
  }

  function score(card: HTMLElement, entry: { word: Word; sound: Sound }, good: boolean): void {
    if (card.dataset.scored) return;
    card.dataset.scored = '1';
    card.classList.add(good ? 'got' : 'tricky');
    tally[entry.sound.id] ??= { good: 0, bad: 0 };
    tally[entry.sound.id][good ? 'good' : 'bad'] += 1;
    saveTally();
    if (good) sfx.right(); else { sfx.tap(); say(entry.word.text); }
    drawBars();
  }

  function drawBars(): void {
    const used = Object.entries(tally).filter(([, t]) => t.good + t.bad > 0);
    if (!used.length) {
      barsEl.replaceChildren(el('span', { class: 'empty', text: 'Roll a few times and this fills in.' }));
      return;
    }
    barsEl.replaceChildren();
    for (const [id, t] of used) {
      let s: Sound;
      try { s = sound(id); } catch { continue; }
      const total = t.good + t.bad;
      barsEl.append(el('div', { class: 'bar' },
        el('span', { class: 'k', text: s.label, vars: { '--x': '0' }, style: { background: s.tones.light } }),
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
  return () => undefined;
}
