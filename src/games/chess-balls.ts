/* Collect the Balls — one chess piece, every ball, as few moves as you can.
 *
 * Once he knows how a piece moves, the next thing is to plan with it: the
 * rook takes two moves to reach a ball that is not on its lines, the bishop
 * only ever reaches its own colour, and the knight's jumps take some
 * working out. Every ball he lands on is collected; the round counts a ball
 * collection done in the fewest moves there are as right first time, and
 * says what the fewest was when it took more.
 *
 * A tap on a square the piece cannot reach does nothing but show, with
 * dots, where it can go; Start again puts everything back. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { BALL_STEPS, PIECES, ballQuestion, moves, type BallQuestion, type BallStep, type Board } from '../content/chess';
import { mountMaths, type Kit } from './maths-kit';
import { boardView } from './chess-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<BallStep>({
    id: 'chess-balls',
    title: 'Collect the',
    swash: 'Balls',
    tagline: 'One chess piece, every ball, in as few moves as you can.',
    steps: BALL_STEPS,
    face: '🐴',
    cheer: 'Good planning!',
    counts: 'Fewest moves',
    build,
  }, root);
}

const plural = (n: number, one: string): string => `${n} ${one}${n === 1 ? '' : 's'}`;

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const count = el('p', { class: 'ch-count', 'aria-live': 'polite' });
  const board = boardView();
  const help = el('button', { class: 'btn ghost small', type: 'button', text: '👀 Where can it go?' });
  const again = el('button', { class: 'btn ghost small', type: 'button', text: '↺ Start again' });
  const node = el('div', { class: 'mx-stage' }, ask, count, board.node, el('div', { class: 'row ch-tools' }, help, again));
  let last: BallQuestion | undefined;

  return {
    node,
    ask: (step: BallStep): Promise<boolean> => new Promise((resolve) => {
      const q = ballQuestion(step, last);
      last = q;
      const info = PIECES[q.kind];
      let at = q.from;
      let left = [...q.balls];
      let used = 0;
      let busy = false;
      const man = { kind: q.kind, colour: 'w' as const };
      const show = (): void => {
        const b: Board = new Map([[at, man]]);
        board.draw(b, left);
        board.dots([]);
        board.mark('miss', []);
        count.textContent = `Moves: ${used} · The fewest: ${q.best}`;
        node.dataset.at = board.squares[at].dataset.sq;
      };
      const reset = (): void => { at = q.from; left = [...q.balls]; used = 0; show(); };
      node.dataset.best = String(q.best);
      node.dataset.balls = q.balls.map((sq) => board.squares[sq].dataset.sq).join(' ');
      ask.textContent = `Collect every ball with the ${info.name}.`;
      say(`${ask.textContent} ${info.moves}`);
      help.onclick = () => board.dots(moves(at, new Map([[at, man]])));
      again.onclick = () => { if (!busy) { sfx.tap(); reset(); } };
      reset();

      board.onTap(async (sq) => {
        if (busy || sq === at) return;
        const can = moves(at, new Map([[at, man]]));
        if (!can.includes(sq)) {
          /* not a move: where it can go, for a moment */
          sfx.wrong();
          board.dots(can);
          board.mark('miss', [sq]);
          kit.life.later(() => { board.dots([]); board.mark('miss', []); }, 1400);
          return;
        }
        at = sq;
        used += 1;
        const got = left.includes(sq);
        left = left.filter((b) => b !== sq);
        sfx.tap();
        if (got) sfx.right();
        show();
        if (left.length) return;
        busy = true;
        board.onTap(() => undefined);
        const ok = used <= q.best;
        if (ok) sfx.cheer();
        const text = ok ? `Every ball in ${plural(used, 'move')}: the fewest there are!`
          : `Every ball in ${plural(used, 'move')}. It can be done in ${q.best}.`;
        kit.note(ok ? `Yes! ${text}` : text, ok);
        say(text);
        await kit.wait(ok ? 2200 : 3200);
        resolve(ok);
      });
    }),
  };
}
