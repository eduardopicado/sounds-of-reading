/* Regression tests for the bugs found in the September 2026 review. Each one
 * failed before its fix: a game that kept talking after he had left it, a
 * sort with two right answers, a saved setting that blanked a game, a
 * microphone left on. */

import { expect, test, type Page } from '@playwright/test';
import { fitsAnother, realWords, sound } from '../../src/content/index';
import { noProblems, openGame, openSetup, recordSpeech, said, seed, watchPage } from './helpers';

const GAMES = [
  'memory-match', 'bingo', 'sound-sort', 'word-builder', 'roll-and-read', 'real-or-silly', 'sentence-smash',
  'same-sound', 'tricky-words', 'sound-rocket', 'penalty-shootout', 'pass-and-shoot', 'be-the-commentator',
  'build-the-word', 'trace-it', 'tall-small-tail', 'flash-count', 'off-the-bench', 'scoreboard-sums', 'number-line-penalty',
];

/** leave the game the way he does, and check nothing is said after that */
async function leaveAndListen(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Back to the games' }).click();
  await expect(page.locator('.tiles').first()).toBeVisible();
  const before = (await said(page)).length;
  await page.waitForTimeout(1800);
  expect((await said(page)).slice(before), 'spoken after leaving the game').toEqual([]);
}

test.describe('leaving a game', () => {
  test('mid-roll in Roll & Read, the die does not call out a sound on the home screen', async ({ page }) => {
    await recordSpeech(page);
    await openGame(page, 'roll-and-read');
    await page.getByRole('button', { name: 'Roll the die' }).click();
    await leaveAndListen(page);
  });

  test('right after sorting a word, Sound Sort does not say the next one', async ({ page }) => {
    await recordSpeech(page);
    await openGame(page, 'sound-sort');
    const text = (await page.locator('.hand .word').textContent())?.trim() ?? '';
    const bins = await page.locator('.bin').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.sound ?? ''));
    const word = realWords().find((w) => w.text === text && bins.includes(w.sound));
    expect(word, `a word from one of the bins: ${text}`).toBeTruthy();
    await page.locator(`.bin[data-sound="${word!.sound}"]`).click();
    await expect(page.locator('.hand.right')).toBeVisible();
    await leaveAndListen(page);
  });

  test('right after spelling a word, Same Sound does not say the next one', async ({ page }) => {
    await recordSpeech(page);
    await seed(page, { settings: { levels: [4, 5, 6], sounds: [] } });
    await openGame(page, 'same-sound');
    /* the word is heard, not shown: the last thing said is the question */
    const heard = (await said(page)).at(-1) ?? '';
    const choices = await page.locator('.choice').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.sound ?? ''));
    const word = realWords().find((w) => w.text === heard && choices.includes(w.sound));
    expect(word, `the word said: ${heard}`).toBeTruthy();
    await page.locator(`.choice[data-sound="${word!.sound}"]`).click();
    await expect(page.locator('.hand.right')).toBeVisible();
    await leaveAndListen(page);
  });

  test('while the microphone permission is being asked, Be the Commentator lets it go', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>;
      w.__micClosed = false;
      w.__micOpened = false;
      class FakeRecorder {
        state = 'inactive'; mimeType = 'audio/webm';
        ondataavailable: unknown = null; onstop: unknown = null;
        static isTypeSupported(): boolean { return true; }
        start(): void { this.state = 'recording'; }
        stop(): void { this.state = 'inactive'; }
      }
      Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: FakeRecorder });
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          /* a parent slow to answer the permission prompt */
          getUserMedia: () => new Promise((resolve) => window.setTimeout(() => {
            w.__micOpened = true;
            resolve({ getTracks: () => [{ stop: () => { w.__micClosed = true; } }] });
          }, 700)),
        },
      });
    });
    await openGame(page, 'be-the-commentator');
    await page.getByRole('button', { name: '🎙 Record' }).click();
    await page.getByRole('button', { name: 'Back to the games' }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __micOpened: boolean }).__micOpened)).toBe(true);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __micClosed: boolean }).__micClosed)).toBe(true);
  });
});

test.describe('one right answer', () => {
  test('Sound Sort never shows a word that fits two bins', async ({ page }) => {
    await seed(page, { settings: { levels: [3, 4, 5, 6, 7], sounds: [] } });
    await openGame(page, 'sound-sort');
    await openSetup(page);
    /* the sort that used to offer "which" to both the wh and the ch bin */
    await page.getByLabel('Which sorting task').selectOption('digraphs');
    await page.getByLabel('How many words').selectOption('16');
    const bins = (await page.locator('.bin').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.sound ?? ''))).map(sound);
    for (let i = 0; i < 16 && !(await page.locator('.results:not([hidden])').count()); i += 1) {
      const text = (await page.locator('.hand .word').textContent())?.trim() ?? '';
      const word = realWords().find((w) => w.text === text && bins.some((b) => b.id === w.sound));
      expect(word, text).toBeTruthy();
      expect(bins.filter((b) => fitsAnother(word!, b)).map((b) => b.id), `${text} fits another bin`).toEqual([]);
      await page.locator(`.bin[data-sound="${word!.sound}"]`).click();
      await expect(page.locator('.hand.right')).toBeVisible();
      /* on to the next word, or the end of the round */
      await expect.poll(async () => (await page.locator('.hand.right').isVisible())
        && !(await page.locator('.results').isVisible()), { timeout: 3000 }).toBe(false);
    }
    await expect(page.locator('.results')).toBeVisible();
  });

  test('Memory Match never puts one picture on the board for two words', async ({ page }) => {
    await seed(page, { settings: { levels: [1, 2, 3, 4, 5], sounds: [] } });
    await openGame(page, 'memory-match');
    await openSetup(page);
    await page.getByLabel('How many pairs').selectOption('8');
    for (let deal = 0; deal < 12; deal += 1) {
      const pics = await page.locator('.card .pic').allTextContents();
      const words = await page.locator('.card .word').allTextContents();
      expect(new Set(pics).size, `pictures ${pics.join(' ')}`).toBe(pics.length);
      expect(new Set(words).size, `words ${words.join(' ')}`).toBe(words.length);
      await page.getByRole('button', { name: 'New game' }).click();
    }
  });

  test('Memory Match same-sound mode deals no word that shares another pair\'s sound', async ({ page }) => {
    await seed(page, { settings: { levels: [1, 2], sounds: [] } });
    await openGame(page, 'memory-match');
    await openSetup(page);
    await page.getByLabel('Matching mode').selectOption('sound');
    await page.getByLabel('How many pairs').selectOption('8');
    for (let deal = 0; deal < 8; deal += 1) {
      const cards = await page.locator('.card').evaluateAll((els) => els.map((e) => ({
        text: e.querySelector('.word')?.textContent?.trim() ?? '', sound: (e as HTMLElement).dataset.sound ?? '',
      })));
      expect(new Set(cards.map((c) => c.text)).size).toBe(cards.length);
      const board = [...new Set(cards.map((c) => c.sound))].map(sound);
      for (const c of cards) {
        const w = realWords().find((x) => x.text === c.text && x.sound === c.sound);
        expect(w, c.text).toBeTruthy();
        expect(board.filter((b) => fitsAnother(w!, b)).map((b) => b.id), `${c.text} also fits`).toEqual([]);
      }
      await page.getByRole('button', { name: 'New game' }).click();
    }
  });
});

test.describe('saved settings from an older version', () => {
  test('a sound that no longer exists does not blank any game', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { settings: { levels: [4, 5, 42], sounds: ['sh', 'a-sound-since-renamed'], pro: 'yes' } });
    for (const path of GAMES) {
      await page.goto('/#/' + path);
      await expect(page.locator('.topbar h1'), path).toBeVisible();
    }
    noProblems(watch);
  });
});

test.describe('stickers', () => {
  test('keeping the same sentence twice lists it once', async ({ page }) => {
    await openGame(page, 'sentence-smash');
    await page.getByRole('button', { name: '🎲 Surprise me' }).click();
    await page.getByRole('button', { name: '⭐ Keep it' }).click();
    await page.getByRole('button', { name: '⭐ Keep it' }).click();
    await expect(page.locator('.saved-row')).toHaveCount(1);
  });
});
