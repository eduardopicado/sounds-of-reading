/* Animals of the World: who lives where, on the world map. */

import { expect, test, type Page } from '@playwright/test';
import { expectTapTargets, noProblems, openGame, seed, watchPage } from './helpers';
import { MAP_H, MAP_W, project } from '../../src/content/projection';
import { place, type PlaceId } from '../../src/content/world';
import { ANIMALS, animal, habitat, type HabitatId } from '../../src/content/animals';

async function startAt(page: Page, step: number): Promise<void> {
  await seed(page, { 'maths-step:animals': step });
  await openGame(page, 'animals');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

/** question n is up: its task and its answer (the animal's homes, or the right button) */
async function wanted(page: Page, n: number): Promise<{ task: string; answer: string }> {
  await expect(page.locator('.score')).toContainText(`Question ${n}`, { timeout: 8000 });
  const stage = page.locator('.an-stage');
  await expect(stage).toHaveAttribute('data-answer', /.+/);
  return { task: (await stage.getAttribute('data-task'))!, answer: (await stage.getAttribute('data-answer'))! };
}

/** a tap on a continent, where its name goes */
async function tap(page: Page, id: PlaceId): Promise<void> {
  const box = (await page.locator('.wm-map').boundingBox())!;
  const [lon, lat] = place(id).labels[0];
  const [x, y] = project(lon, lat);
  await page.mouse.click(box.x + (box.width * x) / MAP_W, box.y + (box.height * y) / MAP_H);
}

/** the animal on the card */
const shownText = async (page: Page): Promise<string> => (await page.locator('.an-name').textContent())!.trim();
const shown = shownText;

test.describe('Animals of the World', () => {
  test('a whole round putting animals on their continents, to the sticker', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0);
    /* the continents' names are on the map to begin with */
    await expect(page.locator('.wm-label.continent:visible')).toHaveCount(7);
    const tasks = ['home', 'home', 'home', 'home', 'home', 'home', 'who', 'who'];
    for (let i = 1; i <= 8; i += 1) {
      const q = await wanted(page, i);
      expect(q.task).toBe(tasks[i - 1]);
      if (q.task === 'who') {
        await page.locator(`.mx-choice[data-n="${q.answer}"]`).click();
        await expect(page.locator('.mx-note')).toHaveText(`Yes! ${animal(q.answer).fact.en}`);
        continue;
      }
      const a = animal(await shown(page));
      await expect(page.locator('.mx-ask')).toHaveText(`Where does the ${a.name} live?`);
      expect(q.answer.split(' ')).toEqual(a.homes);
      /* the first three live on one continent only */
      if (i <= 3) expect(a.homes).toHaveLength(1);
      await tap(page, a.homes[0]);
      await expect(page.locator('.mx-note')).toHaveText(`Yes! ${a.fact.en}`);
      await expect(page.locator(`.wm-map [data-place="${a.homes[0]}"]`)).toHaveClass(/right/);
    }
    await expect(page.locator('.results .sticker')).toHaveText('🦘', { timeout: 8000 });
    noProblems(watch);
  });

  test('a wrong continent says which it was, and every home lights up', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0);
    await wanted(page, 1);
    const a = animal(await shown(page));
    const other: PlaceId = a.homes[0] === 'asia' ? 'africa' : 'asia';
    await tap(page, other);
    await expect(page.locator('.mx-note')).toHaveText(`That is ${place(other).name}. ${a.fact.en}`);
    await expect(page.locator(`.wm-map [data-place="${other}"]`)).toHaveClass(/wrong/);
    for (const home of a.homes) await expect(page.locator(`.wm-map [data-place="${home}"]`)).toHaveClass(/right/);
    noProblems(watch);
  });

  test('which animal lives here: the continent glows, and no picture gives it away', async ({ page }) => {
    await startAt(page, 2);
    const q = await wanted(page, 1);
    await expect(page.locator('.an-card')).toBeHidden();
    await expect(page.locator('.wm-map .glow').first()).toBeVisible();
    await expect(page.locator('.mx-choice')).toHaveCount(3);
    await page.locator(`.mx-choice[data-n="${q.answer}"]`).click();
    await expect(page.locator('.an-card')).toBeVisible();
  });

  test('what kind of place: ice, desert, rainforest', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 3);
    const q = await wanted(page, 1);
    const a = animal(await shown(page));
    await expect(page.locator('.mx-ask')).toHaveText(`What kind of place does the ${a.name} live in?`);
    await expect(page.locator(`.mx-choice[data-n="${q.answer}"]`)).toContainText(habitat(q.answer as HabitatId).name.en);
    await page.locator(`.mx-choice[data-n="${q.answer}"]`).click();
    const plural = a.plural[0].toUpperCase() + a.plural.slice(1);
    await expect(page.locator('.mx-note')).toHaveText(`Yes! ${plural} live ${habitat(q.answer as HabitatId).in.en}.`);
    noProblems(watch);
  });

  test('reading the name: no picture until it is answered', async ({ page }) => {
    await startAt(page, 4);
    const q = await wanted(page, 1);
    await expect(page.locator('.an-card')).toHaveClass(/words-only/);
    await expect(page.locator('.an-pic')).toBeHidden();
    await expect(page.locator('.mx-ask')).toHaveText('Read the name. Where does this animal live?');
    await tap(page, q.answer.split(' ')[0] as PlaceId);
    await expect(page.locator('.an-pic')).toBeVisible();
    await expect(page.locator('.mx-note')).toHaveText(/^Yes! /);
  });

  test('every continent it lives on, one tap each', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 5);
    const q = await wanted(page, 1);
    const homes = q.answer.split(' ') as PlaceId[];
    expect(homes.length).toBeGreaterThan(1);
    for (const [i, home] of homes.entries()) {
      await tap(page, home);
      await expect(page.locator(`.wm-map [data-place="${home}"]`)).toHaveClass(/right/);
      if (i < homes.length - 1) await expect(page.locator('.mx-note')).toHaveText('Yes! Find another one.');
    }
    const a = animal(await shown(page));
    await expect(page.locator('.mx-note')).toHaveText(`Yes! ${a.fact.en}`);
    noProblems(watch);
  });

  test('in Portuguese: the question, the card and the buttons', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 3);
    const q = await wanted(page, 1);
    await page.getByRole('button', { name: 'Português' }).click();
    /* the card shows its name in Portuguese now */
    const ptName = await shownText(page);
    const a = ANIMALS.find((x) => x.pt.name === ptName)!;
    await expect(page.locator('.mx-ask')).toHaveText(`Em que tipo de lugar vive ${a.pt.g === 'f' ? 'a' : 'o'} ${a.pt.name}?`);
    await expect(page.locator(`.mx-choice[data-n="${q.answer}"]`)).toContainText(habitat(q.answer as HabitatId).name.pt);
    await page.locator(`.mx-choice[data-n="${q.answer}"]`).click();
    await expect(page.locator('.mx-note')).toHaveText(new RegExp(`^Isso! (Os|As) ${a.ptPlural} vivem `));
    noProblems(watch);
  });

  test('the buttons are big enough to tap', async ({ page }) => {
    await startAt(page, 3);
    await wanted(page, 1);
    await expectTapTargets(page, '.mx-choice');
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });
});
