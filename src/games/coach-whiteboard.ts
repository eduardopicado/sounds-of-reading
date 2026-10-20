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
 * Years 3 and 4 read a grid like a street directory (C3: along the letters,
 * down the numbers), follow moves given as compass points with north up the
 * board, then the points between them, make three-quarter turns, and tell a
 * right angle from a smaller or a bigger one.
 *
 * Left and right are as he looks at the board. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { pick } from '../lib/random';
import {
  BOARD_STEPS, GRID, NORTH_OF, STEP_OF, TURN_NAME, boardQuestion, compassHelp, gridRef, moveWords, turnWhy,
  type BoardQuestion, type BoardStep, type Compass, type Dir,
} from '../content/maths';
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

const ARROW: Record<Dir | Compass, string> = {
  up: '↑', right: '→', down: '↓', left: '←',
  north: '↑', 'north-east': '↗', east: '→', 'south-east': '↘', south: '↓', 'south-west': '↙', west: '←', 'north-west': '↖',
};
const ANGLE: Record<Dir, number> = { up: 0, right: 90, down: 180, left: 270 };
const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);
const TURN_WORDS: Partial<Record<BoardQuestion['turn'], string>> = {
  'quarter-clockwise': 'a quarter turn clockwise, the way a clock goes',
  'quarter-anticlockwise': 'a quarter turn anticlockwise, the other way',
  half: 'a half turn',
};
const TURN_SIGN: Record<BoardQuestion['turn'], string> = {
  'quarter-clockwise': '↻ ¼', 'quarter-anticlockwise': '↺ ¼', half: '⟲ ½',
  'three-quarter-clockwise': '↻ ¾', 'three-quarter-anticlockwise': '↺ ¾',
};
const ANGLE_WORDS = { smaller: 'Smaller', right: 'Right angle', bigger: 'Bigger' } as const;

/** a compass with north up the board; the points between are drawn smaller */
function rose(points: 4 | 8): SVGSVGElement {
  const r = svg('svg', { class: 'cw-rose', viewBox: '0 0 120 120', role: 'img', 'aria-label': 'A compass: north is up' });
  const point = (deg: number, len: number, w: number, cls: string): SVGElement => {
    const a = (deg * Math.PI) / 180;
    const [sx, sy] = [Math.sin(a), -Math.cos(a)];
    return svg('polygon', { class: cls, points: `${60 + len * sx},${60 + len * sy} ${60 - w * sy},${60 + w * sx} ${60 + w * sy},${60 - w * sx}` });
  };
  if (points === 8) for (const deg of [45, 135, 225, 315]) r.append(point(deg, 28, 8, 'cw-rose-between'));
  for (const deg of [90, 180, 270]) r.append(point(deg, 37, 12, 'cw-rose-main'));
  r.append(point(0, 37, 12, 'cw-rose-north'));
  for (const [letter, x, y] of [['N', 60, 11], ['E', 110, 60], ['S', 60, 110], ['W', 10, 60]] as const) {
    const t = svg('text', { x, y, class: 'cw-rose-letter' });
    t.textContent = letter;
    r.append(t);
  }
  return r;
}

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

  function grid(q: BoardQuestion, step: BoardStep): Promise<boolean> {
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
      board.replaceChildren(step.points ? el('div', { class: 'cw-pair' }, rose(step.points), g) : g);
      const words = q.moves.map(moveWords).join(', then ');
      const verb = step.points ? 'Run' : 'Move';
      ask.replaceChildren(`${verb} `, el('b', { text: words }), '. Tap where he ends up.');
      say(`${verb} ${words}. Tap where he ends up.`);

      const pickCell = async (x: number, y: number): Promise<void> => {
        for (const c of cells) c.disabled = true;
        sfx.tap();
        const ok = `${x},${y}` === q.answer;
        /* the path, square by square, and where he should be */
        let [px, py] = q.start;
        for (const m of q.moves) {
          for (let i = 0; i < m.n; i += 1) {
            px += STEP_OF[m.dir][0];
            py += STEP_OF[m.dir][1];
            cells[py * GRID + px].classList.add('path');
            cells[py * GRID + px].textContent = ARROW[m.dir];
          }
        }
        cells[q.end[1] * GRID + q.end[0]].classList.add('end');
        if (!ok) cells[y * GRID + x].classList.add('wrong');
        const help = step.points ? ` ${compassHelp(q.moves)}` : '';
        resolve(await finish(ok, ok ? `${cap(words)}.` : `Count the squares: ${words}.${help} He ends up here.`));
      };
    });
  }

  async function turn(q: BoardQuestion, step: BoardStep): Promise<boolean> {
    /* Year 2 says up, right, down and left; Years 3–4 say north, east, south and west */
    const name = (d: Dir): string => (step.compass ? cap(NORTH_OF[d]) : `${ARROW[d]} ${d}`);
    const facing = step.compass ? NORTH_OF[q.facing] : q.facing;
    const arrow = svg('svg', { class: 'cw-facing', viewBox: '0 0 100 100', role: 'img', 'aria-label': `He is facing ${facing}` },
      svg('path', { d: 'M50 8 L80 44 H60 V92 H40 V44 H20 Z', class: 'cw-arrow', transform: `rotate(${ANGLE[q.facing]} 50 50)` }));
    board.replaceChildren(el('div', { class: 'cw-turn' }, ...(step.compass ? [rose(4)] : []), arrow, el('span', { class: 'cw-turn-sign', text: TURN_SIGN[q.turn] })));
    ask.textContent = `He is facing ${facing}. He makes ${step.compass ? TURN_NAME[q.turn] : TURN_WORDS[q.turn]}. Which way is he facing now?`;
    say(ask.textContent);
    const answer = name(q.answer as Dir);
    const picked = await kit.choices.askWords((['up', 'right', 'down', 'left'] as Dir[]).map(name));
    kit.choices.revealWord(answer, picked);
    arrow.querySelector('path')?.setAttribute('transform', `rotate(${ANGLE[q.answer as Dir]} 50 50)`);
    return finish(picked === answer, step.compass ? turnWhy(q.facing, q.turn)
      : `From ${q.facing}, ${TURN_WORDS[q.turn]!.split(',')[0]} leaves him facing ${q.answer}.`);
  }

  /** a grid with letters across the top and numbers down the side: tap the
      square named, or name the square the ball is on */
  function gridref(q: BoardQuestion): Promise<boolean> {
    return new Promise((resolve) => {
      const ref = gridRef(q.end);
      const tap = q.way === 'tap';
      const g = el('div', { class: 'cw-grid ref' }, el('span', { class: 'cw-head' }));
      const heads: HTMLElement[] = [];
      const cells: HTMLElement[] = [];
      for (let x = 0; x < GRID; x += 1) heads.push(el('span', { class: 'cw-head', text: 'ABCDE'[x] }));
      g.append(...heads);
      for (let y = 0; y < GRID; y += 1) {
        const num = el('span', { class: 'cw-head', text: String(y + 1) });
        heads.push(num);
        g.append(num);
        for (let x = 0; x < GRID; x += 1) {
          const label = gridRef([x, y]);
          const ball = !tap && x === q.end[0] && y === q.end[1];
          const cell = tap
            ? el('button', { class: 'cw-cell', type: 'button', 'aria-label': label, dataset: { at: `${x},${y}` }, on: { click: () => answer(label, x, y) } })
            : el('span', { class: 'cw-cell still', dataset: { at: `${x},${y}` } }, ball ? el('span', { class: 'cw-ball', text: '⚽', 'aria-label': 'the ball', role: 'img' }) : '');
          g.append(cell);
          cells.push(cell);
        }
      }
      board.replaceChildren(g);
      const [letter, number] = [ref[0], ref.slice(1)];
      const why = `${ref}: along the letters to ${letter}, then down the numbers to ${number}.`;
      /* the column and the row, lit up to where they meet */
      const show = (): void => {
        heads[q.end[0]].classList.add('on');
        heads[GRID + q.end[1]].classList.add('on');
        for (let y = 0; y < q.end[1]; y += 1) cells[y * GRID + q.end[0]].classList.add('path');
        for (let x = 0; x < q.end[0]; x += 1) cells[q.end[1] * GRID + x].classList.add('path');
        cells[q.end[1] * GRID + q.end[0]].classList.add('end');
      };
      const answer = async (picked: string, x?: number, y?: number): Promise<void> => {
        for (const c of cells) if (c instanceof HTMLButtonElement) c.disabled = true;
        if (tap) sfx.tap();
        const ok = picked === ref;
        show();
        if (!ok && x !== undefined && y !== undefined) cells[y * GRID + x].classList.add('wrong');
        resolve(await finish(ok, ok ? `${why}` : `${why} ${tap ? 'The ball goes' : 'The ball is'} where they meet.`));
      };
      if (tap) {
        ask.replaceChildren('Put the ball on ', el('b', { class: 'mx-big', text: ref }), '. Tap the square.');
        say(`Put the ball on ${letter} ${number}. Tap the square.`);
        return;
      }
      ask.textContent = 'Which square is the ball on?';
      say(ask.textContent);
      void kit.choices.askWords(q.refs).then((picked) => {
        kit.choices.revealWord(ref, picked);
        void answer(picked);
      });
    });
  }

  /** two lines from a corner: a right angle, or smaller, or bigger */
  async function angle(q: BoardQuestion): Promise<boolean> {
    const [c, len] = [100, 84];
    const at = (deg: number, r: number): string => {
      const a = (deg * Math.PI) / 180;
      return `${c + r * Math.cos(a)} ${c - r * Math.sin(a)}`;
    };
    const corner = svg('g', { transform: `rotate(${q.tilt} ${c} ${c})` },
      svg('path', { d: `M${at(0, 30)} A30 30 0 0 0 ${at(q.angle, 30)} L${c} ${c} Z`, class: 'cw-angle-fill' }),
      svg('path', { d: `M${at(0, len)} L${c} ${c} L${at(q.angle, len)}`, class: 'cw-angle' }));
    const g = svg('svg', { class: 'cw-corner', viewBox: '0 0 200 200', role: 'img', 'aria-label': 'Two lines meeting at a corner' }, corner);
    board.replaceChildren(g);
    ask.textContent = 'Is this corner a right angle? Or is it smaller, or bigger?';
    say(ask.textContent);
    const answer = ANGLE_WORDS[q.answer as keyof typeof ANGLE_WORDS];
    const picked = await kit.choices.askWords(Object.values(ANGLE_WORDS));
    kit.choices.revealWord(answer, picked);
    /* the square corner of a page, laid on the first line, to hold it against */
    corner.append(svg('path', { d: `M${at(90, len)} L${c} ${c} M${at(0, 18)} L${at(45, 18 * Math.SQRT2)} L${at(90, 18)}`, class: 'cw-right' }));
    const how = q.answer === 'right' ? 'A right angle: a square corner, like the corner of a page.'
      : q.answer === 'smaller' ? 'Smaller than a right angle: it is sharper than the square corner of a page.'
        : 'Bigger than a right angle: it opens wider than the square corner of a page.';
    return finish(picked === answer, how);
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
      /* the answer as its button reads, or the square to tap, for the tests */
      board.dataset.answer = step.task === 'side' ? cap(q.answer)
        : step.task === 'turn' ? (step.compass ? cap(NORTH_OF[q.answer as Dir]) : `${ARROW[q.answer as Dir]} ${q.answer}`)
          : step.task === 'angle' ? ANGLE_WORDS[q.answer as keyof typeof ANGLE_WORDS]
            : q.answer;
      if (step.task === 'side') return side(q);
      if (step.task === 'turn') return turn(q, step);
      if (step.task === 'transform') return transform(q);
      if (step.task === 'gridref') return gridref(q);
      if (step.task === 'angle') return angle(q);
      return grid(q, step);
    },
  };
}
