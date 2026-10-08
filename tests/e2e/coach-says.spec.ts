/* Coach Says, played by reading the coach's instruction and doing it. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, seed, watchPage } from './helpers';

const thing = (page: Page, word: string, size = '') => page.locator(`.cs-thing${size}[data-word="${word}"]`);
const place = (page: Page, word: string) => page.locator(`.cs-place[data-word="${word}"]`);

/** read what the coach says and do it */
async function obey(page: Page): Promise<string> {
  await expect(page.locator('.cs-thing').first()).toBeEnabled({ timeout: 8000 });
  const text = (await page.locator('.cs-say').textContent()) ?? '';
  let m: RegExpMatchArray | null;
  if ((m = text.match(/^Tap the big (\w+)\.$/))) await thing(page, m[1], '.big').click();
  else if ((m = text.match(/^Tap the (\w+) that is not big\.$/))) await thing(page, m[1], '.small').click();
  else if ((m = text.match(/^Tap the (\w+) and the (\w+)\.$/))) { await thing(page, m[2]).click(); await thing(page, m[1]).click(); }
  else if ((m = text.match(/^Tap the (\w+), then tap the (\w+)\.$/))) { await thing(page, m[1]).click(); await thing(page, m[2]).click(); }
  else if ((m = text.match(/^Put the (\w+) and the (\w+) (?:in|on) the (\w+)\.$/))) {
    await thing(page, m[1]).click(); await place(page, m[3]).click();
    await thing(page, m[2]).click(); await place(page, m[3]).click();
  } else if ((m = text.match(/^Put the (\w+) (?:in|on) the (\w+), then tap the (\w+)\.$/))) {
    await thing(page, m[1]).click(); await place(page, m[2]).click(); await thing(page, m[3]).click();
  } else if ((m = text.match(/^Put the (\w+) (?:in|on) the (\w+)\.$/))) {
    await thing(page, m[1]).click(); await place(page, m[2]).click();
  } else if ((m = text.match(/^Tap the (\w+)\.$/))) await thing(page, m[1]).click();
  else throw new Error(`cannot read: ${text}`);
  return text;
}

async function startAt(page: Page, step: number, extra: Record<string, unknown> = {}): Promise<void> {
  await seed(page, { 'maths-step:coach-says': step, ...extra });
  await openGame(page, 'coach-says');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

test.describe('Coach Says', () => {
  test('a whole round of doing what the coach says, to the sticker', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0);
    for (let i = 0; i < 8; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i + 1}`, { timeout: 8000 });
      await obey(page);
      await expect(page.locator('.mx-note')).toContainText('Yes!');
    }
    await expect(page.locator('.results')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.results')).toContainText('8 of 8 right first time');
    await expect(page.locator('.results .sticker')).toHaveText('📣');
    noProblems(watch);
  });

  test('the pictures carry no words: reading the instruction is the only way', async ({ page }) => {
    await startAt(page, 0);
    await expect(page.locator('.cs-thing').first()).toBeEnabled({ timeout: 8000 });
    await expect(page.locator('.cs-things')).toHaveText(/^[^a-z]*$/);
    await expect(page.locator('.cs-say')).toHaveText(/^Tap the \w+\.$/);
  });

  test('big or small: the size word has to be read as well as the animal', async ({ page }) => {
    await startAt(page, 2);
    await expect(page.locator('.cs-thing.big')).toHaveCount(2, { timeout: 8000 });
    await expect(page.locator('.cs-thing.small')).toHaveCount(2);
    await obey(page);
    await expect(page.locator('.mx-note')).toContainText('Yes!');
  });

  test('putting a thing in a place moves it there', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 3);
    const text = await obey(page);
    const [, what, where] = text.match(/^Put the (\w+) (?:in|on) the (\w+)\.$/)!;
    await expect(place(page, where).locator('.cs-inside span')).toHaveCount(1);
    await expect(thing(page, what)).toHaveClass(/gone/);
    await expect(page.locator('.mx-note')).toContainText('Yes!');
    noProblems(watch);
  });

  test('a wrong tap shows what the coach meant', async ({ page }) => {
    await startAt(page, 0);
    await expect(page.locator('.cs-thing').first()).toBeEnabled({ timeout: 8000 });
    const [, word] = ((await page.locator('.cs-say').textContent()) ?? '').match(/^Tap the (\w+)\.$/)!;
    await page.locator(`.cs-thing:not([data-word="${word}"])`).first().click();
    await expect(page.locator('.cs-thing.nope')).toHaveCount(1);
    await expect(thing(page, word)).toHaveClass(/meant/);
    await expect(page.locator('.mx-note')).toContainText(`The coach said: Tap the ${word}.`);
  });

  test('"Read it to me" helps, but then it is not right first time', async ({ page }) => {
    await startAt(page, 0);
    await page.getByRole('button', { name: '🔊 Read it to me' }).click();
    await obey(page);
    await expect(page.locator('.mx-note')).toContainText('That is it!');
    await expect(page.locator('.score')).toContainText('Right first time 0');
  });

  test('Pro mode takes the help away', async ({ page }) => {
    await startAt(page, 0, { settings: { levels: [4, 5], sounds: [], pro: true } });
    await expect(page.locator('.cs-thing').first()).toBeEnabled({ timeout: 8000 });
    await expect(page.getByRole('button', { name: '🔊 Read it to me' })).toBeHidden();
  });

  test('Year 2: two things into one place, and a move then a tap', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 6);
    await obey(page);
    await expect(page.locator('.mx-note')).toContainText('Yes!');
    await expect(page.locator('.cs-inside span')).toHaveCount(2);
    noProblems(watch);
  });

  test('only words he can read at the week\'s level are on the pitch', async ({ page }) => {
    await startAt(page, 0, { settings: { levels: [2], sounds: [] } });
    await expect(page.locator('.cs-thing').first()).toBeEnabled({ timeout: 8000 });
    const words = await page.locator('.cs-thing').evaluateAll((ns) => ns.map((n) => (n as HTMLElement).dataset.word));
    for (const w of words) expect(['dog', 'duck', 'pig', 'cat', 'cup', 'cap', 'sock', 'egg', 'drum']).toContain(w);
  });
});
