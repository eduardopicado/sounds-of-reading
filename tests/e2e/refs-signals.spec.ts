/* Ref's Signals: the referee's hands, and the calls. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, seed, watchPage } from './helpers';

async function startAt(page: Page, step: number, extra: Record<string, unknown> = {}): Promise<void> {
  await seed(page, { 'maths-step:refs-signals': step, ...extra });
  await openGame(page, 'refs-signals');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

async function answer(page: Page, right = true): Promise<string> {
  await expect(page.locator('.mx-choice:enabled, .bj-signal:enabled').first()).toBeVisible({ timeout: 8000 });
  const want = (await page.locator('.bj-card').getAttribute('data-answer'))!;
  if (await page.locator('.bj-signal').count()) {
    await page.locator(right ? `.bj-signal[data-signal="${want}"]` : `.bj-signal:not([data-signal="${want}"])`).first().click();
  } else {
    await page.locator(right ? `.mx-choice[data-n="${want}"]` : `.mx-choice:not([data-n="${want}"])`).first().click();
  }
  return want;
}

test.describe("Ref's Signals", () => {
  test('a whole round of counting fingers, to the sticker', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0);
    for (let i = 0; i < 8; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i + 1}`, { timeout: 8000 });
      await answer(page);
      await expect(page.locator('.mx-note')).toContainText('Yes!');
    }
    await expect(page.locator('.results .sticker')).toHaveText('🙌', { timeout: 8000 });
    noProblems(watch);
  });

  test('the referee shows as many fingers as points', async ({ page }) => {
    await startAt(page, 0);
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
    const n = await page.locator('.bj-card').getAttribute('data-answer');
    await expect(page.locator('.bj-ref')).toHaveAttribute('data-signal', `points-${n}`);
  });

  test('points, advantage or penalty, and a miss says how the signal is made', async ({ page }) => {
    await startAt(page, 1);
    await answer(page, false);
    await expect(page.locator('.mx-note')).toContainText(/fingers up|open hand|fist/);
  });

  test('in Portuguese, the question and the answers switch', async ({ page }) => {
    await startAt(page, 1);
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
    await page.getByRole('button', { name: 'Português' }).click();
    await expect(page.locator('.mx-ask')).toHaveText('O que o árbitro está dando?');
    await expect(page.locator('.mx-choice')).toHaveText(['Pontos', 'Vantagem', 'Punição']);
  });

  test('which move: the fingers say the points', async ({ page }) => {
    await startAt(page, 2);
    await answer(page);
    await expect(page.locator('.mx-note')).toContainText('fingers is');
  });

  test('Year 2: you are the referee, pick the signal', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 3);
    await expect(page.locator('.bj-signal')).toHaveCount(3, { timeout: 8000 });
    await expect(page.locator('.bj-moment')).not.toBeEmpty();
    await answer(page);
    await expect(page.locator('.bj-signal.right')).toHaveCount(1);
    await expect(page.locator('.mx-note')).toContainText('Yes!');
    noProblems(watch);
  });

  test('Year 2: the calls, Combate, Parou and Lute', async ({ page }) => {
    await startAt(page, 4);
    for (let i = 0; i < 3; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i + 1}`, { timeout: 8000 });
      await answer(page);
      await expect(page.locator('.mx-note')).toContainText('Yes!');
    }
  });
});
