/* Tricky Words — look at it, then find it again.
 *
 * Every other game rewards sounding a word out. These are the words where
 * that fails: "said" does not rhyme with paid, "one" does not start like
 * only — or where it cannot work yet, because the school needs "went" before
 * it teaches w. The list is the school's own. Either way the word has to be
 * known on sight, which is a different skill — not decoding faster, but not
 * decoding at all.
 *
 * So the word is shown, then taken away, and he picks it out of four that
 * look like it. A word he has to sound out cannot be found that way, because
 * there is nothing left on screen to sound out. Recognising the shape is the
 * whole exercise, and the flash is what forces it.
 *
 * Two deliberate choices:
 *
 * The app does not say the word. It could, and that would make the game
 * easier and kinder — but then he is matching a sound to a spelling, which
 * is what Bingo already does. Here the only clue is what he saw. The word is
 * spoken afterwards, once he has found it, when it can only confirm.
 *
 * The lookalikes are chosen, not random. there/their/where, could/should/
 * would, come/some — muddling those is exactly what a child does with sight
 * words, and a random pick would make the game trivial.
 *
 * A miss brings the word back and leaves it there, so the worst the game can
 * become is plain matching. Nothing is scored down and nothing is lost. */

import { el, prefersReducedMotion, replay } from '../lib/dom';
import { shuffle } from '../lib/random';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { marked, setMarked } from '../lib/highlight';
import { ALL_SIGHT_WORDS, SIGHT_SETS, type SightWord } from '../content/index';
import { tonesFor } from '../lib/colour';
import { chip, confetti, counter, scoreLine, topbar } from '../ui/components';
import { settings } from '../lib/settings';

/* Tricky words practise no sound, so there is no sound's colour to borrow.
   One tone stands for "this is the bit that lies", everywhere in the game. */
const TRICKY = tonesFor(350);

/** how long the word stays on screen before he has to remember it */
const LOOK_MS = 1600;

/**
 * How easily one word could be mistaken for another.
 *
 * Shared letters matter more than order — a child reading "their" as "there"
 * is not misreading the sequence, he is seeing the same handful of letters in
 * a word of the same length. Length difference is a mild penalty rather than
 * a bar, so "who" can still sit beside "how".
 */
function lookalike(a: string, b: string): number {
  const bag = [...b];
  let shared = 0;
  for (const ch of a) {
    const i = bag.indexOf(ch);
    if (i >= 0) { shared += 1; bag.splice(i, 1); }
  }
  return shared / Math.max(a.length, b.length) - Math.abs(a.length - b.length) * 0.05;
}

/** the three words most easily confused with this one */
function distractors(target: SightWord, pool: SightWord[]): SightWord[] {
  return pool
    .filter((w) => w.text !== target.text)
    .map((w) => ({ w, score: lookalike(target.text, w.text) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.w);
}

/**
 * The school's sets up to the child's level, since sight words build up the
 * same way the sounds do: a level 5 child is still meeting the level 1 words.
 * The extra set outside the school list waits until a parent turns it on.
 */
function startingSets(): string[] {
  const levels = settings().levels;
  const upTo = levels.length ? Math.max(...levels) : 8;
  const sets = SIGHT_SETS.filter((name) => {
    const level = ALL_SIGHT_WORDS.find((w) => w.set === name)?.level;
    return level != null && level <= upTo;
  });
  return sets.length ? sets : SIGHT_SETS.slice(0, 1);
}

export function mount(root: HTMLElement): () => void {
  let chosen: string[] = startingSets();

  const setRow = el('div', { class: 'row' });
  const lenSel = el('select', { 'aria-label': 'How many words' },
    el('option', { value: '6', text: '6 words' }),
    el('option', { value: '10', text: '10 words', selected: 'selected' }),
    el('option', { value: '14', text: '14 words' }),
  );
  lenSel.addEventListener('change', () => start());

  function drawSets(): void {
    setRow.replaceChildren(el('span', { class: 'lbl', text: 'Word sets' }));
    for (const name of SIGHT_SETS) {
      setRow.append(chip(name, chosen.includes(name), () => {
        chosen = chosen.includes(name) ? chosen.filter((s) => s !== name) : [...chosen, name];
        /* never leave him with nothing to play */
        if (!chosen.length) chosen = [name];
        drawSets();
        start();
      }, TRICKY.light));
    }
  }

  /* This game has its own panel rather than the shared one: the level and
     sound pickers steer which sounds are practised, and a tricky word
     practises none, so those controls would sit there doing nothing. */
  const panel = el('div', { class: 'panel', hidden: 'hidden' },
    setRow,
    el('div', { class: 'row' }, el('span', { class: 'lbl', text: 'This game' }), lenSel),
  );

  const done = counter('Found');
  const totalEl = el('span', { text: '0' });
  const rightFirst = counter('Right first try');

  const wordEl = el('div', { class: 'word tricky-word' });
  const hand = el('div', { class: 'hand' }, wordEl);
  const stage = el('div', { class: 'stage' }, hand);
  const askEl = el('p', { class: 'tag', hidden: 'hidden', text: 'Which one was it?' });
  const choices = el('div', { class: 'bins choices' });

  const lookBtn = el('button', {
    class: 'btn ghost', type: 'button', text: '👀 Show me again',
    on: { click: () => current && showWord(current) },
  });

  const resultList = el('ul', {});
  const results = el('div', { class: 'tray results', hidden: 'hidden' },
    el('h2', {}, 'How it went'), resultList,
    el('div', { class: 'row', style: { marginTop: '14px' } },
      el('button', { class: 'btn', type: 'button', text: 'Play again', on: { click: () => start() } })),
  );

  const node = el('div', { class: 'wrap' },
    topbar({
      title: 'Tricky', swash: 'Words',
      tagline: 'Words to know on sight. Look hard, then find it again.',
      onSetup: (open) => { panel.hidden = !open; },
    }),
    panel,
    scoreLine(el('span', {}, done.node, ' of ', totalEl), rightFirst.node),
    stage, askEl,
    el('div', { class: 'row', style: { justifyContent: 'center' } }, lookBtn),
    choices, results,
  );

  let queue: SightWord[] = [];
  let current: SightWord | null = null;
  let tries = 0;
  let found = 0;
  let firstTry = 0;
  let busy = false;
  let log: { word: SightWord; firstTry: boolean }[] = [];
  let hideTimer = 0;

  const pool = (): SightWord[] => ALL_SIGHT_WORDS.filter((w) => chosen.includes(w.set));

  function start(): void {
    window.clearTimeout(hideTimer);
    const words = pool();
    queue = shuffle(words).slice(0, Number(lenSel.value));

    found = 0; firstTry = 0; log = []; busy = false; current = null;
    done.set(0); rightFirst.set(0); totalEl.textContent = String(queue.length);
    results.hidden = true;
    resultList.replaceChildren();
    hand.style.display = '';
    next();
  }

  /** the look: the word, plainly, with nothing marked to lean on */
  function showWord(word: SightWord): void {
    window.clearTimeout(hideTimer);
    wordEl.classList.remove('gone');
    wordEl.textContent = word.text;
    askEl.hidden = true;
    /* Someone who has already missed it keeps the word. The game degrades
       into plain matching rather than into guessing. */
    if (tries > 0) { choices.classList.remove('waiting'); return; }
    /* The choices wait until the word has gone. With both on screen at once
       he can match letters to letters without remembering anything — which
       is exactly what he did, tapping before the word had time to leave. */
    choices.classList.add('waiting');
    /* a longer look when the device asks for less movement — the point is
       the memory, not the hurry */
    const ms = prefersReducedMotion() ? LOOK_MS * 1.5 : LOOK_MS;
    hideTimer = window.setTimeout(() => {
      wordEl.classList.add('gone');
      wordEl.textContent = '?';
      askEl.hidden = false;
      choices.classList.remove('waiting');
    }, ms);
  }

  function drawChoices(word: SightWord): void {
    choices.replaceChildren();
    choices.style.gridTemplateColumns = 'repeat(2, 1fr)';
    const options = shuffle([word, ...distractors(word, pool())]);
    for (const option of options) {
      const btn = el('button', {
        class: 'bin choice', type: 'button', vars: { '--tone': TRICKY.light },
        dataset: { word: option.text }, 'aria-label': `Choose ${option.text}`,
      }, el('span', { class: 'name', text: option.text }));
      btn.addEventListener('click', () => choose(option, btn));
      choices.append(btn);
    }
  }

  function next(): void {
    const word = queue.pop();
    if (!word) { finish(); return; }
    current = word;
    tries = 0;
    hand.classList.remove('right', 'wrong');
    showWord(word);
    drawChoices(word);
  }

  function choose(picked: SightWord, btn: HTMLElement): void {
    if (busy || !current || choices.classList.contains('waiting')) return;
    tries += 1;
    const word = current;

    if (picked.text === word.text) {
      busy = true;
      window.clearTimeout(hideTimer);
      sfx.right();
      hand.classList.add('right');
      askEl.hidden = true;
      /* now the letters that lie light up: the lesson is which bit to
         distrust, not merely that the word is odd */
      wordEl.classList.remove('gone');
      setMarked(wordEl, word.text, word.spans, { tones: TRICKY });
      /* spoken only now, where it can confirm and not give the answer */
      say(word.text);
      if (tries === 1) { firstTry += 1; rightFirst.set(firstTry); }
      log.push({ word, firstTry: tries === 1 });
      found += 1;
      done.set(found);
      current = null;
      window.setTimeout(() => { busy = false; next(); }, 950);
      return;
    }

    sfx.wrong();
    replay(hand, 'wrong');
    btn.classList.add('over');
    window.setTimeout(() => btn.classList.remove('over'), 200);
    /* the word comes back and stays: he is never left guessing blind */
    showWord(word);
  }

  function finish(): void {
    current = null;
    window.clearTimeout(hideTimer);
    hand.style.display = 'none';
    askEl.hidden = true;
    choices.classList.remove('waiting');
    choices.replaceChildren();
    resultList.replaceChildren();
    for (const entry of log) {
      const li = el('li', { class: entry.firstTry ? '' : 'miss' });
      li.append(marked(entry.word.text, entry.word.spans, { tones: TRICKY }));
      if (!entry.firstTry) li.append(el('span', { class: 'mk', text: 'again' }));
      resultList.append(li);
    }
    results.hidden = false;
    sfx.win();
    confetti();
    say(firstTry === log.length ? 'Every one!' : 'Good looking!');
  }

  drawSets();
  root.append(node);
  start();
  return () => window.clearTimeout(hideTimer);
}
