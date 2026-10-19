/* Capital Cities: Australia's states and their capitals, then the world's. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, seed, watchPage } from './helpers';
import { AUS_H, AUS_W, projectAus } from '../../src/content/australia-projection';
import { CAPITALS, STATES, type StateId } from '../../src/content/capitals';
import { country } from '../../src/content/flags';

const state = (id: string) => STATES.find((s) => s.id === (id as StateId))!;

async function startAt(page: Page, step: number): Promise<void> {
  await seed(page, { 'maths-step:capitals': step });
  await openGame(page, 'capitals');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

/** the answer the question is after, once it is up */
async function wanted(page: Page, n: number): Promise<string> {
  await expect(page.locator('.score')).toContainText(`Question ${n}`, { timeout: 8000 });
  return (await page.locator('.cc-stage').getAttribute('data-answer'))!;
}

/** a tap on the map of Australia at a longitude and latitude */
async function tapAt(page: Page, lon: number, lat: number): Promise<void> {
  const box = (await page.locator('.au-map').boundingBox())!;
  const [x, y] = projectAus(lon, lat);
  await page.mouse.click(box.x + (box.width * x) / AUS_W, box.y + (box.height * y) / AUS_H);
}

test.describe('Capital Cities', () => {
  test('a whole round, from the states to their capitals, to the sticker', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0);
    for (let i = 1; i <= 8; i += 1) {
      const want = await wanted(page, i);
      if (STATES.some((s) => s.id === want)) {
        /* the states, with their names and then without: tap where the name goes */
        await tapAt(page, ...state(want).label);
        await expect(page.locator('.mx-note')).toHaveText(`Yes! ${state(want).fact}`);
      } else {
        await page.locator(`.mx-choice[data-n="${want}"]`).click();
        await expect(page.locator('.mx-note')).toContainText(`Yes! ${want} is the capital of `);
      }
    }
    await expect(page.locator('.results .sticker')).toHaveText('🏛️', { timeout: 8000 });
    noProblems(watch);
  });

  test('a wrong state says which one it was, and shows the right one', async ({ page }) => {
    await startAt(page, 1);
    const want = await wanted(page, 1);
    const other = want === 'WA' ? state('QLD') : state('WA');
    await tapAt(page, ...other.label);
    const right = state(want);
    await expect(page.locator('.mx-note')).toHaveText(
      `That is ${other.called}. ${right.called[0].toUpperCase()}${right.called.slice(1)} is here.`,
    );
    await expect(page.locator(`.au-state[data-state="${want}"]`)).toHaveClass(/right/);
    await expect(page.locator(`.au-state[data-state="${other.id}"]`)).toHaveClass(/wrong/);
  });

  test("a state's capital, and a wrong one told whose capital it is", async ({ page }) => {
    await startAt(page, 2);
    const want = await wanted(page, 1);
    const s = STATES.find((x) => x.capital === want)!;
    await expect(page.locator(`.au-state[data-state="${s.id}"]`)).toHaveClass(/glow/);
    const picked = (await page.locator('.mx-choice').evaluateAll((bs, w) =>
      bs.map((b) => (b as HTMLElement).dataset.n!).find((n) => n !== w), want))!;
    await page.locator(`.mx-choice[data-n="${picked}"]`).click();
    const other = STATES.find((x) => x.capital === picked)!;
    await expect(page.locator('.mx-note')).toHaveText(
      `${picked} is the capital of ${other.called}. ${want} is the capital of ${s.called}.`,
    );
    /* and the right city comes up on the map */
    await expect(page.locator(`.au-label.city[data-city="${want}"]`)).toBeVisible();
  });

  test('finds the capital city among the dots', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 3);
    for (let i = 1; i <= 3; i += 1) {
      const want = await wanted(page, i);
      await expect(page.locator('.au-city')).toHaveCount(8);
      const s = STATES.find((x) => x.capital === want)!;
      await tapAt(page, ...s.at);
      await expect(page.locator('.mx-note')).toHaveText(`Yes! ${want} is the capital of ${s.called}.`);
    }
    noProblems(watch);
  });

  test("the world's capitals, with the country's flag", async ({ page }) => {
    await startAt(page, 4);
    const want = await wanted(page, 1);
    const c = CAPITALS.find((x) => x.capital === want)!;
    await expect(page.locator('.cc-flag')).toHaveText(country(c.country).flag);
    await expect(page.locator('.mx-ask')).toHaveText(`What is the capital of ${country(c.country).name}?`);
    await page.locator(`.mx-choice[data-n="${want}"]`).click();
    await expect(page.locator('.mx-note')).toContainText(`Yes! ${want} is the capital of`);
  });

  test('not always the biggest city: a bigger one picked is told so', async ({ page }) => {
    await startAt(page, 5);
    const want = await wanted(page, 1);
    const c = CAPITALS.find((x) => x.capital === want)!;
    await page.locator(`.mx-choice[data-n="${c.bigger![0]}"]`).click();
    const name = country(c.country).name;
    await expect(page.locator('.mx-note')).toHaveText(
      `${want} is the capital of ${name}. ${c.bigger!.join(' and ')} ${c.bigger!.length > 1 ? 'are' : 'is'} bigger.`,
    );
  });
});
