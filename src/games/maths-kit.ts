/* The frame every maths game sits in.
 *
 * A maths game only says how to ask one question at a given step and how to
 * show it; this does the rest, once: the round of questions, the ladder up
 * and down the steps (src/content/maths.ts), remembering the step he reached,
 * the setup panel, the score line, the results and the sticker. It is the
 * "shared game frame" from the code review, started with the maths games so
 * they never grow four copies of the same round loop.
 *
 * A question is a promise: the game shows it, waits for his answer, explains
 * a wrong one, and resolves true if he got it right first time. */

import { el } from '../lib/dom';
import { lifetime, type Life } from '../lib/life';
import { pro } from '../lib/settings';
import { read, write } from '../lib/storage';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { awardFace } from '../lib/stickers';
import { climb, type Climb, type Step } from '../content/maths';
import { confetti, counter, scoreLine, topbar } from '../ui/components';
import { narrationSelect } from './narration';
import { pick } from '../lib/random';
import { TEAMS, YOU, teamById, type Team } from './teams';

export interface Kit {
  life: Life;
  /** wait, cancelled if he leaves the game */
  wait: (ms: number) => Promise<void>;
  /** the number buttons under the question */
  choices: ChoiceRow;
  /** a line of feedback under the stage */
  note: (text: string, good?: boolean) => void;
  /** his team and the other one, for the football games */
  us: () => Team;
  rival: () => Team;
}

export interface Question<S extends Step> {
  node: HTMLElement;
  /** ask one question at this step; true if right first time */
  ask: (step: S) => Promise<boolean>;
  /** a control of the game's own for the setup panel, such as Flash Count's speed */
  setup?: HTMLElement;
}

export interface MathsGame<S extends Step> {
  id: string;
  title: string;
  swash: string;
  tagline: string;
  steps: S[];
  /** the sticker this game gives */
  face: string;
  /** a football game, with teams and the commentator */
  football?: boolean;
  build: (kit: Kit) => Question<S>;
}

/* ── the number buttons ──────────────────────────────────────────────── */

export interface ChoiceRow {
  node: HTMLElement;
  /** show these numbers and wait for one tap */
  ask: (options: number[]) => Promise<number>;
  /** after the tap: light the right one, cross the one he picked if different */
  reveal: (answer: number, picked: number) => void;
  /** the same with words, for questions answered "Yes" or "a quarter" */
  askWords: (options: string[]) => Promise<string>;
  revealWord: (answer: string, picked: string) => void;
  clear: () => void;
}

export function choiceRow(): ChoiceRow {
  const node = el('div', { class: 'mx-choices' });
  /** buttons for these answers, resolving with the one he taps */
  const offer = <T>(options: T[], word: boolean): Promise<T> => new Promise((resolve) => {
    node.replaceChildren(...options.map((x) => {
      const b = el('button', { class: word ? 'mx-choice word' : 'mx-choice', type: 'button', text: String(x), dataset: { n: String(x) } });
      b.addEventListener('click', () => {
        for (const other of node.querySelectorAll('button')) other.disabled = true;
        sfx.tap();
        resolve(x);
      });
      return b;
    }));
  });
  const mark = (answer: string, picked: string): void => {
    for (const b of node.querySelectorAll<HTMLButtonElement>('button')) {
      const n = b.dataset.n ?? '';
      b.classList.toggle('right', n === answer);
      b.classList.toggle('wrong', n === picked && n !== answer);
    }
  };
  return {
    node,
    ask: (options) => offer(options, false),
    reveal: (answer, picked) => mark(String(answer), String(picked)),
    askWords: (options) => offer(options, true),
    revealWord: mark,
    clear: () => node.replaceChildren(),
  };
}

/* ── the frame ───────────────────────────────────────────────────────── */

export function mountMaths<S extends Step>(game: MathsGame<S>, root: HTMLElement): () => void {
  const life = lifetime();
  const key = `maths-step:${game.id}`;
  const saved = (): number => Math.min(game.steps.length - 1, Math.max(0, read<number>(key, 0) || 0));

  const lenSel = el('select', { 'aria-label': 'How many questions' },
    el('option', { value: '8', text: '8 questions' }),
    el('option', { value: '12', text: '12 questions' }),
  );
  const stepSel = el('select', { 'aria-label': 'Start at' },
    ...game.steps.map((s, i) => el('option', { value: String(i), text: `Start at: ${s.name}` })));
  /* Pro starts a step above where he got to */
  stepSel.value = String(Math.min(game.steps.length - 1, saved() + (pro() ? 1 : 0)));
  lenSel.addEventListener('change', () => ready());
  stepSel.addEventListener('change', () => { write(key, Number(stepSel.value)); ready(); });
  const panelRow = el('div', { class: 'row' }, el('span', { class: 'lbl', text: 'This game' }), stepSel, lenSel,
    game.football ? narrationSelect() : null);
  const panel = el('div', { class: 'panel', hidden: 'hidden' }, panelRow);

  const pos = counter('Question');
  const totalEl = el('span', { text: '0' });
  const firsts = counter('Right first time');
  const stepEl = el('span', { class: 'mx-step' });
  const noteEl = el('p', { class: 'mx-note', 'aria-live': 'polite' });
  const choices = choiceRow();

  const ourTeam = (): Team => teamById(read<string>('shootout-team', YOU.id)) ?? YOU;
  let rivalTeam: Team = pick(TEAMS.filter((t) => t !== YOU));

  const kit: Kit = {
    life,
    wait: (ms) => new Promise((resolve) => life.later(resolve, ms)),
    choices,
    note: (text, good = false) => { noteEl.textContent = text; noteEl.classList.toggle('good', good); },
    us: ourTeam,
    rival: () => rivalTeam,
  };
  const question = game.build(kit);
  if (question.setup) {
    panelRow.append(question.setup);
    question.setup.addEventListener('change', () => ready());
  }
  const board = el('div', { class: 'mx-board' }, question.node, noteEl, choices.node);

  const summary = el('p', {});
  const prize = el('span', { class: 'sticker fresh', hidden: 'hidden' });
  const results = el('div', { class: 'tray results', hidden: 'hidden' },
    el('h2', {}, 'Full time! ', prize), summary,
    el('div', { class: 'row', style: { marginTop: '14px' } },
      el('button', { class: 'btn', type: 'button', text: 'Play again', on: { click: () => start() } })),
  );

  /* nothing is asked until he taps Start: a question that flashes up while
     the page is still settling, or before he has sat down, is not a fair one */
  const readyStep = el('p', { class: 'mx-ready-step' });
  const startBtn = el('button', { class: 'btn mx-go', type: 'button', text: '▶ Start', on: { click: () => start() } });
  const readyEl = el('div', { class: 'tray mx-ready' },
    readyStep, el('p', { class: 'mx-ready-how', text: game.tagline }), startBtn);

  const score = scoreLine(el('span', {}, pos.node, ' of ', totalEl), firsts.node, stepEl);

  const node = el('div', { class: 'wrap' },
    topbar({ title: game.title, swash: game.swash, tagline: game.tagline, onSetup: (open) => { panel.hidden = !open; } }),
    panel,
    score,
    readyEl, board, results,
  );

  /* each start bumps the round, so an old round's loop stops where it is */
  let round = 0;

  async function play(me: number): Promise<void> {
    const n = Number(lenSel.value);
    let c: Climb = { step: Number(stepSel.value), right: 0, wrong: 0 };
    let right = 0;
    const startStep = c.step;
    for (let i = 0; i < n; i += 1) {
      pos.set(i + 1);
      stepEl.textContent = game.steps[c.step].name;
      kit.note('');
      choices.clear();
      const ok = await question.ask(game.steps[c.step]);
      if (me !== round || !life.alive()) return;
      if (ok) { right += 1; firsts.set(right); }
      c = climb(c, ok, game.steps.length);
      write(key, c.step);
    }
    finish(right, n, startStep, c.step);
  }

  /** stop any round and wait for Start */
  function ready(): void {
    life.clear();
    round += 1;
    score.hidden = true;
    readyStep.textContent = game.steps[Number(stepSel.value)].name;
    results.hidden = true;
    board.hidden = true;
    readyEl.hidden = false;
  }

  function start(): void {
    life.clear();
    round += 1;
    rivalTeam = pick(TEAMS.filter((t) => t !== YOU && t !== ourTeam()));
    totalEl.textContent = lenSel.value;
    firsts.set(0);
    readyEl.hidden = true;
    score.hidden = false;
    results.hidden = true;
    board.hidden = false;
    void play(round);
  }

  function finish(right: number, n: number, from: number, to: number): void {
    board.hidden = true;
    const moved = to > from ? ` You went up to ${game.steps[to].name}!` : '';
    summary.textContent = `${right} of ${n} right first time.${moved}`;
    const sticker = right * 2 >= n ? awardFace(game.id, game.face) : null;
    prize.hidden = !sticker;
    prize.textContent = sticker?.face ?? '';
    stepSel.value = String(to);
    stepEl.textContent = '';
    results.hidden = false;
    sfx.whistle();
    life.later(() => { sfx.win(); confetti(); }, 350);
    say(right === n ? 'Every one right!' : 'Good counting!');
  }

  root.append(node);
  ready();
  return life.end;
}
