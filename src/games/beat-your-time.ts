/* Beat Your Time — read a little story aloud three times, a grown-up timing
 * each read, and race the reads against each other.
 *
 * Reading the same story again is the best-evidenced way to get faster:
 * each read is smoother than the one before. So he picks a story, may hear
 * it read first, and then reads it to the grown-up, who taps Go and
 * Finished. From the second read, last time's runner sets off with him
 * across the top of the page, so he can see whether he is ahead. After each
 * read the reads so far race again, the fastest first to the flag.
 *
 * While he reads, the grown-up can tap a word he gets stuck on. It does not
 * stop the clock; the words come back after the read to hear and look at,
 * and they come off the words-a-minute the grown-up sees at the end.
 *
 * The stories are Read and Point's (STORIES in words.ts). The fastest read
 * of each story is kept, so a story read again another day has a time to
 * beat from the start. */

import { el } from '../lib/dom';
import { lifetime } from '../lib/life';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { awardFace } from '../lib/stickers';
import { read, write } from '../lib/storage';
import { settings } from '../lib/settings';
import { ALL_STORIES, LEVELS, type Level, type Story } from '../content/index';
import { pieces } from '../content/stories';
import {
  MEDALS, READS, SAYS, afterSays, cleanBests, clockText, compareText, outcome, perMinute, places, storiesUpTo, timeText, wordCount,
} from '../content/beat-time';
import { celebrate, counter, resultsTray, scoreLine, topbar } from '../ui/components';

/** how long the slowest runner takes to reach the flag when the reads race */
const RACE_MS = 2600;
/** each of 3, 2, 1 before the clock starts */
const COUNT_MS = 700;
const TICK_MS = 200;
/** how long to wait for a sentence that never says it has finished: some voices never do */
const sentenceMs = (s: string): number => 1200 + s.length * 75;

interface Read { ms: number; stuck: string[] }

const BEST_KEY = 'beat-best';

export function mount(root: HTMLElement): () => void {
  const life = lifetime();

  const week = settings().levels;
  const storyTop = Math.max(...ALL_STORIES.map((s) => s.level));
  const levelSel = el('select', { 'aria-label': 'Stories up to' },
    ...LEVELS.filter((l) => l.n <= storyTop).map((l) => el('option', { value: String(l.n), text: `Stories up to level ${l.n}` })));
  levelSel.value = String(Math.min(week.length ? Math.max(...week) : storyTop, storyTop));
  levelSel.addEventListener('change', () => pick());
  const panel = el('div', { class: 'panel', hidden: 'hidden' },
    el('div', { class: 'row' }, el('span', { class: 'lbl', text: 'This game' }), levelSel));

  const readNum = counter('Read');
  const clock = el('span', { class: 'bt-clock', text: '0:00', 'aria-label': 'Time' });
  const score = scoreLine(el('span', {}, readNum.node, ` of ${READS}`), clock);

  /* choosing a story */
  const list = el('div', { class: 'bt-list' });
  const choose = el('section', { class: 'bt-choose' }, el('h2', { class: 'bt-head', text: 'Pick a story' }), list);

  /* the story, and the race along the top of it while he reads */
  const ghost = el('span', { class: 'bt-runner ghost', text: '🏃', 'aria-hidden': 'true' });
  const chase = el('div', { class: 'bt-chase', hidden: 'hidden' },
    el('span', { class: 'bt-chase-lbl', text: 'Last time' }),
    el('div', { class: 'bt-track' }, ghost, el('span', { class: 'bt-flag', text: '🏁', 'aria-hidden': 'true' })));
  const title = el('h2', { class: 'rp-title' });
  const page = el('p', { class: 'rp-story bt-story' });
  const book = el('article', { class: 'rp-book bt-book' }, title, page);
  const count = el('div', { class: 'bt-count', hidden: 'hidden', 'aria-live': 'assertive' });
  const hint = el('p', { class: 'bt-hint' });

  const listenBtn = el('button', { class: 'btn ghost', type: 'button', text: '🔊 Listen first', on: { click: () => readAloud() } });
  const goBtn = el('button', { class: 'btn bt-go', type: 'button', text: '▶ Go!', on: { click: () => countdown() } });
  const doneBtn = el('button', { class: 'btn bt-done', type: 'button', text: '🏁 Finished!', hidden: 'hidden', on: { click: () => finishRead() } });
  const againBtn = el('button', { class: 'btn', type: 'button', text: 'Read it again ▶', hidden: 'hidden', on: { click: () => ready() } });
  const otherBtn = el('button', { class: 'btn ghost small', type: 'button', text: 'Another story', on: { click: () => pick() } });
  const actions = el('div', { class: 'row rp-actions' }, listenBtn, goBtn, doneBtn, againBtn);

  /* after a read */
  const race = el('ol', { class: 'bt-race', 'aria-label': 'The reads, raced' });
  const verdict = el('p', { class: 'bt-verdict', 'aria-live': 'polite' });
  const stuckList = el('div', { class: 'bt-stuck-list' });
  const after = el('section', { class: 'bt-after', hidden: 'hidden' }, verdict, race, stuckList);

  const play = el('section', { class: 'bt-play', hidden: 'hidden' }, chase, book, count, hint, after, actions,
    el('div', { class: 'row bt-other' }, otherBtn));

  const finalRace = el('ol', { class: 'bt-race', 'aria-label': 'The three reads, raced' });
  const finalNotes = el('ul', { class: 'bt-notes' });
  const results = resultsTray('Three reads', el('div', {}, finalRace, finalNotes),
    el('button', { class: 'btn', type: 'button', text: 'Same story again', on: { click: () => begin(story!) } }),
    el('button', { class: 'btn ghost', type: 'button', text: 'Another story', on: { click: () => pick() } }),
  );

  const node = el('div', { class: 'wrap' },
    topbar({
      title: 'Beat Your', swash: 'Time',
      tagline: 'Read the story three times. Get faster each time!',
      onSetup: (open) => { panel.hidden = !open; },
    }),
    panel, score, choose, play, results.node,
  );

  let story: Story | null = null;
  let reads: Read[] = [];
  let words: { word: string; node: HTMLButtonElement; sentence: number }[] = [];
  let stuck = new Set<number>();
  let state: 'pick' | 'ready' | 'count' | 'reading' | 'after' | 'done' = 'pick';
  let startedAt = 0;
  /** the time to beat on this read: the last read, or the best ever on the first */
  let toBeat: number | null = null;
  /** the story's best time before this sitting, to say "fastest ever" against once */
  let bestBefore: number | undefined;
  let saidBest = false;
  /** stops the story being read aloud */
  let speaking = 0;

  const bests = (): Record<string, number> => cleanBests(read<unknown>(BEST_KEY, {}));

  function pick(): void {
    life.clear();
    speaking += 1;
    state = 'pick';
    story = null;
    const best = bests();
    list.replaceChildren(...storiesUpTo(Number(levelSel.value) as Level).map((s) => el('button', {
      class: 'bt-pick', type: 'button', dataset: { story: s.title },
      on: { click: () => begin(s) },
    },
    el('span', { class: 'bt-pick-title', text: s.title }),
    el('span', { class: 'bt-pick-sub', text: best[s.title] ? `⏱️ Best: ${timeText(best[s.title])}` : `${wordCount(s)} words` }))));
    choose.hidden = false;
    play.hidden = true;
    score.hidden = true;
    results.hide();
  }

  function begin(s: Story): void {
    story = s;
    reads = [];
    bestBefore = bests()[s.title];
    saidBest = false;
    title.textContent = s.title;
    page.replaceChildren();
    words = [];
    pieces(s).forEach((p, i) => {
      if (i > 0) page.append(' ');
      if (!p.word) { page.append(p.text); return; }
      const n = words.length;
      const btn = el('button', { class: 'rp-word', type: 'button', text: p.text, dataset: { word: p.word }, disabled: 'disabled' });
      btn.addEventListener('click', () => mark(n));
      words.push({ word: p.word, node: btn, sentence: p.sentence });
      page.append(el('span', { class: 'rp-chunk' }, p.lead, btn, p.tail));
    });
    choose.hidden = true;
    play.hidden = false;
    score.hidden = false;
    results.hide();
    ready();
  }

  /** before a read: the story, waiting for Go */
  function ready(): void {
    life.clear();
    speaking += 1;
    state = 'ready';
    stuck = new Set();
    for (const w of words) {
      w.node.classList.remove('bt-stuck', 'reading');
      w.node.disabled = true;
    }
    readNum.set(reads.length + 1);
    clock.textContent = '0:00';
    const best = story ? bests()[story.title] : undefined;
    toBeat = reads.length ? reads[reads.length - 1].ms : best ?? null;
    hint.textContent = toBeat === null
      ? 'Read it out loud to a grown-up. They tap Go, and Finished at the end.'
      : `Time to beat: ${timeText(toBeat)}`;
    chase.hidden = true;
    after.hidden = true;
    book.hidden = false;
    listenBtn.hidden = false;
    goBtn.hidden = false;
    doneBtn.hidden = true;
    againBtn.hidden = true;
    otherBtn.hidden = false;
  }

  /** 3, 2, 1, and the clock starts */
  function countdown(): void {
    speaking += 1;
    for (const w of words) w.node.classList.remove('reading');
    state = 'count';
    listenBtn.hidden = true;
    goBtn.hidden = true;
    otherBtn.hidden = true;
    count.hidden = false;
    say(SAYS.go);
    [3, 2, 1].forEach((n, i) => life.later(() => { count.textContent = String(n); sfx.tap(); }, i * COUNT_MS));
    count.textContent = '3';
    life.later(() => startRead(), 3 * COUNT_MS);
  }

  function startRead(): void {
    count.hidden = true;
    state = 'reading';
    startedAt = performance.now();
    sfx.whistle();
    for (const w of words) w.node.disabled = false;
    hint.textContent = 'Grown-up: tap a word he gets stuck on.';
    doneBtn.hidden = false;
    chase.hidden = toBeat === null;
    ghost.style.setProperty('--at', '0');
    tick();
  }

  function tick(): void {
    if (state !== 'reading') return;
    const ms = performance.now() - startedAt;
    clock.textContent = clockText(ms);
    if (toBeat !== null) ghost.style.setProperty('--at', String(Math.min(1, ms / toBeat)));
    life.later(tick, TICK_MS);
  }

  /** a word he got stuck on, or not after all */
  function mark(n: number): void {
    if (state !== 'reading') return;
    if (stuck.has(n)) stuck.delete(n); else stuck.add(n);
    words[n].node.classList.toggle('bt-stuck', stuck.has(n));
  }

  function finishRead(): void {
    if (state !== 'reading' || !story) return;
    const ms = Math.max(1, performance.now() - startedAt);
    life.clear();
    state = 'after';
    clock.textContent = clockText(ms);
    for (const w of words) w.node.disabled = true;
    const before = reads.length ? reads[reads.length - 1].ms : null;
    const stuckWords = [...new Set([...stuck].sort((a, b) => a - b).map((i) => words[i].word))];
    reads.push({ ms, stuck: stuckWords });

    const all = bests();
    const old = all[story.title];
    const record = old === undefined || ms < old;
    if (record) write(BEST_KEY, { ...all, [story.title]: Math.round(ms) });
    const everBest = !saidBest && bestBefore !== undefined && ms < bestBefore - 500;
    if (everBest) saidBest = true;

    doneBtn.hidden = true;
    chase.hidden = true;
    if (reads.length >= READS) { done(); return; }

    verdict.textContent = compareText(before, ms) + (everBest ? ' 🏆 Your fastest ever!' : '');
    drawRace(race, reads.map((r) => r.ms));
    drawStuck(stuckWords);
    hint.textContent = '';
    book.hidden = true;
    after.hidden = false;
    againBtn.hidden = false;
    otherBtn.hidden = false;
    const o = outcome(before, ms);
    if (o === 'faster') sfx.cheer(); else sfx.land();
    say(everBest ? SAYS.best : afterSays(before, ms, false));
  }

  function done(): void {
    state = 'done';
    play.hidden = true;
    score.hidden = true;
    const times = reads.map((r) => r.ms);
    drawRace(finalRace, times);
    const n = wordCount(story!);
    finalNotes.replaceChildren(...reads.map((r, i) => el('li', {},
      el('b', { text: `Read ${i + 1}: ${timeText(r.ms)}` }),
      ` · ${perMinute(n, r.stuck.length, r.ms)} words a minute`,
      r.stuck.length ? el('span', { class: 'mk', text: ` · stuck on ${r.stuck.join(', ')}` }) : '')));
    results.show(awardFace('beat-your-time', '⏱️'));
    celebrate(times[times.length - 1] < times[0] - 500 ? SAYS.doneFaster : SAYS.done);
  }

  /** the reads race: each runner reaches the flag in a time that goes with its read */
  function drawRace(into: HTMLElement, times: number[]): void {
    const slowest = Math.max(...times);
    const place = places(times);
    into.classList.remove('go');
    into.replaceChildren(...times.map((t, i) => {
      const runner = el('span', { class: 'bt-runner', text: '🏃', 'aria-hidden': 'true', vars: { '--run': `${Math.round((t / slowest) * RACE_MS)}ms` } });
      return el('li', { class: 'bt-lane', dataset: { place: String(place[i]) } },
        el('span', { class: 'bt-lane-lbl', text: `Read ${i + 1}` }),
        el('div', { class: 'bt-track' }, runner, el('span', { class: 'bt-flag', text: '🏁', 'aria-hidden': 'true' })),
        el('span', { class: 'bt-lane-time' },
          el('span', { class: 'bt-medal', text: times.length > 1 ? MEDALS[place[i] - 1] ?? '' : '' }), timeText(t)));
    }));
    /* off they go, a moment after they are on the page */
    life.later(() => into.classList.add('go'), 60);
  }

  function drawStuck(list: string[]): void {
    stuckList.replaceChildren();
    if (!list.length) return;
    stuckList.append(el('span', { class: 'bt-stuck-lbl', text: 'Look at these again:' }),
      ...list.map((w) => el('button', { class: 'btn ghost small bt-stuck-word', type: 'button', text: w, on: { click: () => say(w) } })));
  }

  /** the story aloud, one sentence at a time, each lit as it is read */
  function readAloud(): void {
    if (!story || state !== 'ready') return;
    const s = story;
    const me = (speaking += 1);
    const light = (n: number): void => {
      for (const w of words) w.node.classList.toggle('reading', w.sentence === n);
    };
    const step = (n: number): void => {
      if (me !== speaking || !life.alive() || state !== 'ready') return;
      if (n >= s.sentences.length) { light(-1); return; }
      light(n);
      let moved = false;
      const go = (): void => { if (moved) return; moved = true; life.later(() => step(n + 1), 250); };
      say(s.sentences[n], { onEnd: go });
      life.later(go, sentenceMs(s.sentences[n]));
    };
    step(0);
  }

  root.append(node);
  pick();
  return () => { speaking += 1; state = 'pick'; life.end(); };
}
