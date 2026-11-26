/* Fixture Calendar: days, months, seasons, and reading a real calendar. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, recordSpeech, seed, watchPage } from './helpers';
import { CALENDAR_STEPS, DAYS, SEASON_NAME, type Season } from '../../src/content/calendar';

const stepOf = (task: string): number => CALENDAR_STEPS.findIndex((s) => s.task === task);

async function startAt(page: Page, step: number): Promise<void> {
  await seed(page, { 'maths-step:fixture-calendar': step });
  await openGame(page, 'fixture-calendar');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

async function question(page: Page, n: number): Promise<string> {
  await expect(page.locator('.score')).toContainText(`Question ${n} of`, { timeout: 10_000 });
  return (await page.locator('.fc-stage').getAttribute('data-answer'))!;
}

test.describe('Fixture Calendar', () => {
  test.beforeEach(async ({ page }) => { await recordSpeech(page); });

  test('days of the week: the right one says yes and why', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, stepOf('days'));
    const answer = await question(page, 1);
    expect(DAYS).toContain(answer);
    await expect(page.locator('.mx-ask')).toHaveText(/^What day comes (after|before) \w+day\?$/);
    await page.getByRole('button', { name: answer, exact: true }).click();
    await expect(page.locator('.mx-note')).toContainText(`Yes! ${answer} comes`);
    noProblems(watch);
  });

  test('seasons, by their names', async ({ page }) => {
    await startAt(page, stepOf('seasons'));
    const answer = await question(page, 1) as Season;
    await page.getByRole('button', { name: SEASON_NAME[answer], exact: true }).click();
    await expect(page.locator('.mx-note')).toContainText(`Yes! ${SEASON_NAME[answer]} is `);
  });

  test('a wrong answer shows the right one and why', async ({ page }) => {
    await startAt(page, stepOf('months'));
    const answer = await question(page, 1);
    const wrong = (await page.locator('.mx-choice').allTextContents()).find((t) => t !== answer)!;
    await page.getByRole('button', { name: wrong, exact: true }).click();
    await expect(page.locator('.mx-choice.right')).toHaveText(answer);
    await expect(page.locator('.mx-note')).toContainText(`${answer} comes`);
    await expect(page.locator('.score')).toContainText('Right first time 0');
  });

  test('read the calendar: a real month, Monday first, the date tapped or its day named', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, stepOf('read'));
    for (let n = 1; n <= 3; n += 1) {
      const answer = await question(page, n);
      await expect(page.locator('.fc-head').first()).toHaveText('Mon');
      if (/^\d+$/.test(answer)) {
        await page.locator(`.fc-date[data-date="${answer}"]`).click();
        await expect(page.locator(`.fc-date[data-date="${answer}"]`)).toHaveClass(/right/);
      } else {
        await page.getByRole('button', { name: answer, exact: true }).click();
      }
      await expect(page.locator('.mx-note')).toContainText('Yes! ');
    }
    noProblems(watch);
  });

  test('how many days until the match: today and the match on the calendar', async ({ page }) => {
    await startAt(page, stepOf('until'));
    const answer = await question(page, 1);
    const today = Number(await page.locator('.fc-date.today').getAttribute('data-date'));
    const match = Number(await page.locator('.fc-date.match').getAttribute('data-date'));
    expect(match - today).toBe(Number(answer));
    await page.getByRole('button', { name: answer, exact: true }).click();
    await expect(page.locator('.mx-note')).toContainText(`Yes! Count on from the`);
  });

  test('fits: the calendar on the screen, nothing sideways', async ({ page }) => {
    await startAt(page, stepOf('read'));
    await question(page, 1);
    const view = page.viewportSize()!;
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(view.width);
    const b = (await page.locator('.fc-calendar').boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(view.width);
    const d = (await page.locator('.fc-date').first().boundingBox())!;
    expect(Math.min(d.width, d.height)).toBeGreaterThanOrEqual(38);
  });
});
