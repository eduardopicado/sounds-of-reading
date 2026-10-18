/* Pawn Wars — the first real game of chess: pawns only.
 *
 * His white pawns against the computer's black ones. The first pawn to
 * reach the far end wins; so does taking every pawn the other side has,
 * or leaving it with no move. It is how chess teachers start real games:
 * every pawn rule (one forward, two from the start, taking on the slant)
 * and the first plans — a pawn nobody can stop, a pawn that guards another.
 *
 * He taps a pawn to see where it can go, then the square. The computer
 * starts by taking whatever it sees, and gets more careful up the steps. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import {
  PAWN_STEPS, computerMove, moves, pawnStart, play, rankOf, squareName, winner,
  type Board, type PawnStep,
} from '../content/chess';
import { mountMaths, type Kit } from './maths-kit';
import { boardView } from './chess-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<PawnStep>({
    id: 'chess-pawns',
    title: 'Pawn',
    swash: 'Wars',
    tagline: 'Pawns only: get one of yours to the other end first!',
    steps: PAWN_STEPS,
    face: '🏁',
    cheer: 'Good game!',
    counts: 'Games won',
    unit: 'Game',
    lengths: [3, 1, 5],
    build,
  }, root);
}

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const turn = el('p', { class: 'ch-count', 'aria-live': 'polite' });
  const board = boardView();
  const node = el('div', { class: 'mx-stage' }, ask, turn, board.node);

  return {
    node,
    ask: (step: PawnStep): Promise<boolean> => new Promise((resolve) => {
      let pos: Board = pawnStart(step);
      let picked: number | null = null;
      let mine = true;
      ask.textContent = 'Get a pawn to the other end. Tap a pawn, then where it goes.';
      say('Pawn Wars! Get one of your pawns to the other end before the computer does.');
      const show = (): void => {
        board.draw(pos);
        board.dots(picked === null ? [] : moves(picked, pos));
        board.mark('picked', picked === null ? [] : [picked]);
        turn.textContent = mine ? 'Your move' : 'The computer is thinking…';
        node.dataset.turn = mine ? 'w' : 'b';
        node.dataset.position = [...pos].map(([sq, m]) => `${m.colour}${squareName(sq)}`).sort().join(' ');
      };
      board.mark('miss', []);
      board.mark('hit', []);
      show();

      const over = async (won: boolean): Promise<void> => {
        board.onTap(() => undefined);
        const reached = [...pos].find(([sq, m]) => (m.colour === 'w' ? rankOf(sq) === 7 : rankOf(sq) === 0));
        if (reached) board.mark(won ? 'hit' : 'miss', [reached[0]]);
        const text = won
          ? (reached ? 'You win! Your pawn got to the end.' : 'You win! The computer has no pawns left to move.')
          : (reached ? 'The computer\'s pawn got through. Watch for a pawn that nothing can stop.'
            : 'The computer wins: you have no pawn that can move.');
        if (won) sfx.cheer(); else sfx.wrong();
        kit.note(text, won);
        say(text);
        await kit.wait(3200);
        resolve(won);
      };

      board.onTap(async (sq) => {
        if (!mine) return;
        const man = pos.get(sq);
        if (man?.colour === 'w') {
          sfx.tap();
          picked = picked === sq ? null : sq;
          show();
          return;
        }
        if (picked === null || !moves(picked, pos).includes(sq)) return;
        const took = pos.has(sq);
        pos = play(pos, { from: picked, to: sq });
        picked = null;
        mine = false;
        if (took) sfx.take(); else sfx.move();
        show();
        const first = winner(pos, 'b');
        if (first) { void over(first === 'w'); return; }
        await kit.wait(700);
        const reply = computerMove(pos, step.smart);
        if (reply && pos.has(reply.to)) sfx.take(); else sfx.move();
        if (reply) pos = play(pos, reply);
        mine = true;
        show();
        if (reply) board.mark('hit', [reply.to]);
        const then = winner(pos, 'w');
        if (then) void over(then === 'w');
      });
    }),
  };
}
