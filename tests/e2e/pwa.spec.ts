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
    await expect(page.locator('.tiles .tile-link')).toHaveCount(8);

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
    for (const path of ['memory-match', 'bingo', 'sound-sort', 'word-builder', 'roll-and-read', 'real-or-silly', 'sentence-smash', 'same-sound']) {
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

  test('finds the downloaded voice that iOS only reveals after the first tap', async ({ page }) => {
    await page.addInitScript(() => {
      /* iOS hides enhanced and premium voices from getVoices() until speech has
         been started inside a real gesture, and fires nothing to announce it */
      const hidden = { name: 'Karen', lang: 'en-AU', localService: true, default: false, voiceURI: 'com.apple.voice.enhanced.en-AU.Karen' };
      const shown = [{ name: 'Karen', lang: 'en-AU', localService: true, default: true, voiceURI: 'com.apple.voice.compact.en-AU.Karen' }];
      let spokenOnce = false;
      class FakeUtterance {
        text: string; lang = ''; rate = 1; pitch = 1;
        voice: { voiceURI: string } | null = null;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(text: string) { this.text = text; }
      }
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          getVoices: () => (spokenOnce ? [...shown, hidden] : shown),
          speak: () => { spokenOnce = true; },
          cancel: () => undefined,
          addEventListener: () => undefined,
        },
      });
    });

    await page.goto('/');
    const picker = page.getByLabel('Which voice reads the words');
    /* before any tap only the preinstalled voice is on offer */
    await expect(picker.locator('option')).toHaveCount(2);

    /* the first tap unlocks speech, and the list has to be read again */
    await page.locator('.tile-link').first().click();
    await page.goBack();
    await expect(picker.locator('option')).toHaveCount(3, { timeout: 10_000 });
    const options = await picker.locator('option').allTextContents();
    expect(options.join(' | ')).toContain('enhanced, clearer');
  });

  test('lists a repeated voice once', async ({ page }) => {
    await page.addInitScript(() => {
      /* an iPad really does offer the same Samantha twice */
      const voices = [
        { name: 'Karen', lang: 'en-AU', localService: true, default: true, voiceURI: 'com.apple.voice.compact.en-AU.Karen' },
        { name: 'Samantha', lang: 'en-US', localService: true, default: false, voiceURI: 'com.apple.voice.compact.en-US.Samantha' },
        { name: 'Samantha', lang: 'en-US', localService: true, default: false, voiceURI: 'com.apple.ttsbundle.Samantha-compact' },
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
    /* "Best available" plus Karen plus one Samantha */
    expect(options).toHaveLength(3);
    expect(options.filter((o) => o.includes('Samantha'))).toHaveLength(1);
  });

  test('the diagnostics screen prints the identifier each tier is read from', async ({ page }) => {
    await page.addInitScript(() => {
      const voices = [
        { name: 'Karen', lang: 'en-AU', localService: true, default: true, voiceURI: 'com.apple.voice.compact.en-AU.Karen' },
        { name: 'Albert', lang: 'en-US', localService: true, default: false, voiceURI: 'com.apple.speech.synthesis.voice.Albert' },
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
    await page.goto('/#/voices');
    await expect(page.locator('.wrap')).toContainText('2 English voices');
    /* the identifier is the whole point of the screen */
    await expect(page.locator('.wrap')).toContainText('com.apple.voice.compact.en-AU.Karen');
    await expect(page.locator('.wrap')).toContainText('read as: compact');
    await expect(page.locator('.wrap')).toContainText('read as: novelty');
    /* duplicates are NOT collapsed here — this screen shows the raw truth */
    await expect(page.locator('.wrap')).toContainText('com.apple.speech.synthesis.voice.Albert');
  });

  test('a super-compact voice never passes for the compact one of the same name', async ({ page }) => {
    await page.addInitScript(() => {
      /* straight off the iPad: one Samantha in each of these two tiers. The
         cut-down one ends in the word "compact", so a substring check called
         them the same voice and quietly dropped one of them. */
      const voices = [
        { name: 'Karen', lang: 'en-AU', localService: true, default: true, voiceURI: 'com.apple.voice.compact.en-AU.Karen' },
        { name: 'Samantha', lang: 'en-US', localService: true, default: false, voiceURI: 'com.apple.voice.super-compact.en-US.Samantha' },
        { name: 'Samantha', lang: 'en-US', localService: true, default: false, voiceURI: 'com.apple.voice.compact.en-US.Samantha' },
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
    await page.goto('/#/voices');
    await expect(page.locator('.wrap')).toContainText('read as: super-compact');

    await page.goto('/');
    const options = await page.getByLabel('Which voice reads the words').locator('option').allTextContents();
    const samanthas = options.filter((o) => o.includes('Samantha'));
    /* both survive, and the parent can tell which is which */
    expect(samanthas).toHaveLength(2);
    expect(samanthas.filter((o) => o.includes('lower detail'))).toHaveLength(1);
    /* the better one is offered first */
    expect(samanthas[0]).not.toContain('lower detail');
  });

  test('the diagnostics screen can be reached without an address bar', async ({ page }) => {
    await page.addInitScript(() => {
      const voices = [
        { name: 'Karen', lang: 'en-AU', localService: true, default: true, voiceURI: 'com.apple.voice.compact.en-AU.Karen' },
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
    /* Added to the home screen the app runs standalone: no address bar, and
       it always launches at start_url, so a typed #/voices cannot get there.
       The only way in is from the grown-ups' panel. */
    await page.goto('/');
    await page.getByRole('link', { name: 'Which voices?' }).click();
    await expect(page.locator('.wrap')).toContainText('offered to this page');
    await expect(page.locator('.wrap')).toContainText('com.apple.voice.compact.en-AU.Karen');
  });

  test('each diagnostics row speaks in its own voice', async ({ page }) => {
    await page.addInitScript(() => {
      const voices = [
        { name: 'Karen', lang: 'en-AU', localService: true, default: true, voiceURI: 'com.apple.voice.compact.en-AU.Karen' },
        { name: 'Albert', lang: 'en-US', localService: false, default: false, voiceURI: 'com.apple.speech.synthesis.voice.Albert' },
      ];
      const spoken: { voice: string }[] = [];
      (window as unknown as { __spoken: unknown }).__spoken = spoken;
      class FakeUtterance {
        text: string; lang = ''; rate = 1; pitch = 1;
        voice: { voiceURI: string } | null = null;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(text: string) { this.text = text; }
      }
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          getVoices: () => voices,
          speak: (u: { voice?: { voiceURI: string } }) => spoken.push({ voice: u.voice?.voiceURI ?? '' }),
          cancel: () => undefined,
          addEventListener: () => undefined,
        },
      });
    });
    await page.goto('/#/voices');
    /* the second row is the one the app would never choose on its own, which
       is exactly why its button has to speak as itself */
    await page.locator('.paper').nth(1).getByRole('button', { name: 'Hear it' }).click();
    const spoken = await page.evaluate(() => (window as unknown as { __spoken: { voice: string }[] }).__spoken);
    expect(spoken.pop()?.voice).toBe('com.apple.speech.synthesis.voice.Albert');
  });

  test('never picks a retro or novelty voice over the ordinary one', async ({ page }) => {
    await page.addInitScript(() => {
      /* what an iPad really lists: the Siri-family compact voice alongside the
         Eloquence set and a novelty voice, none of which carry a tier marker */
      const voices = [
        { name: 'Grandma', lang: 'en-AU', localService: true, default: false, voiceURI: 'com.apple.eloquence.en-AU.Grandma' },
        { name: 'Zarvox', lang: 'en-AU', localService: true, default: false, voiceURI: 'com.apple.speech.synthesis.voice.Zarvox' },
        { name: 'Karen', lang: 'en-AU', localService: true, default: true, voiceURI: 'com.apple.voice.compact.en-AU.Karen' },
      ];
      const spoken: { voice: string }[] = [];
      (window as unknown as { __spoken: unknown }).__spoken = spoken;
      class FakeUtterance {
        text: string; lang = ''; rate = 1; pitch = 1;
        voice: { voiceURI: string } | null = null;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(text: string) { this.text = text; }
      }
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          getVoices: () => voices,
          speak: (u: { voice?: { voiceURI: string } }) => spoken.push({ voice: u.voice?.voiceURI ?? '' }),
          cancel: () => undefined,
          addEventListener: () => undefined,
        },
      });
    });

    await page.goto('/#/word-builder');
    await page.locator('.rack .tile').first().click();
    const spoken = await page.evaluate(() => (window as unknown as { __spoken: { voice: string }[] }).__spoken);
    expect(spoken.filter((s) => s.voice).pop()?.voice).toBe('com.apple.voice.compact.en-AU.Karen');
  });

  test('still offers to find a better voice when only retro ones sit alongside compact', async ({ page }) => {
    await page.addInitScript(() => {
      const voices = [
        { name: 'Karen', lang: 'en-AU', localService: true, default: true, voiceURI: 'com.apple.voice.compact.en-AU.Karen' },
        { name: 'Reed', lang: 'en-AU', localService: true, default: false, voiceURI: 'com.apple.eloquence.en-AU.Reed' },
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
    /* an Eloquence voice in the list must not be mistaken for "already better" */
    await expect(page.locator('.week .tag', { hasText: 'Spoken Content' })).toBeVisible();
    const options = await page.getByLabel('Which voice reads the words').locator('option').allTextContents();
    expect(options.join(' | ')).toContain('Karen (en-AU) — standard');
    expect(options.join(' | ')).toContain('Reed (en-AU) — retro, robotic');
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
