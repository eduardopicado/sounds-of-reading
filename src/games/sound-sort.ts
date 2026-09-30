/* Sound Sort — which sound is hiding in this word?
 *
 * The word arrives with nothing highlighted, because working out where the
 * sound is IS the puzzle. Drop it in the right bin and the letters light up.
 * Two misses and the word shows you. Nothing is ever marked wrong twice. */

import { el, replay } from '../lib/dom';
import { lifetime } from '../lib/life';
import { shuffle, spreadAcross } from '../lib/random';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { marked, setMarked } from '../lib/highlight';
import { fitsAnother, picturable, realWords, sound, type Sound, type Word } from '../content/index';
import { SORT_SETS } from '../content/sort-sets';
import { confetti, createSetup, counter, scoreLine, topbar } from '../ui/components';
import { award } from '../lib/stickers';
import { mark } from '../lib/coach';


export function mount(root: HTMLElement): () => void {
  const life = lifetime();
  const setSel = el('select', { 'aria-label': 'Which sorting task' });
  const lenSel = el('select', { 'aria-label': 'How many words' },
    el('option', { value: '8', text: '8 words' }),
    el('option', { value: '12', text: '12 words', selected: 'selected' }),
    el('option', { value: '16', text: '16 words' }),
  );
  const extra = el('div', { class: 'row' },
    el('span', { class: 'lbl', text: 'This game' }), setSel, lenSel,
  );
  setSel.addEventListener('change', () => start());
  lenSel.addEventListener('change', () => start());

  const setup = createSetup({ extra: [extra], onChange: () => { fillSets(); start(); } });

  const done = counter('Sorted');
  const totalEl = el('span', { text: '0' });
  const rightFirst = counter('Right first try');
  const picEl = el('div', { class: 'pic', text: '🎈' });
  const wordEl = el('div', { class: 'word', text: 'ready?' });
  const hand = el('div', { class: 'hand' }, picEl, wordEl);
  const stage = el('div', { class: 'stage' }, hand);
  const bins = el('div', { class: 'bins' });
  const resultList = el('ul', {});
  const prize = el('span', { class: 'sticker fresh', hidden: 'hidden' });
  const results = el('div', { class: 'tray results', hidden: 'hidden' },
    el('h2', {}, 'How it went ', prize), resultList,
    el('div', { class: 'row', style: { marginTop: '14px' } },
      el('button', { class: 'btn', type: 'button', text: 'Play again', on: { click: () => start() } })),
  );

  const node = el('div', { class: 'wrap' },
    topbar({
      title: 'Sound', swash: 'Sort',
      tagline: 'Which sound is hiding in the word? Put it in the right bin.',
      onSetup: (open) => setup.open(open),
    }),
    setup.node,
    scoreLine(el('span', {}, done.node, ' of ', totalEl), rightFirst.node),
    stage,
    el('div', { class: 'row', style: { justifyContent: 'center' } },
      el('button', { class: 'btn ghost', type: 'button', text: '🔊 Say it again', on: { click: () => current && say(current.text) } })),
    bins, results,
  );

  let queue: Word[] = [];
  let current: Word | null = null;
  let tries = 0;
  let sorted = 0;
  let firstTry = 0;
  let busy = false;
  let log: { word: Word; firstTry: boolean }[] = [];
  let binSounds: Sound[] = [];

  /** only offer contrasts whose sounds are all actually in play */
  function fillSets(): void {
    const available = new Set(setup.available().map((s) => s.id));
    const chosen = setup.filter().sounds;
    const keep = setSel.value;
    setSel.replaceChildren();
    if (chosen.length >= 2 && chosen.length <= 4) {
      setSel.append(el('option', { value: 'chosen', text: 'My chosen sounds', selected: 'selected' }));
    }
    for (const preset of SORT_SETS) {
      if (!preset.sounds.every((id) => available.has(id))) continue;
      setSel.append(el('option', { value: preset.id, text: preset.label }));
    }
    if (!setSel.options.length) {
      /* fall back to the first two sounds available, whatever they are */
      setSel.append(el('option', { value: 'auto', text: 'Mixed sounds' }));
    }
    if ([...setSel.options].some((o) => o.value === keep)) setSel.value = keep;
  }

  function currentBins(): Sound[] {
    const chosen = setup.filter().sounds;
    if (setSel.value === 'chosen' && chosen.length >= 2) return chosen.slice(0, 4).map(sound);
    const preset = SORT_SETS.find((p) => p.id === setSel.value);
    if (preset) return preset.sounds.map(sound);
    const pool = setup.available();
    return pool.slice(0, Math.min(4, Math.max(2, pool.length)));
  }

  function start(): void {
    life.clear();
    binSounds = currentBins();
    const levels = setup.filter().levels;
    /* the picture tells him which word it is, so he can get on with finding
       the sound in it — prefer words that have one, and only fall back when a
       bin would otherwise run short */
    const groups = binSounds.map((s) => {
      /* a word that would fit another bin too has no one right answer */
      const all = realWords({ sounds: [s.id], levels })
        .filter((w) => !binSounds.some((o) => fitsAnother(w, o)));
      const withPicture = picturable(all);
      return withPicture.length >= 6 ? withPicture : [...withPicture, ...all.filter((w) => !w.picture)];
    });
    const wanted = Number(lenSel.value);
    queue = shuffle(spreadAcross(groups.filter((g) => g.length), wanted));

    sorted = 0; firstTry = 0; log = []; busy = false; current = null;
    done.set(0); rightFirst.set(0); totalEl.textContent = String(queue.length);
    results.hidden = true;
    resultList.replaceChildren();
    hand.style.display = '';

    bins.replaceChildren();
    bins.style.gridTemplateColumns = `repeat(${Math.min(binSounds.length, 2)}, 1fr)`;
    for (const s of binSounds) {
      const bin = el('button', {
        class: 'bin', type: 'button', vars: { '--tone': s.tones.light },
        dataset: { sound: s.id }, 'aria-label': `Put it in the ${s.label} bin`,
      }, el('span', { class: 'name', text: s.label }), el('span', { class: 'stack' }));
      bin.addEventListener('click', () => drop(s.id, bin));
      bins.append(bin);
    }
    next();
  }

  function next(): void {
    const word = queue.pop();
    if (!word) { finish(); return; }
    current = word;
    tries = 0;
    hand.classList.remove('right', 'wrong');
    hand.style.removeProperty('--tone');
    picEl.textContent = word.picture ?? '🔤';
    /* deliberately plain — finding the sound is the game */
    wordEl.textContent = word.text;
    say(word.text);
  }

  function drop(soundId: string, bin: HTMLElement): void {
    if (busy || !current) return;
    tries += 1;
    const word = current;
    const s = sound(word.sound);

    /* only the first try tells the coach anything */
    if (tries === 1) mark(word, soundId === word.sound);

    if (soundId === word.sound) {
      busy = true;
      sfx.right();
      hand.classList.add('right');
      hand.style.setProperty('--tone', s.tones.deep);
      /* the reveal: now the letters light up */
      setMarked(wordEl, word.text, word.spans, { tones: s.tones });
      const tile = el('span', { class: 'tile' });
      tile.append(marked(word.text, word.spans, { tones: s.tones }));
      bin.querySelector('.stack')?.append(tile);
      if (tries === 1) { firstTry += 1; rightFirst.set(firstTry); }
      log.push({ word, firstTry: tries === 1 });
      sorted += 1;
      done.set(sorted);
      current = null;
      life.later(() => { busy = false; next(); }, 780);
    } else {
      sfx.wrong();
      replay(hand, 'wrong');
      bin.classList.add('over');
      life.later(() => bin.classList.remove('over'), 200);
      /* after two misses, stop letting him flounder */
      if (tries === 2) setMarked(wordEl, word.text, word.spans, { tones: s.tones });
    }
  }

  function finish(): void {
    current = null;
    hand.style.display = 'none';
    resultList.replaceChildren();
    for (const entry of log) {
      const s = sound(entry.word.sound);
      const li = el('li', { class: entry.firstTry ? '' : 'miss' });
      li.append(marked(entry.word.text, entry.word.spans, { tones: s.tones }));
      if (!entry.firstTry) li.append(el('span', { class: 'mk', text: 'retry' }));
      resultList.append(li);
    }
    const sticker = award(log.map((entry) => entry.word.sound));
    prize.hidden = !sticker;
    prize.textContent = sticker?.face ?? '';
    results.hidden = false;
    sfx.win();
    confetti();
    say(firstTry === log.length ? 'Perfect sorting!' : 'Nice work!');
  }

  /* dragging, as well as tapping — the prototype supported both and the child
     reaches for the card first */
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let moved = false;
  hand.addEventListener('pointerdown', (e) => {
    if (!current || busy) return;
    dragging = true; moved = false; startX = e.clientX; startY = e.clientY;
    hand.setPointerCapture(e.pointerId);
  });
  hand.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!moved && Math.hypot(dx, dy) > 6) { moved = true; hand.classList.add('dragging'); }
    if (!moved) return;
    hand.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.03}deg)`;
    for (const b of bins.querySelectorAll('.bin')) b.classList.remove('over');
    const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('.bin');
    under?.classList.add('over');
  });
  hand.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    hand.classList.remove('dragging');
    hand.style.transform = '';
    for (const b of bins.querySelectorAll('.bin')) b.classList.remove('over');
    if (!moved) { if (current) say(current.text); return; }
    const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('.bin');
    if (under instanceof HTMLElement && under.dataset.sound) drop(under.dataset.sound, under);
  });
  hand.addEventListener('pointercancel', () => {
    dragging = false;
    hand.classList.remove('dragging');
    hand.style.transform = '';
  });

  root.append(node);
  fillSets();
  start();
  return life.end;
}
