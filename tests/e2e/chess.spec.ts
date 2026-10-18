/* Chess: Meet the Pieces and Collect the Balls. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, openSetup, seed, watchPage } from './helpers';
import { moves, squareAt, squareName, type Kind } from '../../src/content/chess';

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
    await expect(page.locator('.tiles[data-section="chess"] .tile-link')).toHaveCount(2);
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
