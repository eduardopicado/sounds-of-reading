/* Check! — when the king is attacked.
 *
 * The rule every chess game turns on: a king may never be left where it
 * could be taken. First, is the white king in check — can a black piece
 * reach it? Then which piece gives the check. Then get him out of it: tap a
 * square the king can go to where nothing attacks him. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import {
  CHECK_STEPS, PIECES, attacks, checkQuestion, kingOf, moves, squareName, type CheckQuestion, type CheckStep,
} from '../content/chess';
import { mountMaths, type Kit } from './maths-kit';
import { boardView } from './chess-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<CheckStep>({
    id: 'chess-check',
    title: '',
    swash: 'Check!',
    tagline: 'Is the king attacked? Then get him out of it.',
    steps: CHECK_STEPS,
    face: '👑',
    cheer: 'Good looking!',
    build,
  }, root);
}

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const board = boardView();
  const node = el('div', { class: 'mx-stage' }, ask, board.node);
  let last: CheckQuestion | undefined;

  async function finish(ok: boolean, how: string): Promise<boolean> {
    if (ok) sfx.cheer(); else sfx.wrong();
    kit.note(`${ok ? 'Yes! ' : ''}${how}`, ok);
    say(`${ok ? 'Yes! ' : ''}${how}`);
    await kit.wait(ok ? 2200 : 4200);
    return ok;
  }

  const nameAt = (q: CheckQuestion, sq: number): string => PIECES[q.board.get(sq)!.kind].name;

  return {
    node,
    ask: async (step: CheckStep): Promise<boolean> => {
      const q = checkQuestion(step, last);
      last = q;
      const king = kingOf('w', q.board)!;
      board.dots([]);
      for (const cls of ['hit', 'miss', 'picked']) board.mark(cls, []);
      board.draw(q.board);
      node.dataset.answer = q.answer.map(squareName).join(' ');
      node.dataset.king = squareName(king);

      if (step.task === 'is') {
        ask.textContent = 'Is the white king in check? Can a black piece take him?';
        say(ask.textContent);
        const answer = q.check ? 'Yes' : 'No';
        node.dataset.answer = answer;
        const picked = await kit.choices.askWords(['Yes', 'No']);
        kit.choices.revealWord(answer, picked);
        board.mark('picked', [king]);
        if (q.check) {
          board.mark('hit', q.answer);
          board.dots(attacks(q.answer[0], q.board));
        }
        return finish(picked === answer, q.check
          ? `Check: the black ${nameAt(q, q.answer[0])} can take the king. Every dot is a square it attacks.`
          : 'No check: no black piece can reach the white king.');
      }

      if (step.task === 'which') {
        ask.textContent = 'The white king is in check. Tap the black piece giving check.';
        say(ask.textContent);
        return new Promise((resolve) => {
          board.onTap(async (sq) => {
            if (q.board.get(sq)?.colour !== 'b') return;
            board.onTap(() => undefined);
            const ok = q.answer.includes(sq);
            board.mark('hit', q.answer);
            board.mark('picked', [king]);
            board.dots(attacks(q.answer[0], q.board));
            if (!ok) board.mark('miss', [sq]);
            resolve(await finish(ok, `The ${nameAt(q, q.answer[0])} gives check: it can reach the king.`));
          });
        });
      }

      /* escape: a square the king can go to that nothing attacks */
      ask.textContent = 'The white king is in check. Move him to a safe square.';
      say(ask.textContent);
      board.mark('picked', [king]);
      return new Promise((resolve) => {
        board.onTap(async (sq) => {
          if (sq === king || q.board.get(sq)?.colour === 'w') return;
          board.onTap(() => undefined);
          const ok = q.answer.includes(sq);
          const step1 = moves(king, q.board).includes(sq);
          if (ok) {
            const after = new Map(q.board);
            after.set(sq, after.get(king)!);
            after.delete(king);
            board.draw(after);
          } else board.mark('miss', [sq]);
          board.mark('hit', q.answer);
          resolve(await finish(ok, ok ? 'The king is safe there.'
            : step1 ? 'That square is attacked too: the king would still be in check. The safe squares are ringed.'
              : 'The king moves one square. The safe squares are ringed.'));
        });
      });
    },
  };
}
