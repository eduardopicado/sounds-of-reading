/* Code the Striker — a first program (src/content/coding.ts).
 *
 * The pitch is a grid with the player, the ball, and sometimes cones and a
 * goal. He lines up arrow cards, then presses Go, and only then does the
 * player follow them, a square for each card. Plan first, then run: that is
 * what makes it a program and not a game of steering.
 *
 * A program that goes wrong shows where (the bump, the square he stopped
 * on), and he fixes it and goes again, three goes in all; after the third a
 * program that works is shown running. Right first time is the first Go
 * working. Tapping a card takes it out, so a bug in the middle can be fixed
 * without starting again. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import {
  ARROW, ASK, CODE_STEPS, DIRS, MOST_TIMES, SAYS, makePuzzle, run, same, shortest, verdict,
  type Card, type Cell, type CodeStep, type Dir, type Puzzle,
} from '../content/coding';
import { mountMaths, type Kit } from './maths-kit';
import { player } from './teams';
import { svg } from '../ui/writing';

export function mount(root: HTMLElement): () => void {
  return mountMaths<CodeStep>({
    id: 'code-the-striker',
    title: 'Code the',
    swash: 'Striker',
    tagline: 'Line up the arrows, press Go, and the player follows your program.',
    steps: CODE_STEPS,
    face: '🤖',
    cheer: 'Good coding!',
    unit: 'Puzzle',
    lengths: [6, 10],
    build,
  }, root);
}

const GOES = 3;
const STRIDE = 360;
const DIR_NAME: Record<Dir, string> = { up: 'Up', right: 'Right', down: 'Down', left: 'Left' };

function cone(): SVGSVGElement {
  const s = svg('svg', { class: 'cs-cone', viewBox: '0 0 40 40', 'aria-hidden': 'true' });
  s.append(svg('path', { d: 'M20 4 L33 34 H7 Z', fill: '#F28C28', stroke: '#9A4D0B', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }),
    svg('path', { d: 'M14.5 17 H25.5 L27.5 22 H12.5 Z', fill: '#FFF6E7' }),
    svg('rect', { x: 4, y: 33, width: 32, height: 4, rx: 1.5, fill: '#9A4D0B' }));
  return s as SVGSVGElement;
}

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const pitch = el('div', { class: 'cs-pitch' });
  const program = el('div', { class: 'cs-program', 'aria-label': 'Your program' });
  const palette = el('div', { class: 'cs-palette' });
  const node = el('div', { class: 'mx-stage cs-stage' }, ask, pitch,
    el('div', { class: 'cs-code' }, el('span', { class: 'cs-label', text: 'Program' }), program), palette);

  let p: Puzzle;
  let cards: Card[] = [];
  let busy = false;
  let runner: HTMLElement;
  let ball: HTMLElement;
  let repeat = false;

  const place = (n: HTMLElement, c: Cell): void => {
    n.style.setProperty('--x', String(c.x));
    n.style.setProperty('--y', String(c.y));
  };

  function draw(): void {
    pitch.style.setProperty('--n', String(p.size));
    const cells: HTMLElement[] = [];
    for (let y = 0; y < p.size; y += 1) {
      for (let x = 0; x < p.size; x += 1) {
        const c = el('div', { class: 'cs-cell', dataset: { x: String(x), y: String(y) } });
        if (p.cones.some((k) => k.x === x && k.y === y)) { c.classList.add('cone'); c.append(cone()); }
        cells.push(c);
      }
    }
    const goal = p.targets.length > 1 ? p.targets[p.targets.length - 1] : null;
    const net = goal ? el('div', { class: 'cs-goal', 'aria-hidden': 'true' }) : null;
    if (net && goal) place(net, goal);
    ball = el('span', { class: 'cs-ball', text: '⚽', 'aria-hidden': 'true' });
    place(ball, p.targets[0]);
    runner = el('div', { class: 'cs-runner' }, player(kit.us(), 44, 'kicker'));
    place(runner, p.start);
    pitch.replaceChildren(...cells, ...(net ? [net] : []), ball, runner);
  }

  function showProgram(): void {
    program.replaceChildren(...(cards.length ? cards.map((c, i) => {
      const b = el('button', {
        class: 'cs-card', type: 'button', dataset: { dir: c.dir, times: String(c.times) },
        'aria-label': `${DIR_NAME[c.dir]}${c.times > 1 ? ` ${c.times} times` : ''}. Tap to take it out.`,
      }, el('span', { class: 'cs-arrow', text: ARROW[c.dir] }), c.times > 1 ? el('span', { class: 'cs-times', text: `×${c.times}` }) : null);
      b.addEventListener('click', () => {
        if (busy) return;
        sfx.tap();
        cards.splice(i, 1);
        showProgram();
      });
      return b;
    }) : [el('span', { class: 'cs-empty', text: 'Tap the arrows to add cards' })]));
    program.dataset.count = String(cards.length);
  }

  let go: HTMLButtonElement;
  function makePalette(onGo: () => void): void {
    const add = (dir: Dir): void => {
      if (busy) return;
      if (cards.length >= p.most) { kit.note(repeat ? SAYS.tooMany : `${p.most} cards is the most.`, false); sfx.wrong(); return; }
      sfx.tap();
      cards.push({ dir, times: 1 });
      showProgram();
    };
    const arrows = DIRS.map((d) => {
      const b = el('button', { class: 'cs-key', type: 'button', text: ARROW[d], 'aria-label': DIR_NAME[d], dataset: { key: d } });
      b.addEventListener('click', () => add(d));
      return b;
    });
    const more = repeat ? el('button', { class: 'cs-key cs-repeat', type: 'button', text: '🔁 Repeat', dataset: { key: 'repeat' } }) : null;
    more?.addEventListener('click', () => {
      if (busy || !cards.length) return;
      sfx.tap();
      const last = cards[cards.length - 1];
      last.times = last.times >= MOST_TIMES ? 1 : last.times + 1;
      showProgram();
    });
    const back = el('button', { class: 'cs-key cs-back', type: 'button', text: '⌫', 'aria-label': 'Take out the last card', dataset: { key: 'back' } });
    back.addEventListener('click', () => {
      if (busy || !cards.length) return;
      sfx.tap();
      cards.pop();
      showProgram();
    });
    go = el('button', { class: 'cs-go', type: 'button', text: '▶ Go', dataset: { key: 'go' } }) as HTMLButtonElement;
    go.addEventListener('click', () => { if (!busy) onGo(); });
    palette.replaceChildren(el('div', { class: 'cs-keys' }, arrows[3], arrows[0], arrows[2], arrows[1], ...(more ? [more] : []), back), go);
  }

  const lock = (on: boolean): void => {
    busy = on;
    node.classList.toggle('running', on);
    for (const b of node.querySelectorAll<HTMLButtonElement>('.cs-key, .cs-go, .cs-card')) b.disabled = on;
  };

  /** run the program on the pitch, a square at a time */
  async function play(list: Card[]): Promise<ReturnType<typeof run>> {
    const result = run(p, list);
    for (const c of pitch.querySelectorAll('.trail, .bumped')) c.classList.remove('trail', 'bumped');
    runner.classList.remove('bump');
    place(runner, p.start);
    place(ball, p.targets[0]);
    ball.classList.remove('carried');
    let got = 0;
    for (let i = 1; i < result.path.length; i += 1) {
      const at = result.path[i];
      await kit.wait(STRIDE);
      pitch.querySelector(`.cs-cell[data-x="${result.path[i - 1].x}"][data-y="${result.path[i - 1].y}"]`)?.classList.add('trail');
      place(runner, at);
      if (got < p.targets.length && same(at, p.targets[got])) got += 1;
      /* once he has the ball it goes with him */
      if (got >= 1) { place(ball, at); ball.classList.add('carried'); }
      sfx.move();
    }
    await kit.wait(STRIDE);
    if (result.bump) {
      runner.classList.add('bump');
      pitch.querySelector(`.cs-cell[data-x="${result.bump.x}"][data-y="${result.bump.y}"]`)?.classList.add('bumped');
    }
    return result;
  }

  return {
    node,
    ask: (step: CodeStep): Promise<boolean> => new Promise((resolve) => {
      repeat = step.task === 'repeat';
      p = makePuzzle(step.task);
      node.dataset.task = step.task;
      node.dataset.puzzle = JSON.stringify(p);
      cards = (p.given ?? []).map((c) => ({ ...c }));
      draw();
      showProgram();
      ask.textContent = ASK[step.task];
      say(ASK[step.task]);
      let goes = 0;
      makePalette(async () => {
        if (!cards.length) { kit.note(SAYS.empty, false); say(SAYS.empty); return; }
        lock(true);
        goes += 1;
        const result = await play(cards);
        const ok = result.stop === 'done';
        const line = verdict(p, result);
        if (ok) {
          if (p.targets.length > 1) sfx.goal(); else sfx.cheer();
          kit.note(line, true);
          await kit.say(line, 1800);
          resolve(goes === 1);
          return;
        }
        sfx.wrong();
        kit.note(line, false);
        if (goes < GOES) {
          await kit.say(line, 1200);
          /* back to the start, the program kept, to be fixed */
          runner.classList.remove('bump');
          place(runner, p.start);
          place(ball, p.targets[0]);
          ball.classList.remove('carried');
          lock(false);
          return;
        }
        await kit.say(line, 1200);
        /* three goes: show one that works, running */
        cards = shortest(p, repeat)!;
        showProgram();
        lock(true);
        kit.note(SAYS.shown, false);
        await kit.say(SAYS.shown, 800);
        await play(cards);
        resolve(false);
      });
      lock(false);
    }),
  };
}

