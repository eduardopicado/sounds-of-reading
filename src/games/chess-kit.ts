/* The chess board and its pieces, shared by the chess games.
 *
 * The pieces are drawn here rather than taken from a font: the chess
 * characters come out as different shapes on different devices, and as an
 * emoji on some. Each is a simple silhouette a child can tell apart — the
 * castle, the horse's head, the crown with a cross — white with a dark edge,
 * or dark with a light one.
 *
 * The board is eight rows of buttons, a8 at the top left as White sees it,
 * with the letters along the bottom and the numbers up the side. */

import { el } from '../lib/dom';
import { svg } from '../ui/writing';
import { FILES, PIECES, at, isDark, squareName, type Board, type Man } from '../content/chess';

/* each piece in a 100 × 100 box, standing on y = 90 */
const SHAPES: Record<Man['kind'], string[]> = {
  P: ['M50 14a13 13 0 1 1 -0.1 0Z', 'M38 44Q50 36 62 44L66 74H34Z', 'M24 76h52a4 4 0 0 1 4 4v6a4 4 0 0 1 -4 4H24a4 4 0 0 1 -4 -4v-6a4 4 0 0 1 4 -4Z'],
  R: ['M26 16h11v9h7v-9h12v9h7v-9h11v20l-7 7v27l7 6v4H26v-4l7-6V43l-7-7Z', 'M20 80h60v10H20Z'],
  B: ['M50 8a5.5 5.5 0 1 1 -0.1 0Z', 'M50 19C66 30 68 50 59 62H41C32 50 34 30 50 19Z', 'M38 62h24v8H38Z', 'M30 72h40l6 12H24Z', 'M20 84h60v6H20Z'],
  N: ['M70 90H28c0-18 8-26 18-34-8 2-15 5-21 1-6-4-4-12 3-17l18-14c2-6 6-10 11-12l2 8c15 4 20 22 17 40-1 10-4 17-6 28Z', 'M20 82h62v8H20Z'],
  Q: ['M18 30l12 22 5-28 8 22 7-28 7 28 8-22 5 28 12-22-8 40H26Z', 'M24 72h52v8H24Z', 'M20 82h60v8H20Z'],
  K: ['M46 4h8v8h8v8h-8v10h-8V20h-8v-8h8Z', 'M30 42Q50 26 70 42L64 70H36Z', 'M30 70h40v8H30Z', 'M22 80h56v10H22Z'],
};
/* the bits drawn in the other colour: the knight's eye, the bishop's slit,
   the balls on the queen's crown */
const DETAILS: Partial<Record<Man['kind'], string>> = {
  N: 'M53 33a3.5 3.5 0 1 1 -0.1 0Z',
  B: 'M55 30L45 46',
  Q: 'M18 26a4 4 0 1 1 -0.1 0ZM35 20a4 4 0 1 1 -0.1 0ZM50 14a4 4 0 1 1 -0.1 0ZM65 20a4 4 0 1 1 -0.1 0ZM82 26a4 4 0 1 1 -0.1 0Z',
};

/** one piece, drawn */
export function pieceSvg(man: Man): SVGSVGElement {
  const pic = svg('svg', { class: `ch-piece ${man.colour === 'w' ? 'white' : 'black'}`, viewBox: '12 0 76 94', 'aria-hidden': 'true' });
  for (const d of SHAPES[man.kind]) pic.append(svg('path', { d, class: 'ch-body' }));
  const detail = DETAILS[man.kind];
  if (detail) pic.append(svg('path', { d: detail, class: man.kind === 'Q' ? 'ch-body' : 'ch-detail' }));
  return pic;
}

export const pieceName = (man: Man): string => `${man.colour === 'w' ? 'white' : 'black'} ${PIECES[man.kind].name}`;

export interface BoardView {
  node: HTMLElement;
  /** the square buttons, by square number */
  squares: HTMLButtonElement[];
  /** put the pieces and balls on it */
  draw: (board: Board, balls?: number[]) => void;
  /** dots on the squares a piece can go to; none to clear them */
  dots: (squares: number[]) => void;
  /** a class on some squares, off all the others */
  mark: (cls: string, squares: number[]) => void;
  /** what to do when a square is tapped */
  onTap: (f: (sq: number) => void) => void;
}

export function boardView(): BoardView {
  let tap: (sq: number) => void = () => undefined;
  const squares: HTMLButtonElement[] = [];
  const grid = el('div', { class: 'ch-board', role: 'grid', 'aria-label': 'The chess board' });
  for (let rank = 7; rank >= 0; rank -= 1) {
    const row = el('div', { class: 'ch-row', role: 'row' });
    for (let file = 0; file < 8; file += 1) {
      const sq = at(file, rank);
      const b = el('button', {
        class: `ch-sq ${isDark(sq) ? 'dark' : 'light'}`, type: 'button', role: 'gridcell',
        dataset: { sq: squareName(sq) }, 'aria-label': squareName(sq),
        on: { click: () => tap(sq) },
      }) as HTMLButtonElement;
      squares[sq] = b;
      row.append(b);
    }
    grid.append(row);
  }
  const ranks = el('div', { class: 'ch-ranks', 'aria-hidden': 'true' }, ...[8, 7, 6, 5, 4, 3, 2, 1].map((n) => el('span', { text: String(n) })));
  const files = el('div', { class: 'ch-files', 'aria-hidden': 'true' }, ...[...FILES].map((f) => el('span', { text: f })));
  const node = el('div', { class: 'ch-frame' }, ranks, grid, el('span'), files);

  return {
    node,
    squares,
    draw: (board, balls = []) => {
      squares.forEach((b, sq) => {
        const man = board.get(sq);
        const ball = balls.includes(sq);
        b.replaceChildren(...(man ? [pieceSvg(man)] : []), ...(ball ? [el('span', { class: 'ch-ball', text: '⚽', 'aria-hidden': 'true' })] : []));
        b.setAttribute('aria-label', [squareName(sq), man ? pieceName(man) : '', ball ? 'a ball' : ''].filter(Boolean).join(', '));
        b.dataset.piece = man ? man.kind : '';
        b.toggleAttribute('data-ball', ball);
      });
    },
    dots: (list) => squares.forEach((b, sq) => b.classList.toggle('dot', list.includes(sq))),
    mark: (cls, list) => squares.forEach((b, sq) => b.classList.toggle(cls, list.includes(sq))),
    onTap: (f) => { tap = f; },
  };
}
