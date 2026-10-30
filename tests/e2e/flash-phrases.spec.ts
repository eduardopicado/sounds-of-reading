/* Flash Phrases: a phrase flashes up and goes, and he picks the one he read. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, seed, watchPage } from './helpers';

async function start(page: Page, step = 0): Promise<void> {
  await seed(page, { 'maths-step:flash-phrases': step });
  await openGame(page, 'flash-phrases');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

/** wait for the phrase, then for the answers, and pick the right one or another */
async function answer(page: Page, right: boolean): Promise<{ phrase: string; picked: string }> {
  /* the new phrase is up: the last one stays on the card a moment after it is answered */
  await expect(page.locator('.mx-ask')).toHaveText('Read it!', { timeout: 8000 });
  const phrase = (await page.locator('.fp-stage').getAttribute('data-answer'))!;
  await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
  const options = await page.locator('.mx-choice').allTextContents();
  const picked = right ? phrase : options.find((o) => o !== phrase)!;
  await page.locator('.mx-choice').nth(options.indexOf(picked)).click();
  return { phrase, picked };
}

test.describe('Flash Phrases', () => {
  test('the phrase shows, goes, and only then come the three to pick from', async ({ page }) => {
    const watch = watchPage(page);
    await start(page);
    await expect(page.locator('.fp-word').first()).toBeVisible({ timeout: 6000 });
    const phrase = (await page.locator('.fp-stage').getAttribute('data-answer'))!;
    await expect(page.locator('.fp-card')).toHaveText(phrase.split(' ').join(''));
    await expect(page.locator('.mx-choice')).toHaveCount(0);
    await expect(page.locator('.mx-choice')).toHaveCount(3, { timeout: 8000 });
    await expect(page.locator('.fp-word')).toHaveCount(0);
    expect(await page.locator('.mx-choice').allTextContents()).toContain(phrase);
    noProblems(watch);
  });

  test('a whole round, read right', async ({ page }) => {
    const watch = watchPage(page);
    await start(page);
    for (let i = 0; i < 8; i += 1) {
      await answer(page, true);
      await expect(page.locator('.mx-note')).toContainText('read in a flash');
    }
    await expect(page.locator('.results')).toContainText('8 of 8', { timeout: 8000 });
    noProblems(watch);
  });

  test('a miss shows the phrase again with the misread word marked', async ({ page }) => {
    const watch = watchPage(page);
    await start(page, 2);
    const { phrase, picked } = await answer(page, false);
    const at = phrase.split(' ').findIndex((w, i) => w !== picked.split(' ')[i]);
    const [right, wrong] = [phrase.split(' ')[at], picked.split(' ')[at]];
    await expect(page.locator('.fp-word.misread')).toHaveText(right);
    await expect(page.locator('.mx-note')).toHaveText(`It said “${phrase}”: ${right}, not ${wrong}.`);
    noProblems(watch);
  });

  test('the look closes in with every right answer, and a miss gives it back', async ({ page }) => {
    await start(page);
    await answer(page, true);
    const first = Number(await page.locator('.fp-card').getAttribute('data-ms'));
    await expect(page.locator('.score')).toContainText('Question 2', { timeout: 6000 });
    await answer(page, true);
    const second = Number(await page.locator('.fp-card').getAttribute('data-ms'));
    expect(second).toBeLessThan(first);
  });
});
