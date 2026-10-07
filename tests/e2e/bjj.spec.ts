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

test.describe('Match Maths', () => {
  test('a whole round of adding up the match', async ({ page }) => {
    const watch = watchPage(page);
    await voices(page);
    await openGame(page, 'match-maths');
    await openSetup(page);
    await page.getByLabel('How many questions').selectOption('8');
    await page.getByRole('button', { name: 'Set up this game' }).click();
    await page.getByRole('button', { name: '▶ Start' }).click();
    for (let i = 0; i < 8; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i + 1}`, { timeout: 10000 });
      await answer(page, '.bj-story');
    }
    await expect(page.locator('.results')).toContainText('8 of 8');
    noProblems(watch);
  });

  test('takedown and mount: the cards say the points, and 2 + 4 = 6', async ({ page }) => {
    await start(page, 'match-maths');
    await expect(page.locator('.bj-step')).toHaveCount(2, { timeout: 10000 });
    const shown = (await page.locator('.bj-step-points').allTextContents()).map((t) => Number(t.replace('+', '')));
    const total = Number(await page.locator('.bj-story').getAttribute('data-answer'));
    expect(shown[0] + shown[1]).toBe(total);
    await page.locator(`.mx-choice[data-n="${total}"]`).click();
    await expect(page.locator('.mx-sum')).toHaveText(`${shown[0]} + ${shown[1]} = ${total}`);
    await expect(page.locator('.bj-score-row.blue .bj-score-points')).toHaveText(String(total));
  });

  test('in Portuguese, the story, the cards and the voice', async ({ page }) => {
    await voices(page);
    await seed(page, { 'bjj-lang': 'pt', 'maths-step:match-maths': 1 });
    await start(page, 'match-maths');
    await expect(page.locator('.bj-story')).toContainText('Quantos pontos o Azul tem?', { timeout: 10000 });
    await expect(page.locator('.bj-step-points').first()).toHaveText('?');
    await expect(page.locator('.bj-score-row.blue .bj-score-name')).toHaveText('Azul');
    await expect.poll(async () => (await said(page)).at(-1)).toMatchObject({ lang: 'pt-BR' });
    /* and back to English in the middle */
    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.locator('.bj-story')).toContainText('How many points has Blue got?');
    await answer(page, '.bj-story');
    await expect(page.locator('.mx-note')).toContainText('Yes!');
  });

  test('his belt is on Blue in every picture and beside his name on the scoreboard', async ({ page }) => {
    await seed(page, { 'bjj-belt': 'green' });
    await start(page, 'match-maths');
    await expect(page.locator('.bj-step').first()).toBeVisible({ timeout: 10000 });
    /* the belt is drawn on every Blue card, last, so nothing covers it */
    for (const pic of await page.locator('.bj-step.blue .bj-pic').all()) {
      await expect(pic.locator('polyline[stroke="#3A9A4E"]').first()).toBeAttached();
    }
    await expect(page.locator('.bj-score-row.blue .bj-belt rect[fill="#3A9A4E"]').first()).toBeAttached();
    await expect(page.locator('.bj-score-row.white .bj-belt rect[fill="#F4F1EA"]').first()).toBeAttached();
  });

  test('which move was it: any move worth those points', async ({ page }) => {
    await seed(page, { 'maths-step:match-maths': 4 });
    await start(page, 'match-maths');
    await expect(page.locator('.mx-choice')).toHaveCount(3, { timeout: 10000 });
    await expect(page.locator('.bj-step-mystery')).toHaveCount(1);
    await expect(page.locator('.mx-sum')).toContainText('+ ? =');
    const points = Number(await page.locator('.bj-story').getAttribute('data-answer'));
    const ids = await page.locator('.mx-choice').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.n ?? ''));
    const worth: Record<string, number> = { takedown: 2, sweep: 2, 'knee-on-belly': 2, 'guard-pass': 3, mount: 4, back: 4 };
    await page.locator(`.mx-choice[data-n="${ids.find((id) => worth[id] === points)}"]`).click();
    await expect(page.locator('.mx-note')).toHaveClass(/good/);
  });

  test('Year 2: a draw on points goes to the advantages, then the penalties', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:match-maths': 6 });
    await start(page, 'match-maths');
    await expect(page.locator('.bj-score-extra')).toHaveCount(4, { timeout: 10000 });
    const [blue, white] = await page.locator('.bj-score-points').allTextContents();
    expect(blue).toBe(white);
    const winner = await page.locator('.bj-story').getAttribute('data-answer');
    await page.locator(`.mx-choice[data-n="${winner}"]`).click();
    await expect(page.locator('.mx-note')).toContainText(`${winner} wins!`);
    noProblems(watch);
  });
});
