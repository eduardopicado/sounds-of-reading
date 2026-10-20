/* Flags of the World: which flag is which country, and where it is. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, seed, watchPage } from './helpers';
import { COUNTRIES, LOOKALIKES, country } from '../../src/content/flags';

async function startAt(page: Page, step: number): Promise<void> {
  await seed(page, { 'maths-step:flags': step });
  await openGame(page, 'flags');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

/** the country the question is after, once it is up */
async function wanted(page: Page, n: number): Promise<string> {
  await expect(page.locator('.score')).toContainText(`Question ${n}`, { timeout: 8000 });
  return (await page.locator('.fl-stage').getAttribute('data-answer'))!;
}

/** a point well inside a country on the screen: of the points on its
    biggest part, the one nearest their middle, so a tap is not on a border */
async function inside(page: Page, id: string): Promise<{ x: number; y: number }> {
  const at = await page.evaluate((id) => {
    const paths = [...document.querySelectorAll<SVGPathElement>(`.wm-map path[data-country="${id}"]`)];
    let best: { x: number; y: number }[] = [];
    for (const path of paths) {
      const box = path.getBBox();
      const svg = path.ownerSVGElement!;
      const m = path.getScreenCTM()!;
      const found: { x: number; y: number }[] = [];
      for (let i = 1; i < 20; i += 1) {
        for (let j = 1; j < 20; j += 1) {
          const p = svg.createSVGPoint();
          p.x = box.x + (box.width * i) / 20;
          p.y = box.y + (box.height * j) / 20;
          if (!path.isPointInFill(p)) continue;
          const s = p.matrixTransform(m);
          /* and nothing else on top of it there */
          if (document.elementFromPoint(s.x, s.y)?.getAttribute('data-country') === id) found.push({ x: s.x, y: s.y });
        }
      }
      /* Alaska is part of the United States, but not the part to tap */
      if (found.length > best.length) best = found;
    }
    if (!best.length) return null;
    const mx = best.reduce((a, p) => a + p.x, 0) / best.length;
    const my = best.reduce((a, p) => a + p.y, 0) / best.length;
    return best.reduce((a, p) => (Math.hypot(p.x - mx, p.y - my) < Math.hypot(a.x - mx, a.y - my) ? p : a));
  }, id);
  expect(at, id).not.toBeNull();
  return at!;
}

test.describe('Flags of the World', () => {
  test('a whole round, from picking the flag to naming it, to the sticker', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0);
    for (let i = 1; i <= 8; i += 1) {
      const want = await wanted(page, i);
      await page.locator(`.mx-choice[data-n="${want}"]`).click();
      await expect(page.locator('.mx-note')).toHaveText(`Yes! ${country(want).looks}`);
    }
    await expect(page.locator('.results .sticker')).toHaveText('🎌', { timeout: 8000 });
    noProblems(watch);
  });

  test('a wrong flag says whose it is, and what the right one looks like', async ({ page }) => {
    await startAt(page, 0);
    const want = await wanted(page, 1);
    const other = (await page.locator('.mx-choice').evaluateAll((bs, w) =>
      bs.map((b) => (b as HTMLElement).dataset.n!).find((n) => n !== w), want))!;
    await expect(page.locator('.mx-ask')).toHaveText(`Which is the flag of ${country(want).name}?`);
    await page.locator(`.mx-choice[data-n="${other}"]`).click();
    await expect(page.locator('.mx-note')).toHaveText(`That is the flag of ${country(other).name}. ${country(want).looks}`);
    await expect(page.locator(`.mx-choice[data-n="${want}"]`)).toHaveClass(/right/);
  });

  test('whose flag: the flag is shown, and the names are to read', async ({ page }) => {
    await startAt(page, 1);
    const want = await wanted(page, 1);
    await expect(page.locator('.fl-flag')).toHaveText(country(want).flag);
    const names = await page.locator('.mx-choice').allTextContents();
    expect(names).toHaveLength(3);
    await page.locator(`.mx-choice[data-n="${want}"]`).click();
    await expect(page.locator('.mx-note')).toContainText('Yes!');
  });

  test('finds the country on the map, with its flag beside the question', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 3);
    for (let i = 1; i <= 3; i += 1) {
      const want = await wanted(page, i);
      await expect(page.locator('.mx-ask')).toHaveText(`Where is ${country(want).name}?`);
      await expect(page.locator('.fl-flag')).toHaveText(country(want).flag);
      const at = await inside(page, want);
      await page.mouse.click(at.x, at.y);
      await expect(page.locator('.mx-note')).toHaveText(`Yes! That is ${country(want).name}.`);
      await expect(page.locator(`.wm-map path[data-country="${want}"]`).first()).toHaveClass(/right/);
    }
    noProblems(watch);
  });

  test('a wrong country on the map is named, and the right one shown', async ({ page }) => {
    await startAt(page, 3);
    const want = await wanted(page, 1);
    /* another of the big countries he knows */
    const other = COUNTRIES.find((c) => c.big && c.id !== want)!;
    const at = await inside(page, other.id);
    await page.mouse.click(at.x, at.y);
    const here = `${country(want).name[0].toUpperCase()}${country(want).name.slice(1)} is here.`;
    await expect(page.locator('.mx-note')).toHaveText(`That is ${other.name}. ${here}`);
    await expect(page.locator(`.wm-map path[data-country="${other.id}"]`).first()).toHaveClass(/wrong/);
  });

  test('look closely: the flags that are easy to mix up, and how to tell them apart', async ({ page }) => {
    await startAt(page, 4);
    const want = await wanted(page, 1);
    const group = LOOKALIKES.find((l) => l.ids.includes(want))!;
    const offered = await page.locator('.mx-choice').evaluateAll((bs) => bs.map((b) => (b as HTMLElement).dataset.n!));
    expect(offered.sort()).toEqual([...group.ids].sort());
    await page.locator(`.mx-choice[data-n="${want}"]`).click();
    await expect(page.locator('.mx-note')).toHaveText(`Yes! ${group.tell}`);
  });

  test("what's on the flag: one flag offered has it", async ({ page }) => {
    await startAt(page, 5);
    const want = await wanted(page, 1);
    await expect(page.locator('.mx-ask')).toHaveText(/^Which flag has .+\?$/);
    await page.locator(`.mx-choice[data-n="${want}"]`).click();
    await expect(page.locator('.mx-note')).toHaveText(`Yes! ${country(want).looks}`);
  });
});
