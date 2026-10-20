/* Ice Cream Van: Australian coins. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, openSetup, seed, watchPage } from './helpers';
import { coinOf, money } from '../../src/content/maths';

async function startAt(page: Page, step: number): Promise<void> {
  await seed(page, { 'maths-step:ice-cream-van': step });
  await openGame(page, 'ice-cream-van');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

const answerOf = async (page: Page): Promise<string> => (await page.locator('.mx-stage').getAttribute('data-answer'))!;

/** answer whatever is asked: a coin to tap, or a money button */
async function answer(page: Page): Promise<void> {
  await expect(page.locator('.iv-pick:enabled, .mx-choice:enabled').first()).toBeVisible({ timeout: 8000 });
  const want = await answerOf(page);
  if (await page.locator('.mx-choice').count()) await page.locator(`.mx-choice[data-n="${want}"]`).click();
  else await page.locator(`.iv-pick[data-cents="${want}"]`).first().click();
}

test.describe('Ice Cream Van', () => {
  test('a whole round of coins, to the sticker', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0);
    for (let i = 0; i < 8; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i + 1}`, { timeout: 8000 });
      await answer(page);
      await expect(page.locator('.mx-note')).toContainText('Yes!');
    }
    await expect(page.locator('.results .sticker')).toHaveText('🍦', { timeout: 8000 });
    noProblems(watch);
  });

  test('which coin pays: the price tag and the coins', async ({ page }) => {
    await startAt(page, 1);
    await expect(page.locator('.iv-tag')).toBeVisible({ timeout: 8000 });
    const want = Number(await answerOf(page));
    await expect(page.locator(`.iv-pick[data-cents="${want}"]`)).toHaveCount(1);
    await page.locator(`.iv-pick:not([data-cents="${want}"])`).first().click();
    await expect(page.locator('.mx-note')).toContainText('exactly');
  });

  test('Year 2: counting mixed coins shows the running total', async ({ page }) => {
    await startAt(page, 3);
    await answer(page);
    await expect(page.locator('.iv-stage.counted')).toBeVisible();
    await expect(page.locator('.mx-note')).toContainText(' = ');
  });

  test('Year 2: pay the exact price from the purse', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 4);
    await expect(page.locator('.iv-purse .iv-pick').first()).toBeVisible({ timeout: 8000 });
    let price = Number(await answerOf(page));
    /* biggest coins first, as a grown-up pays */
    const coins = await page.locator('.iv-purse .iv-pick').evaluateAll((ns) => ns.map((n) => Number((n as HTMLElement).dataset.cents)));
    for (const c of coins.sort((a, b) => b - a)) {
      if (c > price) continue;
      await page.locator(`.iv-purse .iv-pick[data-cents="${c}"]`).first().click();
      price -= c;
    }
    expect(price).toBe(0);
    await page.getByRole('button', { name: 'Pay' }).click();
    await expect(page.locator('.mx-note')).toContainText('Enjoy it!');
    noProblems(watch);
  });

  test('Year 2: paying too much is not exact', async ({ page }) => {
    await startAt(page, 4);
    await expect(page.locator('.iv-purse .iv-pick').first()).toBeVisible({ timeout: 8000 });
    const all = await page.locator('.iv-purse .iv-pick').count();
    for (let i = 0; i < all; i += 1) await page.locator('.iv-purse .iv-pick').first().click();
    await page.getByRole('button', { name: 'Pay' }).click();
    await expect(page.locator('.mx-note')).toContainText('too much');
  });

  test('Year 2: the change from a note', async ({ page }) => {
    await startAt(page, 5);
    await expect(page.locator('.iv-note')).toBeVisible({ timeout: 8000 });
    await answer(page);
    await expect(page.locator('.mx-note')).toContainText('the change is');
  });

  test('Years 3–4: dollars and cents, where the nought matters', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 6);
    await expect(page.locator('.mx-choice')).toHaveCount(4, { timeout: 8000 });
    await expect(page.locator('.iv-tag.blank')).toHaveText('?');
    const want = Number(await answerOf(page));
    await expect(page.locator('.mx-ask')).toContainText(/\d dollars? and \d+ cents\. Which price tag says that\?/);
    for (const label of await page.locator('.mx-choice').allTextContents()) expect(label).toMatch(/^\$\d+(\.\d\d)?$/);
    await page.locator(`.mx-choice:not([data-n="${want}"])`).first().click();
    await expect(page.locator('.mx-note')).toContainText(`is ${money(want)}.`);
    await expect(page.locator('.iv-tag')).toHaveText(money(want));
    noProblems(watch);
  });

  test('Years 3–4: pay to the 5 cents from the purse', async ({ page }) => {
    await startAt(page, 7);
    await expect(page.locator('.iv-purse .iv-pick').first()).toBeVisible({ timeout: 8000 });
    let price = Number(await answerOf(page));
    expect(price % 5).toBe(0);
    const coins = await page.locator('.iv-purse .iv-pick').evaluateAll((ns) => ns.map((n) => Number((n as HTMLElement).dataset.cents)));
    for (const c of coins.sort((a, b) => b - a)) {
      if (c > price) continue;
      await page.locator(`.iv-purse .iv-pick[data-cents="${c}"]`).first().click();
      price -= c;
    }
    expect(price).toBe(0);
    await page.getByRole('button', { name: 'Pay' }).click();
    await expect(page.locator('.mx-note')).toContainText('Enjoy it!');
  });

  test('Years 3–4: which treat is cheaper, dollars first', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 8);
    await expect(page.locator('.iv-offer:enabled')).toHaveCount(2, { timeout: 8000 });
    const want = await answerOf(page);
    await expect(page.locator(`.iv-offer[data-cents="${want}"]`)).toHaveCount(1);
    await page.locator(`.iv-offer:not([data-cents="${want}"])`).click();
    await expect(page.locator(`.iv-offer.right[data-cents="${want}"]`)).toHaveCount(1);
    await expect(page.locator('.iv-offer.wrong')).toHaveCount(1);
    await expect(page.locator('.mx-note')).toContainText(`so ${money(Number(want))} is cheaper. Get the `);
    noProblems(watch);
  });

  test('Years 3–4: two treats added up, dollars then cents', async ({ page }) => {
    await startAt(page, 9);
    await expect(page.locator('.mx-choice')).toHaveCount(4, { timeout: 8000 });
    await expect(page.locator('.iv-counter .iv-tag')).toHaveCount(2);
    const [a, b] = (await page.locator('.iv-counter .iv-tag').allTextContents()).map((t) => Math.round(Number(t.slice(1)) * 100));
    const want = Number(await answerOf(page));
    expect(want).toBe(a + b);
    await page.locator(`.mx-choice:not([data-n="${want}"])`).first().click();
    await expect(page.locator('.mx-note')).toContainText('Dollars: ');
    await expect(page.locator('.mx-note')).toContainText(`Together: ${money(want)}.`);
  });

  test('Years 3–4: the change from a $5, $10 or $20 note, counted up', async ({ page }) => {
    await startAt(page, 10);
    await expect(page.locator('.iv-note')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.iv-note')).toHaveAttribute('aria-label', /^\$(5|10|20) note$/);
    await expect(page.locator('.mx-choice')).toHaveCount(4);
    const want = Number(await answerOf(page));
    await page.locator(`.mx-choice:not([data-n="${want}"])`).first().click();
    await expect(page.locator('.mx-note')).toContainText('Count up from ');
    /* the jumps add up to it ("5c + 60c + $2 = $2.65"), or there was only
       one ("20c makes $5. The change is 20c.") */
    const said = money(want).replace(/[$.]/g, '\\$&');
    await expect(page.locator('.mx-note')).toHaveText(new RegExp(`The change is (.+ = )?${said}\\.$`));
  });

  test('the coins are photographs of the real ones, at their real sizes', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 3);
    const photos = page.locator('.iv-stage img.iv-photo');
    await expect(photos.first()).toBeVisible({ timeout: 8000 });
    const shown = await photos.evaluateAll((ns) => ns.map((n) => {
      const img = n as HTMLImageElement;
      return { alt: img.alt, loaded: img.complete && img.naturalWidth > 0, width: img.getBoundingClientRect().width };
    }));
    expect(shown.length).toBeGreaterThan(1);
    const cents = await page.locator('.iv-stage .iv-slot').evaluateAll((ns) => ns.map((n) => Number((n as HTMLElement).dataset.cents)));
    for (const [i, c] of cents.entries()) {
      /* named for a screen reader, drawn, and as big as the real coin is, next to the others */
      expect(shown[i].alt).toBe(money(c));
      expect(shown[i].loaded, money(c)).toBe(true);
      expect(shown[i].width).toBeCloseTo(coinOf(c).mm * 3.2, -0.5);
    }
    noProblems(watch);
  });

  test('a grown-up can switch to the drawn coins in setup, and it is remembered', async ({ page }) => {
    await openGame(page, 'ice-cream-van');
    await openSetup(page);
    await page.getByLabel('Coins').selectOption('drawn');
    await page.getByRole('button', { name: 'Set up this game' }).click();
    await page.getByRole('button', { name: '▶ Start' }).click();
    await expect(page.locator('.iv-pick svg.iv-coin').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.iv-photo')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.topbar h1')).toBeVisible();
    await page.getByRole('button', { name: '▶ Start' }).click();
    await expect(page.locator('.iv-pick svg.iv-coin').first()).toBeVisible({ timeout: 8000 });
  });
});
