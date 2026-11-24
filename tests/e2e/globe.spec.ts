/* The globe: the world map on a ball he turns with a finger, in World Map,
 * Flags and Animals of the World alike (world-kit.ts). */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, recordSpeech, seed, watchPage } from './helpers';
import { COUNTRIES, HOME, middle, toScreen, wrapLon, type View } from '../../src/content/globe';
import { place, type PlaceId } from '../../src/content/world';

async function startAt(page: Page, step: number, globe = true): Promise<void> {
  await seed(page, { 'maths-step:world-map': step, ...(globe ? { 'world-globe': true } : {}) });
  await openGame(page, 'world-map');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

async function viewOf(page: Page): Promise<View> {
  const [lon, lat] = (await page.locator('.wm-globe').getAttribute('data-view'))!.split(' ').map(Number);
  return { lon, lat };
}

/** the ball on the screen: its middle and radius */
async function ball(page: Page): Promise<{ x: number; y: number; r: number }> {
  const b = (await page.locator('.wm-globe-ball').boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, r: b.width / 2 };
}

/** a drag across the ball, in steps, as a finger would */
async function drag(page: Page, dx: number, dy: number): Promise<void> {
  const b = await ball(page);
  await page.mouse.move(b.x, b.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) await page.mouse.move(b.x + (dx * i) / 10, b.y + (dy * i) / 10);
  await page.mouse.up();
  /* the ball is drawn, and its turn written down, on the next frame: two
     frames on, it has been (WebKit's frames can come well after the drag) */
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
}

/** turn the ball, by dragging, until a place is in the middle */
async function turnTo(page: Page, lon: number, lat: number): Promise<void> {
  const b = await ball(page);
  const v = await viewOf(page);
  const k = (Math.PI * b.r) / 180;
  await drag(page, wrapLon(v.lon - lon) * k, (lat - v.lat) * k);
}

/** a tap on the ball at a longitude and latitude, which must face him */
async function tapAt(page: Page, lon: number, lat: number): Promise<void> {
  const b = await ball(page);
  const p = toScreen(lon, lat, await viewOf(page));
  expect(p.facing, `${lon}, ${lat} faces him`).toBeGreaterThan(0.2);
  await page.mouse.click(b.x + p.u * b.r, b.y - p.v * b.r);
}

const wanted = async (page: Page, n: number): Promise<PlaceId> => {
  await expect(page.locator('.score')).toContainText(`Question ${n}`, { timeout: 8000 });
  return (await page.locator('.wm-stage').getAttribute('data-answer')) as PlaceId;
};

test.describe('the globe', () => {
  /* a voice that says at once when it has finished, as an iPad's does: the
     game waits for the end of what is said before the next question */
  test.beforeEach(async ({ page }) => { await recordSpeech(page); });

  test('switched on with the button and remembered; a drag turns it; names only on the side facing him', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0, false);
    const btn = page.getByRole('button', { name: 'Globe' });
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.wm-globe')).toHaveCount(0);
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.wm-globe-ball')).toBeVisible();
    await expect(page.locator('.wm-map')).toBeHidden();
    await expect(page.locator('.wm-globe')).toHaveAttribute('data-view', `${HOME.lon.toFixed(2)} ${HOME.lat.toFixed(2)}`);

    /* Australia faces him; South America is round the back */
    const names = page.locator('.wm-globe-labels');
    await expect(names.locator('[data-place="australia"]')).toBeVisible();
    await expect(names.locator('[data-place="south-america"]')).toBeHidden();

    /* a drag to the right turns the west round to him */
    const b = await ball(page);
    await drag(page, b.r, 0);
    const v = await viewOf(page);
    expect(wrapLon(HOME.lon - v.lon)).toBeCloseTo(180 / Math.PI, 0);
    expect(v.lat).toBeCloseTo(HOME.lat, 0);
    await expect(names.locator('[data-place="africa"]')).toBeVisible();

    /* the ball is square and on the screen */
    const box = (await page.locator('.wm-globe-ball').boundingBox())!;
    expect(Math.abs(box.width - box.height)).toBeLessThan(2);
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);

    /* remembered, and back to the flat map */
    await page.reload();
    await page.getByRole('button', { name: '▶ Start' }).click();
    await expect(page.locator('.wm-globe-ball')).toBeVisible();
    await page.getByRole('button', { name: 'Globe' }).click();
    await expect(page.locator('.wm-map')).toBeVisible();
    await expect(page.locator('.wm-globe')).toBeHidden();
    noProblems(watch);
  });

  test('finding a continent on the globe, turned round to it', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0);
    const want = await wanted(page, 1);
    const [lon, lat] = place(want).labels[0];
    await turnTo(page, lon, lat);
    await tapAt(page, lon, lat);
    await expect(page.locator('.mx-note')).toContainText('Yes! ');
    await expect(page.locator('.score')).toContainText('Right first time 1');
    noProblems(watch);
  });

  test('a wrong tap turns the globe round to the right answer', async ({ page }) => {
    await startAt(page, 2);
    let want = await wanted(page, 1);
    /* a continent that is not the one asked for, on the side he can see */
    const other = (['australia', 'asia'] as PlaceId[]).find((p) => p !== want)!;
    await tapAt(page, ...place(other).labels[0]);
    await expect(page.locator('.mx-note')).toContainText(`That is ${place(other).name}.`);
    const [lon, lat] = place(want).labels[0];
    await expect.poll(async () => toScreen(lon, lat, await viewOf(page)).facing).toBeGreaterThan(0.95);
    want = await wanted(page, 2);
    expect(want).toBeTruthy();
  });

  test('an ocean, and the oceans\' names round the ball', async ({ page }) => {
    await startAt(page, 1);
    const want = await wanted(page, 1);
    const [lon, lat] = place(want).labels[0];
    await turnTo(page, lon, lat);
    await expect(page.locator(`.wm-globe-labels [data-place="${want}"]`).first()).toBeVisible();
    await tapAt(page, lon, lat);
    await expect(page.locator('.mx-note')).toContainText('Yes! ');
  });

  test('the place to name glows, and the globe turns to show it', async ({ page }) => {
    await startAt(page, 4);
    const want = await wanted(page, 1);
    const [lon, lat] = place(want).labels[0];
    await expect.poll(async () => toScreen(lon, lat, await viewOf(page)).facing).toBeGreaterThan(0.95);
    await page.getByRole('button', { name: place(want).name, exact: true }).click();
    await expect(page.locator('.mx-note')).toContainText('Yes! ');
  });

  test('Flags on the globe: turned round to the country, a tap finds it', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'world-globe': true, 'maths-step:flags': 3 });
    await openGame(page, 'flags');
    await page.getByRole('button', { name: '▶ Start' }).click();
    await expect(page.locator('.score')).toContainText('Question 1', { timeout: 8000 });
    await expect(page.locator('.wm-globe-ball')).toBeVisible();
    const code = (await page.locator('.fl-stage').getAttribute('data-answer'))!;
    const [lon, lat] = middle(COUNTRIES.find((c) => c.id === code)!);
    await turnTo(page, lon, lat);
    await tapAt(page, lon, lat);
    await expect(page.locator('.mx-note')).toContainText('Yes!');
    noProblems(watch);
  });
});
