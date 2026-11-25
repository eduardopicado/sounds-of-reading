/* Punctuation Ref: each sentence breaks one rule, and he makes the call. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, recordSpeech, seed, watchPage } from './helpers';
import { MARK_NAME, PUNCTUATION_STEPS, type Mark } from '../../src/content/punctuation';

const stepOf = (task: string): number => PUNCTUATION_STEPS.findIndex((s) => s.task === task);

async function startAt(page: Page, step: number): Promise<void> {
  await seed(page, { 'maths-step:punctuation-ref': step });
  await openGame(page, 'punctuation-ref');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

async function question(page: Page, n: number): Promise<string> {
  await expect(page.locator('.score')).toContainText(`Question ${n} of`, { timeout: 10_000 });
  await expect(page.locator('.pr-sentence')).toHaveAttribute('data-shown', 'question');
  return (await page.locator('.pr-stage').getAttribute('data-answer'))!;
}

test.describe('Punctuation Ref', () => {
  test.beforeEach(async ({ page }) => { await recordSpeech(page); });

  test('capital letters: tap the word, and the sentence is shown right', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, stepOf('capitals'));
    const at = await question(page, 1);
    const word = page.locator(`.pr-word[data-at="${at}"]`);
    await expect(word).toHaveText(/^[a-z]/);
    await word.click();
    await expect(page.locator('.mx-note')).toContainText('Yes! ');
    await expect(page.locator('.pr-right')).toHaveText(/^[A-Z].*[.?!]$/);
    noProblems(watch);
  });

  test('the end mark: the whistle for a wrong one, and the rule', async ({ page }) => {
    await startAt(page, stepOf('ends'));
    const mark = await question(page, 1) as Mark;
    const wrong = (['.', '?', '!'] as Mark[]).find((m) => m !== mark)!;
    await page.getByRole('button', { name: `${wrong} ${MARK_NAME[wrong]}` }).click();
    await expect(page.locator('.mx-choice.right')).toContainText(MARK_NAME[mark]);
    await expect(page.locator('.mx-note')).toContainText(MARK_NAME[mark].toLowerCase());
    await expect(page.locator('.pr-right')).toHaveText(new RegExp(`\\${mark}$`));
  });

  test('commas: tap the gap after the first thing in the list', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, stepOf('commas'));
    const at = await question(page, 1);
    await page.locator(`.pr-gap[data-at="${at}"]`).click();
    await expect(page.locator('.mx-note')).toContainText('Yes! A comma goes between');
    await expect(page.locator('.pr-right')).toContainText(',');
    noProblems(watch);
  });

  test("short words and whose it is: the apostrophe in the right place", async ({ page }) => {
    await startAt(page, stepOf('short'));
    const short = await question(page, 1);
    await page.getByRole('button', { name: short, exact: true }).click();
    await expect(page.locator('.mx-note')).toContainText('Yes! The apostrophe goes where the letters were');
  });

  test('whose is it', async ({ page }) => {
    await startAt(page, stepOf('whose'));
    const whose = await question(page, 1);
    expect(whose).toMatch(/'s$/);
    await expect(page.locator('.pr-plain')).toContainText('___');
    await page.getByRole('button', { name: whose, exact: true }).click();
    await expect(page.locator('.pr-right')).toContainText(whose);
  });

  test('which one is right: the answers keep their capitals', async ({ page }) => {
    await startAt(page, stepOf('check'));
    const right = await question(page, 1);
    await expect(page.locator('.mx-choice')).toHaveCount(3);
    await expect(page.locator('.mx-choice').filter({ hasText: /^[a-z]/ })).toHaveCount(1);
    await page.getByRole('button', { name: right, exact: true }).click();
    await expect(page.locator('.mx-note')).toContainText('Yes! It starts with a capital letter.');
  });

  test('fits: the sentence and the gaps on the screen', async ({ page }) => {
    await startAt(page, stepOf('commas'));
    await question(page, 1);
    const view = page.viewportSize()!;
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(view.width);
    for (const g of await page.locator('.pr-gap, .pr-word').all()) {
      const b = (await g.boundingBox())!;
      expect(b.x + b.width).toBeLessThanOrEqual(view.width);
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
  });
});
