/* Team crests: a grown-up adds one from the iPad's pictures, and Futebol de
 * Botão puts it on that team's buttons, cut to a circle. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, watchPage } from './helpers';

/** a picture twice as wide as it is tall, red on the left and blue on the
    right, made in the page as a PNG the way a photo would arrive */
async function widePicture(page: Page): Promise<Buffer> {
  const url = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 60;
    c.height = 30;
    const g = c.getContext('2d')!;
    g.fillStyle = '#ff0000'; g.fillRect(0, 0, 30, 30);
    g.fillStyle = '#0000ff'; g.fillRect(30, 0, 30, 30);
    return c.toDataURL('image/png');
  });
  return Buffer.from(url.split(',')[1], 'base64');
}

/** the crest's size, and the colour a quarter of the way in from each side */
async function look(page: Page, src: string): Promise<{ size: number; left: number[]; right: number[] }> {
  return page.evaluate(async (s) => {
    const img = new Image();
    img.src = s;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d')!;
    g.drawImage(img, 0, 0);
    const at = (x: number): number[] => Array.from(g.getImageData(x, img.height / 2, 1, 1).data).slice(0, 3);
    return { size: img.width, left: at(img.width / 4), right: at((3 * img.width) / 4) };
  }, src);
}

test.describe('team crests', () => {
  test('a grown-up adds one, the buttons wear it, and it can be taken off again', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'grown-ups');
    const card = page.locator('.gu-card.crests');
    await expect(card.getByRole('combobox', { name: 'Which team' })).toHaveValue('you');
    await expect(card.locator('.gu-crest')).toContainText('No crest');
    await expect(card.getByRole('button', { name: 'Remove' })).toBeHidden();

    await card.locator('.gu-crest-file').setInputFiles({ name: 'crest.png', mimeType: 'image/png', buffer: await widePicture(page) });
    await expect(card.locator('.gu-crest-said')).toHaveText('Saved for his own team, on this iPad.');
    const shown = card.locator('.gu-crest img');
    await expect(shown).toHaveAttribute('alt', 'The crest for his own team');
    const src = (await shown.getAttribute('src'))!;
    expect(src).toMatch(/^data:image\/png;base64,/);
    /* the square from the middle: half red, half blue, made small */
    const crest = await look(page, src);
    expect(crest.size).toBe(128);
    expect(crest.left).toEqual([255, 0, 0]);
    expect(crest.right).toEqual([0, 0, 255]);
    await expect(card.locator('.gu-crest-list img')).toHaveCount(1);

    /* his buttons wear it, cut to their face, instead of the star */
    await openGame(page, 'futebol-de-botao');
    await page.getByRole('button', { name: '▶ Start' }).click();
    const ours = page.locator('.bt-btn.us');
    await expect(ours.first()).toBeVisible();
    const n = await ours.count();
    await expect(page.locator('.bt-btn.us image.bt-crest')).toHaveCount(n);
    await expect(page.locator('.bt-btn.us image.bt-crest').first()).toHaveAttribute('href', src);
    await expect(page.locator('.bt-btn.us .bt-flag')).toHaveCount(0);

    /* taken off again: the star is back */
    await openGame(page, 'grown-ups');
    await page.locator('.gu-card.crests').getByRole('button', { name: 'Remove' }).click();
    await expect(page.locator('.gu-card.crests .gu-crest')).toContainText('No crest');
    await expect(page.locator('.gu-card.crests .gu-crest-list img')).toHaveCount(0);
    await openGame(page, 'futebol-de-botao');
    await page.getByRole('button', { name: '▶ Start' }).click();
    await expect(page.locator('.bt-btn.us').first()).toBeVisible();
    await expect(page.locator('.bt-btn.us image.bt-crest')).toHaveCount(0);
    await expect(page.locator('.bt-btn.us .bt-flag').first()).toHaveText('⭐');
    noProblems(watch);
  });

  test('a file that is not a picture is turned away, and nothing is kept', async ({ page }) => {
    await openGame(page, 'grown-ups');
    const card = page.locator('.gu-card.crests');
    await card.locator('.gu-crest-file').setInputFiles({ name: 'notes.png', mimeType: 'image/png', buffer: Buffer.from('not a picture') });
    await expect(card.locator('.gu-crest-said')).toHaveText('That picture would not open. Try a photo, or a PNG or JPEG file.');
    await expect(card.locator('.gu-crest')).toContainText('No crest');
  });
});
