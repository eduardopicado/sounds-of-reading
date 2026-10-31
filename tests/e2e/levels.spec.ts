/* Levels 9 and 10, after the school's eight: other ways to write a vowel,
 * then the letters that say nothing or another sound. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, openSetup, watchPage } from './helpers';

/** start with these saved on the device, once per tab (see coach.spec.ts) */
async function seed(page: Page, items: Record<string, unknown>): Promise<void> {
  await page.addInitScript((pairs) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    for (const [k, v] of Object.entries(pairs)) localStorage.setItem(`sor:${k}`, JSON.stringify(v));
  }, items);
}

const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('sor:settings') ?? '{}'));

test('the grown-ups corner offers levels 9 and 10, kept in order, with their sounds', async ({ page }) => {
  const watch = watchPage(page);
  await seed(page, { settings: { levels: [], sounds: [] } });
  await openGame(page, 'grown-ups');
  /* 10 first, then 9: saved as 9 and 10, not "10" before "9" */
  await page.locator('.week .chip', { hasText: /^10kn/ }).click();
  await page.locator('.week .chip', { hasText: /^9ey/ }).click();
  expect((await saved(page)).levels).toEqual([9, 10]);
  await expect(page.locator('.week .group-name')).toHaveText(['Level 9', 'Level 10']);
  for (const name of ['ey (key)', 'eigh', 'kn', 'ch (school)', 'o (son)']) {
    await expect(page.locator('.week .chip').filter({ hasText: new RegExp(`^${name.replace(/[()]/g, '\\$&')}$`) })).toBeVisible();
  }
  /* ten level chips still fit the width, phone included */
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  noProblems(watch);
});

test('Sound Sort sorts the silent letters, each word marked where its sound is', async ({ page }) => {
  const watch = watchPage(page);
  await seed(page, { settings: { levels: [10], sounds: [] } });
  await openGame(page, 'sound-sort');
  await openSetup(page);
  await page.getByLabel('Which sorting task').selectOption({ label: 'kn · wr · mb' });
  await page.getByRole('button', { name: 'Set up this game' }).click();
  await expect(page.locator('.bin .name')).toHaveText(['kn', 'wr', 'mb']);

  /* try the bins in turn until one takes it: the word lands there marked */
  const score = page.locator('.score b').first();
  for (let i = 0; i < 3 && (await score.textContent()) === '0'; i += 1) {
    await page.locator('.bin').nth(i).click();
    await page.waitForTimeout(900);
  }
  await expect(score).toHaveText('1');
  const tile = page.locator('.bin .stack .tile').first();
  const bin = await tile.locator('xpath=ancestor::button[contains(@class,"bin")]').getAttribute('data-sound');
  expect((await tile.locator('.gr').allTextContents()).join('')).toBe(bin);
  noProblems(watch);
});

test('Read and Point offers stories up to the last level that has them', async ({ page }) => {
  await seed(page, { settings: { levels: [9, 10], sounds: [] } });
  await openGame(page, 'read-and-point');
  const upTo = page.getByLabel('Stories up to');
  await expect(upTo).toHaveValue('8');
  await expect(upTo.locator('option')).toHaveCount(8);
});
