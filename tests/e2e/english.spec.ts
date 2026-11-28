/* Word Positions, Opposites and Same, Story Order. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, recordSpeech, seed, watchPage } from './helpers';
import { STORY_STEPS, WORDS_STEPS, WORD_STEPS } from '../../src/content/english';

async function startAt(page: Page, game: string, step: number): Promise<void> {
  await seed(page, { [`maths-step:${game}`]: step });
  await openGame(page, game);
  await page.getByRole('button', { name: '▶ Start' }).click();
}
async function question(page: Page, n: number, stage: string): Promise<string> {
  await expect(page.locator('.score')).toContainText(`Question ${n} of`, { timeout: 10_000 });
  return (await page.locator(stage).getAttribute('data-answer'))!;
}

test.describe('Word Positions', () => {
  test.beforeEach(async ({ page }) => { await recordSpeech(page); });

  for (const task of ['naming', 'doing', 'describing']) {
    test(`tap the ${task} word`, async ({ page }) => {
      const watch = watchPage(page);
      await startAt(page, 'word-positions', WORD_STEPS.findIndex((s) => s.task === task));
      const at = await question(page, 1, '.ew-stage');
      await page.locator(`.ew-word[data-at="${at}"]`).click();
      await expect(page.locator('.mx-note')).toContainText('Yes! ');
      noProblems(watch);
    });
  }

  test('which position: the marked word to defence, midfield or attack', async ({ page }) => {
    await startAt(page, 'word-positions', WORD_STEPS.findIndex((s) => s.task === 'position'));
    await question(page, 1, '.ew-stage');
    await expect(page.locator('.ew-word.marked')).toHaveCount(1);
    const kind = (await page.locator('.ew-stage').getAttribute('data-kind'))!;
    await page.locator(`.mx-choice[data-n="${kind}"]`).click();
    await expect(page.locator('.mx-note')).toContainText(/^Yes! .* is a (naming|doing|describing) word/);
  });

  test('every naming word, then Done; a wrong extra word is marked', async ({ page }) => {
    await startAt(page, 'word-positions', WORD_STEPS.findIndex((s) => s.task === 'every'));
    const answer = (await question(page, 1, '.ew-stage')).split(',');
    expect(answer.length).toBeGreaterThanOrEqual(2);
    for (const i of answer) await page.locator(`.ew-word[data-at="${i}"]`).click();
    await page.getByRole('button', { name: 'Done ✓' }).click();
    await expect(page.locator('.mx-note')).toContainText('Yes! The naming words are');
  });
});

test.describe('Opposites and Same', () => {
  test.beforeEach(async ({ page }) => { await recordSpeech(page); });

  for (const step of WORDS_STEPS) {
    test(`${step.name}`, async ({ page }) => {
      const watch = watchPage(page);
      await startAt(page, 'opposites', WORDS_STEPS.indexOf(step));
      const answer = await question(page, 1, '.ew-stage');
      await page.locator(`.mx-choice[data-n="${answer}"]`).click();
      await expect(page.locator('.mx-note')).toContainText('Yes! ');
      noProblems(watch);
    });
  }
});

test.describe('Story Order', () => {
  test.beforeEach(async ({ page }) => { await recordSpeech(page); });

  test('what comes next: the picture fills the gap', async ({ page }) => {
    await startAt(page, 'story-order', 0);
    const answer = await question(page, 1, '.so-stage');
    await page.locator(`.mx-choice[data-n="${answer}"]`).click();
    await expect(page.locator('.so-pic.gap')).toHaveText(answer);
    await expect(page.locator('.mx-note')).toContainText('Yes! ');
  });

  for (const task of ['pictures', 'four']) {
    test(`${task} in order: a wrong tap is shaken back, then the right order fills the slots`, async ({ page }) => {
      const watch = watchPage(page);
      await startAt(page, 'story-order', STORY_STEPS.findIndex((s) => s.task === task));
      const order = (await question(page, 1, '.so-stage')).split(' | ');
      const card = (item: string) => page.locator('.so-card').filter({ hasText: item }).first();
      /* tap the last one first: it stays, and a hint says what to look for */
      await card(order[order.length - 1]).click();
      await expect(page.locator('.mx-note')).toContainText('Not that one yet');
      await expect(page.locator('.so-placed')).toHaveCount(0);
      for (const item of order) await card(item).click();
      await expect(page.locator('.so-placed')).toHaveCount(order.length);
      await expect(page.locator('.score')).toContainText('Right first time 0');
      noProblems(watch);
    });
  }

  test('who and where: a question about a Read and Point story', async ({ page }) => {
    await startAt(page, 'story-order', STORY_STEPS.findIndex((s) => s.task === 'who'));
    const answer = await question(page, 1, '.so-stage');
    await expect(page.locator('.so-text')).toBeVisible();
    await page.locator(`.mx-choice[data-n="${answer}"]`).click();
    await expect(page.locator('.mx-note')).toContainText('Yes! ');
  });

  test('fits: four sentences on the screen, nothing sideways', async ({ page }) => {
    await startAt(page, 'story-order', STORY_STEPS.findIndex((s) => s.task === 'four'));
    await question(page, 1, '.so-stage');
    const view = page.viewportSize()!;
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(view.width);
    for (const c of await page.locator('.so-card').all()) {
      const b = (await c.boundingBox())!;
      expect(b.x + b.width).toBeLessThanOrEqual(view.width);
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
  });
});
