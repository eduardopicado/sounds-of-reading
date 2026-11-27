/* Measure the Pitch: boots, rulers, squares and cups. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, recordSpeech, seed, watchPage } from './helpers';
import { MEASURE_STEPS } from '../../src/content/measure';

const stepOf = (task: string): number => MEASURE_STEPS.findIndex((s) => s.task === task);

async function startAt(page: Page, step: number): Promise<void> {
  await seed(page, { 'maths-step:measure-the-pitch': step });
  await openGame(page, 'measure-the-pitch');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

async function question(page: Page, n: number): Promise<string> {
  await expect(page.locator('.score')).toContainText(`Question ${n} of`, { timeout: 10_000 });
  await expect(page.locator('.mx-choice').first()).toBeEnabled();
  return (await page.locator('.mt-stage').getAttribute('data-answer'))!;
}
const tap = (page: Page, answer: string) => page.locator(`.mx-choice[data-n="${answer}"]`).click();

test.describe('Measure the Pitch', () => {
  test.beforeEach(async ({ page }) => { await recordSpeech(page); });

  for (const task of MEASURE_STEPS.map((s) => s.task)) {
    test(`${task}: the right answer says yes and why`, async ({ page }) => {
      const watch = watchPage(page);
      await startAt(page, stepOf(task));
      const answer = await question(page, 1);
      if (task !== 'units') await expect(page.locator('.mt-pic')).toBeVisible();
      await tap(page, answer);
      await expect(page.locator('.mx-note')).toContainText('Yes! ');
      noProblems(watch);
    });
  }

  test('a ruler that does not start at 0: reading the end mark is wrong, and why', async ({ page }) => {
    await startAt(page, stepOf('offset'));
    const answer = await question(page, 1);
    const wrong = (await page.locator('.mx-choice').evaluateAll((ns) => ns.map((n) => (n as HTMLElement).dataset.n!))).find((n) => n !== answer)!;
    await tap(page, wrong);
    await expect(page.locator('.mx-choice.right')).toHaveText(answer);
    await expect(page.locator('.mx-note')).toContainText('not at 0');
  });

  for (const task of ['gaps', 'area']) {
    test(`fits (${task}): the picture on the screen, nothing sideways`, async ({ page }) => {
      await startAt(page, stepOf(task));
      await question(page, 1);
      const view = page.viewportSize()!;
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(view.width);
      const b = (await page.locator('.mt-pic').boundingBox())!;
      expect(b.x + b.width).toBeLessThanOrEqual(view.width);
    });
  }
});
