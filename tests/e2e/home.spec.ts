import { expect, test } from '@playwright/test';
import { expectTapTargets, noProblems, watchPage } from './helpers';

test.describe('home screen', () => {
  test('shows all nine games and opens each one', async ({ page }) => {
    const watch = watchPage(page);
    await page.goto('/');

    const names = await page.locator('.tile-link .name').allTextContents();
    expect(names).toEqual([
      'Memory Match', 'Bingo', 'Sound Sort', 'Word Builder',
      'Roll & Read', 'Real or Silly?', 'Sentence Smash', 'Same Sound, Two Ways',
      'Tricky Words',
    ]);

    for (const path of ['memory-match', 'bingo', 'sound-sort', 'word-builder', 'roll-and-read', 'real-or-silly', 'sentence-smash', 'same-sound', 'tricky-words']) {
      await page.goto('/');
      await page.locator(`.tile-link[data-game="${path}"]`).click();
      await expect(page.locator('.topbar h1')).toBeVisible();
      expect(page.url()).toContain('#/' + path);
      /* and back out again, the way a child leaves a game */
      await page.getByRole('button', { name: 'Back to the games' }).click();
      await expect(page.locator('.tiles')).toBeVisible();
    }
    noProblems(watch);
  });

  test('tiles and chips are big enough to tap', async ({ page }) => {
    await page.goto('/');
    await expectTapTargets(page, '.tile-link');
    await expectTapTargets(page, '.week .chip');
  });

  test('nothing leaves the device and nothing is fetched from elsewhere', async ({ page }) => {
    const watch = watchPage(page);
    await page.goto('/');
    await page.waitForTimeout(600);
    noProblems(watch);
    /* the fonts are ours, not Google's */
    const fontUrls = await page.evaluate(() =>
      [...document.fonts].map((f) => f.family));
    expect(fontUrls.join(' ')).toContain('Andika');
  });

  test('works when localStorage is unavailable', async ({ page }) => {
    const watch = watchPage(page);
    await page.addInitScript(() => {
      /* what a locked-down or private-mode browser does */
      Object.defineProperty(window, 'localStorage', {
        get() { throw new Error('storage blocked'); },
      });
    });
    await page.goto('/');
    await expect(page.locator('.tiles .tile-link')).toHaveCount(9);
    await page.goto('/#/real-or-silly');
    await expect(page.locator('.theword')).toBeVisible();
    noProblems(watch);
  });
});

test.describe("this week's sounds", () => {
  test('a change on the home screen reaches the games and survives a reload', async ({ page }) => {
    const watch = watchPage(page);
    await page.goto('/');

    /* pick level 4 only, then sh only */
    const levels = page.locator('.week .row').filter({ hasText: 'LEVELS' });
    await page.locator('.week .chip', { hasText: /^5/ }).click();
    await expect(page.locator('.week .now')).toHaveText(/Level 4/);
    await page.locator('.week .chip').filter({ hasText: /^sh$/ }).click();
    await expect(page.locator('.week .now')).toHaveText(/Level 4 — sh/);
    expect(await levels.count()).toBeGreaterThan(0);

    /* a game opened now starts from that choice */
    await page.goto('/#/roll-and-read');
    const faces = await page.locator('.cube .face').allTextContents();
    expect(new Set(faces)).toEqual(new Set(['sh']));

    /* and it is still there after a reload, because it is in localStorage */
    await page.goto('/');
    await expect(page.locator('.week .now')).toHaveText(/Level 4 — sh/);
    noProblems(watch);
  });

  test('merging the two th sounds shows one chip instead of two', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.week .chip', { hasText: 'th (them)' })).toBeVisible();
    await page.locator('.week .chip', { hasText: 'Merge the two th sounds' }).click();
    await expect(page.locator('.week .chip', { hasText: 'th (them)' })).toHaveCount(0);
    await expect(page.locator('.week .chip').filter({ hasText: /^th$/ })).toBeVisible();
  });
});

test.describe('sticker book', () => {
  test('finishing a round wins a sticker that lands in the book', async ({ page }) => {
    const watch = watchPage(page);
    await page.goto('/');
    await expect(page.locator('.tray .empty', { hasText: 'first sticker' })).toBeVisible();

    await page.goto('/#/word-builder');
    const tiles = page.locator('.rack .tile');
    for (let i = 0, n = await tiles.count(); i < n; i += 1) {
      await tiles.nth(i).click({ timeout: 5000 }).catch(() => undefined);
      await page.waitForTimeout(70);
    }
    await expect(page.locator('.overlay.show')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.overlay .prize')).not.toBeEmpty();
    const won = await page.locator('.overlay .prize').textContent();

    await page.goto('/');
    await expect(page.locator('.sticker')).toHaveCount(1);
    await expect(page.locator('.sticker')).toHaveText(won!);

    await page.getByRole('button', { name: 'Start a new sticker book' }).click();
    await expect(page.locator('.sticker')).toHaveCount(0);
    noProblems(watch);
  });
});
