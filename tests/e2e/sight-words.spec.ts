/* The Phonics / Sight words switch in Bingo, Memory Match, Build the Word and
 * Roll & Read: phonics stays as it was, and sight words come from the
 * school's list at his level. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, openSetup, recordSpeech, said, watchPage } from './helpers';
import { SIGHT_SETS, soundsAlike } from '../../src/content/index';
import { sightWordsIn } from '../../src/content/sight';

const SIGHT = new Set(sightWordsIn(SIGHT_SETS).map((w) => w.text));
const sightSwitch = (page: Page) => page.getByRole('group', { name: 'Which words' });

async function toSight(page: Page): Promise<void> {
  await sightSwitch(page).getByRole('button', { name: '👀 Sight words' }).click();
  await expect(sightSwitch(page).getByRole('button', { name: '👀 Sight words' })).toHaveAttribute('aria-pressed', 'true');
}

test.describe('the sight words switch', () => {
  test('Bingo: a card of sight words, called by voice only, with no two that sound the same', async ({ page }) => {
    const watch = watchPage(page);
    await recordSpeech(page);
    await openGame(page, 'bingo');
    /* phonics first, as it always was */
    await expect(sightSwitch(page).getByRole('button', { name: '🔤 Phonics' })).toHaveAttribute('aria-pressed', 'true');
    await toSight(page);
    const words = (await page.locator('.cell:not(.free)').allTextContents()).map((t) => t.trim());
    expect(words).toHaveLength(8);
    for (const w of words) expect(SIGHT.has(w), w).toBe(true);
    for (const a of words) for (const b of words) expect(soundsAlike(a, b), `${a} / ${b}`).toBe(false);

    await page.getByRole('button', { name: 'Call a word' }).click();
    /* no picture for a sight word: only the voice */
    await expect(page.locator('.caller .pic')).toHaveText('🔊');
    const called = (await said(page)).at(-1)!;
    expect(words).toContain(called);
    const cell = page.locator('.cell').filter({ hasText: new RegExp(`^${called}$`) });
    await cell.click();
    await expect(cell).toHaveClass(/marked/);

    /* remembered on this iPad */
    await page.reload();
    await expect(sightSwitch(page).getByRole('button', { name: '👀 Sight words' })).toHaveAttribute('aria-pressed', 'true');
    for (const w of (await page.locator('.cell:not(.free)').allTextContents()).map((t) => t.trim())) expect(SIGHT.has(w), w).toBe(true);
    /* and back to phonics */
    await sightSwitch(page).getByRole('button', { name: '🔤 Phonics' }).click();
    await page.getByRole('button', { name: 'Call a word' }).click();
    await expect(page.locator('.caller .pic')).not.toHaveText('🔊');
    noProblems(watch);
  });

  test('Bingo: the sets come from his level, and a parent can change them', async ({ page }) => {
    await openGame(page, 'bingo');
    await toSight(page);
    await openSetup(page);
    const row = page.locator('.setup-sight-row');
    await expect(row).toBeVisible();
    await expect(page.locator('.setup-sounds-row')).toBeHidden();
    /* the default week is levels 4 and 5: the school sets up to 5 */
    for (const n of [1, 2, 3, 4, 5]) await expect(row.getByRole('button', { name: `Level ${n}` })).toHaveAttribute('aria-pressed', 'true');
    await expect(row.getByRole('button', { name: 'Level 6' })).toHaveAttribute('aria-pressed', 'false');
    for (const n of [2, 3, 4, 5]) await row.getByRole('button', { name: `Level ${n}` }).click();
    const level1 = new Set(sightWordsIn(['Level 1']).map((w) => w.text));
    for (const w of (await page.locator('.cell:not(.free)').allTextContents()).map((t) => t.trim())) expect(level1.has(w), w).toBe(true);
  });

  test('Memory Match: the same sight word twice is a pair, said only once it is matched', async ({ page }) => {
    const watch = watchPage(page);
    await recordSpeech(page);
    await openGame(page, 'memory-match');
    await toSight(page);
    await expect(page.locator('.wrap > .topbar .tag')).toHaveText('Flip two cards. Keep them if they are the same word.');
    const cards = page.locator('.card');
    await expect(cards).toHaveCount(12);
    const texts = (await page.locator('.card .face.front').allTextContents()).map((t) => t.trim());
    for (const t of texts) expect(SIGHT.has(t), t).toBe(true);
    const first = texts[0];
    const twin = texts.indexOf(first, 1);
    expect(twin).toBeGreaterThan(0);
    const before = (await said(page)).length;
    await cards.nth(0).click();
    await page.waitForTimeout(150);
    expect((await said(page)).length).toBe(before);
    await cards.nth(twin).click();
    await expect(cards.nth(0)).toHaveClass(/done/);
    await expect(cards.nth(twin)).toHaveClass(/done/);
    expect((await said(page)).at(-1)).toBe(first);
    await expect(page.locator('.tray .tokn')).toHaveText([first]);
    await expect(page.locator('.tray h2')).toHaveText('Words collected');
    noProblems(watch);
  });

  test('Build the Word: hear a sight word and build it from magnet letters', async ({ page }) => {
    const watch = watchPage(page);
    await recordSpeech(page);
    await openGame(page, 'build-the-word');
    await toSight(page);
    await expect(page.getByLabel('Which tiles')).toBeHidden();
    for (let i = 0; i < 3; i += 1) {
      await expect(page.locator('.score')).toContainText(`Word ${i + 1}`);
      const word = (await said(page)).at(-1)!;
      expect(SIGHT.has(word), word).toBe(true);
      await expect(page.locator('.bw-pic')).toHaveText('👂');
      await expect(page.locator('.bw-slot')).toHaveCount(word.length);
      const tiles = page.locator('.bw-tile.magnet:not([hidden])');
      expect(await tiles.count()).toBeGreaterThan(word.length);
      for (const ch of word) {
        const texts = (await tiles.allTextContents()).map((t) => t.trim());
        await tiles.nth(texts.indexOf(ch)).click();
      }
      await expect(page.locator('.bw-note')).toContainText(word);
      await expect(page.locator('.bw-note.good')).toBeVisible();
    }
    noProblems(watch);
  });

  test('Roll & Read: the die has the sight word sets, and the chart is kept word by word', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'roll-and-read');
    await toSight(page);
    await expect(page.locator('.tray h2')).toHaveText('How the sight words are going');
    const faces = (await page.locator('.cube .face').allTextContents()).map((t) => t.trim());
    expect(new Set(faces)).toEqual(new Set(['1', '2', '3', '4', '5']));
    await page.getByRole('button', { name: 'Roll the die' }).click();
    await expect(page.locator('.wcard')).toHaveCount(3, { timeout: 8000 });
    await expect(page.locator('.dice-hint')).toContainText('sight words out loud');
    const shown = (await page.locator('.wcard .w').allTextContents()).map((t) => t.trim());
    for (const w of shown) expect(SIGHT.has(w), w).toBe(true);
    await page.locator('.wcard .ok').first().click();
    await page.locator('.wcard .no').nth(1).click();
    /* one bar a word, the missed one first */
    await expect(page.locator('.bar')).toHaveCount(2);
    await expect(page.locator('.bar .k').first()).toHaveText(shown[1]);
    await expect(page.locator('.bar .n')).toHaveText(['0/1', '1/1']);
    /* the sounds' tally is its own, untouched */
    await sightSwitch(page).getByRole('button', { name: '🔤 Phonics' }).click();
    await expect(page.locator('.bars .empty')).toBeVisible();
    noProblems(watch);
  });
});
