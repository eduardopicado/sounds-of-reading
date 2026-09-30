/* The football commentator: "Goooool do Brasil!", "Defendeu o goleiro!" */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, openSetup, seed, watchPage } from './helpers';

type Said = { text: string; lang: string };

/** a speech engine with an Australian voice, and a Brazilian one if asked */
async function voices(page: Page, portuguese: boolean): Promise<void> {
  await page.addInitScript((pt) => {
    const spoken: Said[] = [];
    (window as unknown as { __said: Said[] }).__said = spoken;
    class FakeUtterance {
      text: string; lang = ''; rate = 1; pitch = 1; volume = 1; voice: { lang: string } | null = null;
      onend: (() => void) | null = null; onerror: (() => void) | null = null;
      constructor(text: string) { this.text = text; }
    }
    const list = [{ name: 'Karen', lang: 'en-AU', localService: true, default: true, voiceURI: 'com.apple.voice.compact.en-AU.Karen' }];
    if (pt) list.push({ name: 'Luciana', lang: 'pt-BR', localService: true, default: false, voiceURI: 'com.apple.voice.compact.pt-BR.Luciana' });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => list,
        speak: (u: FakeUtterance) => {
          if (u.text) spoken.push({ text: u.text, lang: u.voice?.lang ?? u.lang });
          window.setTimeout(() => u.onend?.(), 0);
        },
        cancel: () => undefined,
        addEventListener: () => undefined,
      },
    });
  }, portuguese);
}

const said = (page: Page): Promise<Said[]> =>
  page.evaluate(() => [...(window as unknown as { __said: Said[] }).__said]);

/** the word he is being asked for: on his kick, ask to hear it */
async function kick(page: Page, right: boolean): Promise<string> {
  const pitch = page.locator('.pk-pitch');
  await expect(pitch).toHaveAttribute('data-ready', '1', { timeout: 6000 });
  if ((await pitch.getAttribute('data-phase')) === 'shoot') await page.getByRole('button', { name: 'Say it' }).click();
  const all = await said(page);
  const word = all[all.length - 1].text;
  const texts = (await page.locator('.pk-spot:not([hidden])').allTextContents()).map((t) => t.trim());
  const at = right ? texts.indexOf(word) : texts.findIndex((t) => t !== word);
  await page.locator('.pk-spot:not([hidden])').nth(at).click();
  return word;
}

async function kickOff(page: Page): Promise<void> {
  await openGame(page, 'penalty-shootout');
  await page.getByRole('button', { name: 'Kick off ⚽' }).click();
}

test.describe('the commentator', () => {
  test('shouts his team\'s goal in Portuguese, then says the word', async ({ page }) => {
    const watch = watchPage(page);
    await voices(page, true);
    await seed(page, { 'shootout-team': 'brazil', 'shootout-rival': 'argentina' });
    await kickOff(page);

    const word = await kick(page, true);
    await expect.poll(async () => (await said(page)).map((s) => s.text)).toContainEqual(expect.stringMatching(/ do Brasil!$/));
    const all = await said(page);
    const call = all.findIndex((s) => / do Brasil!$/.test(s.text));
    expect(all[call].lang).toBe('pt-BR');
    /* and the word straight after, in English */
    await expect.poll(async () => (await said(page)).slice(call + 1)[0]).toEqual({ text: word, lang: 'en-AU' });
    noProblems(watch);
  });

  test('calls the keeper\'s save, and the other team\'s goal', async ({ page }) => {
    await voices(page, true);
    await seed(page, { 'shootout-team': 'palmeiras', 'shootout-rival': 'flamengo' });
    await kickOff(page);

    /* his kick, saved */
    await kick(page, false);
    await expect.poll(async () => (await said(page)).map((s) => s.text))
      .toContainEqual(expect.stringMatching(/^(Defendeu o goleiro|Que defesa|Pegou o goleiro)!$/));

    /* in goal, the wrong way: a goal for Flamengo */
    await kick(page, false);
    await expect.poll(async () => (await said(page)).map((s) => s.text)).toContainEqual(expect.stringMatching(/ do Flamengo!$/));
  });

  test('uses the right article for the team: da Argentina, de Portugal', async ({ page }) => {
    await voices(page, true);
    await seed(page, { 'shootout-team': 'argentina', 'shootout-rival': 'portugal' });
    await kickOff(page);
    await kick(page, true);
    await expect.poll(async () => (await said(page)).map((s) => s.text)).toContainEqual(expect.stringMatching(/ da Argentina!$/));
    await kick(page, false);
    await expect.poll(async () => (await said(page)).map((s) => s.text)).toContainEqual(expect.stringMatching(/ de Portugal!$/));
  });

  test('with no Portuguese voice on the device, calls it in English instead', async ({ page }) => {
    await voices(page, false);
    await seed(page, { 'shootout-team': 'brazil', 'shootout-rival': 'argentina' });
    await kickOff(page);
    await kick(page, true);
    await expect.poll(async () => (await said(page)).map((s) => s.text)).toContain('Goooal for Brazil!');
    expect((await said(page)).some((s) => /do Brasil/.test(s.text))).toBe(false);
  });

  test('a grown-up can turn the commentator off', async ({ page }) => {
    await voices(page, true);
    await openGame(page, 'penalty-shootout');
    await openSetup(page);
    await page.getByLabel('Commentator').selectOption('off');
    await page.getByRole('button', { name: 'Set up this game' }).click();
    await page.getByRole('button', { name: 'Kick off ⚽' }).click();
    const word = await kick(page, true);
    await expect(page.locator('.pk-banner')).toHaveText('GOAL!');
    await expect.poll(async () => (await said(page)).at(-1)?.text).toBe(word);
    expect((await said(page)).some((s) => s.lang === 'pt-BR')).toBe(false);
  });

  test('Pass and Shoot has the commentator too', async ({ page }) => {
    await voices(page, true);
    await seed(page, { 'shootout-team': 'brazil' });
    await openGame(page, 'pass-and-shoot');
    const players = page.locator('.ps-player');
    const n = await players.count();
    for (let i = 0; i < n; i += 1) await players.nth(i).click();
    await expect(page.locator('.ps-target:not([hidden])').first()).toBeEnabled();
    await page.locator('.ps-target:not([hidden])').first().click();
    await expect.poll(async () => (await said(page)).map((s) => s.text))
      .toContainEqual(expect.stringMatching(/( do Brasil|Defendeu o goleiro|Que defesa|Pegou o goleiro)!$/));
  });
});
