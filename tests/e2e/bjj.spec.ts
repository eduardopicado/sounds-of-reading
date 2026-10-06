/* The jiu-jitsu games, in English and in Portuguese. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, openSetup, seed, watchPage } from './helpers';

type Said = { text: string; lang: string };

/** a speech engine with an Australian voice and a Brazilian one */
async function voices(page: Page, portuguese = true): Promise<void> {
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
        speak: (u: FakeUtterance) => { if (u.text) spoken.push({ text: u.text, lang: u.voice?.lang ?? u.lang }); window.setTimeout(() => u.onend?.(), 0); },
        cancel: () => undefined,
        addEventListener: () => undefined,
      },
    });
  }, portuguese);
}

const said = (page: Page): Promise<Said[]> => page.evaluate(() => [...(window as unknown as { __said: Said[] }).__said]);

async function start(page: Page, id: string): Promise<void> {
  await openGame(page, id);
  await page.getByRole('button', { name: '▶ Start' }).click();
}

/** tap the button that answers the question on the card */
async function answer(page: Page, board = '.bj-card'): Promise<void> {
  await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
  await page.locator(`.mx-choice[data-n="${await page.locator(board).getAttribute('data-answer')}"]`).click();
}

test.describe("Ref's Call", () => {
  test('a whole round, the referee calling every move', async ({ page }) => {
    const watch = watchPage(page);
    await voices(page);
    await openGame(page, 'refs-call');
    await openSetup(page);
    await page.getByLabel('How many questions').selectOption('8');
    await page.getByRole('button', { name: 'Set up this game' }).click();
    await page.getByRole('button', { name: '▶ Start' }).click();
    for (let i = 0; i < 8; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i + 1}`, { timeout: 10000 });
      await answer(page);
    }
    await expect(page.locator('.results')).toContainText('8 of 8');
    expect((await said(page)).map((s) => s.text)).toContainEqual(expect.stringMatching(/! \d points!/));
    noProblems(watch);
  });

  test('a picture of the move, its name, and a miss says the points', async ({ page }) => {
    await start(page, 'refs-call');
    await expect(page.locator('.bj-pic')).toHaveCount(1);
    await expect(page.locator('.mx-choice')).toHaveCount(3);
    const points = Number(await page.locator('.bj-card').getAttribute('data-answer'));
    await page.locator(`.mx-choice:not([data-n="${points}"])`).first().click();
    await expect(page.locator('.mx-note')).toContainText(`${points} points`);
  });

  test('the flags switch to Portuguese mid-question, words and voice', async ({ page }) => {
    const watch = watchPage(page);
    await voices(page);
    await seed(page, { 'maths-step:refs-call': 2 });
    await start(page, 'refs-call');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    await expect(page.locator('.mx-ask')).toContainText('Which move is worth');
    await page.getByRole('button', { name: 'Português' }).click();
    await expect(page.getByRole('button', { name: 'Português' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.mx-ask')).toContainText('Qual vale');
    /* the answer buttons are relabelled, and still answer the same */
    const names = await page.locator('.mx-choice').allTextContents();
    expect(names.some((n) => /queda|raspagem|joelho|passagem|montada|costas/.test(n))).toBe(true);
    await answer(page);
    await expect(page.locator('.mx-note')).toContainText('Isso!');
    await expect.poll(async () => (await said(page)).at(-1)).toMatchObject({ lang: 'pt-BR' });
    expect((await said(page)).at(-1)!.text).toMatch(/pontos!/);
    /* and it is remembered */
    await page.reload();
    await page.getByRole('button', { name: '▶ Start' }).click();
    await expect(page.getByRole('button', { name: 'Português' })).toHaveAttribute('aria-pressed', 'true');
    noProblems(watch);
  });

  test('with no Portuguese voice, the words switch and the voice stays English', async ({ page }) => {
    await voices(page, false);
    await seed(page, { 'bjj-lang': 'pt' });
    await start(page, 'refs-call');
    await expect(page.locator('.mx-ask')).toHaveText('Quantos pontos?');
    await expect.poll(async () => (await said(page)).at(-1)?.text ?? '').toMatch(/How many points\?$/);
  });

  test('Year 2: points, an advantage or a penalty', async ({ page }) => {
    await seed(page, { 'maths-step:refs-call': 3 });
    await start(page, 'refs-call');
    await expect(page.locator('.bj-moment')).not.toBeEmpty({ timeout: 10000 });
    await expect(page.locator('.mx-choice')).toHaveCount(3);
    const call = await page.locator('.bj-card').getAttribute('data-answer');
    await answer(page);
    if (call !== 'points') await expect(page.locator('.mx-note')).toContainText(call === 'advantage' ? 'advantage' : 'penalty');
    else await expect(page.locator('.mx-note')).toContainText('points!');
  });

  test('his belt colour, from setup, is on Blue', async ({ page }) => {
    await openGame(page, 'refs-call');
    await openSetup(page);
    await page.getByLabel('Belt').selectOption('orange');
    await page.getByRole('button', { name: 'Set up this game' }).click();
    await page.getByRole('button', { name: '▶ Start' }).click();
    await expect(page.locator('.bj-pic polyline[stroke="#EE8A2B"]').first()).toBeAttached();
  });
});
