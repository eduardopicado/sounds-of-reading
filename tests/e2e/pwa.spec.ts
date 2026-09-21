/* The app-ness: installable, offline, and quiet on the network. */

import { expect, test } from '@playwright/test';
import { noProblems, watchPage } from './helpers';

test.describe('progressive web app', () => {
  test('has a manifest that makes it installable as a home screen app', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();
    const manifest = await (await request.get(new URL(href!, 'http://localhost:4173/').toString())).json();

    expect(manifest.name).toBe('Sounds of Reading');
    expect(manifest.display).toBe('standalone');
    expect(manifest.lang).toBe('en-AU');
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
    /* relative, so it works from a domain root or a project subpath alike */
    expect(manifest.start_url.startsWith('http')).toBe(false);
  });

  test('keeps playing in airplane mode once it has been opened', async ({ page, context }) => {
    const watch = watchPage(page);
    await page.goto('/');
    /* let the service worker install and precache */
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 20_000 })
      .catch(() => undefined);
    await page.evaluate(() => navigator.serviceWorker?.ready);
    await page.waitForTimeout(1500);

    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.tiles .tile-link')).toHaveCount(7);

    /* and a game still works, fonts and all */
    await page.locator('.tile-link[data-game="word-builder"]').click();
    await expect(page.locator('.rack .tile').first()).toBeVisible();
    await page.locator('.rack .tile').first().click();
    await expect(page.locator('.verdict')).toContainText(/real word|silly word/);

    await context.setOffline(false);
    noProblems(watch);
  });

  test('asks the network for nothing but itself', async ({ page }) => {
    const watch = watchPage(page);
    await page.goto('/');
    for (const path of ['memory-match', 'bingo', 'sound-sort', 'word-builder', 'roll-and-read', 'real-or-silly', 'sentence-smash']) {
      await page.goto('/#/' + path);
      await page.waitForTimeout(250);
    }
    noProblems(watch);
  });
});

test.describe('speech', () => {
  test('never inherits the device language and prefers an Australian voice', async ({ page }) => {
    await page.addInitScript(() => {
      /* a device set to Portuguese, with an Australian English voice available */
      const voices = [
        { name: 'Luciana', lang: 'pt-BR', localService: true, default: true, voiceURI: 'pt' },
        { name: 'Karen', lang: 'en-AU', localService: true, default: false, voiceURI: 'au' },
        { name: 'Daniel', lang: 'en-GB', localService: true, default: false, voiceURI: 'gb' },
      ];
      const spoken: { text: string; lang: string; voice: string }[] = [];
      (window as unknown as { __spoken: unknown }).__spoken = spoken;
      /* the real utterance rejects a plain object as a voice, so stub it too */
      class FakeUtterance {
        text: string; lang = ''; rate = 1; pitch = 1;
        voice: { name: string; lang: string } | null = null;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(text: string) { this.text = text; }
      }
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          getVoices: () => voices,
          speak: (u: SpeechSynthesisUtterance) => spoken.push({ text: u.text, lang: u.lang, voice: u.voice?.name ?? '' }),
          cancel: () => undefined,
          addEventListener: () => undefined,
        },
      });
    });

    await page.goto('/#/word-builder');
    await page.locator('.rack .tile').first().click();
    const spoken = await page.evaluate(() => (window as unknown as { __spoken: { text: string; lang: string; voice: string }[] }).__spoken);
    const real = spoken.filter((s) => s.text);
    expect(real.length).toBeGreaterThan(0);
    expect(real[real.length - 1].lang).toBe('en-AU');
    expect(real[real.length - 1].voice).toBe('Karen');
  });

  test('picks the enhanced voice over the compact one of the same name', async ({ page }) => {
    await page.addInitScript(() => {
      /* exactly what an iPad looks like once a better Karen is downloaded:
         two voices with the same name, told apart only by their identifier */
      const voices = [
        { name: 'Karen', lang: 'en-AU', localService: true, default: true, voiceURI: 'com.apple.voice.compact.en-AU.Karen' },
        { name: 'Karen', lang: 'en-AU', localService: true, default: false, voiceURI: 'com.apple.voice.enhanced.en-AU.Karen' },
        { name: 'Daniel', lang: 'en-GB', localService: true, default: false, voiceURI: 'com.apple.voice.premium.en-GB.Daniel' },
      ];
      const spoken: { text: string; lang: string; voice: string }[] = [];
      (window as unknown as { __spoken: unknown }).__spoken = spoken;
      class FakeUtterance {
        text: string; lang = ''; rate = 1; pitch = 1;
        voice: { name: string; lang: string; voiceURI: string } | null = null;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(text: string) { this.text = text; }
      }
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          getVoices: () => voices,
          speak: (u: { text: string; lang: string; voice?: { voiceURI: string } }) =>
            spoken.push({ text: u.text, lang: u.lang, voice: u.voice?.voiceURI ?? '' }),
          cancel: () => undefined,
          addEventListener: () => undefined,
        },
      });
    });

    await page.goto('/#/word-builder');
    await page.locator('.rack .tile').first().click();
    const spoken = await page.evaluate(() => (window as unknown as { __spoken: { voice: string }[] }).__spoken);
    const last = spoken.filter((s) => s.voice).pop();
    /* enhanced Karen beats compact Karen, and Australian beats a premium Brit */
    expect(last?.voice).toBe('com.apple.voice.enhanced.en-AU.Karen');
  });

  test('offers every installed English voice, and says where to get better ones', async ({ page }) => {
    await page.addInitScript(() => {
      const voices = [
        { name: 'Karen', lang: 'en-AU', localService: true, default: true, voiceURI: 'com.apple.voice.compact.en-AU.Karen' },
        { name: 'Daniel', lang: 'en-GB', localService: true, default: false, voiceURI: 'com.apple.voice.compact.en-GB.Daniel' },
      ];
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          getVoices: () => voices,
          speak: () => undefined,
          cancel: () => undefined,
          addEventListener: () => undefined,
        },
      });
    });
    await page.goto('/');
    const options = await page.getByLabel('Which voice reads the words').locator('option').allTextContents();
    expect(options.join(' | ')).toContain('Karen (en-AU)');
    expect(options.join(' | ')).toContain('Daniel (en-GB)');
    /* nothing a web page does can install a voice, so it explains where to */
    await expect(page.locator('.week .tag', { hasText: 'Spoken Content' })).toBeVisible();
  });

  test('survives a browser where touching speechSynthesis throws', async ({ page }) => {
    const watch = watchPage(page);
    await page.addInitScript(() => {
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        get() { throw new Error('speech is not available here'); },
      });
    });
    await page.goto('/#/real-or-silly');
    await expect(page.locator('.theword')).toBeVisible();
    await page.locator('.ans.real').click();
    await expect(page.locator('.verdict')).not.toHaveClass(/idle/);
    /* the prototype's unattributed "Script error." came from exactly this */
    noProblems(watch);
  });
});
