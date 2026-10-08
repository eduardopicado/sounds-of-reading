/* Short Hand, Long Hand: the handover's checklist, played with a finger. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, recordSpeech, said, seed, watchPage } from './helpers';

const clock = (page: Page) => page.locator('.ct-clock');
const time = (page: Page) => clock(page).getAttribute('data-time');

/** where a point at `deg` degrees clockwise from the top, `r` from the
    middle, falls on the screen (the clock is 400 units across) */
async function at(page: Page, deg: number, r: number): Promise<[number, number]> {
  const box = (await clock(page).boundingBox())!;
  const a = (deg * Math.PI) / 180;
  return [box.x + ((200 + r * Math.sin(a)) * box.width) / 400, box.y + ((200 - r * Math.cos(a)) * box.height) / 400];
}

/** press at the first angle and drag round through the rest */
async function drag(page: Page, r: number, ...degs: number[]): Promise<void> {
  const [x, y] = await at(page, degs[0], r);
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (const d of degs.slice(1)) {
    const [nx, ny] = await at(page, d, r);
    await page.mouse.move(nx, ny, { steps: 4 });
  }
  await page.mouse.up();
}

const tab = (page: Page, name: string) => page.locator('.ct-tab', { hasText: name });
const press = async (page: Page, label: string, times = 1): Promise<void> => {
  for (let i = 0; i < times; i += 1) await page.getByRole('button', { name: label }).click();
};
const starCount = async (page: Page): Promise<number> => Number(await page.locator('.ct-stars b').textContent());

test.describe('Short Hand, Long Hand', () => {
  test('opens on Play at 3:25, in digits and in words', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'clock-trainer');
    await expect(page.locator('.ct-readout .ct-digits')).toHaveText('3:25');
    await expect(page.locator('.ct-words')).toHaveText('25 past 3');
    await expect(clock(page)).toHaveAttribute('aria-label', 'Clock showing 25 past 3');
    await expect(page.locator('.ct-card.m .ct-chip')).toHaveText(['5', '10', '15', '20', '25']);
    noProblems(watch);
  });

  test('the long hand going past the top moves the hour on, and back', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'clock-trainer');
    /* from the 25 clockwise round past the 12 */
    await drag(page, 135, 150, 200, 260, 320, 350, 12);
    expect(await time(page)).toBe('4:02');
    /* and anticlockwise back past the 12 */
    await drag(page, 135, 12, 350, 300);
    expect(await time(page)).toBe('3:50');
    noProblems(watch);
  });

  test('the short hand jumps zone to zone and keeps the minutes', async ({ page }) => {
    await openGame(page, 'clock-trainer');
    /* near the middle, by the short hand at 3:25 */
    await drag(page, 60, 102, 150, 200);
    expect(await time(page)).toBe('6:25');
    await expect(page.locator('.ct-card.h')).toContainText('in the 6 zone');
  });

  test('at 3:59 the hour is still 3, and the minutes count in fives then little steps', async ({ page }) => {
    await openGame(page, 'clock-trainer');
    await press(page, 'Five minutes forward', 6);
    await press(page, 'One minute forward', 4);
    expect(await time(page)).toBe('3:59');
    await expect(page.locator('.ct-words')).toHaveText('1 to 4');
    await expect(page.locator('.ct-card.h')).toContainText('It looks close to the 4, but it is still 3');
    await expect(page.locator('.ct-card.m .ct-chip').last()).toHaveText('+4');
    await expect(page.locator('.ct-sum')).toHaveText('59 minutes');
  });

  test('watching an hour go by moves the short hand to the next number', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'clock-trainer');
    await page.getByRole('button', { name: 'Watch one whole hour go by' }).click();
    /* the buttons rest while it runs */
    await expect(page.getByRole('button', { name: 'One hour forward' })).toBeDisabled();
    await expect(page.locator('.ct-card.h')).toContainText('Now it points right at the 4', { timeout: 12000 });
    expect(await time(page)).toBe('4:00');
    await expect(page.getByRole('button', { name: 'One hour forward' })).toBeEnabled();
    noProblems(watch);
  });

  test('leaving while an hour is being watched leaves nothing running', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'clock-trainer');
    await page.getByRole('button', { name: 'Watch one whole hour go by' }).click();
    await page.getByRole('button', { name: 'Back to the games' }).click();
    await page.waitForTimeout(1500);
    await expect(page.locator('.tiles').first()).toBeVisible();
    noProblems(watch);
  });

  test('says the time out loud in the reading voice', async ({ page }) => {
    await recordSpeech(page);
    await openGame(page, 'clock-trainer');
    await page.getByRole('button', { name: '🔊 Say it out loud' }).click();
    await expect.poll(() => said(page)).toContain('25 past 3');
  });

  test('Set the clock, fives: the long hand snaps to fives, and the hints say what is wrong', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'clock-trainer');
    await tab(page, 'Set the clock').click();
    await page.locator('.ct-level', { hasText: 'fives' }).click();
    await expect(page.getByRole('button', { name: 'One minute forward' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Five minutes forward' })).toBeVisible();
    for (let round = 0; round < 3; round += 1) {
      const [h, m] = ((await page.locator('.ct-ask .ct-digits').textContent()) ?? '').split(':').map(Number);
      expect(await time(page)).toBe('12:00');
      if (h !== 12) {
        await page.getByRole('button', { name: 'Check my clock' }).click();
        await expect(page.locator('.ct-fb')).toContainText(`Put it in the ${h} zone`);
        await press(page, 'One hour forward', h);
      }
      if (m !== 0) {
        await page.getByRole('button', { name: 'Check my clock' }).click();
        await expect(page.locator('.ct-fb')).toContainText('The hour is right!');
        await press(page, 'Five minutes forward', m / 5);
      }
      const before = await starCount(page);
      await page.getByRole('button', { name: 'Check my clock' }).click();
      await expect(page.locator('.ct-fb')).toContainText('You did it!');
      /* a star only for right first time */
      expect(await starCount(page)).toBe(h === 12 && m === 0 ? before + 1 : before);
      await page.getByRole('button', { name: 'Next one' }).click();
    }
    /* dragging snaps the long hand to a five too */
    await drag(page, 135, 0, 40);
    expect(Number((await time(page))!.split(':')[1]) % 5).toBe(0);
    noProblems(watch);
  });

  test('Set the clock right first time wins a star', async ({ page }) => {
    await openGame(page, 'clock-trainer');
    await tab(page, 'Set the clock').click();
    await page.locator('.ct-level', { hasText: 'quarters' }).click();
    const [h, m] = ((await page.locator('.ct-ask .ct-digits').textContent()) ?? '').split(':').map(Number);
    await press(page, 'One hour forward', h % 12);
    await press(page, 'Five minutes forward', m / 5);
    await page.getByRole('button', { name: 'Check my clock' }).click();
    await expect(page.locator('.ct-fb')).toContainText(`We say`);
    expect(await starCount(page)).toBe(1);
  });

  test('Read the clock: three different times, one right; a miss brings the helpers back', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'clock-trainer': { stars: 0, ring: false, zone: false } });
    await openGame(page, 'clock-trainer');
    await tab(page, 'Read the clock').click();
    await page.locator('.ct-level', { hasText: 'any minute' }).click();
    const choices = page.locator('.ct-choice');
    await expect(choices).toHaveCount(3);
    const times = await choices.evaluateAll((ns) => ns.map((n) => (n as HTMLElement).dataset.time));
    expect(new Set(times).size).toBe(3);
    await expect(page.locator('.ct-choice[data-ok="1"]')).toHaveCount(1);
    /* the clock shows the right one, and the hands cannot be moved */
    expect(await time(page)).toBe(await page.locator('.ct-choice[data-ok="1"]').getAttribute('data-time'));
    await expect(page.locator('.ct-steps')).toBeHidden();
    await expect(page.locator('.ct-ringg')).toBeHidden();

    await page.locator('.ct-choice[data-ok="0"]').first().click();
    await expect(page.locator('.ct-choice[data-ok="0"]').first()).toBeDisabled();
    await expect(page.locator('.ct-fb')).toContainText('Not that one');
    await expect(page.locator('.ct-ringg')).toBeVisible();
    await expect(page.locator('.ct-zone')).toBeVisible();

    await page.locator('.ct-choice[data-ok="1"]').click();
    await expect(page.locator('.ct-fb')).toContainText('Yes! It is');
    expect(await starCount(page)).toBe(0);

    await page.getByRole('button', { name: 'Next one' }).click();
    await page.locator('.ct-choice[data-ok="1"]').click();
    expect(await starCount(page)).toBe(1);
    noProblems(watch);
  });

  test('the helpers switch off behind the ⚙, and stay off after a reload', async ({ page }) => {
    await openGame(page, 'clock-trainer');
    await page.getByRole('button', { name: 'Set up this game' }).click();
    await page.getByRole('button', { name: 'Minute numbers' }).click();
    await page.getByRole('button', { name: 'Hour zone' }).click();
    await expect(page.locator('.ct-ringg')).toBeHidden();
    await expect(page.locator('.ct-zone')).toBeHidden();
    await page.reload();
    await expect(page.locator('.ct-ringg')).toBeHidden();
    await expect(page.locator('.ct-zone')).toBeHidden();
    await page.getByRole('button', { name: 'Set up this game' }).click();
    await expect(page.getByRole('button', { name: 'Minute numbers' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('stars and the level are kept, every five stars wins a sticker, and the grown-ups see the level', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'clock-trainer': { stars: 4 }, 'maths-step:clock-trainer': 2 });
    await openGame(page, 'clock-trainer');
    expect(await starCount(page)).toBe(4);
    await tab(page, 'Read the clock').click();
    await expect(page.locator('.ct-level[aria-pressed="true"]')).toHaveText('quarters');
    await page.locator('.ct-choice[data-ok="1"]').click();
    expect(await starCount(page)).toBe(5);
    await expect(page.locator('.ct-prize')).toContainText('5 stars! A sticker for your book');
    await page.reload();
    expect(await starCount(page)).toBe(5);
    await page.goto('/');
    await expect(page.locator('.sticker')).toHaveText(['🕰️']);
    await page.goto('/#/grown-ups');
    await expect(page.locator('.mp-row[data-game="clock-trainer"] .mp-step')).toHaveText('quarters · step 3 of 5');
    noProblems(watch);
  });

  test('fits the screen without scrolling sideways', async ({ page }) => {
    await openGame(page, 'clock-trainer');
    for (const name of ['Play', 'Set the clock', 'Read the clock']) {
      await tab(page, name).click();
      const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(wide, name).toBeLessThanOrEqual(0);
    }
  });
});
