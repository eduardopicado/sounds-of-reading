/* Board Squares — every square has a name: e4.
 *
 * The letter along the bottom, then the number up the side, like a grid
 * reference on Coach's Whiteboard. He finds a square, then names the one the
 * ball is on (the slips offered are the letter or the number one out), then
 * finds squares with the letters and numbers taken away, and last says
 * whether a square is light or dark — a1, in the corner on his left, is
 * always dark. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { SQUARE_STEPS, fileOf, rankOf, squareAt, squareName, squareQuestion, type SquareQuestion, type SquareStep } from '../content/chess';
import { mountMaths, type Kit } from './maths-kit';
import { boardView } from './chess-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<SquareStep>({
    id: 'chess-squares',
    title: 'Board',
    swash: 'Squares',
    tagline: 'Every square has a name: a letter, then a number. Find e4!',
    steps: SQUARE_STEPS,
    face: '🔡',
    cheer: 'Good finding!',
    build,
  }, root);
}

/** "e4": e along the bottom, then up to 4 */
const howTo = (name: string): string => `${name}: along the letters to ${name[0]}, then up the numbers to ${name[1]}.`;

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const board = boardView();
  const node = el('div', { class: 'mx-stage' }, ask, board.node);
  let last: SquareQuestion | undefined;

  async function finish(ok: boolean, how: string): Promise<boolean> {
    if (ok) sfx.cheer(); else sfx.wrong();
    kit.note(`${ok ? 'Yes! ' : ''}${how}`, ok);
    say(`${ok ? 'Yes! ' : ''}${how}`);
    await kit.wait(ok ? 2000 : 3800);
    return ok;
  }

  /** light up the file and the rank, to where they meet */
  const lines = (sq: number): void => {
    const path = Array.from({ length: 64 }, (_, i) => i).filter((i) =>
      (rankOf(i) === 0 && fileOf(i) <= fileOf(sq)) || (fileOf(i) === fileOf(sq) && rankOf(i) <= rankOf(sq)));
    board.mark('picked', path);
    board.mark('hit', [sq]);
  };

  return {
    node,
    ask: async (step: SquareStep): Promise<boolean> => {
      const q = squareQuestion(step, last);
      last = q;
      board.dots([]);
      for (const cls of ['hit', 'miss', 'picked']) board.mark(cls, []);
      board.labels(step.task !== 'blind');
      node.dataset.answer = q.answer;
      if (step.task === 'name') {
        board.draw(new Map(), [q.sq]);
        ask.textContent = 'Which square is the ball on?';
        say(ask.textContent);
        const picked = await kit.choices.askWords(q.options);
        kit.choices.revealWord(q.answer, picked);
        lines(q.sq);
        return finish(picked === q.answer, howTo(q.answer));
      }
      if (step.task === 'colour') {
        board.draw(new Map(), [q.sq]);
        ask.textContent = `Is ${squareName(q.sq)}, where the ball is, a light square or a dark one?`;
        say(ask.textContent);
        const picked = await kit.choices.askWords(q.options);
        kit.choices.revealWord(q.answer, picked);
        board.mark('hit', [q.sq, squareAt('a1')]);
        return finish(picked === q.answer, `${squareName(q.sq)} is ${q.answer.toLowerCase()}. a1, in the corner on your left, is always dark, and the colours take turns from there.`);
      }
      board.draw(new Map());
      ask.textContent = `Tap ${q.answer}.`;
      say(`Tap ${q.answer[0]} ${q.answer[1]}.`);
      return new Promise((resolve) => {
        board.onTap(async (sq) => {
          board.onTap(() => undefined);
          const ok = squareName(sq) === q.answer;
          if (!ok) board.mark('miss', [sq]);
          board.labels(true);
          lines(q.sq);
          resolve(await finish(ok, ok ? howTo(q.answer)
            : `That's ${squareName(sq)}. ${howTo(q.answer)}`));
        });
      });
    },
  };
}

