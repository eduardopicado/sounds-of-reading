/* Foosball Words: slide the rods until the lane spells the word, then shoot. */

import { expect, test, type Page } from '@playwright/test';
import { expectTapTargets, noProblems, openGame, openSetup, seed, watchPage } from './helpers';
import { FOOS_STEPS } from '../../src/content/foosball';

async function startAt(page: Page, step: number): Promise<void> {
  await seed(page, { 'maths-step:foosball-words': step });
  await openGame(page, 'foosball-words');
  await page.getByRole('button', { name: '▶ Start' }).click();
  await expect(page.locator('.fb-col').first()).toBeVisible();
}

/** the word asked for, a sound to a rod */
const answerOf = async (page: Page): Promise<string[]> =>
  ((await page.locator('.mx-stage').getAttribute('data-answer')) ?? '').split(' ');

/** slide every rod with its arrows until its player in the lane is the one wanted */
async function setRods(page: Page, parts: string[]): Promise<void> {
  for (const [i, part] of parts.entries()) {
    const col = page.locator('.fb-col').nth(i);
    const players = await col.locator('.fb-man').evaluateAll((ns) => ns.map((n) => (n as HTMLElement).dataset.part));
    const want = players.indexOf(part);
    expect(want, `rod ${i + 1} has ${part}`).toBeGreaterThanOrEqual(0);
    for (let at = Number(await col.getAttribute('data-at')); at !== want; at = Number(await col.getAttribute('data-at'))) {
      await col.getByRole('button', { name: at < want ? `Sound ${i + 1} up` : `Sound ${i + 1} down` }).click();
    }
  }
  await expect(page.locator('.fb-reads')).toHaveText(parts.join(''));
}

test.describe('Foosball Words', () => {
  test('a whole round, every word built and scored, to the sticker', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'foosball-words');
    await openSetup(page);
    await page.getByLabel('How many questions').selectOption('8');
    await page.getByRole('button', { name: 'Set up this game' }).click();
    await page.getByRole('button', { name: '▶ Start' }).click();
    for (let i = 0; i < 8; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i + 1}`, { timeout: 8000 });
      await expect(page.getByRole('button', { name: '⚽ Shoot!' })).toBeEnabled();
      const parts = await answerOf(page);
      /* it never starts on the answer */
      expect(await page.locator('.fb-reads').textContent()).not.toBe(parts.join(''));
      await setRods(page, parts);
      await page.getByRole('button', { name: '⚽ Shoot!' }).click();
      await expect(page.locator('.mx-note.good')).toContainText(`GOAL! ${parts.join(' · ')}: ${parts.join('')}.`);
    }
    await expect(page.locator('.results')).toContainText('8 of 8', { timeout: 8000 });
    await expect(page.locator('.results .sticker')).toHaveText('🕹️');
    noProblems(watch);
  });

  test('a miss says the word again; a second miss slides the rods to it', async ({ page }) => {
    await startAt(page, 0);
    const parts = await answerOf(page);
    const word = parts.join('');
    await page.getByRole('button', { name: '⚽ Shoot!' }).click();
    await expect(page.locator('.mx-note')).toContainText(`Listen: ${word}.`);
    /* every rod starts on a wrong player, so every one gives a shake */
    await expect(page.locator('.fb-col.wrong')).toHaveCount(parts.length);
    await expect(page.getByRole('button', { name: '⚽ Shoot!' })).toBeEnabled();
    await page.getByRole('button', { name: '⚽ Shoot!' }).click();
    await expect(page.locator('.mx-note')).toContainText(`Here it is: ${parts.join(' · ')}, ${word}.`);
    await expect(page.locator('.fb-reads')).toHaveText(word);
    await expect(page.locator('.score')).toContainText('Right first time 0');
  });

  test('a rod slides with a finger too', async ({ page }) => {
    await startAt(page, 1);
    const col = page.locator('.fb-col').first();
    const before = Number(await col.getAttribute('data-at'));
    const box = (await col.locator('.fb-track').boundingBox())!;
    const step = (await col.locator('.fb-man').first().boundingBox())!.height;
    /* up the screen brings the next player into the lane, down the one before */
    const dir = before === 0 ? -1 : 1;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + dir * step * 1.1, { steps: 6 });
    await page.mouse.up();
    await expect(col).toHaveAttribute('data-at', String(before - dir));
  });

  test('words of four sounds on four rods, and the arrows are big enough to tap', async ({ page }) => {
    await startAt(page, 2);
    await expect(page.locator('.fb-col')).toHaveCount(4);
    await expect(page.locator('.fb-col').first().locator('.fb-man')).toHaveCount(FOOS_STEPS[2].players);
    await expectTapTargets(page, '.fb-up, .fb-down');
    const parts = await answerOf(page);
    expect(parts).toHaveLength(4);
    await setRods(page, parts);
    await page.getByRole('button', { name: '⚽ Shoot!' }).click();
    await expect(page.locator('.mx-note.good')).toContainText('GOAL!');
  });
});
