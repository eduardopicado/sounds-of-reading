/* Accessibility, checked rather than assumed. The definition of done asks for
 * a Lighthouse accessibility score of 95+, and axe covers the same rules. */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = [
  ['home', '/'],
  ['Grown-ups corner', '/#/grown-ups'],
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
  ['Penalty Shootout', '/#/penalty-shootout'],
  ['Pass and Shoot', '/#/pass-and-shoot'],
  ['Be the Commentator', '/#/be-the-commentator'],
  ['Build the Word', '/#/build-the-word'],
  ['Coach Says', '/#/coach-says'],
  ['Big Words', '/#/big-words'],
  ['Trace It', '/#/trace-it'],
  ['Tall, Small, Tail', '/#/tall-small-tail'],
  ['Flash Count', '/#/flash-count'],
  ['Off the Bench', '/#/off-the-bench'],
  ['Scoreboard Sums', '/#/scoreboard-sums'],
  ['Number Line Penalty', '/#/number-line-penalty'],
  ['Team Buses', '/#/team-buses'],
  ['Keepy-Uppy Count', '/#/keepy-uppy'],
  ['Training Drills', '/#/training-drills'],
  ['Half-Time Oranges', '/#/half-time-oranges'],
  ['Jump Line', '/#/jump-line'],
  ['Match Clock', '/#/match-clock'],
  ['Fan Survey', '/#/fan-survey'],
  ['Fact Family Formation', '/#/fact-family'],
  ['Kit and Ball Shapes', '/#/kit-shapes'],
  ["Coach's Whiteboard", '/#/coach-whiteboard'],
  ['Ice Cream Van', '/#/ice-cream-van'],
  ["Ref's Call", '/#/refs-call'],
  ['Match Maths', '/#/match-maths'],
  ['Weigh-In', '/#/weigh-in'],
  ["Ref's Signals", '/#/refs-signals'],
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

/* the shootout's first screen is the kick-off; the pitch it covers is only
   checked once the match is under way */
test('Penalty Shootout mid-match has no accessibility violations', async ({ page }) => {
  await page.goto('/#/penalty-shootout');
  await page.getByRole('button', { name: 'Kick off ⚽' }).click();
  await expect(page.locator('.pk-pitch[data-ready="1"]')).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 120)) }))).toEqual([]);
});

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
