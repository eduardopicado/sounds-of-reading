/* Accessibility, checked rather than assumed. The definition of done asks for
 * a Lighthouse accessibility score of 95+, and axe covers the same rules. */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = [
  ['home', '/'],
  ['Memory Match', '/#/memory-match'],
  ['Bingo', '/#/bingo'],
  ['Sound Sort', '/#/sound-sort'],
  ['Word Builder', '/#/word-builder'],
  ['Roll & Read', '/#/roll-and-read'],
  ['Real or Silly?', '/#/real-or-silly'],
  ['Sentence Smash', '/#/sentence-smash'],
  ['Same Sound, Two Ways', '/#/same-sound'],
  ['Tricky Words', '/#/tricky-words'],
  ['Sound Rocket', '/#/sound-rocket'],
] as const;

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

test('every control can be reached and named', async ({ page }) => {
  await page.goto('/#/bingo');
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
