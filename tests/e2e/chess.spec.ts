/* Chess: Meet the Pieces and Collect the Balls. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, openSetup, seed, watchPage } from './helpers';
import { allMoves, moves, rankOf, squareAt, squareName, type Board, type Kind } from '../../src/content/chess';

async function startAt(page: Page, game: string, step: number): Promise<void> {
  await seed(page, { [`maths-step:${game}`]: step });
  await openGame(page, game);
  await page.getByRole('button', { name: '▶ Start' }).click();
  await expect(page.locator('.ch-sq').first()).toBeVisible();
}

const square = (page: Page, name: string) => page.locator(`.ch-sq[data-sq="${name}"]`);

/** the shortest way round every ball, worked out from the rules the game uses */
function route(kind: Kind, from: string, balls: string[]): string[] {
  const targets = balls.map(squareAt);
  const full = (1 << targets.length) - 1;
  const start = `${squareAt(from)}:0`;
  const back = new Map<string, string | null>([[start, null]]);
  const queue = [start];
  while (queue.length) {
    const state = queue.shift()!;
    const [sq, mask] = state.split(':').map(Number);
    if (mask === full) {
      const path: string[] = [];
      for (let s: string | null = state; s && s !== start; s = back.get(s)!) path.unshift(squareName(Number(s.split(':')[0])));
      return path;
    }
    for (const to of moves(sq, new Map([[sq, { kind, colour: 'w' }]]))) {
      const i = targets.indexOf(to);
      const next = `${to}:${i >= 0 ? mask | (1 << i) : mask}`;
      if (!back.has(next)) { back.set(next, state); queue.push(next); }
    }
  }
  throw new Error('no route');
}

test.describe('Meet the Pieces', () => {
  test('the home screen has a chess section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.tiles-head', { hasText: 'Chess' })).toBeVisible();
    await expect(page.locator('.tiles[data-section="chess"] .tile-link')).toHaveCount(8);
  });

  test('a whole round of moving the piece to the ball, to the sticker', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'chess-pieces');
    await openSetup(page);
    await page.getByLabel('How many questions').selectOption('8');
    await page.getByRole('button', { name: 'Set up this game' }).click();
    await page.getByRole('button', { name: '▶ Start' }).click();
    for (let i = 0; i < 8; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i + 1}`, { timeout: 8000 });
      const ball = (await page.locator('.mx-stage').getAttribute('data-answer'))!;
      await expect(square(page, ball)).toHaveAttribute('data-ball', '');
      await square(page, ball).click();
      await expect(page.locator('.mx-note.good')).toContainText('got there');
      /* the piece is on the ball's square now */
      await expect(square(page, ball)).not.toHaveAttribute('data-piece', '');
    }
    await expect(page.locator('.results')).toContainText('8 of 8', { timeout: 8000 });
    await expect(page.locator('.results .sticker')).toHaveText('♟️');
    noProblems(watch);
  });

  test('a wrong square shows every square the piece can reach, and how it moves', async ({ page }) => {
    await startAt(page, 'chess-pieces', 5);
    await expect(page.locator('.mx-step')).toHaveText('The knight');
    const from = (await page.locator('.ch-sq[data-piece="N"]').getAttribute('data-sq'))!;
    const can = moves(squareAt(from), new Map([[squareAt(from), { kind: 'N', colour: 'w' }]])).map(squareName);
    const wrong = (await page.locator('.ch-sq[data-piece=""]:not([data-ball])').evaluateAll((ns) => ns.map((n) => (n as HTMLElement).dataset.sq)))
      .find((sq) => !can.includes(sq!))!;
    await square(page, wrong).click();
    await expect(page.locator('.ch-sq.dot')).toHaveCount(can.length);
    await expect(square(page, wrong)).toHaveClass(/miss/);
    await expect(page.locator('.mx-note')).toContainText('The knight jumps in an L');
  });

  test('which balls can it reach: tap them, then Done', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 'chess-pieces', 6);
    const answer = ((await page.locator('.mx-stage').getAttribute('data-answer')) ?? '').split(' ');
    expect(answer.length).toBeGreaterThanOrEqual(2);
    for (const sq of answer) await square(page, sq).click();
    await expect(page.locator('.ch-sq.picked')).toHaveCount(answer.length);
    await page.getByRole('button', { name: 'Done ✓' }).click();
    await expect(page.locator('.mx-note.good')).toContainText(`It can reach ${answer.length} of the balls.`);
    noProblems(watch);
  });

  test('something in the way: a ball behind its own pawn is out of reach', async ({ page }) => {
    await startAt(page, 'chess-pieces', 7);
    await expect(page.locator('.ch-sq[data-piece="P"]').first()).toBeVisible();
    /* tap every ball, reachable or not */
    for (const sq of await page.locator('.ch-sq[data-ball]').evaluateAll((ns) => ns.map((n) => (n as HTMLElement).dataset.sq!))) {
      await square(page, sq).click();
    }
    await page.getByRole('button', { name: 'Done ✓' }).click();
    await expect(page.locator('.mx-note')).toContainText('It cannot go through its own pawns.');
    expect(await page.locator('.ch-sq.miss').count()).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Collect the Balls', () => {
  for (const [step, kind] of [[0, 'R'], [4, 'N'], [6, 'Q']] as const) {
    test(`step ${step + 1}: every ball in the fewest moves (${kind})`, async ({ page }) => {
      const watch = watchPage(page);
      await startAt(page, 'chess-balls', step);
      const stage = page.locator('.mx-stage');
      const best = Number(await stage.getAttribute('data-best'));
      const balls = ((await stage.getAttribute('data-balls')) ?? '').split(' ');
      const path = route(kind, (await stage.getAttribute('data-at'))!, balls);
      expect(path).toHaveLength(best);
      await expect(page.locator('.ch-count')).toHaveText(`Moves: 0 · The fewest: ${best}`);
      for (const [i, sq] of path.entries()) {
        await square(page, sq).click();
        if (i < path.length - 1) await expect(page.locator('.ch-count')).toHaveText(`Moves: ${i + 1} · The fewest: ${best}`);
      }
      await expect(page.locator('.mx-note.good')).toContainText('the fewest there are!');
      noProblems(watch);
    });
  }

  test('a square it cannot reach shows where it can go; Start again puts it back', async ({ page }) => {
    await startAt(page, 'chess-balls', 0);
    const stage = page.locator('.mx-stage');
    const from = (await stage.getAttribute('data-at'))!;
    const can = moves(squareAt(from), new Map([[squareAt(from), { kind: 'R', colour: 'w' }]])).map(squareName);
    const balls = ((await stage.getAttribute('data-balls')) ?? '').split(' ');
    const wrong = (await page.locator('.ch-sq').evaluateAll((ns) => ns.map((n) => (n as HTMLElement).dataset.sq!)))
      .find((sq) => sq !== from && !can.includes(sq))!;
    await square(page, wrong).click();
    await expect(page.locator('.ch-sq.dot')).toHaveCount(can.length);
    await expect(page.locator('.ch-count')).toContainText('Moves: 0');
    const step = can.find((sq) => !balls.includes(sq))!;
    await square(page, step).click();
    await expect(page.locator('.ch-count')).toContainText('Moves: 1');
    await expect(stage).toHaveAttribute('data-at', step);
    await page.getByRole('button', { name: '↺ Start again' }).click();
    await expect(page.locator('.ch-count')).toContainText('Moves: 0');
    await expect(stage).toHaveAttribute('data-at', from);
    await page.getByRole('button', { name: '👀 Where can it go?' }).click();
    await expect(page.locator('.ch-sq.dot')).toHaveCount(can.length);
  });
});

test.describe('Capture!', () => {
  test('a whole round of taking the one piece it can, to the sticker', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'chess-capture');
    await openSetup(page);
    await page.getByLabel('How many questions').selectOption('8');
    await page.getByRole('button', { name: 'Set up this game' }).click();
    await page.getByRole('button', { name: '▶ Start' }).click();
    for (let i = 0; i < 8; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i + 1}`, { timeout: 8000 });
      const answer = (await page.locator('.mx-stage').getAttribute('data-answer'))!;
      await square(page, answer).click();
      await expect(page.locator('.mx-note.good')).toContainText('Yes!');
    }
    await expect(page.locator('.results .sticker')).toHaveText('⚔️', { timeout: 8000 });
    noProblems(watch);
  });

  test('taking the guarded piece loses yours: the guard is shown', async ({ page }) => {
    await startAt(page, 'chess-capture', 2);
    const stage = page.locator('.mx-stage');
    const answer = (await stage.getAttribute('data-answer'))!;
    const trap = ((await stage.getAttribute('data-takes')) ?? '').split(' ').find((t) => t !== answer)!;
    await square(page, trap).click();
    await expect(page.locator('.mx-note')).toContainText('is guarded by the pawn');
    await expect(page.locator('.ch-sq.picked')).toHaveCount(1);
    await expect(square(page, trap)).toHaveClass(/miss/);
    await expect(square(page, answer)).toHaveClass(/hit/);
  });

  test('of two free pieces, take the one worth more', async ({ page }) => {
    await startAt(page, 'chess-capture', 3);
    const answer = (await page.locator('.mx-stage').getAttribute('data-answer'))!;
    await square(page, answer).click();
    await expect(page.locator('.mx-note.good')).toContainText(/is worth \d, a \w+ \d: take the/);
  });
});

/** the position on the board, read back from the page */
const position = async (page: Page): Promise<Board> => {
  const text = (await page.locator('.mx-stage').getAttribute('data-position')) ?? '';
  return new Map(text.split(' ').filter(Boolean).map((t) => [squareAt(t.slice(1)), { kind: 'P' as Kind, colour: t[0] as 'w' | 'b' }]));
};

test.describe('Pawn Wars', () => {
  test('a pawn shows where it can go; the computer answers each move', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 'chess-pawns', 0);
    await expect(page.locator('.score')).toContainText('Game 1 of 3');
    await square(page, 'd2').click();
    await expect(page.locator('.ch-sq.dot')).toHaveCount(2);
    /* a square it cannot go to does nothing */
    await square(page, 'd5').click();
    await expect(page.locator('.mx-stage')).toHaveAttribute('data-turn', 'w');
    await square(page, 'd4').click();
    await expect(page.locator('.mx-stage')).toHaveAttribute('data-turn', 'w', { timeout: 4000 });
    const after = await position(page);
    expect(after.get(squareAt('d4'))?.colour).toBe('w');
    /* Black moved one of its pawns off the seventh row */
    expect([...after].filter(([sq, m]) => m.colour === 'b' && rankOf(sq) === 6).length).toBe(2);
    noProblems(watch);
  });

  test('a game is played to the end, and the next one starts', async ({ page }) => {
    await startAt(page, 'chess-pawns', 0);
    for (let turn = 0; turn < 60; turn += 1) {
      if (await page.locator('.mx-note').textContent().then((t) => /You win|The computer/.test(t ?? ''))) break;
      await expect(page.locator('.mx-stage')).toHaveAttribute('data-turn', 'w', { timeout: 4000 });
      if (await page.locator('.mx-note').textContent().then((t) => /You win|The computer/.test(t ?? ''))) break;
      const b = await position(page);
      const options = allMoves(b, 'w');
      if (!options.length) break;
      /* a pawn that can get through, or take, or else the one furthest up */
      const best = options.find((m) => rankOf(m.to) === 7) ?? options.find((m) => b.get(m.to)) ??
        [...options].sort((x, y) => rankOf(y.to) - rankOf(x.to))[0];
      await square(page, squareName(best.from)).click();
      await square(page, squareName(best.to)).click();
    }
    await expect(page.locator('.mx-note')).toContainText(/You win|The computer/, { timeout: 4000 });
    await expect(page.locator('.score')).toContainText('Game 2 of 3', { timeout: 8000 });
  });
});

test.describe('Board Squares', () => {
  test('a whole round of finding squares, to the sticker', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'chess-squares');
    await openSetup(page);
    await page.getByLabel('How many questions').selectOption('8');
    await page.getByRole('button', { name: 'Set up this game' }).click();
    await page.getByRole('button', { name: '▶ Start' }).click();
    for (let i = 0; i < 8; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i + 1}`, { timeout: 8000 });
      const answer = (await page.locator('.mx-stage').getAttribute('data-answer'))!;
      if (await page.locator('.mx-choice').count()) await page.locator(`.mx-choice[data-n="${answer}"]`).click();
      else {
        await expect(page.locator('.mx-ask')).toHaveText(`Tap ${answer}.`);
        await square(page, answer).click();
      }
      await expect(page.locator('.mx-note.good')).toContainText(`${answer}: along the letters to ${answer[0]}, then up the numbers to ${answer[1]}.`);
    }
    await expect(page.locator('.results .sticker')).toHaveText('🔡', { timeout: 8000 });
    noProblems(watch);
  });

  test('a wrong square lights up the way to the right one', async ({ page }) => {
    await startAt(page, 'chess-squares', 0);
    const answer = (await page.locator('.mx-stage').getAttribute('data-answer'))!;
    const wrong = answer === 'a1' ? 'b2' : 'a1';
    await square(page, wrong).click();
    await expect(page.locator('.mx-note')).toContainText(`That's ${wrong}.`);
    await expect(square(page, answer)).toHaveClass(/hit/);
    expect(await page.locator('.ch-sq.picked').count()).toBeGreaterThanOrEqual(1);
  });

  test('names the square the ball is on', async ({ page }) => {
    await startAt(page, 'chess-squares', 1);
    await expect(page.locator('.mx-choice')).toHaveCount(4, { timeout: 8000 });
    const answer = (await page.locator('.mx-stage').getAttribute('data-answer'))!;
    await expect(square(page, answer)).toHaveAttribute('data-ball', '');
    await page.locator(`.mx-choice[data-n="${answer}"]`).click();
    await expect(page.locator('.mx-note.good')).toBeVisible();
  });

  test('finds a square with no letters or numbers, which come back after', async ({ page }) => {
    await startAt(page, 'chess-squares', 2);
    await expect(page.locator('.ch-files')).toBeHidden();
    const answer = (await page.locator('.mx-stage').getAttribute('data-answer'))!;
    await square(page, answer).click();
    await expect(page.locator('.ch-files')).toBeVisible();
    await expect(page.locator('.mx-note.good')).toBeVisible();
  });

  test('says whether a square is light or dark', async ({ page }) => {
    await startAt(page, 'chess-squares', 3);
    await expect(page.locator('.mx-choice')).toHaveText(['Light', 'Dark'], { timeout: 8000 });
    const answer = (await page.locator('.mx-stage').getAttribute('data-answer'))!;
    await page.locator(`.mx-choice:not([data-n="${answer}"])`).click();
    await expect(page.locator('.mx-note')).toContainText('a1, in the corner on your left, is always dark');
  });
});

test.describe('Set Up the Board', () => {
  test('a whole round of putting pieces on their squares, to the sticker', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'chess-setup');
    await openSetup(page);
    await page.getByLabel('How many questions').selectOption('8');
    await page.getByRole('button', { name: 'Set up this game' }).click();
    await page.getByRole('button', { name: '▶ Start' }).click();
    for (let i = 0; i < 8; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i + 1}`, { timeout: 8000 });
      await expect(page.locator('.ch-holding .ch-piece')).toBeVisible();
      await expect(page.locator('.ch-sq[data-piece]:not([data-piece=""])')).toHaveCount(31);
      const answer = (await page.locator('.mx-stage').getAttribute('data-answer'))!;
      await square(page, answer).click();
      await expect(page.locator('.mx-note.good')).toContainText(`goes on ${answer}.`);
    }
    await expect(page.locator('.results .sticker')).toHaveText('🏰', { timeout: 8000 });
    noProblems(watch);
  });

  test('the queen on her own colour; a wrong square is shown and the rule said', async ({ page }) => {
    await startAt(page, 'chess-setup', 1);
    const answer = (await page.locator('.mx-stage').getAttribute('data-answer'))!;
    expect(['d1', 'e1']).toContain(answer);
    /* an empty square in the middle of the board */
    await square(page, 'e4').click();
    await expect(page.locator('.mx-note')).toContainText(`goes on ${answer}.`);
    await expect(square(page, 'e4')).toHaveClass(/miss/);
    await expect(square(page, answer)).toHaveClass(/hit/);
  });
});

test.describe('Check!', () => {
  test('is it check: yes or no, with the attacker shown', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 'chess-check', 0);
    await expect(page.locator('.mx-choice')).toHaveText(['Yes', 'No'], { timeout: 8000 });
    const answer = (await page.locator('.mx-stage').getAttribute('data-answer'))!;
    await page.locator(`.mx-choice[data-n="${answer}"]`).click();
    await expect(page.locator('.mx-note.good')).toContainText(answer === 'Yes' ? 'can take the king' : 'no black piece can reach');
    if (answer === 'Yes') expect(await page.locator('.ch-sq.dot').count()).toBeGreaterThan(0);
    noProblems(watch);
  });

  test('tap the piece giving check', async ({ page }) => {
    await startAt(page, 'chess-check', 1);
    const answer = (await page.locator('.mx-stage').getAttribute('data-answer'))!;
    await square(page, answer).click();
    await expect(page.locator('.mx-note.good')).toContainText('gives check: it can reach the king.');
  });

  test('get the king out: a safe square works, an attacked one is shown', async ({ page }) => {
    await startAt(page, 'chess-check', 2);
    const stage = page.locator('.mx-stage');
    const safe = ((await stage.getAttribute('data-answer')) ?? '').split(' ');
    await square(page, safe[0]).click();
    await expect(page.locator('.mx-note.good')).toContainText('The king is safe there.');
    await expect(square(page, safe[0])).toHaveAttribute('data-piece', 'K');
    await expect(page.locator('.score')).toContainText('Question 2', { timeout: 8000 });
    /* now a square next to the king that is not safe */
    const king = (await stage.getAttribute('data-king'))!;
    const answer = ((await stage.getAttribute('data-answer')) ?? '').split(' ');
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]
      .map(([f, r]) => String.fromCharCode(king.charCodeAt(0) + f) + (Number(king[1]) + r))
      .filter((sq) => /^[a-h][1-8]$/.test(sq) && !answer.includes(sq));
    const free = [];
    for (const sq of near) if ((await square(page, sq).getAttribute('data-piece')) !== 'K' && !(await square(page, sq).getAttribute('aria-label'))!.includes('white')) free.push(sq);
    await square(page, free[0]).click();
    await expect(page.locator('.mx-note')).toContainText('The safe squares are ringed.');
    expect(await page.locator('.ch-sq.hit').count()).toBe(answer.length);
  });
});

test.describe('Mate in One', () => {
  for (const step of [0, 1, 2]) {
    test(`step ${step + 1}: the mating move wins`, async ({ page }) => {
      const watch = watchPage(page);
      await startAt(page, 'chess-mate', step);
      const [mate] = ((await page.locator('.mx-stage').getAttribute('data-mates')) ?? '').split(' ');
      const [from, to] = mate.split('-');
      await square(page, from).click();
      await expect(square(page, from)).toHaveClass(/picked/);
      expect(await page.locator('.ch-sq.dot').count()).toBeGreaterThan(0);
      await square(page, to).click();
      await expect(page.locator('.mx-note.good')).toContainText('Checkmate!');
      noProblems(watch);
    });
  }

  test('a move that is not mate says why, and shows the mate', async ({ page }) => {
    await startAt(page, 'chess-mate', 0);
    const stage = page.locator('.mx-stage');
    const mates = ((await stage.getAttribute('data-mates')) ?? '').split(' ');
    /* the white king's move is never the mate in these puzzles */
    const king = (await page.locator('.ch-sq[data-piece="K"]').evaluateAll((ns) =>
      ns.filter((n) => (n.getAttribute('aria-label') ?? '').includes('white king')).map((n) => (n as HTMLElement).dataset.sq)))[0]!;
    await square(page, king).click();
    const dots = await page.locator('.ch-sq.dot').evaluateAll((ns) => ns.map((n) => (n as HTMLElement).dataset.sq!));
    const to = dots.find((sq) => !mates.includes(`${king}-${sq}`))!;
    await square(page, to).click();
    await expect(page.locator('.mx-note')).toContainText('The checkmate is the');
    await expect(page.locator('.mx-note')).toContainText(mates[0].split('-')[1]);
  });
});
