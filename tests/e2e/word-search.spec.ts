/* Word Search: drag across a hidden word, or tap its two ends. */

import { expect, test, type Page, type Locator } from '@playwright/test';
import { noProblems, openGame, openSetup, seed, watchPage } from './helpers';
import { SEARCH_STEPS, THEMES } from '../../src/content/word-search';
import { ALL_SIGHT_WORDS } from '../../src/content/index';

const ends = async (li: Locator): Promise<[string, string]> =>
  [(await li.getAttribute('data-from'))!, (await li.getAttribute('data-to'))!];

/** the middle of a letter on screen */
async function centre(page: Page, at: string): Promise<{ x: number; y: number }> {
  const box = (await page.locator(`.ws-cell[data-at="${at}"]`).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** a finger from one letter to another */
async function drag(page: Page, from: string, to: string): Promise<void> {
  const a = await centre(page, from);
  const b = await centre(page, to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
}

async function start(page: Page, step: number, list = 'tricky'): Promise<void> {
  await seed(page, { 'maths-step:word-search': step, 'search-list': list });
  await openGame(page, 'word-search');
  await expect(page.locator('.ws-cell').first()).toBeVisible();
}

test.describe('Word Search', () => {
  test('a whole grid found by dragging, to the sticker and a step up', async ({ page }) => {
    const watch = watchPage(page);
    await start(page, 0);
    await expect(page.locator('.ws-grid')).toHaveAttribute('data-size', String(SEARCH_STEPS[0].size));
    await expect(page.locator('.ws-told')).toHaveText(SEARCH_STEPS[0].told);
    const words = await page.locator('.ws-list li').all();
    expect(words).toHaveLength(SEARCH_STEPS[0].count);
    for (const [i, li] of words.entries()) {
      const [from, to] = await ends(li);
      /* the first step's words all read left to right */
      expect(Number(to.split(',')[0])).toBeGreaterThan(Number(from.split(',')[0]));
      await drag(page, from, to);
      await expect(li).toHaveClass(/found/);
      await expect(page.locator('.ws-ring')).toHaveCount(i + 1);
      await expect(page.locator('.score')).toContainText(`Found ${i + 1} of`);
    }
    await expect(page.locator('.results')).toBeVisible({ timeout: 4000 });
    await expect(page.locator('.results .sticker')).toHaveText('🔎');
    await expect(page.locator('.ws-results')).toContainText(`Next: ${SEARCH_STEPS[1].name}`);
    expect(await page.evaluate(() => localStorage.getItem('sor:maths-step:word-search'))).toBe('1');
    await page.getByRole('button', { name: 'Next grid' }).click();
    await expect(page.locator('.ws-grid')).toHaveAttribute('data-size', String(SEARCH_STEPS[1].size));
    noProblems(watch);
  });

  test('two taps find a word, even from its last letter; a wrong line finds nothing', async ({ page }) => {
    const watch = watchPage(page);
    await start(page, 4);
    const li = page.locator('.ws-list li').first();
    const [from, to] = await ends(li);
    /* a line that is not a word: from the first letter of one word to a
       letter that ends no word begun there */
    const pairs = await page.locator('.ws-list li').evaluateAll((ns) =>
      ns.flatMap((n) => [`${(n as HTMLElement).dataset.from} ${(n as HTMLElement).dataset.to}`, `${(n as HTMLElement).dataset.to} ${(n as HTMLElement).dataset.from}`]));
    const wrongEnd = ['0,0', '1,0', '0,1', '2,2', '3,3'].find((c) => c !== from && !pairs.includes(`${from} ${c}`))!;
    await page.locator(`.ws-cell[data-at="${from}"]`).click();
    await expect(page.locator(`.ws-cell.first[data-at="${from}"]`)).toHaveCount(1);
    await page.locator(`.ws-cell[data-at="${wrongEnd}"]`).click();
    await expect(page.locator('.ws-list li.found')).toHaveCount(0);
    await expect(page.locator('.ws-cell.first')).toHaveCount(0);
    /* last letter first, then the first: still the word */
    await page.locator(`.ws-cell[data-at="${to}"]`).click();
    await page.locator(`.ws-cell[data-at="${from}"]`).click();
    await expect(li).toHaveClass(/found/);
    noProblems(watch);
  });

  test('a found tricky word lights up the letters that lie', async ({ page }) => {
    await start(page, 2);
    const lis = await page.locator('.ws-list li').all();
    /* none is coloured until it is found */
    await expect(page.locator('.ws-list .gr')).toHaveCount(0);
    for (const li of lis) {
      const [from, to] = await ends(li);
      await drag(page, from, to);
      await expect(li).toHaveClass(/found/);
    }
    /* each word with letters that lie shows them; an only-early word has none */
    for (const li of lis) {
      const text = await li.getAttribute('data-word');
      const word = ALL_SIGHT_WORDS.find((w) => w.text === text)!;
      await expect(li.locator('.gr')).toHaveCount(word.spans.length);
    }
  });

  test('help lights the first letter of a word, and a grid found with help stays on its step', async ({ page }) => {
    await start(page, 0);
    await page.getByRole('button', { name: '👀 Help me find one' }).click();
    const hint = page.locator('.ws-cell.hint');
    await expect(hint).toHaveCount(1);
    const at = await hint.getAttribute('data-at');
    const froms = await page.locator('.ws-list li').evaluateAll((ns) => ns.map((n) => (n as HTMLElement).dataset.from));
    expect(froms).toContain(at);
    for (const li of await page.locator('.ws-list li').all()) {
      const [from, to] = await ends(li);
      await drag(page, from, to);
    }
    await expect(page.locator('.results')).toBeVisible({ timeout: 4000 });
    await expect(page.locator('.ws-results')).not.toContainText('Next:');
    expect(await page.evaluate(() => localStorage.getItem('sor:maths-step:word-search'))).toBe('0');
  });

  test('a themed list, each word with its picture, remembered', async ({ page }) => {
    const watch = watchPage(page);
    await start(page, 1);
    await openSetup(page);
    await page.getByRole('button', { name: '🌏 Countries' }).click();
    await expect(page.locator('.score')).toContainText('Countries');
    const countries = THEMES.find((t) => t.id === 'countries')!;
    const shown = await page.locator('.ws-list .ws-word').allTextContents();
    for (const word of shown) expect(countries.words.map((w) => w.shown)).toContain(word);
    await expect(page.locator('.ws-list .ws-pic')).toHaveCount(shown.length);
    await page.reload();
    await expect(page.locator('.score')).toContainText('Countries');
    noProblems(watch);
  });

  test('the Years 3–4 grids hide words backwards and on a slant', async ({ page }) => {
    await start(page, 5, 'animals');
    await expect(page.locator('.ws-grid')).toHaveAttribute('data-size', '10');
    await expect(page.locator('.ws-told')).toContainText('backwards');
    for (const li of await page.locator('.ws-list li').all()) {
      const [from, to] = await ends(li);
      await drag(page, from, to);
      await expect(li).toHaveClass(/found/);
    }
    await expect(page.locator('.results')).toBeVisible({ timeout: 4000 });
  });

  test('prints the puzzle as a sheet', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __printed: number }).__printed = 0;
      window.print = () => { (window as unknown as { __printed: number }).__printed += 1; };
    });
    const watch = watchPage(page);
    await start(page, 1, 'colours');
    await openSetup(page);
    await page.getByRole('button', { name: '🖨 Print this puzzle' }).click();
    expect(await page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1);
    const size = SEARCH_STEPS[1].size;
    await expect(page.locator('.ws-print tr')).toHaveCount(size);
    await expect(page.locator('.ws-print td')).toHaveCount(size * size);
    await expect(page.locator('.ws-print h2')).toHaveText('Word search: Colours');
    await expect(page.locator('.ws-plist li')).toHaveCount(SEARCH_STEPS[1].count);
    /* the same letters as on screen */
    const onScreen = await page.locator('.ws-cell').allTextContents();
    expect(await page.locator('.ws-print td').allTextContents()).toEqual(onScreen);
    await expect(page.locator('.ws-print')).toBeHidden();
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.ws-print')).toBeVisible();
    await page.emulateMedia({ media: 'screen' });
    await page.getByRole('button', { name: 'Back to the games' }).click();
    await expect(page.locator('.ws-print')).toHaveCount(0);
    noProblems(watch);
  });
});
