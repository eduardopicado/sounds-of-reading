/* Mate in One — win the game in one move.
 *
 * Checkmate: the king is in check and has no way out. White to move: find
 * the move that does it. The puzzles are the first mates children learn:
 * the back row (the king shut in by his own pawns), the queen next to the
 * king with her own king guarding her, and two rooks up the board. Tap a
 * white piece to see where it can go, then its square. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import {
  MATE_STEPS, PIECES, checkQuestion, inCheck, kingOf, legalAll, legalMoves, play, squareName,
  type CheckQuestion, type CheckStep,
} from '../content/chess';
import { mountMaths, type Kit } from './maths-kit';
import { boardView } from './chess-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<CheckStep>({
    id: 'chess-mate',
    title: 'Mate in',
    swash: 'One',
    tagline: 'White to move: checkmate in one move!',
    steps: MATE_STEPS,
    face: '🏆',
    cheer: 'Good hunting!',
    build,
  }, root);
}

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const board = boardView();
  const node = el('div', { class: 'mx-stage' }, ask, board.node);
  let last: CheckQuestion | undefined;

  return {
    node,
    ask: (step: CheckStep): Promise<boolean> => new Promise((resolve) => {
      const q = checkQuestion(step, last);
      last = q;
      let picked: number | null = null;
      board.dots([]);
      for (const cls of ['hit', 'miss', 'picked']) board.mark(cls, []);
      board.draw(q.board);
      node.dataset.mates = q.mates.map((m) => `${squareName(m.from)}-${squareName(m.to)}`).join(' ');
      ask.textContent = 'White to move. Find the checkmate!';
      say('White to move. Find the move that checkmates the black king.');

      board.onTap(async (sq) => {
        const man = q.board.get(sq);
        if (man?.colour === 'w') {
          sfx.tap();
          picked = picked === sq ? null : sq;
          board.mark('picked', picked === null ? [] : [picked]);
          board.dots(picked === null ? [] : legalMoves(picked, q.board));
          return;
        }
        if (picked === null || !legalMoves(picked, q.board).includes(sq)) return;
        board.onTap(() => undefined);
        const move = { from: picked, to: sq };
        const after = play(q.board, move);
        board.dots([]);
        board.mark('picked', []);
        board.draw(after);
        const ok = q.mates.some((m) => m.from === move.from && m.to === move.to);
        const piece = PIECES[q.board.get(move.from)!.kind].name;
        let how: string;
        if (ok) how = `Checkmate! The ${piece} gives check, and the black king has nowhere to go.`;
        else {
          const escape = legalAll('b', after).find((m) => m.from === kingOf('b', after));
          const why = inCheck('b', after)
            ? `That is check, but the king can get out of it${escape ? `, to ${squareName(escape.to)}` : ''}.`
            : 'That is not check.';
          const mate = q.mates[0];
          how = `${why} The checkmate is the ${PIECES[q.board.get(mate.from)!.kind].name} to ${squareName(mate.to)}.`;
          board.mark('miss', [sq]);
          board.mark('hit', [mate.from, mate.to]);
        }
        if (ok) { sfx.cheer(); board.mark('hit', [kingOf('b', after)!]); } else sfx.wrong();
        kit.note(how, ok);
        say(how);
        await kit.wait(ok ? 2600 : 5200);
        resolve(ok);
      });
    }),
  };
}
