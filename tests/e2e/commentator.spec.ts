/* Be the Commentator: read a line with expression, record it, hear it back.
 * A fake microphone stands in for the real one, so the whole round can be
 * played without anything being recorded. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, openSetup, watchPage } from './helpers';

type Mic = 'yes' | 'refused' | 'none';

/** a pretend microphone and recorder, and a player that counts what it plays */
async function fakeMic(page: Page, mic: Mic): Promise<void> {
  await page.addInitScript((mode) => {
    const w = window as unknown as Record<string, unknown>;
    w.__played = 0;
    w.__micClosed = false;
    HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
      w.__played = (w.__played as number) + 1;
      window.setTimeout(() => this.dispatchEvent(new Event('ended')), 20);
      return Promise.resolve();
    };
    if (mode === 'none') {
      Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: undefined });
      return;
    }
    class FakeRecorder {
      state = 'inactive';
      mimeType = 'audio/webm';
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      static isTypeSupported(): boolean { return true; }
      start(): void { this.state = 'recording'; }
      stop(): void {
        this.state = 'inactive';
        window.setTimeout(() => {
          this.ondataavailable?.({ data: new Blob(['take'], { type: 'audio/webm' }) });
          this.onstop?.();
        }, 0);
      }
    }
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: FakeRecorder });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => {
          if (mode === 'refused') throw new DOMException('no', 'NotAllowedError');
          return { getTracks: () => [{ stop: () => { w.__micClosed = true; } }] };
        },
      },
    });
  }, mic);
}

const played = (page: Page): Promise<number> =>
  page.evaluate(() => (window as unknown as { __played: number }).__played);

async function fiveLines(page: Page): Promise<void> {
  await openSetup(page);
  await page.getByLabel('How many lines').selectOption('5');
  await page.getByRole('button', { name: 'Set up this game' }).click();
}

test.describe('Be the Commentator', () => {
  test('records each line, plays it back, and ends with the highlights', async ({ page }) => {
    const watch = watchPage(page);
    await fakeMic(page, 'yes');
    await openGame(page, 'be-the-commentator');
    await fiveLines(page);

    for (let i = 0; i < 5; i += 1) {
      await expect(page.locator('.score')).toContainText(`Line ${i + 1}`);
      await page.getByRole('button', { name: '🎙 Record' }).click();
      /* on air: the card says so and the stop button is the only way on */
      await expect(page.locator('.cm-card')).toHaveClass(/live/);
      const before = await played(page);
      await page.getByRole('button', { name: '⏹ Stop' }).click();
      /* he hears it straight back */
      await expect(page.getByRole('button', { name: '▶ Play it back' })).toBeVisible();
      await expect.poll(() => played(page)).toBeGreaterThan(before);
      await page.getByRole('button', { name: 'Next line ➡' }).click();
    }

    await expect(page.locator('.results')).toBeVisible();
    await expect(page.locator('.cm-reel li.has-take')).toHaveCount(5);
    const before = await played(page);
    await page.getByRole('button', { name: '▶ Play the highlights' }).click();
    await expect.poll(() => played(page), { timeout: 10_000 }).toBe(before + 5);
    noProblems(watch);
  });

  test('tells him how to say it from the mark at the end', async ({ page }) => {
    await fakeMic(page, 'yes');
    await openGame(page, 'be-the-commentator');
    for (let i = 0; i < 4; i += 1) {
      const line = (await page.locator('.cm-line').textContent())?.trim() ?? '';
      const mood = (await page.locator('.cm-mood').textContent()) ?? '';
      const last = line.slice(-1);
      expect(mood).toContain(last === '!' ? 'excited' : last === '?' ? 'question' : 'calmly');
      /* and a scoop under every phrase */
      expect(await page.locator('.cm-line .cm-chunk').count()).toBeGreaterThan(0);
      await page.getByRole('button', { name: '🎙 Record' }).click();
      await page.getByRole('button', { name: '⏹ Stop' }).click();
      await page.getByRole('button', { name: 'Next line ➡' }).click();
    }
  });

  test('another go replaces the take', async ({ page }) => {
    await fakeMic(page, 'yes');
    await openGame(page, 'be-the-commentator');
    await page.getByRole('button', { name: '🎙 Record' }).click();
    await page.getByRole('button', { name: '⏹ Stop' }).click();
    await page.getByRole('button', { name: '🎙 Again' }).click();
    await expect(page.getByRole('button', { name: '🎙 Record' })).toBeVisible();
    await expect(page.locator('.score')).toContainText('Line 1');
  });

  test('with the microphone refused, he reads to a grown-up and the game goes on', async ({ page }) => {
    const watch = watchPage(page);
    await fakeMic(page, 'refused');
    await openGame(page, 'be-the-commentator');
    await fiveLines(page);
    await page.getByRole('button', { name: '🎙 Record' }).click();
    await expect(page.locator('.cm-status')).toContainText('read it out loud to a grown-up');
    for (let i = 0; i < 5; i += 1) await page.getByRole('button', { name: '✅ I read it!' }).click();
    await expect(page.locator('.results')).toBeVisible();
    /* nothing to replay, so no replay button */
    await expect(page.getByRole('button', { name: '▶ Play the highlights' })).toBeHidden();
    noProblems(watch);
  });

  test('every match has an excited line, a question and a calm one', async ({ page }) => {
    await fakeMic(page, 'none');
    await openGame(page, 'be-the-commentator');
    await fiveLines(page);
    for (let i = 0; i < 5; i += 1) await page.getByRole('button', { name: '✅ I read it!' }).click();
    const reel = (await page.locator('.cm-reel').textContent()) ?? '';
    for (const face of ['🤩', '🤔', '😌']) expect(reel).toContain(face);
  });

  test('on a device that cannot record, it starts in read-aloud mode', async ({ page }) => {
    await fakeMic(page, 'none');
    await openGame(page, 'be-the-commentator');
    await expect(page.getByRole('button', { name: '✅ I read it!' })).toBeVisible();
    await expect(page.getByRole('button', { name: '🎙 Record' })).toBeHidden();
  });

  test('lets go of the microphone when he leaves', async ({ page }) => {
    await fakeMic(page, 'yes');
    await openGame(page, 'be-the-commentator');
    await page.getByRole('button', { name: '🎙 Record' }).click();
    await page.getByRole('button', { name: '⏹ Stop' }).click();
    await page.getByRole('button', { name: 'Back to the games' }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __micClosed: boolean }).__micClosed)).toBe(true);
  });
});
