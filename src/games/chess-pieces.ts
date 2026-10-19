/* Meet the Pieces — how each chess piece moves, one at a time.
 *
 * The way chess is first taught: one piece alone on the board, and a ball
 * to reach with it. The rook and the bishop first (straight, and on the
 * slant), then the queen who does both, the king's one step, the pawn, and
 * last the knight's jump. Then several balls: which can it reach in one
 * move? Then his own pawns in the way, which nothing but the knight can
 * pass.
 *
 * A miss is never just wrong: every square the piece can reach gets a dot,
 * and the way it moves is said. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { PIECES, PIECE_STEPS, moves, pieceQuestion, type PieceQuestion, type PieceStep } from '../content/chess';
import { mountMaths, type Kit } from './maths-kit';
import { boardView } from './chess-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<PieceStep>({
    id: 'chess-pieces',
    title: 'Meet the',
    swash: 'Pieces',
    tagline: 'How does each chess piece move? Get it to the ball.',
    steps: PIECE_STEPS,
    face: '♟️',
    cheer: 'Good moving!',
    build,
  }, root);
}

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const board = boardView();
  const done = el('button', { class: 'btn mx-go', type: 'button', text: 'Done ✓', hidden: 'hidden' }) as HTMLButtonElement;
  const node = el('div', { class: 'mx-stage' }, ask, board.node, done);
  let last: PieceQuestion | undefined;

  async function finish(ok: boolean, how: string): Promise<boolean> {
    if (ok) sfx.cheer(); else sfx.wrong();
    kit.note(`${ok ? 'Yes! ' : ''}${how}`, ok);
    say(`${ok ? 'Yes! ' : ''}${how}`);
    await kit.wait(ok ? 2200 : 4200);
    return ok;
  }

  /** move the piece to the one ball */
  const reach = (q: PieceQuestion): Promise<boolean> => new Promise((resolve) => {
    const info = PIECES[q.kind];
    ask.textContent = `Move the ${info.name} to the ball.`;
    say(`${ask.textContent} ${info.moves}`);
    board.onTap(async (sq) => {
      if (sq === q.from) return;
      board.onTap(() => undefined);
      const can = moves(q.from, q.board);
      const ok = sq === q.balls[0];
      if (can.includes(sq)) {
        /* it goes where he sent it, ball or not */
        const after = new Map(q.board);
        after.set(sq, after.get(q.from)!);
        after.delete(q.from);
        board.draw(after, ok ? [] : q.balls);
        sfx.tap();
      }
      if (!ok) {
        board.dots(can);
        board.mark('miss', [sq]);
        board.mark('hit', q.balls);
      }
      resolve(await finish(ok, ok ? `The ${info.name} got there.` : `${info.moves} It can go to every square with a dot.`));
    });
  });

  /** tap every ball it can reach, then Done */
  const which = (q: PieceQuestion, step: PieceStep): Promise<boolean> => new Promise((resolve) => {
    const info = PIECES[q.kind];
    const picked = new Set<number>();
    ask.textContent = `Tap every ball the ${info.name} can reach in one move. Then tap Done.`;
    say(ask.textContent);
    done.hidden = false;
    board.onTap((sq) => {
      if (!q.balls.includes(sq)) return;
      sfx.tap();
      if (picked.has(sq)) picked.delete(sq); else picked.add(sq);
      board.mark('picked', [...picked]);
    });
    done.onclick = async () => {
      done.hidden = true;
      board.onTap(() => undefined);
      const ok = q.reach.length === picked.size && q.reach.every((b) => picked.has(b));
      board.mark('picked', []);
      board.dots(moves(q.from, q.board));
      board.mark('hit', q.reach);
      board.mark('miss', [...picked].filter((b) => !q.reach.includes(b)));
      const n = q.reach.length;
      const own = step.task === 'blocked' ? ' It cannot go through its own pawns.' : '';
      resolve(await finish(ok, `${info.moves}${own} It can reach ${n} of the balls.`));
    };
  });

  return {
    node,
    ask: (step: PieceStep): Promise<boolean> => {
      const q = pieceQuestion(step, last);
      last = q;
      done.hidden = true;
      board.dots([]);
      for (const cls of ['hit', 'miss', 'picked']) board.mark(cls, []);
      board.draw(q.board, q.balls);
      node.dataset.answer = q.reach.map((sq) => board.squares[sq].dataset.sq).join(' ');
      node.dataset.piece = q.kind;
      return step.task === 'reach' ? reach(q) : which(q, step);
    },
  };
}
