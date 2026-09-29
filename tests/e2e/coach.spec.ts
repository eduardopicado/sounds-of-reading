/* Pro mode and the coach: the two ways the app gets harder as he gets better. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, watchPage } from './helpers';

/** start the page with these things already saved on the device.
 *
 *  Once per tab, not once per load: the offline worker reloads the page the
 *  first time it takes over, and a seed that ran again then would quietly
 *  put back whatever the test had just changed. */
async function seed(page: Page, items: Record<string, unknown>): Promise<void> {
  await page.addInitScript((pairs) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    for (const [k, v] of Object.entries(pairs)) localStorage.setItem(`sor:${k}`, JSON.stringify(v));
  }, items);
}

test.describe('Pro mode', () => {
  test('is one switch on the home screen, and every game shows it is on', async ({ page }) => {
    const watch = watchPage(page);
    await page.goto('/');
    await page.getByRole('button', { name: /Pro mode/ }).click();
    await expect(page.getByRole('button', { name: /Pro mode/ })).toHaveAttribute('aria-pressed', 'true');

    await openGame(page, 'penalty-shootout');
    await expect(page.locator('.topbar .pro-badge')).toHaveText('PRO');
    /* four words in the goal instead of three */
    await page.getByRole('button', { name: 'Kick off ⚽' }).click();
    await expect(page.locator('.pk-pitch[data-ready="1"]')).toBeVisible();
    await expect(page.locator('.pk-spot:not([hidden])')).toHaveCount(4);
    noProblems(watch);
  });

  test('puts four pictures in the goal in Pass and Shoot', async ({ page }) => {
    await seed(page, { settings: { levels: [4, 5], sounds: [], pro: true } });
    await openGame(page, 'pass-and-shoot');
    const players = page.locator('.ps-player');
    const n = await players.count();
    for (let i = 0; i < n; i += 1) await players.nth(i).click();
    await expect(page.locator('.ps-pitch')).toHaveAttribute('data-phase', 'shoot');
    await expect(page.locator('.ps-target:not([hidden])')).toHaveCount(4);
  });

  test('gives Tricky Words only a glance', async ({ page }) => {
    await seed(page, { settings: { levels: [4, 5], sounds: [], pro: true } });
    await openGame(page, 'tricky-words');
    const shown = Date.now();
    await expect(page.locator('.tricky-word')).toHaveClass(/gone/, { timeout: 4000 });
    /* 1 second, not 1.6. Timed from outside the page, which adds about a
       third of a second, so a normal round would read about 1.9 here */
    expect(Date.now() - shown).toBeLessThan(1500);
  });

  test('takes away the sound-it-out help in Real or Silly', async ({ page }) => {
    await seed(page, { settings: { levels: [4, 5], sounds: [], pro: true } });
    await openGame(page, 'real-or-silly');
    await expect(page.getByRole('button', { name: /Sound it out/ })).toBeHidden();
  });

  test('is off to begin with', async ({ page }) => {
    await openGame(page, 'penalty-shootout');
    await expect(page.locator('.topbar .pro-badge')).toHaveCount(0);
    await page.getByRole('button', { name: 'Kick off ⚽' }).click();
    await expect(page.locator('.pk-pitch[data-ready="1"]')).toBeVisible();
    await expect(page.locator('.pk-spot:not([hidden])')).toHaveCount(3);
  });
});

test.describe('the coach', () => {
  test('moves the week up a level once the top one is mastered, and can be undone', async ({ page }) => {
    const watch = watchPage(page);
    /* 25 answers at level 5, one of them wrong: mastered */
    await seed(page, {
      settings: { levels: [4, 5], sounds: ['ai'] },
      coach: { sounds: {}, levels: { 5: '1111111111110111111111111' } },
    });
    await page.goto('/');
    await expect(page.locator('.coach-move')).toContainText('Level 5 mastered');
    await expect(page.locator('.coach-move')).toContainText('levels 5 and 6');
    await expect(page.locator('.week .now')).toContainText('Level 5, 6');

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.locator('.coach-move')).toBeHidden();
    /* back to the week the parent chose, sound pick and all */
    await expect(page.locator('.week .now')).toContainText('Level 4, 5');
    await expect(page.locator('.week .now')).toContainText('ai');

    /* and it has to be earned again, not repeated on the next visit */
    await page.reload();
    await expect(page.locator('.coach-move')).toBeHidden();
    await expect(page.locator('.week .now')).toContainText('Level 4, 5');
    noProblems(watch);
  });

  test('says once, and then keeps quiet', async ({ page }) => {
    await seed(page, {
      settings: { levels: [4, 5], sounds: [] },
      coach: { sounds: {}, levels: { 5: '1'.repeat(25) } },
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Great, keep it' }).click();
    await expect(page.locator('.coach-move')).toBeHidden();
    await page.reload();
    await expect(page.locator('.coach-move')).toBeHidden();
    await expect(page.locator('.week .now')).toContainText('Level 5, 6');
  });

  test('does not move him up on too few answers, or with too many wrong', async ({ page }) => {
    await seed(page, {
      settings: { levels: [4, 5], sounds: [] },
      coach: { sounds: {}, levels: { 5: '1111111111111111110101011' } },
    });
    await page.goto('/');
    await expect(page.locator('.coach-move')).toBeHidden();
    await expect(page.locator('.week .now')).toContainText('Level 4, 5');
  });

  test('stays out of it when switched off', async ({ page }) => {
    await seed(page, {
      settings: { levels: [4, 5], sounds: [], coach: false },
      coach: { sounds: {}, levels: { 5: '1'.repeat(25) } },
    });
    await page.goto('/');
    await expect(page.locator('.coach-move')).toBeHidden();
    await expect(page.locator('.week .now')).toContainText('Level 4, 5');
  });

  test('tells the parent which sounds are going well and which need practice', async ({ page }) => {
    await seed(page, { coach: { sounds: { sh: '11111111', ai: '0101000' }, levels: {} } });
    await page.goto('/');
    await expect(page.locator('.coach-report')).toContainText('Going well: sh');
    await expect(page.locator('.coach-report')).toContainText('Needs practice: ai');
  });

  test('notes every answer against the sound it practises', async ({ page }) => {
    await openGame(page, 'real-or-silly');
    await page.getByRole('button', { name: /Real word/ }).click();
    const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('sor:coach') ?? '{}'));
    const runs = Object.values(rec.sounds ?? {}) as string[];
    expect(runs.join('')).toMatch(/^[01]$/);
  });
});
