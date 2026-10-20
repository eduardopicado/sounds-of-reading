/* Weigh-In: the balance, blocks, then kilograms and weight classes, then grams. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, seed, watchPage } from './helpers';

async function startAt(page: Page, step: number, extra: Record<string, unknown> = {}): Promise<void> {
  await seed(page, { 'maths-step:weigh-in': step, ...extra });
  await openGame(page, 'weigh-in');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

/** the card carries the answer for the tests, as the other maths games do */
async function answer(page: Page, right = true): Promise<string> {
  await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
  const want = (await page.locator('.wi-card').getAttribute('data-answer'))!;
  const pick = right ? page.locator(`.mx-choice[data-n="${want}"]`) : page.locator(`.mx-choice:not([data-n="${want}"])`).first();
  await pick.click();
  return want;
}

test.describe('Weigh-In', () => {
  test('a whole round on the balance, to the sticker', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0);
    for (let i = 0; i < 8; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i + 1}`, { timeout: 8000 });
      await answer(page);
      await expect(page.locator('.mx-note')).toContainText('Yes!');
    }
    await expect(page.locator('.results')).toContainText('right first time', { timeout: 8000 });
    await expect(page.locator('.results .sticker')).toHaveText('⚖️');
    noProblems(watch);
  });

  test('the heavier side goes down, and a miss says so', async ({ page }) => {
    await startAt(page, 0);
    await expect(page.locator('.wi-pic')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.mx-ask')).toHaveText('Which is heavier?');
    await answer(page, false);
    await expect(page.locator('.mx-note')).toContainText('The side that goes down is heavier');
  });

  test('blocks: the balance is level and he counts the blocks', async ({ page }) => {
    await startAt(page, 2);
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
    const want = Number(await page.locator('.wi-card').getAttribute('data-answer'));
    await expect(page.locator('.wi-block')).toHaveCount(want);
    await answer(page);
    await expect(page.locator('.mx-note')).toContainText(`${want} blocks`);
  });

  test('Year 2: read the scale in kilograms', async ({ page }) => {
    await startAt(page, 3);
    await expect(page.locator('.wi-scale')).toBeVisible({ timeout: 8000 });
    const kg = await page.locator('.wi-scale').getAttribute('data-value');
    expect(await page.locator('.wi-card').getAttribute('data-answer')).toBe(kg);
    await answer(page);
    await expect(page.locator('.mx-note')).toContainText(`${kg} kilograms`);
  });

  test('Year 2: the weight class, in English and Portuguese', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 4);
    await expect(page.locator('.wi-classes tr')).toHaveCount(5, { timeout: 8000 });
    await expect(page.locator('.wi-classes')).toContainText('up to 20 kg');
    await page.getByRole('button', { name: 'Português' }).click();
    await expect(page.locator('.wi-classes')).toContainText('até 20 kg');
    await expect(page.locator('.mx-ask')).toHaveText('Em qual categoria o Azul luta?');
    await answer(page);
    await expect(page.locator('.mx-note')).toContainText('Isso!');
    noProblems(watch);
  });

  test('Year 2: with the gi on, add or take away 2 kg', async ({ page }) => {
    await startAt(page, 5);
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
    await expect(page.locator('.mx-ask')).toContainText('gi');
    await answer(page);
    await expect(page.locator('.mx-note')).toContainText(/take away 2|add 2/);
  });

  test('Years 3–4: grams on the kitchen scale', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 6);
    for (let i = 1; i <= 3; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i}`, { timeout: 8000 });
      await expect(page.locator('.wi-scale')).toHaveAttribute('data-unit', 'g');
      const g = await page.locator('.wi-scale').getAttribute('data-value');
      await expect(page.locator('.mx-ask')).toHaveText(/^How many grams does the .+ weigh\?$/);
      /* the buttons say grams */
      await expect(page.locator(`.mx-choice[data-n="${g}"]`)).toHaveText(`${g} g`);
      expect(await answer(page)).toBe(g);
      await expect(page.locator('.mx-note')).toContainText(`weighs ${g} grams`);
    }
    noProblems(watch);
  });

  test('Years 3–4: how many more grams make a kilogram, and a miss shows how', async ({ page }) => {
    await startAt(page, 7);
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
    const g = Number(await page.locator('.wi-scale').getAttribute('data-value'));
    expect(Number(await page.locator('.wi-card').getAttribute('data-answer'))).toBe(1000 - g);
    await expect(page.locator('.wi-on-scale')).toContainText('🍌');
    await answer(page, false);
    await expect(page.locator('.mx-note')).toContainText(`The scale shows ${g} grams. 1 kilogram is 1000 grams`);
    await expect(page.locator('.mx-note')).toContainText(`${1000 - g} grams more.`);
  });

  test('Year 4: between the numbers, working out what each space is worth', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 8);
    for (let i = 1; i <= 3; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i}`, { timeout: 8000 });
      await expect(page.locator('.mx-choice').first()).toBeEnabled();
      /* the pointer is on a mark with no number */
      const value = await page.locator('.wi-scale').getAttribute('data-value');
      await expect(page.locator('.wi-scale text', { hasText: new RegExp(`^${value}$`) })).toHaveCount(0);
      await answer(page, i !== 1);
      await expect(page.locator('.mx-note')).toContainText(/each space is (2|20|25|50|100) (grams|kilograms)\. Count on from \d+: /);
    }
    noProblems(watch);
  });

  test('Years 3–4: which bag is heavier, and by how much, in Portuguese too', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 9);
    for (let i = 1; i <= 3; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i}`, { timeout: 8000 });
      await expect(page.locator('.wi-bag')).toHaveCount(2);
      await expect(page.locator('.mx-ask')).toHaveText(i === 1 ? 'Which bag is heavier?' : 'Qual mochila é mais pesada?');
      if (i === 1) {
        await expect(page.locator('.wi-bag.blue .wi-tag')).toHaveText(/^\d( kg)?( \d+ g)?$|^\d+ g$/);
        await expect(page.locator('.mx-choice[data-n="Blue"]')).toHaveText("Blue's bag");
      }
      const side = await answer(page);
      /* then how much: the second question names the heavier bag */
      await expect(page.locator('.wi-bag.heavier')).toHaveAttribute('data-side', side);
      await expect(page.locator('.mx-ask')).toHaveText(i === 1 ? `How much heavier is ${side}'s bag?` : `Quanto a mochila do ${side === 'Blue' ? 'Azul' : 'Branco'} pesa a mais?`);
      const by = await answer(page);
      await expect(page.locator('.mx-note')).toContainText(i === 1 ? `bag is ${by} g heavier.` : `é ${by} g mais pesada.`);
      if (i === 1) {
        await page.getByRole('button', { name: 'Português' }).click();
        await expect(page.locator('.mx-note')).toContainText('Isso!');
      }
    }
    noProblems(watch);
  });

  test('Years 3–4: the wrong bag picked, then the amount, is not right first time', async ({ page }) => {
    await startAt(page, 9);
    /* answer() gives back the right answer, here the heavier bag he did not pick */
    const heavier = await answer(page, false);
    await expect(page.locator('.wi-bag.heavier')).toHaveAttribute('data-side', heavier);
    const by = await answer(page);
    await expect(page.locator('.mx-note')).not.toContainText('Yes!');
    await expect(page.locator('.mx-note')).toContainText(`${heavier}'s bag is ${by} g heavier.`);
  });
});
