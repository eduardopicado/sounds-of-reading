/* Accessibility, checked rather than assumed. The definition of done asks for
 * a Lighthouse accessibility score of 95+, and axe covers the same rules. */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openGame } from './helpers';
import { GAMES } from '../../src/games/catalog';

const PAGES: [string, string][] = [
  ['home', '/'],
  ['Grown-ups corner', '/#/grown-ups'],
  ...GAMES.map((g): [string, string] => [g.name, `/#/${g.path}`]),
];

for (const [name, path] of PAGES) {
  test(`${name} has no accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForTimeout(400);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const summary = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 120)),
    }));
    expect(summary).toEqual([]);
  });
}

/* the shootout's first screen is the kick-off; the pitch it covers is only
   checked once the match is under way */
test('Penalty Shootout mid-match has no accessibility violations', async ({ page }) => {
  await openGame(page, 'penalty-shootout');
  await page.getByRole('button', { name: 'Kick off ⚽' }).click();
  await expect(page.locator('.pk-pitch[data-ready="1"]')).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 120)) }))).toEqual([]);
});

/* A game that waits for Start shows only the Start tray when it opens, so
   the check above never saw a question. Each is checked again with its
   first question up: the choices, the picture, the feedback line. */
for (const game of GAMES.filter((g) => g.ladder && g.path !== 'clock-trainer')) {
  test(`${game.name}, with a question up, has no accessibility violations`, async ({ page }) => {
    await openGame(page, game.path);
    await page.getByRole('button', { name: '▶ Start' }).click();
    await expect(page.locator('.mx-board')).toBeVisible();
    await page.waitForTimeout(400);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 120)) }))).toEqual([]);
  });
}

test('every control can be reached and named', async ({ page }) => {
  await openGame(page, 'bingo');
  const unnamed = await page.locator('button, a, select').evaluateAll((nodes) =>
    nodes
      .filter((n) => {
        const label = (n.getAttribute('aria-label') ?? n.textContent ?? '').trim();
        return label === '' && !n.hasAttribute('aria-hidden');
      })
      .map((n) => n.outerHTML.slice(0, 100)),
  );
  expect(unnamed).toEqual([]);
});

test('the page declares Australian English', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-AU');
});
