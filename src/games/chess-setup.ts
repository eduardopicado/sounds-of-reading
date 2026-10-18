/* Set Up the Board — every piece on its starting square.
 *
 * The board is set out but for one piece, shown above it: tap the square
 * where it goes. The rooks in the corners, the knights beside them, then
 * the bishops; the queen on her own colour and the king beside her; the
 * pawns in a row in front. Then Black's side, which is White's turned
 * round. Once he can do this, he can set up a real game. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { HOME_RULE, SETUP_STEPS, setupQuestion, squareName, type SetupQuestion, type SetupStep } from '../content/chess';
import { mountMaths, type Kit } from './maths-kit';
import { boardView, pieceName, pieceSvg } from './chess-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<SetupStep>({
    id: 'chess-setup',
    title: 'Set Up the',
    swash: 'Board',
    tagline: 'Put each piece on its starting square.',
    steps: SETUP_STEPS,
    face: '🏰',
    cheer: 'Ready to play!',
    build,
  }, root);
}

function build(kit: Kit) {
  const holding = el('div', { class: 'ch-holding' });
  const ask = el('p', { class: 'mx-ask' });
  const board = boardView();
  const node = el('div', { class: 'mx-stage' }, ask, holding, board.node);
  let last: SetupQuestion | undefined;

  return {
    node,
    ask: (step: SetupStep): Promise<boolean> => new Promise((resolve) => {
      const q = setupQuestion(step, last);
      last = q;
      board.dots([]);
      for (const cls of ['hit', 'miss', 'picked']) board.mark(cls, []);
      board.draw(q.board);
      holding.replaceChildren(pieceSvg(q.man));
      node.dataset.answer = squareName(q.answer);
      const name = pieceName(q.man);
      ask.textContent = `Where does the ${name} go? Tap its square.`;
      say(ask.textContent);
      board.onTap(async (sq) => {
        if (q.board.has(sq)) return;
        board.onTap(() => undefined);
        const ok = sq === q.answer;
        const after = new Map(q.board);
        after.set(q.answer, q.man);
        board.draw(after);
        holding.replaceChildren();
        board.mark('hit', [q.answer]);
        if (!ok) board.mark('miss', [sq]);
        const how = `${HOME_RULE[q.man.kind]} The ${name} goes on ${squareName(q.answer)}.`;
        if (ok) sfx.cheer(); else sfx.wrong();
        kit.note(`${ok ? 'Yes! ' : ''}${how}`, ok);
        say(`${ok ? 'Yes! ' : ''}${how}`);
        await kit.wait(ok ? 2000 : 4000);
        resolve(ok);
      });
    }),
  };
}
