/* Capture! — taking the other side's pieces.
 *
 * Once he knows how the pieces move: the same moves take a piece, by
 * landing on it. First which black piece his can take (only one can); then
 * the knight, the king and the pawn, which take differently — the pawn on
 * the slant, never straight ahead. Then two he could take, one guarded by
 * a pawn: take the free one, or lose your piece. Then two free ones: take
 * the one worth more (a pawn 1, a knight or bishop 3, a rook 5, a queen 9). */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import {
  CAPTURE_STEPS, PIECES, VALUE, attacks, captureQuestion, moves, squareName, type CaptureQuestion, type CaptureStep,
} from '../content/chess';
import { mountMaths, type Kit } from './maths-kit';
import { boardView } from './chess-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<CaptureStep>({
    id: 'chess-capture',
    title: '',
    swash: 'Capture!',
    tagline: 'Take a black piece by landing on it. Which one can you take?',
    steps: CAPTURE_STEPS,
    face: '⚔️',
    cheer: 'Good taking!',
    build,
  }, root);
}

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const board = boardView();
  const node = el('div', { class: 'mx-stage' }, ask, board.node);
  let last: CaptureQuestion | undefined;

  return {
    node,
    ask: (step: CaptureStep): Promise<boolean> => new Promise((resolve) => {
      const q = captureQuestion(step, last);
      last = q;
      const mine = PIECES[q.kind].name;
      const name = (sq: number): string => PIECES[q.board.get(sq)!.kind].name;
      board.dots([]);
      for (const cls of ['hit', 'miss', 'picked']) board.mark(cls, []);
      board.draw(q.board);
      node.dataset.answer = squareName(q.answer);
      node.dataset.takes = q.takes.map(squareName).join(' ');
      ask.textContent = step.task === 'take' ? `Which black piece can your ${mine} take?`
        : step.task === 'free' ? `Your ${mine} can take two pieces. One is guarded. Take the free one.`
          : `Your ${mine} can take two pieces. Take the one worth more.`;
      say(ask.textContent);

      board.onTap(async (sq) => {
        if (q.board.get(sq)?.colour !== 'b') return;
        board.onTap(() => undefined);
        const ok = sq === q.answer;
        if (q.takes.includes(sq)) {
          /* it takes what he chose, right or not */
          const after = new Map(q.board);
          after.set(sq, after.get(q.from)!);
          after.delete(q.from);
          board.draw(after);
          sfx.take();
        }
        board.mark('hit', [q.answer]);
        if (!ok) board.mark('miss', [sq]);
        let how: string;
        if (step.task === 'take') {
          board.dots(moves(q.from, q.board));
          how = ok ? `Your ${mine} takes the ${name(sq)}.`
            : `${PIECES[q.kind].moves} It can only land on the ${name(q.answer)}.`;
        } else if (step.task === 'free') {
          board.mark('picked', [q.guard!]);
          const trap = name(q.trap!);
          how = ok ? `The ${name(q.answer)} was free. The ${trap} was guarded by a pawn.`
            : `The ${trap} is guarded by the pawn: take it, and the pawn takes your ${mine} back. The ${name(q.answer)} was free.`;
          if (!ok) board.dots(attacks(q.guard!, q.board));
        } else {
          const other = q.takes.find((t) => t !== q.answer)!;
          how = `A ${name(q.answer)} is worth ${VALUE[q.board.get(q.answer)!.kind]}, a ${name(other)} ${VALUE[q.board.get(other)!.kind]}: take the ${name(q.answer)}.`;
        }
        if (ok) sfx.cheer(); else sfx.wrong();
        kit.note(`${ok ? 'Yes! ' : ''}${how}`, ok);
        say(`${ok ? 'Yes! ' : ''}${how}`);
        await kit.wait(ok ? 2400 : 4200);
        resolve(ok);
      });
    }),
  };
}
