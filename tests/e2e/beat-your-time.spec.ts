/* Beat Your Time: a story read three times, a grown-up timing each read,
 * and the reads raced. The page's clock is a test clock, so a read takes
 * exactly as long as the test says. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, recordSpeech, said, seed, watchPage } from './helpers';
import { ALL_STORIES } from '../../src/content/index';
import { SAYS, wordCount } from '../../src/content/beat-time';

/** Go, the countdown (3, 2, 1 at 700 ms each), a read of `ms`, then Finished */
async function readFor(page: Page, ms: number, stuckOn?: string): Promise<void> {
  await page.getByRole('button', { name: '▶ Go!' }).click();
  await expect(page.locator('.bt-count')).toBeVisible();
  await page.clock.runFor(2100);
  await expect(page.getByRole('button', { name: '🏁 Finished!' })).toBeVisible();
  if (stuckOn) await page.locator(`.rp-word[data-word="${stuckOn}"]`).first().click();
  await page.clock.runFor(ms);
  await page.getByRole('button', { name: '🏁 Finished!' }).click();
}

const last = async (page: Page): Promise<string | undefined> => (await said(page)).at(-1);

/** the game opened, and its clock stopped: from here time moves only when
 * the test moves it, so a read takes exactly as long as the test says
 * (a running test clock drifts on, by a second on a slow WebKit run) */
async function open(page: Page): Promise<void> {
  await openGame(page, 'beat-your-time');
  await expect(page.locator('.bt-pick').first()).toBeVisible();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
}

test.describe('Beat Your Time', () => {
  test('three reads of a story, each against the one before, then the race and a sticker', async ({ page }) => {
    const watch = watchPage(page);
    await page.clock.install();
    await recordSpeech(page);
    await seed(page, { settings: { levels: [5], sounds: [] } });
    await open(page);

    /* his level's stories come first */
    const first = page.locator('.bt-pick').first();
    const title = (await first.getAttribute('data-story'))!;
    const story = ALL_STORIES.find((s) => s.title === title)!;
    expect(story.level).toBeGreaterThanOrEqual(4);
    await expect(first).toContainText(`${wordCount(story)} words`);
    await first.click();
    await expect(page.locator('.rp-title')).toHaveText(title);
    await expect(page.locator('.score')).toContainText('Read 1 of 3');

    /* read 1: no time to beat yet, and a word he got stuck on */
    await expect(page.locator('.bt-hint')).toContainText('They tap Go');
    const word = (await page.locator('.rp-word').nth(3).getAttribute('data-word'))!;
    await readFor(page, 30_000, word);
    expect(await said(page)).toContain(SAYS.go);
    await expect(page.locator('.bt-verdict')).toHaveText('30 seconds. Now read it again!');
    await expect(page.locator('.bt-lane')).toHaveCount(1);
    await expect(page.locator('.bt-stuck-word')).toHaveText([word]);
    expect(await last(page)).toBe(SAYS.first);
    /* the word he got stuck on, to hear again */
    await page.locator('.bt-stuck-word').click();
    expect(await last(page)).toBe(word);

    /* read 2: last time's runner sets off with him, and he beats it */
    await page.getByRole('button', { name: 'Read it again ▶' }).click();
    await expect(page.locator('.score')).toContainText('Read 2 of 3');
    await expect(page.locator('.bt-hint')).toHaveText('Time to beat: 30 seconds');
    await expect(page.locator('.rp-word.bt-stuck')).toHaveCount(0);
    await page.getByRole('button', { name: '▶ Go!' }).click();
    await page.clock.runFor(2100);
    await expect(page.locator('.bt-chase')).toBeVisible();
    await page.clock.runFor(15_000);
    const ghostAt = await page.locator('.bt-runner.ghost').evaluate((n) => Number(getComputedStyle(n).getPropertyValue('--at')));
    expect(ghostAt).toBeGreaterThan(0.4);
    expect(ghostAt).toBeLessThan(0.6);
    await page.clock.runFor(10_000);
    await page.getByRole('button', { name: '🏁 Finished!' }).click();
    await expect(page.locator('.bt-verdict')).toHaveText('5 seconds faster!');
    expect(await last(page)).toBe(SAYS.faster);
    await expect(page.locator('.bt-lane')).toHaveCount(2);
    await expect(page.locator('.bt-lane').nth(1)).toHaveAttribute('data-place', '1');
    await expect(page.locator('.bt-lane').nth(1)).toContainText('🥇');
    await expect(page.locator('.bt-stuck-word')).toHaveCount(0);

    /* read 3, and the end: the three raced, and what the grown-up wants to know */
    await page.getByRole('button', { name: 'Read it again ▶' }).click();
    await readFor(page, 20_000);
    const results = page.locator('.results');
    await expect(results).toBeVisible();
    await expect(results.locator('.bt-lane')).toHaveCount(3);
    await expect(results.locator('.bt-lane').nth(2)).toHaveAttribute('data-place', '1');
    /* words read right in a minute, the stuck word left out */
    const n = wordCount(story);
    const notes = results.locator('.bt-notes li');
    await expect(notes.nth(0)).toContainText(`Read 1: 30 seconds · ${Math.round(((n - 1) * 60000) / 30000)} words a minute`);
    await expect(notes.nth(0)).toContainText(`stuck on ${word}`);
    await expect(notes.nth(2)).toContainText(`Read 3: 20 seconds · ${Math.round((n * 60000) / 20000)} words a minute`);
    await expect(results.locator('.sticker')).toHaveText('⏱️');
    expect(await said(page)).toContain(SAYS.doneFaster);

    /* the best time is kept, and shown next time */
    await page.getByRole('button', { name: 'Another story' }).last().click();
    await expect(page.locator(`.bt-pick[data-story="${title}"]`)).toContainText('Best: 20 seconds');
    await page.reload();
    await expect(page.locator(`.bt-pick[data-story="${title}"]`)).toContainText('Best: 20 seconds');
    noProblems(watch);
  });

  test('a story read before has its best time to beat from the first read, and "fastest ever" once', async ({ page }) => {
    await page.clock.install();
    await recordSpeech(page);
    await seed(page, { settings: { levels: [2], sounds: [] }, 'beat-best': { 'The Duck': 40_000 } });
    await open(page);
    await page.locator('.bt-pick[data-story="The Duck"]').click();
    await expect(page.locator('.bt-hint')).toHaveText('Time to beat: 40 seconds');
    await readFor(page, 35_000);
    await expect(page.locator('.bt-verdict')).toHaveText('35 seconds. Now read it again! 🏆 Your fastest ever!');
    expect(await last(page)).toBe(SAYS.best);
    await page.getByRole('button', { name: 'Read it again ▶' }).click();
    await readFor(page, 30_000);
    await expect(page.locator('.bt-verdict')).toHaveText('5 seconds faster!');
  });

  test('listen first reads the story a sentence at a time, and leaving in the countdown says nothing after', async ({ page }) => {
    const watch = watchPage(page);
    await page.clock.install();
    await recordSpeech(page);
    await seed(page, { settings: { levels: [1], sounds: [] } });
    await open(page);
    const title = (await page.locator('.bt-pick').first().getAttribute('data-story'))!;
    const story = ALL_STORIES.find((s) => s.title === title)!;
    await page.locator('.bt-pick').first().click();
    await page.getByRole('button', { name: '🔊 Listen first' }).click();
    await page.clock.runFor(1000);
    expect(await said(page)).toContain(story.sentences[0]);
    await expect(page.locator('.rp-word.reading').first()).toBeVisible();
    await page.clock.runFor(20_000);
    expect(await said(page)).toContain(story.sentences[2]);

    await page.getByRole('button', { name: '▶ Go!' }).click();
    await page.getByRole('button', { name: 'Back to the games' }).click();
    const before = (await said(page)).length;
    await page.clock.runFor(5000);
    expect((await said(page)).length).toBe(before);
    noProblems(watch);
  });
});
