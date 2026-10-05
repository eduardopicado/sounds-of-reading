/* Coach's Whiteboard — position, directions and turns.
 *
 * The coach draws the drill on the whiteboard. Kindergarten and Year 1 use
 * the words of position: is the ball to the left or the right of the
 * keeper? Then he follows directions on the grid — 2 squares up, then 3
 * squares left — and taps where the player ends up.
 *
 * Year 2 makes quarter and half turns (which way is he facing now?) and
 * tells a flip from a slide from a turn: the same shape moved three
 * different ways, the start of transformations in the syllabus.
 *
 * Left and right are as he looks at the board. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { pick } from '../lib/random';
import { BOARD_STEPS, GRID, boardQuestion, moveWords, type BoardQuestion, type BoardStep, type Dir } from '../content/maths';
import { mountMaths, type Kit } from './maths-kit';
import { player } from './teams';
import { svg } from '../ui/writing';

export function mount(root: HTMLElement): () => void {
  return mountMaths<BoardStep>({
    id: 'coach-whiteboard',
    title: "Coach's",
    swash: 'Whiteboard',
    tagline: 'Left and right, up and down, and turns: follow the coach.',
    steps: BOARD_STEPS,
    face: '📋',
    build,
  }, root);
}

const ARROW: Record<Dir, string> = { up: '↑', right: '→', down: '↓', left: '←' };
const ANGLE: Record<Dir, number> = { up: 0, right: 90, down: 180, left: 270 };
const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);
const TURN_WORDS = {
  'quarter-clockwise': 'a quarter turn clockwise, the way a clock goes',
  'quarter-anticlockwise': 'a quarter turn anticlockwise, the other way',
  half: 'a half turn',
};

/** an L shape of four squares, which looks different flipped and turned */
const L_SHAPE = 'M0 0 H40 V80 H80 V120 H0 Z';

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const board = el('div', { class: 'cw-board' });
  const node = el('div', { class: 'mx-stage' }, ask, board);
  let last: BoardQuestion | undefined;

  async function finish(ok: boolean, how: string): Promise<boolean> {
    if (ok) {
      sfx.cheer();
      kit.note(`Yes! ${how}`, true);
      say(`Yes! ${how}`);
      await kit.wait(2400);
      return true;
    }
    sfx.wrong();
    kit.note(how);
    say(how);
    await kit.wait(3600);
    return false;
  }

  async function side(q: BoardQuestion): Promise<boolean> {
    board.replaceChildren(el('div', { class: 'cw-row' }, ...Array.from({ length: GRID }, (_, i) =>
      el('span', { class: 'cw-spot' }, i === q.keeper ? player(kit.rival(), 74, 'keeper') : i === q.ball ? el('span', { class: 'cw-ball', text: '⚽' }) : ''))));
    ask.textContent = 'Is the ball on the left or the right of the keeper?';
    say(ask.textContent);
    const answer = cap(q.answer);
    const picked = await kit.choices.askWords(['Left', 'Right']);
    kit.choices.revealWord(answer, picked);
    return finish(picked === answer, `The ball is on the ${q.answer} of the keeper.`);
  }

  function grid(q: BoardQuestion): Promise<boolean> {
    return new Promise((resolve) => {
      const cells: HTMLButtonElement[] = [];
      const g = el('div', { class: 'cw-grid' });
      for (let y = 0; y < GRID; y += 1) {
        for (let x = 0; x < GRID; x += 1) {
          const at = x === q.start[0] && y === q.start[1];
          const cell = el('button', { class: at ? 'cw-cell start' : 'cw-cell', type: 'button', 'aria-label': `Square ${x + 1} across, ${y + 1} down`, dataset: { at: `${x},${y}` } },
            at ? player(kit.us(), 40, 'kicker') : '');
          cell.addEventListener('click', () => pickCell(x, y));
          g.append(cell);
          cells.push(cell as HTMLButtonElement);
        }
      }
      board.replaceChildren(g);
      const words = q.moves.map(moveWords).join(', then ');
      ask.replaceChildren('Move ', el('b', { text: words }), '. Tap where he ends up.');
      say(`Move ${words}. Tap where he ends up.`);

      const pickCell = async (x: number, y: number): Promise<void> => {
        for (const c of cells) c.disabled = true;
        sfx.tap();
        const ok = `${x},${y}` === q.answer;
        /* the path, square by square, and where he should be */
        let [px, py] = q.start;
        for (const m of q.moves) {
          for (let i = 0; i < m.n; i += 1) {
            px += m.dir === 'right' ? 1 : m.dir === 'left' ? -1 : 0;
            py += m.dir === 'down' ? 1 : m.dir === 'up' ? -1 : 0;
            cells[py * GRID + px].classList.add('path');
            cells[py * GRID + px].textContent = ARROW[m.dir];
          }
        }
        cells[q.end[1] * GRID + q.end[0]].classList.add('end');
        if (!ok) cells[y * GRID + x].classList.add('wrong');
        resolve(await finish(ok, ok ? `${cap(words)}.` : `Count the squares: ${words}. He ends up here.`));
      };
    });
  }

  async function turn(q: BoardQuestion): Promise<boolean> {
    const arrow = svg('svg', { class: 'cw-facing', viewBox: '0 0 100 100', role: 'img', 'aria-label': `He is facing ${q.facing}` },
      svg('path', { d: 'M50 8 L80 44 H60 V92 H40 V44 H20 Z', class: 'cw-arrow', transform: `rotate(${ANGLE[q.facing]} 50 50)` }));
    board.replaceChildren(el('div', { class: 'cw-turn' }, arrow, el('span', { class: 'cw-turn-sign', text: q.turn === 'half' ? '⟲ ½' : q.turn === 'quarter-clockwise' ? '↻ ¼' : '↺ ¼' })));
    ask.textContent = `He is facing ${q.facing}. He makes ${TURN_WORDS[q.turn]}. Which way is he facing now?`;
    say(ask.textContent);
    const options = (['up', 'right', 'down', 'left'] as Dir[]).map((d) => `${ARROW[d]} ${d}`);
    const answer = `${ARROW[q.answer as Dir]} ${q.answer}`;
    const picked = await kit.choices.askWords(options);
    kit.choices.revealWord(answer, picked);
    arrow.querySelector('path')?.setAttribute('transform', `rotate(${ANGLE[q.answer as Dir]} 50 50)`);
    return finish(picked === answer, `From ${q.facing}, ${TURN_WORDS[q.turn].split(',')[0]} leaves him facing ${q.answer}.`);
  }

  async function transform(q: BoardQuestion): Promise<boolean> {
    /* the same shape before and after: slid along, flipped over, or turned */
    const after = q.done === 'slide' ? 'translate(290 40)'
      : q.done === 'flip' ? 'translate(370 40) scale(-1 1)'
        : pick(['translate(306 40) rotate(90 40 60)', 'translate(290 40) rotate(180 40 60)']);
    const g = svg('svg', { class: 'cw-shapes', viewBox: '0 0 420 200', role: 'img', 'aria-label': 'a shape before and after it moved' },
      svg('path', { d: L_SHAPE, class: 'cw-shape', transform: 'translate(40 40)' }),
      svg('path', { d: 'M160 100 H240', class: 'cw-move' }), svg('path', { d: 'M228 88 L242 100 L228 112', class: 'cw-move' }),
      svg('path', { d: L_SHAPE, class: 'cw-shape after', transform: after }));
    board.replaceChildren(g);
    ask.textContent = 'The coach moved the shape. Was it a flip, a slide or a turn?';
    say(ask.textContent);
    const options = ['flip', 'slide', 'turn'];
    const picked = await kit.choices.askWords(options);
    kit.choices.revealWord(q.answer, picked);
    const how = q.done === 'slide' ? 'A slide: it moved along but still faces the same way.'
      : q.done === 'flip' ? 'A flip: it is the other way round, like in a mirror.'
        : 'A turn: it spun round, like the hands of a clock.';
    return finish(picked === q.answer, how);
  }

  return {
    node,
    ask: async (step: BoardStep): Promise<boolean> => {
      const q = boardQuestion(step, last);
      last = q;
      /* the answer as its button reads, for the tests */
      board.dataset.answer = step.task === 'side' ? cap(q.answer) : step.task === 'turn' ? `${ARROW[q.answer as Dir]} ${q.answer}` : q.answer;
      if (step.task === 'side') return side(q);
      if (step.task === 'turn') return turn(q);
      if (step.task === 'transform') return transform(q);
      return grid(q);
    },
  };
}
