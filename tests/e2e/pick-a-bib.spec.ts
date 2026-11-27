/* Pick a Bib: certain, possible, impossible; likely and unlikely; the
 * spinner; ten picks. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, recordSpeech, seed, watchPage } from './helpers';
import { CHANCE_STEPS } from '../../src/content/chance';

const stepOf = (task: string): number => CHANCE_STEPS.findIndex((s) => s.task === task);

async function startAt(page: Page, step: number): Promise<void> {
  await seed(page, { 'maths-step:pick-a-bib': step });
  await openGame(page, 'pick-a-bib');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

async function question(page: Page, n: number): Promise<string> {
  await expect(page.locator('.score')).toContainText(`Question ${n} of`, { timeout: 10_000 });
  await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10_000 });
  return (await page.locator('.pb-stage').getAttribute('data-answer'))!;
}
const tap = (page: Page, answer: string) => page.locator(`.mx-choice[data-n="${answer}"]`).click();

test.describe('Pick a Bib', () => {
  test.beforeEach(async ({ page }) => { await recordSpeech(page); });

  for (const task of CHANCE_STEPS.map((s) => s.task)) {
    test(`${task}: the right answer says yes and why`, async ({ page }) => {
      const watch = watchPage(page);
      await startAt(page, stepOf(task));
      const answer = await question(page, 1);
      await expect(page.locator('.pb-pic')).toBeVisible();
      if (task === 'picks') {
        await expect(page.locator('.pb-picked')).toHaveCount(10);
        await expect(page.locator('.pb-tally')).toBeVisible();
      }
      await tap(page, answer);
      await expect(page.locator('.mx-note')).toContainText('Yes! ');
      noProblems(watch);
    });
  }

  test('a wrong call shows the right one and why', async ({ page }) => {
    await startAt(page, stepOf('will'));
    const answer = await question(page, 1);
    const wrong = ['certain', 'possible', 'impossible'].find((c) => c !== answer)!;
    await tap(page, wrong);
    await expect(page.locator('.mx-choice.right')).toHaveAttribute('data-n', answer);
    await expect(page.locator('.mx-note')).toContainText(`${answer}.`);
  });

  test('fits: the bag on the screen, nothing sideways', async ({ page }) => {
    await startAt(page, stepOf('more'));
    await question(page, 1);
    const view = page.viewportSize()!;
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(view.width);
    const b = (await page.locator('.pb-pic').boundingBox())!;
    expect(b.x + b.width).toBeLessThanOrEqual(view.width);
  });
});
