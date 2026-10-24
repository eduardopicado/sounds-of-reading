/* Read and Point: a little story read together, and the sight words in it
 * found with a tap. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, openSetup, recordSpeech, said, watchPage } from './helpers';
import { ALL_STORIES } from '../../src/content/index';
import { sightSetsUpTo, sightWordsIn } from '../../src/content/sight';

/** every copy of a word in the story, tapped */
async function tapEvery(page: Page, word: string): Promise<void> {
  const copies = page.locator(`.rp-word[data-word="${word}"]`);
  const n = await copies.count();
  for (let i = 0; i < n; i += 1) await copies.nth(i).click();
}

test.describe('Read and Point', () => {
  test('one word: find every copy, a wrong tap says what it was, and three stories end the round', async ({ page }) => {
    const watch = watchPage(page);
    await recordSpeech(page);
    await openGame(page, 'read-and-point');
    for (let story = 1; story <= 3; story += 1) {
      await expect(page.locator('.score')).toContainText(`Story ${story}`);
      const target = (await page.locator('.rp-find-word').textContent())!;
      const copies = await page.locator(`.rp-word[data-word="${target}"]`).count();
      expect(copies).toBeGreaterThanOrEqual(2);
      await expect(page.locator('.rp-tally')).toHaveText(`0 of ${copies}`);
      expect((await said(page)).at(-1)).toBe(`Find every ${target}.`);

      if (story === 1) {
        /* a word that is not it: shaken, said, and named */
        const other = page.locator(`.rp-word:not([data-word="${target}"])`).first();
        const word = (await other.getAttribute('data-word'))!;
        await other.click();
        await expect(other).toHaveClass(/nope/);
        expect((await said(page)).at(-1)).toBe(word);
        await expect(page.locator('.rp-note')).toHaveText(`That says ${word}.`);
      }

      await tapEvery(page, target);
      await expect(page.locator('.rp-tally')).toHaveText(`${copies} of ${copies}`);
      await expect(page.locator(`.rp-word.found`)).toHaveCount(copies);
      await expect(page.locator('.rp-note')).toHaveText(`You found every ${target}!`);
      await page.getByRole('button', { name: story < 3 ? 'Next story ▶' : 'Finish' }).click();
    }
    await expect(page.locator('.results')).toBeVisible();
    await expect(page.locator('.results li')).toHaveCount(3);
    await expect(page.locator('.results li.miss')).toHaveCount(1);
    noProblems(watch);
  });

  test('every sight word: all the school words up to his level, wherever they are', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'read-and-point');
    await openSetup(page);
    await page.getByLabel('What to find').selectOption('all');
    await page.getByLabel('Stories up to').selectOption('3');
    await expect(page.locator('.rp-ask')).toContainText('Find every sight word');
    const sight = new Set(sightWordsIn(sightSetsUpTo([3])).map((w) => w.text.toLowerCase()));
    const words = await page.locator('.rp-word').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.word!));
    const wanted = words.filter((w) => sight.has(w));
    await expect(page.locator('.rp-tally')).toHaveText(`0 of ${wanted.length}`);
    for (const w of new Set(wanted)) await tapEvery(page, w);
    await expect(page.locator('.rp-tally')).toHaveText(`${wanted.length} of ${wanted.length}`);
    await expect(page.locator('.rp-note')).toHaveText('You found every sight word!');
    /* the stories asked for are at his level or below */
    const title = (await page.locator('.rp-title').textContent())!;
    expect(ALL_STORIES.find((s) => s.title === title)!.level).toBeLessThanOrEqual(3);
    noProblems(watch);
  });

  test('reads the story aloud a sentence at a time, and a tap stops it', async ({ page }) => {
    await recordSpeech(page);
    await openGame(page, 'read-and-point');
    const title = (await page.locator('.rp-title').textContent())!;
    const story = ALL_STORIES.find((s) => s.title === title)!;
    await page.getByRole('button', { name: '🔊 Read it to me' }).click();
    await expect.poll(async () => (await said(page)).filter((t) => story.sentences.includes(t)).length, { timeout: 15000 })
      .toBeGreaterThanOrEqual(2);
    const heard = (await said(page)).filter((t) => story.sentences.includes(t));
    expect(heard).toEqual(story.sentences.slice(0, heard.length));
    /* a tap on a word stops the reading, and no sentence stays lit */
    await page.locator('.rp-word').first().click();
    await expect(page.locator('.rp-word.reading')).toHaveCount(0);
  });
});
