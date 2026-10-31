/* Word Parts: endings and fronts, and the rules that put them on. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, seed, watchPage } from './helpers';

async function start(page: Page, step = 0): Promise<void> {
  await seed(page, { 'maths-step:word-parts': step });
  await openGame(page, 'word-parts');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

/** wait for question n's answers, and pick the right one or another */
async function answer(page: Page, n: number, right: boolean): Promise<{ answer: string; picked: string; options: string[] }> {
  await expect(page.locator('.score')).toContainText(`Question ${n}`, { timeout: 8000 });
  await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
  const answer = (await page.locator('.wp-card').getAttribute('data-answer'))!;
  const options = await page.locator('.mx-choice').allTextContents();
  const picked = right ? answer : options.find((o) => o !== answer)!;
  await page.locator('.mx-choice').nth(options.indexOf(picked)).click();
  return { answer, picked, options };
}

test.describe('Word Parts', () => {
  test('hear the ending: one word three ways, and the ending marked after', async ({ page }) => {
    const watch = watchPage(page);
    await start(page, 0);
    await expect(page.locator('.mx-ask')).toHaveText('Listen. Which one did I say?');
    const { answer: word, options } = await answer(page, 1, true);
    /* jumps, jumping, jumped: the same word with each ending */
    const base = word.replace(/(es|s|ing|ed)$/, '');
    expect(options.every((o) => o.startsWith(base))).toBe(true);
    await expect(page.locator('.mx-note')).toContainText('Yes!');
    await expect(page.locator('.wp-word')).toHaveText(word);
    expect(word.endsWith(await page.locator('.wp-word .gr').textContent() ?? '?')).toBe(true);
    noProblems(watch);
  });

  test('what the ed says: t, d or id, with the ed marked on the word', async ({ page }) => {
    const watch = watchPage(page);
    await start(page, 1);
    await expect(page.locator('.wp-word .gr')).toHaveText('ed', { timeout: 8000 });
    const { answer: says, options } = await answer(page, 1, true);
    expect(options.sort()).toEqual(['d', 'id', 't']);
    await expect(page.locator('.mx-note')).toContainText(`the ed says ${says}`);
    noProblems(watch);
  });

  test('double it: a wrong spelling says why the letter doubles', async ({ page }) => {
    const watch = watchPage(page);
    await start(page, 2);
    await expect(page.locator('.wp-sum')).toBeVisible({ timeout: 8000 });
    const [base, part] = [await page.locator('.wp-base').textContent(), await page.locator('.wp-part').textContent()];
    const { answer: word } = await answer(page, 1, false);
    expect(word.startsWith(base! + base!.at(-1))).toBe(true);
    await expect(page.locator('.mx-note')).toContainText(`so the ${base!.at(-1)} doubles: ${word}`);
    /* the word now, its doubled letter and ending marked */
    await expect(page.locator('.wp-word .gr')).toHaveText(base!.at(-1) + part!);
    noProblems(watch);
  });

  test('what a front or an ending means, and the part marked after', async ({ page }) => {
    const watch = watchPage(page);
    await start(page, 7);
    const means = await page.locator('.wp-means').textContent({ timeout: 8000 });
    const { answer: word } = await answer(page, 1, true);
    await expect(page.locator('.mx-note')).toContainText(`${word}: ${means}`);
    await expect(page.locator('.wp-word .gr')).toHaveText(/^(un|dis|re)$/);
    noProblems(watch);
  });

  test('a whole round of every rule, with nothing off the side of the screen', async ({ page }) => {
    const watch = watchPage(page);
    await start(page, 5);
    for (let i = 1; i <= 8; i += 1) await answer(page, i, true);
    await expect(page.locator('.results')).toContainText('8 of 8', { timeout: 8000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    noProblems(watch);
  });
});
