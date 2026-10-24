/* Team crests: a grown-up adds one from the iPad's pictures, and Futebol de
 * Botão puts it on that team's buttons, cut to a circle. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, openSetup, seed, watchPage } from './helpers';

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
  test('the card has a place for his team, one for the Rivals, and one for a real team', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'grown-ups');
    const card = page.locator('.gu-card.crests');
    await expect(card.locator('.gu-crest-slot.you strong')).toHaveText('⭐ His own team');
    await expect(card.locator('.gu-crest-slot.rivals strong')).toHaveText('🛡️ The Rivals');
    /* the real teams' picker has only real teams in it, and nothing is picked yet */
    const real = card.getByRole('combobox', { name: 'A real team' });
    await expect(real).toHaveValue('');
    const options = await real.locator('option').allTextContents();
    expect(options.join(' ')).not.toMatch(/You|Rivals/);
    expect(options).toContain('🇧🇷 Brazil');
    expect(options).toContain('Palmeiras');
    await expect(card.locator('.gu-crest-slot.other .gu-crest-pick')).toBeHidden();
    await real.selectOption('palmeiras');
    await expect(card.locator('.gu-crest-slot.other .gu-crest')).toContainText('No crest');
    await expect(card.locator('.gu-crest-slot.other .gu-crest-pick')).toBeVisible();
    noProblems(watch);
  });

  test("a grown-up adds his team's crest, the buttons wear it, and it can be taken off again", async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'grown-ups');
    const slot = page.locator('.gu-card.crests .gu-crest-slot.you');
    await expect(slot.locator('.gu-crest')).toContainText('No crest');
    await expect(slot.getByRole('button', { name: 'Remove the crest for his own team' })).toBeHidden();

    await slot.locator('.gu-crest-file').setInputFiles({ name: 'crest.png', mimeType: 'image/png', buffer: await widePicture(page) });
    await expect(slot.locator('.gu-crest-said')).toHaveText('Saved for his own team, on this iPad.');
    const shown = slot.locator('.gu-crest img');
    await expect(shown).toHaveAttribute('alt', 'The crest for his own team');
    const src = (await shown.getAttribute('src'))!;
    expect(src).toMatch(/^data:image\/png;base64,/);
    /* the square from the middle: half red, half blue, made small */
    const crest = await look(page, src);
    expect(crest.size).toBe(128);
    expect(crest.left).toEqual([255, 0, 0]);
    expect(crest.right).toEqual([0, 0, 255]);
    /* the Rivals' slot is untouched */
    await expect(page.locator('.gu-card.crests .gu-crest-slot.rivals .gu-crest')).toContainText('No crest');

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
    await page.getByRole('button', { name: 'Remove the crest for his own team' }).click();
    await expect(page.locator('.gu-card.crests .gu-crest-slot.you .gu-crest')).toContainText('No crest');
    await openGame(page, 'futebol-de-botao');
    await page.getByRole('button', { name: '▶ Start' }).click();
    await expect(page.locator('.bt-btn.us').first()).toBeVisible();
    await expect(page.locator('.bt-btn.us image.bt-crest')).toHaveCount(0);
    await expect(page.locator('.bt-btn.us .bt-flag').first()).toHaveText('⭐');
    noProblems(watch);
  });

  test("a real team's crest is listed, and a tap on it picks that team again", async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'grown-ups');
    const card = page.locator('.gu-card.crests');
    const slot = card.locator('.gu-crest-slot.other');
    await card.getByRole('combobox', { name: 'A real team' }).selectOption('flamengo');
    await slot.locator('.gu-crest-file').setInputFiles({ name: 'fla.png', mimeType: 'image/png', buffer: await widePicture(page) });
    await expect(slot.locator('.gu-crest-said')).toHaveText('Saved for Flamengo, on this iPad.');
    await expect(card.locator('.gu-crest-list .gu-crest-kept')).toHaveCount(1);

    await card.getByRole('combobox', { name: 'A real team' }).selectOption('brazil');
    await expect(slot.locator('.gu-crest')).toContainText('No crest');
    await card.getByRole('button', { name: 'Flamengo' }).click();
    await expect(card.getByRole('combobox', { name: 'A real team' })).toHaveValue('flamengo');
    await expect(slot.locator('.gu-crest img')).toHaveAttribute('alt', 'The crest for Flamengo');
    /* his own team and the Rivals have none */
    await expect(card.locator('.gu-crest-slot.you .gu-crest')).toContainText('No crest');
    await expect(card.locator('.gu-crest-slot.rivals .gu-crest')).toContainText('No crest');
    noProblems(watch);
  });

  test('the Rivals wear theirs, and once he picks them every football game plays them', async ({ page }) => {
    const watch = watchPage(page);
    /* Botão from the step with a defender in the way */
    await seed(page, { 'maths-step:futebol-de-botao': 3 });
    await openGame(page, 'grown-ups');
    const card = page.locator('.gu-card.crests');
    const picture = await widePicture(page);
    await card.locator('.gu-crest-slot.you .gu-crest-file').setInputFiles({ name: 'ours.png', mimeType: 'image/png', buffer: picture });
    await expect(card.locator('.gu-crest-slot.you .gu-crest-said')).toHaveText('Saved for his own team, on this iPad.');
    await card.locator('.gu-crest-slot.rivals .gu-crest-file').setInputFiles({ name: 'theirs.png', mimeType: 'image/png', buffer: picture });
    await expect(card.locator('.gu-crest-slot.rivals .gu-crest-said')).toHaveText('Saved for the Rivals, on this iPad.');
    /* the list is for real teams only */
    await expect(card.locator('.gu-crest-list .gu-crest-kept')).toHaveCount(0);

    /* both sides' shirts wear their crest: the kits at kick-off, his taker
       and their keeper */
    await openGame(page, 'penalty-shootout');
    await openSetup(page);
    await page.getByLabel('Play against').selectOption('rivals');
    await expect(page.locator('.pk-overlay .pk-big')).toContainText('Rivals');
    await expect(page.locator('.pk-overlay .pk-kit image.pk-crest')).toHaveCount(2);
    await expect(page.locator('.pk-keeper image.pk-crest')).toHaveCount(1);
    await page.getByRole('button', { name: 'Kick off ⚽' }).click();
    await expect(page.locator('.pk-taker image.pk-crest')).toHaveCount(1);

    /* and Futebol de Botão plays them too, their button in their crest */
    await openGame(page, 'futebol-de-botao');
    await page.getByRole('button', { name: '▶ Start' }).click();
    await expect(page.locator('.bt-btn.them')).toHaveCount(1);
    await expect(page.locator('.bt-btn.them image.bt-crest')).toHaveCount(1);
    noProblems(watch);
  });

  test('a file that is not a picture is turned away, and nothing is kept', async ({ page }) => {
    await openGame(page, 'grown-ups');
    const slot = page.locator('.gu-card.crests .gu-crest-slot.rivals');
    await slot.locator('.gu-crest-file').setInputFiles({ name: 'notes.png', mimeType: 'image/png', buffer: Buffer.from('not a picture') });
    await expect(slot.locator('.gu-crest-said')).toHaveText('That picture would not open. Try a photo, or a PNG or JPEG file.');
    await expect(slot.locator('.gu-crest')).toContainText('No crest');
  });
});
