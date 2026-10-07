/* Big Words: two-syllable words, read a part at a time. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, seed, watchPage } from './helpers';
import { ALL_BIG_WORDS } from '../../src/content/big-words';

async function startAt(page: Page, step: number, extra: Record<string, unknown> = {}): Promise<void> {
  await seed(page, { 'maths-step:big-words': step, ...extra });
  await openGame(page, 'big-words');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

/** do whatever is asked, from the word the stage is showing */
async function answer(page: Page, right = true): Promise<void> {
  const stage = page.locator('.bw-word');
  await expect(page.locator('.bw-pic:enabled, .bw-tile:enabled, .bw-gap:enabled').first()).toBeVisible({ timeout: 8000 });
  const word = (await stage.getAttribute('data-word'))!;
  const at = Number(await stage.getAttribute('data-split'));
  if (await page.locator('.bw-pic').count()) {
    await page.locator(right ? `.bw-pic[data-word="${word}"]` : `.bw-pic:not([data-word="${word}"])`).first().click();
  } else if (await page.locator('.bw-gap').count()) {
    await page.locator(`.bw-gap[data-at="${right ? at : at === 1 ? 2 : 1}"]`).click();
  } else {
    const [a, b] = [word.slice(0, at), word.slice(at)];
    await page.locator(`.bw-tile[data-part="${right ? a : b}"]`).click();
    await page.locator(`.bw-tile[data-part="${right ? b : a}"]`).click();
  }
}

test.describe('Big Words', () => {
  test('a whole round of reading big words, to the sticker', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0);
    for (let i = 0; i < 8; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i + 1}`, { timeout: 8000 });
      await answer(page);
      await expect(page.locator('.mx-note')).toContainText('Yes!');
    }
    await expect(page.locator('.results .sticker')).toHaveText('🐘', { timeout: 8000 });
    noProblems(watch);
  });

  test('shows the word in its two parts, and the pictures carry no words', async ({ page }) => {
    await startAt(page, 0);
    await expect(page.locator('.bw-part')).toHaveCount(2, { timeout: 8000 });
    await expect(page.locator('.bw-answers')).toHaveText(/^[^a-z]*$/);
  });

  test('a wrong picture shows the parts and says the word', async ({ page }) => {
    await startAt(page, 1);
    await expect(page.locator('.bw-part')).toHaveCount(1, { timeout: 8000 });
    await answer(page, false);
    await expect(page.locator('.bw-part')).toHaveCount(2);
    await expect(page.locator('.bw-pic.wrong')).toHaveCount(1);
  });

  test('build it: hear the word, tap the two parts in order', async ({ page }) => {
    await startAt(page, 2);
    await expect(page.locator('.bw-tile')).toHaveCount(4, { timeout: 8000 });
    await expect(page.getByRole('button', { name: '🔊 Say it again' })).toBeVisible();
    await answer(page);
    await expect(page.locator('.mx-note')).toContainText('Yes!');
  });

  test('Year 2: tap where it splits', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 3);
    await expect(page.locator('.bw-gap').first()).toBeVisible({ timeout: 8000 });
    await answer(page);
    await expect(page.locator('.mx-note')).toContainText('Yes!');
    /* and then shows the two parts it splits into */
    await expect(page.locator('.bw-part')).toHaveCount(2);
    noProblems(watch);
  });

  test('Year 2: build it from six parts', async ({ page }) => {
    await startAt(page, 4);
    await expect(page.locator('.bw-tile')).toHaveCount(6, { timeout: 8000 });
    await answer(page, false);
    await expect(page.locator('.mx-note')).not.toContainText('Yes!');
  });

  test('only words he can read at the week\'s level', async ({ page }) => {
    await startAt(page, 0, { settings: { levels: [2], sounds: [] } });
    await expect(page.locator('.bw-part').first()).toBeVisible({ timeout: 8000 });
    const word = await page.locator('.bw-word').getAttribute('data-word');
    expect(ALL_BIG_WORDS.find((w) => w.text === word)!.level).toBeLessThanOrEqual(2);
  });
});
