/* Read and Point — read a little story together, and point to the sight
 * words in it.
 *
 * His teacher's suggestion for home is a simple picture book read together,
 * the child pointing out the sight words as they come. Here the book is a
 * short story at his level (STORIES in words.ts: every word one he can read)
 * and the pointing is a tap.
 *
 * Two ways to play, chosen in ⚙. One word: "Find every the", and a count of
 * how many there are, so he knows when he has them all. Every sight word:
 * all the words from the school's list up to his level, wherever they are.
 *
 * A tap on the wrong word says that word aloud. That is the useful part of
 * a mistake here: he tapped "they" thinking it was "the", and now he has
 * heard the difference. A word found lights up, its tricky letters marked,
 * as in Tricky Words. "Read it to me" reads the story a sentence at a time
 * with the sentence lit, for reading along, at any point. */

import { el, replay } from '../lib/dom';
import { lifetime } from '../lib/life';
import { shuffle } from '../lib/random';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { awardFace } from '../lib/stickers';
import { setMarked } from '../lib/highlight';
import { read, write } from '../lib/storage';
import { settings } from '../lib/settings';
import { ALL_STORIES, LEVELS, type Level, type SightWord, type Story } from '../content/index';
import { TRICKY, sightSetsUpTo, sightWordsIn } from '../content/sight';
import { huntFor, pieces } from '../content/stories';
import { celebrate, counter, resultsTray, scoreLine, topbar } from '../ui/components';

type Mode = 'one' | 'all';

/** how long to wait for a sentence that never says it has finished: some voices never do */
const sentenceMs = (s: string): number => 1200 + s.length * 75;

export function mount(root: HTMLElement): () => void {
  const life = lifetime();

  const week = settings().levels;
  const modeSel = el('select', { 'aria-label': 'What to find' },
    el('option', { value: 'one', text: 'One sight word' }),
    el('option', { value: 'all', text: 'Every sight word' }),
  );
  modeSel.value = read<string>('point-mode', 'one') === 'all' ? 'all' : 'one';
  const levelSel = el('select', { 'aria-label': 'Stories up to' },
    ...LEVELS.map((l) => el('option', { value: String(l.n), text: `Stories up to level ${l.n}` })));
  levelSel.value = String(week.length ? Math.max(...week) : 8);
  const lenSel = el('select', { 'aria-label': 'How many stories' },
    el('option', { value: '3', text: '3 stories', selected: 'selected' }),
    el('option', { value: '5', text: '5 stories' }),
  );
  modeSel.addEventListener('change', () => { write('point-mode', modeSel.value); start(); });
  levelSel.addEventListener('change', () => start());
  lenSel.addEventListener('change', () => start());
  const panel = el('div', { class: 'panel', hidden: 'hidden' },
    el('div', { class: 'row' }, el('span', { class: 'lbl', text: 'This game' }), modeSel, levelSel, lenSel));

  const storyNum = counter('Story');
  const totalEl = el('span', { text: '0' });
  const foundCount = counter('Found');

  const title = el('h2', { class: 'rp-title' });
  const page = el('p', { class: 'rp-story' });
  const book = el('article', { class: 'rp-book', vars: { '--found': TRICKY.light, '--found-deep': TRICKY.deep } }, title, page);
  const find = el('span', { class: 'rp-target' });
  const hear = el('button', {
    class: 'btn ghost small', type: 'button', text: '🔊', 'aria-label': 'Say the word to find',
    on: { click: () => { if (target) say(target); } },
  });
  const tally = el('span', { class: 'rp-tally', 'aria-live': 'polite' });
  const ask = el('div', { class: 'rp-ask' }, find, hear, tally);
  const note = el('p', { class: 'rp-note', 'aria-live': 'polite' });
  const readBtn = el('button', { class: 'btn ghost', type: 'button', text: '🔊 Read it to me', on: { click: () => readAloud() } });
  const nextBtn = el('button', { class: 'btn', type: 'button', text: 'Next story ▶', hidden: 'hidden', on: { click: () => next() } });
  const actions = el('div', { class: 'row rp-actions' }, readBtn, nextBtn);

  const resultList = el('ul', {});
  const results = resultsTray('Stories read', resultList,
    el('button', { class: 'btn', type: 'button', text: 'Play again', on: { click: () => start() } }),
  );

  const node = el('div', { class: 'wrap' },
    topbar({
      title: 'Read and', swash: 'Point',
      tagline: 'Read the story together. Tap the sight words.',
      onSetup: (open) => { panel.hidden = !open; },
    }),
    panel,
    scoreLine(el('span', {}, storyNum.node, ' of ', totalEl), foundCount.node),
    ask, book, note, actions, results.node,
  );

  let queue: Story[] = [];
  let index = 0;
  let sight: SightWord[] = [];
  let target: string | null = null;
  let wanted = new Set<string>();
  let words: { word: string; node: HTMLButtonElement; found: boolean; sentence: number }[] = [];
  let toFind = 0;
  let found = 0;
  let misses = 0;
  let totalFound = 0;
  let log: { story: Story; misses: number }[] = [];
  /** stops the story being read aloud */
  let reading = 0;

  const mode = (): Mode => modeSel.value as Mode;

  function start(): void {
    life.clear();
    reading += 1;
    const upTo = Number(levelSel.value) as Level;
    sight = sightWordsIn(sightSetsUpTo([upTo]));
    /* his own level first, then the levels below it, each shuffled */
    const fit = ALL_STORIES.filter((s) => s.level <= upTo);
    queue = [...shuffle(fit.filter((s) => s.level >= upTo - 1)), ...shuffle(fit.filter((s) => s.level < upTo - 1))]
      .slice(0, Number(lenSel.value));
    index = 0; totalFound = 0; log = [];
    foundCount.set(0);
    totalEl.textContent = String(queue.length);
    results.hide();
    for (const n of [ask, book, note, actions]) n.hidden = false;
    show();
  }

  function show(): void {
    reading += 1;
    const story = queue[index];
    storyNum.set(index + 1);
    title.textContent = story.title;
    nextBtn.hidden = true;
    note.textContent = '';
    found = 0; misses = 0;

    const sightTexts = new Set(sight.map((w) => w.text.toLowerCase()));
    target = mode() === 'one' ? huntFor(story, sight) : null;
    wanted = target ? new Set([target]) : sightTexts;

    page.replaceChildren();
    words = [];
    pieces(story).forEach((p, i) => {
      if (i > 0) page.append(' ');
      if (!p.word) { page.append(p.text); return; }
      const btn = el('button', { class: 'rp-word', type: 'button', text: p.text, dataset: { word: p.word } });
      const entry = { word: p.word, node: btn, found: false, sentence: p.sentence };
      btn.addEventListener('click', () => tap(entry));
      words.push(entry);
      /* a word and its marks stay on one line: no full stop alone at the start of the next */
      page.append(el('span', { class: 'rp-chunk' }, p.lead, btn, p.tail));
    });
    toFind = words.filter((w) => wanted.has(w.word)).length;
    find.replaceChildren(...(target
      ? ['Find every ', el('b', { class: 'rp-find-word', text: target })]
      : ['Find every sight word']));
    hear.hidden = !target;
    drawTally();
    say(target ? `Find every ${target}.` : 'Find every sight word.');
  }

  function drawTally(): void {
    tally.textContent = `${found} of ${toFind}`;
  }

  function tap(entry: { word: string; node: HTMLButtonElement; found: boolean }): void {
    /* a tap stops the story being read aloud: he is reading it now */
    reading += 1;
    for (const w of words) w.node.classList.remove('reading');
    if (entry.found) { say(entry.word); return; }
    if (!wanted.has(entry.word)) {
      /* the useful part of a mistake: he hears what he tapped */
      misses += 1;
      sfx.wrong();
      replay(entry.node, 'nope');
      say(entry.word);
      note.textContent = target ? `That says ${entry.word}.` : `${entry.word} is not on the sight word list.`;
      return;
    }
    entry.found = true;
    found += 1;
    totalFound += 1;
    foundCount.set(totalFound);
    sfx.right();
    entry.node.classList.add('found');
    /* now its tricky letters light up, as in Tricky Words */
    const w = sight.find((s) => s.text.toLowerCase() === entry.word);
    if (w) setMarked(entry.node, entry.node.textContent ?? '', w.spans, { tones: TRICKY });
    say(entry.word);
    note.textContent = '';
    drawTally();
    if (found === toFind) done();
  }

  function done(): void {
    const story = queue[index];
    log.push({ story, misses });
    note.textContent = target ? `You found every ${target}!` : 'You found every sight word!';
    sfx.win();
    nextBtn.hidden = false;
    nextBtn.textContent = index + 1 < queue.length ? 'Next story ▶' : 'Finish';
  }

  function next(): void {
    reading += 1;
    index += 1;
    if (index >= queue.length) { finish(); return; }
    show();
  }

  /** the story aloud, one sentence at a time, each lit as it is read */
  function readAloud(): void {
    const story = queue[index];
    if (!story) return;
    const me = (reading += 1);
    const light = (n: number): void => {
      for (const w of words) w.node.classList.toggle('reading', w.sentence === n);
    };
    const step = (n: number): void => {
      if (me !== reading || !life.alive()) return;
      if (n >= story.sentences.length) { light(-1); return; }
      light(n);
      let moved = false;
      const go = (): void => { if (moved) return; moved = true; life.later(() => step(n + 1), 250); };
      say(story.sentences[n], { onEnd: go });
      life.later(go, sentenceMs(story.sentences[n]));
    };
    step(0);
  }

  function finish(): void {
    for (const n of [ask, book, note, actions]) n.hidden = true;
    resultList.replaceChildren(...log.map((e) => el('li', { class: e.misses ? 'miss' : '' },
      e.story.title, e.misses ? el('span', { class: 'mk', text: `${e.misses} to look at again` }) : '')));
    results.show(awardFace('read-and-point', '👉'));
    celebrate(log.every((e) => !e.misses) ? 'Every one first time!' : 'Good reading!');
  }

  root.append(node);
  start();
  return () => { reading += 1; life.end(); };
}
