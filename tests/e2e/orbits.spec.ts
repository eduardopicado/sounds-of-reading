/* Planet Orbits: the planets going round, to scale, the Earth's year, the
 * Moon, and its shapes. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, recordSpeech, seed, watchPage } from './helpers';
import { ORBIT_STEPS } from '../../src/content/orbits';
import { planet, type PlanetId } from '../../src/content/space';

const stepOf = (task: string): number => ORBIT_STEPS.findIndex((s) => s.task === task);

async function startAt(page: Page, step: number, lang: 'en' | 'pt' = 'en'): Promise<void> {
  await seed(page, { 'maths-step:orbits': step, 'geo-lang': lang });
  await openGame(page, 'orbits');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

async function question(page: Page, n: number): Promise<string> {
  await expect(page.locator('.score')).toContainText(`Question ${n} of`, { timeout: 10_000 });
  await expect(page.locator('.mx-choice').first()).toBeEnabled();
  return (await page.locator('.ob-stage').getAttribute('data-answer'))!;
}

test.describe('Planet Orbits', () => {
  test.beforeEach(async ({ page }) => { await recordSpeech(page); });

  test('the planets go round: the picture moves, and the fastest is the nearest', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, stepOf('fast'));
    const answer = await question(page, 1) as PlanetId;
    await expect(page.locator('.ob-planet')).toHaveCount(8);
    const where = () => page.locator('.ob-planet[data-planet="mercury"]').getAttribute('transform');
    const before = await where();
    await expect.poll(where, { timeout: 3000 }).not.toBe(before);
    await page.getByRole('button', { name: planet(answer).name.en, exact: true }).click();
    await expect(page.locator('.mx-note')).toContainText(`Yes! ${planet(answer).name.en} goes round`);
    noProblems(watch);
  });

  test('a wrong answer shows the right one and why', async ({ page }) => {
    await startAt(page, stepOf('between'));
    const answer = await question(page, 1) as PlanetId;
    const wrong = (await page.locator('.mx-choice').allTextContents()).find((t) => t !== planet(answer).name.en)!;
    await page.getByRole('button', { name: wrong, exact: true }).click();
    await expect(page.locator('.mx-choice.right')).toHaveText(planet(answer).name.en);
    await expect(page.locator('.mx-note')).toContainText(`${planet(answer).name.en} is between`);
  });

  test('to scale: the planet asked about has its orbit marked', async ({ page }) => {
    await startAt(page, stepOf('scale'));
    const answer = await question(page, 1);
    await expect(page.locator('.ob-orbit.marked')).toHaveCount(1);
    await page.getByRole('button', { name: answer, exact: true }).click();
    await expect(page.locator('.mx-note')).toContainText('times as far from the Sun as the Earth');
  });

  test('the Moon\'s shapes: the Moon is drawn where it is', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, stepOf('phases'));
    const answer = await question(page, 1);
    await expect(page.locator('.ob-moon')).toHaveAttribute('data-at', /^(new|first|full|last)$/);
    await page.locator(`.mx-choice[data-n="${answer}"]`).click();
    await expect(page.locator('.mx-note')).toContainText('Yes! ');
    noProblems(watch);
  });

  test('in Portuguese: the question and the answers', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, stepOf('moon'), 'pt');
    const answer = await question(page, 1);
    await expect(page.locator('.mx-ask')).toHaveText(/Lua|luas/);
    await page.locator(`.mx-choice[data-n="${answer}"]`).click();
    await expect(page.locator('.mx-note')).toContainText('Isso! ');
    noProblems(watch);
  });

  test('fits: the picture on the screen, nothing sideways', async ({ page }) => {
    await startAt(page, stepOf('year'));
    await question(page, 1);
    const view = page.viewportSize()!;
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(view.width);
    const b = (await page.locator('.ob-picture').boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(view.width);
    expect(b.width).toBeGreaterThanOrEqual(200);
  });
});
