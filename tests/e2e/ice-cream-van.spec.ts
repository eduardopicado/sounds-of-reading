/* Ice Cream Van: Australian coins. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, seed, watchPage } from './helpers';

async function startAt(page: Page, step: number): Promise<void> {
  await seed(page, { 'maths-step:ice-cream-van': step });
  await openGame(page, 'ice-cream-van');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

const answerOf = async (page: Page): Promise<string> => (await page.locator('.mx-stage').getAttribute('data-answer'))!;

/** answer whatever is asked: a coin to tap, or a money button */
async function answer(page: Page): Promise<void> {
  await expect(page.locator('.iv-pick:enabled, .mx-choice:enabled').first()).toBeVisible({ timeout: 8000 });
  const want = await answerOf(page);
  if (await page.locator('.mx-choice').count()) await page.locator(`.mx-choice[data-n="${want}"]`).click();
  else await page.locator(`.iv-pick[data-cents="${want}"]`).first().click();
}

test.describe('Ice Cream Van', () => {
  test('a whole round of coins, to the sticker', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0);
    for (let i = 0; i < 8; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i + 1}`, { timeout: 8000 });
      await answer(page);
      await expect(page.locator('.mx-note')).toContainText('Yes!');
    }
    await expect(page.locator('.results .sticker')).toHaveText('🍦', { timeout: 8000 });
    noProblems(watch);
  });

  test('which coin pays: the price tag and the coins', async ({ page }) => {
    await startAt(page, 1);
    await expect(page.locator('.iv-tag')).toBeVisible({ timeout: 8000 });
    const want = Number(await answerOf(page));
    await expect(page.locator(`.iv-pick[data-cents="${want}"]`)).toHaveCount(1);
    await page.locator(`.iv-pick:not([data-cents="${want}"])`).first().click();
    await expect(page.locator('.mx-note')).toContainText('exactly');
  });

  test('Year 2: counting mixed coins shows the running total', async ({ page }) => {
    await startAt(page, 3);
    await answer(page);
    await expect(page.locator('.iv-stage.counted')).toBeVisible();
    await expect(page.locator('.mx-note')).toContainText(' = ');
  });

  test('Year 2: pay the exact price from the purse', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 4);
    await expect(page.locator('.iv-purse .iv-pick').first()).toBeVisible({ timeout: 8000 });
    let price = Number(await answerOf(page));
    /* biggest coins first, as a grown-up pays */
    const coins = await page.locator('.iv-purse .iv-pick').evaluateAll((ns) => ns.map((n) => Number((n as HTMLElement).dataset.cents)));
    for (const c of coins.sort((a, b) => b - a)) {
      if (c > price) continue;
      await page.locator(`.iv-purse .iv-pick[data-cents="${c}"]`).first().click();
      price -= c;
    }
    expect(price).toBe(0);
    await page.getByRole('button', { name: 'Pay' }).click();
    await expect(page.locator('.mx-note')).toContainText('Enjoy it!');
    noProblems(watch);
  });

  test('Year 2: paying too much is not exact', async ({ page }) => {
    await startAt(page, 4);
    await expect(page.locator('.iv-purse .iv-pick').first()).toBeVisible({ timeout: 8000 });
    const all = await page.locator('.iv-purse .iv-pick').count();
    for (let i = 0; i < all; i += 1) await page.locator('.iv-purse .iv-pick').first().click();
    await page.getByRole('button', { name: 'Pay' }).click();
    await expect(page.locator('.mx-note')).toContainText('too much');
  });

  test('Year 2: the change from a note', async ({ page }) => {
    await startAt(page, 5);
    await expect(page.locator('.iv-note')).toBeVisible({ timeout: 8000 });
    await answer(page);
    await expect(page.locator('.mx-note')).toContainText('the change is');
  });
});
