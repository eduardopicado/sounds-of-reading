/* Football Ref: be the referee, from the ball going out to offside. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, recordSpeech, said, seed, watchPage } from './helpers';
import { CALLS, FOOTBALL_STEPS, SIGNALS, WHY, type Call } from '../../src/content/football-rules';

async function startAt(page: Page, step: number, lang: 'en' | 'pt' = 'en'): Promise<void> {
  await seed(page, { 'maths-step:football-ref': step, 'football-lang': lang });
  await openGame(page, 'football-ref');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

const card = (page: Page) => page.locator('.fr-card');

/** the question up, and its answer */
async function question(page: Page, n: number): Promise<Call> {
  await expect(page.locator('.score')).toContainText(`Question ${n} of`, { timeout: 10_000 });
  return (await card(page).getAttribute('data-answer')) as Call;
}

test.describe('Football Ref', () => {
  test.beforeEach(async ({ page }) => { await recordSpeech(page); });

  test('a whole round, every one right, climbing from the ball going out, to the sticker', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0);
    for (let n = 1; n <= 8; n += 1) {
      const answer = await question(page, n);
      /* three right in a row climb a step: first the ball going out, then fouls */
      if (n === 1) {
        await expect(page.locator('.fr-pitch')).toBeVisible();
        for (const c of ['Throw-in', 'Corner', 'Goal kick']) await expect(page.getByRole('button', { name: c, exact: true })).toBeVisible();
      }
      if (n === 4) await expect(page.locator('.score')).toContainText('Free kick or penalty?');
      await page.getByRole('button', { name: CALLS[answer].en, exact: true }).click();
      await expect(page.locator('.mx-note')).toContainText('Yes! ');
    }
    await expect(page.locator('.results')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.results')).toContainText('8 of 8');
    noProblems(watch);
  });

  test('a wrong call says what the rule is', async ({ page }) => {
    await startAt(page, 1);
    const answer = await question(page, 1);
    const wrong = answer === 'penalty' ? 'free-kick' : 'penalty';
    await page.getByRole('button', { name: CALLS[wrong].en, exact: true }).click();
    const why = answer === 'penalty' ? WHY.inBox : WHY.outBox;
    await expect(page.locator('.mx-note')).toHaveText(why.en);
    expect(await said(page)).toContain(why.en);
  });

  test('offside: once he has answered, the last defender\'s line is drawn', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, FOOTBALL_STEPS.findIndex((s) => s.task === 'offside'));
    const answer = await question(page, 1);
    await expect(page.locator('.fr-player.runner')).toHaveCount(1);
    await expect(page.locator('.fr-him')).toHaveCount(1);
    await expect(page.locator('.fr-line')).toHaveCount(0);
    await page.getByRole('button', { name: CALLS[answer].en, exact: true }).click();
    await expect(page.locator('.fr-line.defender')).toHaveCount(1);
    noProblems(watch);
  });

  test('the referee\'s signals, and a yellow or a red card', async ({ page }) => {
    await startAt(page, FOOTBALL_STEPS.findIndex((s) => s.task === 'signal'));
    const answer = await question(page, 1);
    await expect(page.locator('.fr-signal')).toBeVisible();
    const kind = (await card(page).getAttribute('data-kind')) as keyof typeof SIGNALS;
    expect(SIGNALS[kind].call).toBe(answer);
    await page.getByRole('button', { name: CALLS[answer].en, exact: true }).click();
    await expect(page.locator('.mx-note')).toHaveText(`Yes! ${SIGNALS[kind].how.en}`);
  });

  test('in Portuguese: lateral, escanteio, tiro de meta', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0, 'pt');
    const answer = await question(page, 1);
    await expect(page.locator('.mx-ask')).toHaveText('A bola saiu. E agora?');
    for (const c of ['Lateral', 'Escanteio', 'Tiro de meta']) await expect(page.getByRole('button', { name: c, exact: true })).toBeVisible();
    await page.getByRole('button', { name: CALLS[answer].pt, exact: true }).click();
    await expect(page.locator('.mx-note')).toContainText('Isso! ');
    noProblems(watch);
  });

  test('the pitch fits on the screen, with nothing to scroll sideways', async ({ page }) => {
    await startAt(page, FOOTBALL_STEPS.findIndex((s) => s.task === 'tricky'));
    await question(page, 1);
    const pitch = (await page.locator('.fr-pitch').boundingBox())!;
    const view = page.viewportSize()!;
    expect(pitch.x).toBeGreaterThanOrEqual(0);
    expect(pitch.x + pitch.width).toBeLessThanOrEqual(view.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(view.width);
    /* and the buttons under it are on the screen too */
    const buttons = (await page.getByRole('button', { name: 'Offside', exact: true }).boundingBox())!;
    expect(buttons.y + buttons.height).toBeLessThanOrEqual(view.height);
  });
});
