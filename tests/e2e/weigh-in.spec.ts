/* Weigh-In: the balance, blocks, then kilograms and weight classes. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, seed, watchPage } from './helpers';

async function startAt(page: Page, step: number, extra: Record<string, unknown> = {}): Promise<void> {
  await seed(page, { 'maths-step:weigh-in': step, ...extra });
  await openGame(page, 'weigh-in');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

/** the card carries the answer for the tests, as the other maths games do */
async function answer(page: Page, right = true): Promise<string> {
  await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
  const want = (await page.locator('.wi-card').getAttribute('data-answer'))!;
  const pick = right ? page.locator(`.mx-choice[data-n="${want}"]`) : page.locator(`.mx-choice:not([data-n="${want}"])`).first();
  await pick.click();
  return want;
}

test.describe('Weigh-In', () => {
  test('a whole round on the balance, to the sticker', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0);
    for (let i = 0; i < 8; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i + 1}`, { timeout: 8000 });
      await answer(page);
      await expect(page.locator('.mx-note')).toContainText('Yes!');
    }
    await expect(page.locator('.results')).toContainText('right first time', { timeout: 8000 });
    await expect(page.locator('.results .sticker')).toHaveText('⚖️');
    noProblems(watch);
  });

  test('the heavier side goes down, and a miss says so', async ({ page }) => {
    await startAt(page, 0);
    await expect(page.locator('.wi-pic')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.mx-ask')).toHaveText('Which is heavier?');
    await answer(page, false);
    await expect(page.locator('.mx-note')).toContainText('The side that goes down is heavier');
  });

  test('blocks: the balance is level and he counts the blocks', async ({ page }) => {
    await startAt(page, 2);
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
    const want = Number(await page.locator('.wi-card').getAttribute('data-answer'));
    await expect(page.locator('.wi-block')).toHaveCount(want);
    await answer(page);
    await expect(page.locator('.mx-note')).toContainText(`${want} blocks`);
  });

  test('Year 2: read the scale in kilograms', async ({ page }) => {
    await startAt(page, 3);
    await expect(page.locator('.wi-scale')).toBeVisible({ timeout: 8000 });
    const kg = await page.locator('.wi-scale').getAttribute('data-kg');
    expect(await page.locator('.wi-card').getAttribute('data-answer')).toBe(kg);
    await answer(page);
    await expect(page.locator('.mx-note')).toContainText(`${kg} kilograms`);
  });

  test('Year 2: the weight class, in English and Portuguese', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 4);
    await expect(page.locator('.wi-classes tr')).toHaveCount(5, { timeout: 8000 });
    await expect(page.locator('.wi-classes')).toContainText('up to 20 kg');
    await page.getByRole('button', { name: 'Português' }).click();
    await expect(page.locator('.wi-classes')).toContainText('até 20 kg');
    await expect(page.locator('.mx-ask')).toHaveText('Em qual categoria o Azul luta?');
    await answer(page);
    await expect(page.locator('.mx-note')).toContainText('Isso!');
    noProblems(watch);
  });

  test('Year 2: with the gi on, add or take away 2 kg', async ({ page }) => {
    await startAt(page, 5);
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
    await expect(page.locator('.mx-ask')).toContainText('gi');
    await answer(page);
    await expect(page.locator('.mx-note')).toContainText(/take away 2|add 2/);
  });
});
