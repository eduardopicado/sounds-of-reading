/* Build the Word: hear it, then spell it from the tiles. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, openSetup, watchPage } from './helpers';

/** a speech engine that writes down what it says, so the test hears the word too */
async function recordSpeech(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const spoken: string[] = [];
    (window as unknown as { __said: string[] }).__said = spoken;
    class FakeUtterance {
      text: string; lang = ''; rate = 1; pitch = 1; volume = 1; voice: unknown = null;
      onend: (() => void) | null = null; onerror: (() => void) | null = null;
      constructor(text: string) { this.text = text; }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [{ name: 'Karen', lang: 'en-AU', localService: true, default: true, voiceURI: 'karen' }],
        speak: (u: FakeUtterance) => { if (u.text) spoken.push(u.text); window.setTimeout(() => u.onend?.(), 0); },
        cancel: () => undefined,
        addEventListener: () => undefined,
      },
    });
  });
}

const lastSaid = (page: Page): Promise<string> =>
  page.evaluate(() => { const s = (window as unknown as { __said: string[] }).__said; return s[s.length - 1] ?? ''; });

/** tap tiles to spell `word`, longest matching tile first, left to right */
async function spell(page: Page, word: string): Promise<void> {
  let rest = word;
  while (rest) {
    const tiles = page.locator('.bw-tile:not([hidden])');
    const texts = (await tiles.allTextContents()).map((t) => t.trim());
    const fits = texts.map((t, i) => ({ t, i })).filter(({ t }) => rest.startsWith(t)).sort((a, b) => b.t.length - a.t.length);
    expect(fits.length, `a tile to continue "${rest}"`).toBeGreaterThan(0);
    await tiles.nth(fits[0].i).click();
    rest = rest.slice(fits[0].t.length);
  }
}

test.describe('Build the Word', () => {
  test('hears each word and spells it, through to the end', async ({ page }) => {
    const watch = watchPage(page);
    await recordSpeech(page);
    await openGame(page, 'build-the-word');
    await openSetup(page);
    await page.getByLabel('How many words').selectOption('6');
    await page.getByRole('button', { name: 'Set up this game' }).click();

    for (let i = 0; i < 6; i += 1) {
      await expect(page.locator('.score')).toContainText(`Word ${i + 1}`);
      const word = await lastSaid(page);
      /* a slot for each sound, and more tiles than slots */
      const slots = await page.locator('.bw-slot').count();
      expect(await page.locator('.bw-tile').count()).toBeGreaterThan(slots);
      await spell(page, word);
      await expect(page.locator('.bw-note')).toContainText(word);
    }

    await expect(page.locator('.results')).toBeVisible({ timeout: 6000 });
    await expect(page.locator('.results li')).toHaveCount(6);
    await expect(page.locator('.results li.miss')).toHaveCount(0);
    noProblems(watch);
  });

  test('a wrong tile bounces back, the right ones stay, and two misses show the answer', async ({ page }) => {
    await recordSpeech(page);
    await openGame(page, 'build-the-word');
    const word = await lastSaid(page);
    const slots = page.locator('.bw-slot');
    const n = await slots.count();

    /* fill every slot with tiles that are not the right ones where possible */
    async function fillWrong(): Promise<void> {
      for (let s = 0; s < n; s += 1) {
        const emptyAt = await slots.evaluateAll((els) => els.findIndex((e) => !e.classList.contains('filled')));
        if (emptyAt < 0) break;
        const tiles = page.locator('.bw-tile:not([hidden])');
        const texts = (await tiles.allTextContents()).map((t) => t.trim());
        /* a tile whose letters are nowhere in the word: surely wrong */
        const pick = texts.findIndex((t) => !word.includes(t));
        await tiles.nth(pick >= 0 ? pick : 0).click();
      }
    }

    await fillWrong();
    await expect(page.locator('.bw-note')).toContainText('Nearly', { timeout: 4000 });
    /* the wrong ones came back out; whatever was right is locked in */
    await expect(page.locator('.bw-slot.filled:not(.locked)')).toHaveCount(0);

    await fillWrong();
    await expect(page.locator('.bw-note')).toContainText('It is spelled', { timeout: 4000 });
    await expect(page.locator('.bw-note')).toContainText(word);
    await expect(page.locator('.bw-slot.locked')).toHaveCount(n);
  });

  test('a placed tile can be taken back out', async ({ page }) => {
    await recordSpeech(page);
    await openGame(page, 'build-the-word');
    const before = await page.locator('.bw-tile:not([hidden])').count();
    await page.locator('.bw-tile:not([hidden])').first().click();
    await expect(page.locator('.bw-slot.filled')).toHaveCount(1);
    await page.locator('.bw-slot.filled').first().click();
    await expect(page.locator('.bw-slot.filled')).toHaveCount(0);
    await expect(page.locator('.bw-tile:not([hidden])')).toHaveCount(before);
  });

  test('letter tiles give a slot for every letter', async ({ page }) => {
    await recordSpeech(page);
    await openGame(page, 'build-the-word');
    await openSetup(page);
    await page.getByLabel('Which tiles').selectOption('letters');
    const word = await lastSaid(page);
    await expect(page.locator('.bw-slot')).toHaveCount(word.length);
  });
});
