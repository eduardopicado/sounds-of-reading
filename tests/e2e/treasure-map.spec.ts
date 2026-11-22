/* Treasure Map: the key, the squares, the compass, and the treasure. */

import { expect, test, type Page } from '@playwright/test';
import { expectTapTargets, noProblems, openGame, seed, watchPage } from './helpers';
import { THINGS } from '../../src/content/treasure';

async function startAt(page: Page, step: number): Promise<void> {
  await seed(page, { 'maths-step:treasure-map': step });
  await openGame(page, 'treasure-map');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

/** question n is up: what it wants, and how it is answered */
async function wanted(page: Page, n: number): Promise<{ answer: string; task: string }> {
  await expect(page.locator('.score')).toContainText(`Question ${n}`, { timeout: 8000 });
  const stage = page.locator('.tm-stage');
  await expect(stage).toHaveAttribute('data-answer', /.+/);
  return { answer: (await stage.getAttribute('data-answer'))!, task: (await stage.getAttribute('data-task'))! };
}

/** answer it right: a square on the map, or a button */
async function answer(page: Page, q: { answer: string; task: string }): Promise<void> {
  if (['which', 'way', 'scale'].includes(q.task)) await page.locator(`.mx-choice[data-n="${q.answer}"]`).click();
  else await page.locator(`.tm-cell[data-sq="${q.answer}"]`).click();
}

test.describe('Treasure Map', () => {
  test('a whole round finding things with the key, to the sticker', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0);
    /* letters across, numbers down, a key and a compass */
    await expect(page.locator('.tm-head')).toHaveText(['A', 'B', 'C', 'D', 'E', '1', '2', '3', '4', '5']);
    await expect(page.locator('.tm-cell')).toHaveCount(25);
    await expect(page.locator('.tm-key li')).toHaveCount(6);
    await expect(page.locator('.tm-compass .tm-n')).toHaveText('N');
    /* three right in a row climbs a step: the key, then left and right, then the squares */
    const steps = ['key', 'key', 'key', 'side', 'side', 'side', 'square', 'square'];
    for (let i = 1; i <= 8; i += 1) {
      const q = await wanted(page, i);
      expect(q.task).toBe(steps[i - 1]);
      const cell = page.locator(`.tm-cell[data-sq="${q.answer}"]`);
      /* the thing on the square asked for, if any */
      const word = (await cell.getAttribute('aria-label'))!.split(', ')[1];
      if (q.task === 'key') await expect(page.locator('.mx-ask')).toHaveText(`Tap the ${word}.`);
      if (q.task === 'side') await expect(page.locator('.mx-ask')).toHaveText(/^What is (to the (left|right) of|above|below) the \w+\?$/);
      if (q.task === 'square') await expect(page.locator('.mx-ask')).toHaveText(`Tap square ${q.answer}.`);
      await answer(page, q);
      await expect(page.locator('.mx-note')).toHaveText(q.task === 'square' ? `Yes! That is square ${q.answer}.` : `Yes! That is the ${word}.`);
      await expect(cell).toHaveClass(/right/);
    }
    await expect(page.locator('.results .sticker')).toHaveText('💎', { timeout: 8000 });
    noProblems(watch);
  });

  test('a wrong square says what he tapped, and shows where the right one is', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 2);
    const q = await wanted(page, 1);
    expect(await page.locator('.mx-ask').textContent()).toBe(`Tap square ${q.answer}.`);
    const other = q.answer === 'A1' ? 'B2' : 'A1';
    await page.locator(`.tm-cell[data-sq="${other}"]`).click();
    await expect(page.locator('.mx-note')).toHaveText(`That is square ${other}. Square ${q.answer} is here.`);
    await expect(page.locator(`.tm-cell[data-sq="${q.answer}"]`)).toHaveClass(/right/);
    await expect(page.locator(`.tm-cell[data-sq="${other}"]`)).toHaveClass(/wrong/);
    /* and the map takes no more taps */
    await expect(page.locator('.tm-cell').first()).toBeDisabled();
    noProblems(watch);
  });

  test('which square: the right name and the slips one square out', async ({ page }) => {
    await startAt(page, 3);
    const q = await wanted(page, 1);
    /* three or four: a corner square has only two neighbours */
    expect(await page.locator('.mx-choice').count()).toBeGreaterThanOrEqual(3);
    expect(await page.locator('.mx-choice').allTextContents()).toContain(q.answer);
    /* the squares are not for tapping while the buttons are */
    await expect(page.locator('.tm-cell').first()).toBeDisabled();
    await answer(page, q);
    await expect(page.locator('.mx-note')).toHaveText(`Yes! It is in ${q.answer}.`);
  });

  test('following the directions walks the path and digs up the treasure', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 5);
    const q = await wanted(page, 1);
    await expect(page.locator('.tm-cell')).toHaveCount(36);
    await expect(page.locator('.mx-ask')).toHaveText(/^Start at the \w+\. Go \d squares? \w+, then \d squares? \w+\. Tap where the treasure is\.$/);
    await expect(page.locator('.tm-cell.start')).toHaveCount(1);
    await answer(page, q);
    await expect(page.locator('.mx-note')).toHaveText('You found the treasure!');
    await expect(page.locator(`.tm-cell[data-sq="${q.answer}"]`)).toHaveClass(/treasure/);
    await expect(page.locator('.tm-cell.walked').first()).toBeVisible();
    noProblems(watch);
  });

  test('in Portuguese: the question, the key, the compass and the buttons', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 6);
    const q = await wanted(page, 1);
    await page.getByRole('button', { name: 'Português' }).click();
    await expect(page.locator('.mx-ask')).toHaveText(/^Comece n[oa] \S+\. Para que lado fica [ao] \S+\?$/);
    await expect(page.locator('.tm-compass .tm-e')).toHaveText('L');
    await expect(page.locator('.mx-choice')).toHaveText(['Norte', 'Sul', 'Leste', 'Oeste']);
    const names = THINGS.map((t) => t.pt.name);
    for (const word of await page.locator('.tm-key .tm-word').allTextContents()) expect(names).toContain(word);
    await answer(page, q);
    await expect(page.locator('.mx-note')).toHaveText(/^Isso! Fica para o (norte|sul|leste|oeste)\.$/);
    noProblems(watch);
  });

  test('the scale: how far, in metres', async ({ page }) => {
    await startAt(page, 8);
    const q = await wanted(page, 1);
    await expect(page.locator('.mx-ask')).toHaveText(/^Each square is (2|5|10) metres\. Start at the \w+\. How far is it to the \w+\?$/);
    await answer(page, q);
    await expect(page.locator('.mx-note')).toHaveText(`Yes! It is ${q.answer} metres.`);
  });

  test('every square is big enough to tap, on every screen', async ({ page }) => {
    await startAt(page, 5);
    await wanted(page, 1);
    await expectTapTargets(page, '.tm-cell');
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });
});
