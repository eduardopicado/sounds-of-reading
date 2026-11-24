/* Code the Striker: plan the arrows, press Go, and the player follows. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, recordSpeech, seed, watchPage } from './helpers';
import { ASK, CODE_STEPS, SAYS, shortest, solves, type Card, type Puzzle } from '../../src/content/coding';

const stepOf = (task: string): number => CODE_STEPS.findIndex((s) => s.task === task);

async function startAt(page: Page, step: number): Promise<void> {
  await seed(page, { 'maths-step:code-the-striker': step });
  await openGame(page, 'code-the-striker');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

async function puzzle(page: Page, n: number): Promise<Puzzle> {
  await expect(page.locator('.score')).toContainText(`Puzzle ${n} of`, { timeout: 15_000 });
  await expect(page.locator('[data-key="go"]')).toBeEnabled();
  return JSON.parse((await page.locator('.cs-stage').getAttribute('data-puzzle'))!) as Puzzle;
}

/** tap in a program, a card at a time (repeat taps for ×2, ×3) */
async function enter(page: Page, cards: Card[]): Promise<void> {
  for (const c of cards) {
    await page.locator(`[data-key="${c.dir}"]`).click();
    for (let t = 1; t < c.times; t += 1) await page.locator('[data-key="repeat"]').click();
  }
}

test.describe('Code the Striker', () => {
  test.beforeEach(async ({ page }) => { await recordSpeech(page); });

  test('a program that works takes the player to the ball, first time', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0);
    const p = await puzzle(page, 1);
    await expect(page.locator('.mx-ask')).toHaveText(ASK.line);
    await expect(page.locator('.cs-cell')).toHaveCount(36);
    const best = shortest(p)!;
    await enter(page, best);
    await expect(page.locator('.cs-program .cs-card')).toHaveCount(best.length);
    await page.locator('[data-key="go"]').click();
    await expect(page.locator('.mx-note')).toHaveText(SAYS.done, { timeout: 10_000 });
    await expect(page.locator('.score')).toContainText('Right first time 1');
    await puzzle(page, 2);
    noProblems(watch);
  });

  test('a program that falls short says so, keeps the cards to fix, and a card can be taken out', async ({ page }) => {
    await startAt(page, 0);
    const p = await puzzle(page, 1);
    const best = shortest(p)!;
    await enter(page, best.slice(0, 1));
    await page.locator('[data-key="go"]').click();
    await expect(page.locator('.mx-note')).toHaveText(SAYS.short, { timeout: 10_000 });
    await expect(page.locator('[data-key="go"]')).toBeEnabled({ timeout: 10_000 });
    await expect(page.locator('.cs-program .cs-card')).toHaveCount(1);
    /* a wrong card added, then tapped out */
    await page.locator('[data-key="down"]').click();
    await page.locator('.cs-program .cs-card').last().click();
    await expect(page.locator('.cs-program .cs-card')).toHaveCount(1);
    await enter(page, best.slice(1));
    await page.locator('[data-key="go"]').click();
    await expect(page.locator('.mx-note')).toHaveText(SAYS.done, { timeout: 10_000 });
    /* worked on the second go: not right first time */
    await expect(page.locator('.score')).toContainText('Right first time 0');
  });

  test('three goes wrong, and a program that works is shown running', async ({ page }) => {
    await startAt(page, 0);
    const p = await puzzle(page, 1);
    /* off the pitch every time: straight at the nearest edge, six squares */
    const away: Card['dir'] = p.start.y <= 2 ? 'up' : 'down';
    for (let go = 0; go < 3; go += 1) {
      await expect(page.locator('[data-key="go"]')).toBeEnabled({ timeout: 10_000 });
      if (go === 0) await enter(page, Array.from({ length: 6 }, () => ({ dir: away, times: 1 })));
      await page.locator('[data-key="go"]').click();
      await expect(page.locator('.mx-note')).toHaveText(SAYS.edge, { timeout: 10_000 });
    }
    await expect(page.locator('.mx-note')).toHaveText(SAYS.shown, { timeout: 10_000 });
    const shown = await page.locator('.cs-program .cs-card').evaluateAll((ns) => ns.map((n) => ({ dir: (n as HTMLElement).dataset.dir, times: Number((n as HTMLElement).dataset.times) })));
    expect(solves(p, shown as Card[])).toBe(true);
    await puzzle(page, 2);
  });

  test('the bug step starts with a program that goes wrong; fixed, it works', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, stepOf('bug'));
    const p = await puzzle(page, 1);
    await expect(page.locator('.cs-program .cs-card')).toHaveCount(p.given!.length);
    await expect(page.locator('.cs-cone')).toHaveCount(p.cones.length);
    /* take out every card and put the working program in */
    for (let i = 0; i < p.given!.length; i += 1) await page.locator('[data-key="back"]').click();
    await enter(page, shortest(p)!);
    await page.locator('[data-key="go"]').click();
    await expect(page.locator('.mx-note')).toHaveText(SAYS.done, { timeout: 10_000 });
    noProblems(watch);
  });

  test('ball, then goal', async ({ page }) => {
    await startAt(page, stepOf('goal'));
    const p = await puzzle(page, 1);
    await expect(page.locator('.cs-goal')).toBeVisible();
    await enter(page, shortest(p)!);
    await page.locator('[data-key="go"]').click();
    await expect(page.locator('.mx-note')).toHaveText(SAYS.goal, { timeout: 15_000 });
  });

  test('repeat: two cards, each going further', async ({ page }) => {
    await startAt(page, stepOf('repeat'));
    const p = await puzzle(page, 1);
    const best = shortest(p, true)!;
    expect(best).toHaveLength(2);
    await enter(page, best);
    await expect(page.locator('.cs-times').first()).toHaveText(`×${best[0].times}`);
    /* a third card is not allowed */
    await page.locator('[data-key="up"]').click();
    await expect(page.locator('.cs-program .cs-card')).toHaveCount(2);
    await expect(page.locator('.mx-note')).toHaveText(SAYS.tooMany);
    await page.locator('[data-key="go"]').click();
    await expect(page.locator('.mx-note')).toHaveText(SAYS.done, { timeout: 15_000 });
  });

  test('fits on the screen: the pitch, the program and Go, nothing sideways', async ({ page }) => {
    await startAt(page, stepOf('cones'));
    await puzzle(page, 1);
    const view = page.viewportSize()!;
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(view.width);
    for (const sel of ['.cs-pitch', '.cs-program', '[data-key="go"]', '[data-key="left"]']) {
      const b = (await page.locator(sel).boundingBox())!;
      expect(b.x, sel).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width, sel).toBeLessThanOrEqual(view.width);
    }
    for (const k of await page.locator('.cs-key, .cs-go').all()) expect(Math.min(...Object.values((await k.boundingBox())!).slice(2))).toBeGreaterThanOrEqual(44);
  });
});
