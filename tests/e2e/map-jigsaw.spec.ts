/* Map Jigsaw: drag the continents, and Australia's states, back into place. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, seed, watchPage } from './helpers';
import { CONTINENT_PIECES, STATE_PIECES, SAYS } from '../../src/content/jigsaw';
import { STATES } from '../../src/content/capitals';

async function startAt(page: Page, step: number): Promise<void> {
  await seed(page, { 'maths-step:map-jigsaw': step });
  await openGame(page, 'map-jigsaw');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

/** piece n is up: which one, and where it goes on the screen */
async function waiting(page: Page, n: number): Promise<{ id: string; x: number; y: number }> {
  await expect(page.locator('.score')).toContainText(`Piece ${n}`, { timeout: 8000 });
  const board = page.locator('.jg-board');
  await expect(board).toHaveAttribute('data-piece', /.+/);
  const id = (await board.getAttribute('data-piece'))!;
  const [gx, gy] = (await board.getAttribute('data-goes'))!.split(' ').map(Number);
  const [x, y] = await page.evaluate(([x, y]) => {
    const m = document.querySelector<SVGSVGElement>('.jg-board')!.getScreenCTM()!;
    const pt = new DOMPoint(x, y).matrixTransform(m);
    return [pt.x, pt.y];
  }, [gx, gy]);
  return { id, x, y };
}

/** pick the piece up by its middle and let it go here */
async function drag(page: Page, x: number, y: number): Promise<void> {
  const piece = page.locator('.jg-piece:not(.in)');
  const box = (await piece.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 6 });
  await page.mouse.up();
}

const piece = (id: string) => [...CONTINENT_PIECES, ...STATE_PIECES].find((p) => p.id === id)!;

test.describe('Map Jigsaw', () => {
  test('the seven continents, each dragged into place, to the sticker and the next step', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0);
    await expect(page.locator('.jg-hole')).toHaveCount(7);
    const seen: string[] = [];
    for (let i = 1; i <= 7; i += 1) {
      const p = await waiting(page, i);
      seen.push(p.id);
      await expect(page.locator('.mx-ask')).toHaveText(`Put ${piece(p.id).name.en} on the map.`);
      await drag(page, p.x, p.y);
      await expect(page.locator(`.jg-piece.in[data-piece="${p.id}"]`)).toHaveCount(1);
      await expect(page.locator('.mx-note')).toHaveText(`That is ${piece(p.id).name.en}. ${piece(p.id).facts.map((f) => f.en).join(' ')}`);
      await expect(page.locator(`.jg-hole[data-piece="${p.id}"]`)).toHaveClass(/filled/);
    }
    /* every continent once, the whole puzzle */
    expect(seen.sort()).toEqual(CONTINENT_PIECES.map((x) => x.id).sort());
    await expect(page.locator('.results')).toContainText('7 of 7 in first time', { timeout: 8000 });
    await expect(page.locator('.results')).toContainText('You went up to Continents, on the sea!');
    await expect(page.locator('.results .sticker')).toHaveText('🧩');
    noProblems(watch);
  });

  test('too far and it goes back; twice, and the place it goes glows', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 1);
    const p = await waiting(page, 1);
    const board = (await page.locator('.jg-board').boundingBox())!;
    /* the far corner of the map from where it goes */
    const away = { x: p.x < board.x + board.width / 2 ? board.x + board.width - 20 : board.x + 20, y: board.y + 20 };
    await drag(page, away.x, away.y);
    await expect(page.locator('.mx-note')).toHaveText(SAYS.tryAgain.en);
    await expect(page.locator('.jg-piece.in')).toHaveCount(0);
    await expect(page.locator('.jg-hint')).toHaveCount(0);
    await drag(page, away.x, away.y);
    await expect(page.locator('.mx-note')).toHaveText(SAYS.here.en);
    await expect(page.locator(`.jg-hint[data-piece="${p.id}"]`)).toHaveCount(1);
    await drag(page, p.x, p.y);
    await expect(page.locator(`.jg-piece.in[data-piece="${p.id}"]`)).toHaveCount(1);
    await expect(page.locator('.jg-hint')).toHaveCount(0);
    /* in, but not first time */
    await expect(page.locator('.score')).toContainText('In first time 0');
    noProblems(watch);
  });

  test("Australia's states, with the ACT in New South Wales", async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 2);
    await expect(page.locator('.jg-hole')).toHaveCount(7);
    await expect(page.locator('.jg-hole[data-piece="ACT"]')).toHaveCount(0);
    for (let i = 1; i <= 7; i += 1) {
      const p = await waiting(page, i);
      await drag(page, p.x, p.y);
      await expect(page.locator(`.jg-piece.in[data-piece="${p.id}"]`)).toHaveCount(1);
      if (p.id === 'NSW') {
        const act = STATES.find((s) => s.id === 'ACT')!;
        await expect(page.locator('.mx-note')).toContainText(act.fact);
      }
    }
    await expect(page.locator('.results')).toContainText('7 of 7 in first time', { timeout: 8000 });
    noProblems(watch);
  });

  test('no name: the shape is all he has, and the name comes once it is in', async ({ page }) => {
    await startAt(page, 4);
    const p = await waiting(page, 1);
    await expect(page.locator('.mx-ask')).toHaveText('Where does this piece go?');
    await expect(page.locator('.jg-piece:not(.in)')).toHaveAttribute('aria-label', 'A piece of the map');
    await expect(page.locator('.jg-hole')).toHaveCount(0);
    await drag(page, p.x, p.y);
    await expect(page.locator('.mx-note')).toContainText(`That is ${piece(p.id).name.en}.`);
  });

  test('in Portuguese', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 3);
    const p = await waiting(page, 1);
    await page.getByRole('button', { name: 'Português' }).click();
    await expect(page.locator('.mx-ask')).toHaveText(piece(p.id).ask.pt);
    await drag(page, p.x, p.y);
    await expect(page.locator('.mx-note')).toContainText(piece(p.id).facts[0].pt);
    noProblems(watch);
  });

  for (const [step, map] of [[0, 'the world'], [2, 'Australia']] as const) {
    test(`the map and the tray are both on the screen, ${map}: a piece never has to scroll to its place`, async ({ page }) => {
      await startAt(page, step);
      await waiting(page, 1);
      const tray = (await page.locator('.jg-tray').boundingBox())!;
      const view = page.viewportSize()!;
      expect(tray.y + tray.height).toBeLessThanOrEqual(view.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(view.width);
    });
  }
});
