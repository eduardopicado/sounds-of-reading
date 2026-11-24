/* Solar System: find the planet, out from the Sun, Mystery Planet, bigger or
 * nearer, day and night. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, recordSpeech, said, seed, watchPage } from './helpers';
import { CLUES, PLANETS, SPACE_STEPS, planet, stillFits, type PlanetId } from '../../src/content/space';

const stepOf = (name: string): number => SPACE_STEPS.findIndex((s) => s.name === name);

async function startAt(page: Page, step: number, lang: 'en' | 'pt' = 'en'): Promise<void> {
  await seed(page, { 'maths-step:solar-system': step, 'geo-lang': lang });
  await openGame(page, 'solar-system');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

const stage = (page: Page) => page.locator('.ss-stage');

async function question(page: Page, n: number): Promise<string> {
  await expect(page.locator('.score')).toContainText(`Question ${n} of`, { timeout: 10_000 });
  return (await stage(page).getAttribute('data-answer'))!;
}

test.describe('Solar System', () => {
  test.beforeEach(async ({ page }) => { await recordSpeech(page); });

  test('find the planet with its name: the Sun, the eight in order, and a fact', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0);
    const want = (await question(page, 1)) as PlanetId;
    await expect(page.locator('.mx-ask')).toHaveText(`Where is ${planet(want).name.en}?`);
    await expect(page.locator('.ss-system .ss-tile')).toHaveCount(8);
    expect(await page.locator('.ss-system .ss-tile').evaluateAll((ns) => ns.map((n) => (n as HTMLElement).dataset.planet)))
      .toEqual(['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']);
    await page.locator(`.ss-tile[data-planet="${want}"]`).click();
    await expect(page.locator('.mx-note')).toHaveText(`Yes! ${planet(want).fact.en}`);
    /* a wrong one says what it was, and where the right one is */
    const next = (await question(page, 2)) as PlanetId;
    const other = PLANETS.find((p) => p.id !== next)!;
    await page.locator(`.ss-tile[data-planet="${other.id}"]`).click();
    await expect(page.locator('.mx-note')).toHaveText(`That is ${other.name.en}. ${planet(next).name.en} is here.`);
    noProblems(watch);
  });

  test('out from the Sun: eight in a row, to the sticker', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, stepOf('Out from the Sun'));
    for (let n = 1; n <= 8; n += 1) {
      const want = await question(page, n);
      await expect(page.locator('.ss-slots .ss-tile')).toHaveCount(n - 1);
      await page.locator(`.ss-tray .ss-tile[data-planet="${want}"]`).click();
      await expect(page.locator('.mx-note')).toContainText('Yes! ');
    }
    await expect(page.locator('.results')).toContainText('8 of 8', { timeout: 10_000 });
    noProblems(watch);
  });

  test('Mystery Planet: each card asked turns the planets it rules out, until the secret is found', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, stepOf('Mystery Planet'));
    const secret = (await question(page, 1)) as PlanetId;
    await expect(page.locator('.ss-card')).toHaveCount(4);
    for (let i = 0; i < 8 && !(await page.locator('.mx-note').textContent())?.startsWith('Yes!'); i += 1) {
      const card = page.locator('.ss-card').first();
      if (!(await card.count())) break;
      const id = (await card.getAttribute('data-clue'))!;
      const c = CLUES.find((x) => x.id === id)!;
      const yes = c.yes.includes(secret);
      await card.click();
      await expect(page.locator('.ss-said')).toHaveText(`${c.ask.en} ${yes ? 'Yes!' : 'No.'}`);
      /* the ones it rules out are turned over */
      for (const p of PLANETS) if (c.yes.includes(p.id) !== yes) await expect(page.locator(`.ss-tile[data-planet="${p.id}"]`)).toHaveClass(/out/);
    }
    await expect(page.locator('.mx-note')).toHaveText(`Yes! It is ${planet(secret).name.en}! ${planet(secret).fact.en}`);
    await expect(page.locator('.score')).toContainText('Right first time 1');
    noProblems(watch);
  });

  test('Mystery Planet, he turns them over: one that still fits pops back, with why', async ({ page }) => {
    await startAt(page, stepOf('Mystery Planet: you turn them over'));
    const secret = (await question(page, 1)) as PlanetId;
    const card = page.locator('.ss-card').first();
    const id = await card.getAttribute('data-clue');
    const c = CLUES.find((x) => x.id === id)!;
    const yes = c.yes.includes(secret);
    await card.click();
    await expect(page.locator('.mx-ask')).toHaveText('Turn over the planets it cannot be.');
    await expect(page.locator('.ss-card')).toHaveCount(0);
    /* the secret still fits: it stays up, and he is told so */
    await page.locator(`.ss-tile[data-planet="${secret}"]`).click();
    await expect(page.locator(`.ss-tile[data-planet="${secret}"]`)).not.toHaveClass(/out/);
    await expect(page.locator('.mx-note')).toHaveText(stillFits(planet(secret)).en);
    expect(await said(page)).toContain(stillFits(planet(secret)).en);
    /* turning over the ones that do not fit brings the cards back */
    for (const p of PLANETS) {
      if (c.yes.includes(p.id) !== yes) await page.locator(`.ss-tile[data-planet="${p.id}"]`).click();
    }
    await expect(page.locator('.ss-card').first()).toBeVisible();
    await expect(page.locator('.mx-ask')).toHaveText('I am thinking of a planet. Ask me questions to find it!');
  });

  test('bigger, or nearer the Sun, and day or night at the house', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, stepOf('Bigger, or nearer the Sun?'));
    const want = (await question(page, 1)) as PlanetId;
    await expect(page.locator('.ss-pair .ss-tile')).toHaveCount(2);
    await page.getByRole('button', { name: planet(want).name.en, exact: true }).last().click();
    await expect(page.locator('.mx-note')).toContainText(`Yes! ${planet(want).name.en} is `);
    noProblems(watch);
  });

  test('day and night: the house on the side facing the Sun has day', async ({ page }) => {
    await startAt(page, stepOf('Day and night'));
    const answer = await question(page, 1);
    await expect(page.locator('.ss-daynight')).toBeVisible();
    await page.getByRole('button', { name: answer === 'day' ? 'Day' : 'Night', exact: true }).click();
    await expect(page.locator('.mx-note')).toContainText(answer === 'day' ? 'Yes! Day!' : 'Yes! Night!');
  });

  test('in Portuguese: the names, the question, and the fact', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0, 'pt');
    const want = (await question(page, 1)) as PlanetId;
    const name = planet(want).name.pt;
    await expect(page.locator('.mx-ask')).toHaveText(want === 'earth' ? 'Onde está a Terra?' : `Onde está ${name}?`);
    await expect(page.locator('.ss-tile[data-planet="jupiter"] .ss-name')).toHaveText('Júpiter');
    await page.locator(`.ss-tile[data-planet="${want}"]`).click();
    await expect(page.locator('.mx-note')).toHaveText(`Isso! ${planet(want).fact.pt}`);
    noProblems(watch);
  });

  for (const name of ['Find the planet, with names', 'Out from the Sun', 'Mystery Planet']) {
    test(`fits on the screen (${name}): nothing to scroll sideways, the planets all there`, async ({ page }) => {
      await startAt(page, stepOf(name));
      await question(page, 1);
      const view = page.viewportSize()!;
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(view.width);
      for (const t of await page.locator('.ss-tile').all()) {
        const b = (await t.boundingBox())!;
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width).toBeLessThanOrEqual(view.width);
        expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(40);
      }
    });
  }
});
