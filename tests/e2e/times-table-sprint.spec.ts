/* Times Table Sprint: the times tables to 12 × 12, typed on a number pad,
 * quick or not, with each fact remembered. */

import { expect, test, type Page } from '@playwright/test';
import { expectTapTargets, noProblems, openGame, openSetup, seed, watchPage } from './helpers';
import { KNOWN_BOX, TIMES_STEPS, timesFacts } from '../../src/content/maths';

async function start(page: Page): Promise<void> {
  await openGame(page, 'times-table-sprint');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

/** the answer to the sum on screen, once it is waiting for him */
async function asked(page: Page): Promise<number> {
  const sum = page.locator('.ts-sum');
  await expect(sum).toContainText('= ?', { timeout: 10000 });
  return Number(await sum.getAttribute('data-answer'));
}

/** tap the digits of a number, then ✓ */
async function type(page: Page, n: number): Promise<void> {
  for (const d of String(n)) await page.locator('.ts-pad').getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('button', { name: 'Check' }).click();
}

test.describe('Times Table Sprint', () => {
  test('a whole round, typed quickly and right, to the sticker', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'times-table-sprint');
    await openSetup(page);
    await page.getByLabel('How many questions').selectOption('12');
    await page.getByRole('button', { name: 'Set up this game' }).click();
    await page.getByRole('button', { name: '▶ Start' }).click();
    for (let i = 0; i < 12; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i + 1}`, { timeout: 8000 });
      await type(page, await asked(page));
      await expect(page.locator('.mx-note.good')).toContainText('Yes!');
    }
    await expect(page.locator('.results')).toContainText('12 of 12 quick and right');
    await expect(page.locator('.results .sticker')).toHaveText('⏱️');
    noProblems(watch);
  });

  test('the first step is the 2 and 10 times tables, both ways round', async ({ page }) => {
    await start(page);
    for (let i = 0; i < 6; i += 1) {
      await asked(page);
      const [a, op, b] = ((await page.locator('.ts-sum').textContent()) ?? '').split(' ');
      expect(op).toBe('×');
      expect([Number(a), Number(b)].some((x) => x === 2 || x === 10)).toBe(true);
      await type(page, Number(a) * Number(b));
    }
  });

  test('a wrong answer shows the right one built from easier facts, and the fact comes back', async ({ page }) => {
    await start(page);
    const answer = await asked(page);
    const sum = ((await page.locator('.ts-sum').textContent()) ?? '').replace(' = ?', '');
    await type(page, answer + 1);
    await expect(page.locator('.ts-entry.wrong')).toHaveText(String(answer));
    await expect(page.locator('.mx-note')).toContainText(`= ${answer}`);
    await expect(page.locator('.ts-help svg[role="img"]')).toBeVisible();
    /* it is asked again within the next few questions, either way round */
    const [a, , b] = sum.split(' ').map(Number);
    let back = false;
    for (let i = 0; i < 5 && !back; i += 1) {
      const n = await asked(page);
      const [x, , y] = ((await page.locator('.ts-sum').textContent()) ?? '').split(' ').map(Number);
      back = (x === a && y === b) || (x === b && y === a);
      await type(page, n);
    }
    expect(back).toBe(true);
  });

  test('a slow right answer is praised, but does not count as quick', async ({ page }) => {
    await seed(page, { 'sprint-pace': 'quick' });
    await start(page);
    const answer = await asked(page);
    await expect(page.locator('.ts-bar.late')).toBeAttached({ timeout: 8000 });
    await type(page, answer);
    await expect(page.locator('.mx-note')).toContainText('Right!');
    await expect(page.locator('.mx-note')).toContainText('come back');
    await expect(page.locator('.score')).toContainText('Quick and right 0');
  });

  test('a keyboard types the answer too', async ({ page }) => {
    await start(page);
    const answer = await asked(page);
    await page.keyboard.type(String(answer));
    await expect(page.locator('.ts-entry')).toHaveText(String(answer));
    await page.keyboard.press('Backspace');
    await page.keyboard.type(String(answer).slice(-1));
    await page.keyboard.press('Enter');
    await expect(page.locator('.mx-note.good')).toContainText('Yes!');
  });

  test('moves up a table only once every fact in this one is known', async ({ page }) => {
    /* all of ×2 and ×10 known but one */
    const facts = timesFacts(TIMES_STEPS[0].tables);
    const boxes = Object.fromEntries(facts.map((f) => [f, KNOWN_BOX]));
    await seed(page, { 'times-facts': boxes, 'maths-step:times-table-sprint': 0 });
    await start(page);
    for (let i = 0; i < 3; i += 1) {
      await type(page, await asked(page));
      await expect(page.locator('.mx-note.good')).toContainText('Yes!');
    }
    /* every fact was already known, so a right answer takes him up to ×5 */
    await expect(page.locator('.mx-step')).toHaveText(TIMES_STEPS[1].name);
  });

  test('three right in a row is not enough on its own', async ({ page }) => {
    await seed(page, { 'maths-step:times-table-sprint': 0 });
    await start(page);
    for (let i = 0; i < 4; i += 1) {
      await type(page, await asked(page));
      await expect(page.locator('.mx-note.good')).toContainText('Yes!');
    }
    await expect(page.locator('.mx-step')).toHaveText(TIMES_STEPS[0].name);
  });

  test('at the top, the same facts the other way round: division', async ({ page }) => {
    await seed(page, { 'maths-step:times-table-sprint': TIMES_STEPS.length - 1 });
    await start(page);
    const answer = await asked(page);
    const [a, op, b] = ((await page.locator('.ts-sum').textContent()) ?? '').split(' ');
    expect(op).toBe('÷');
    expect(Number(a) / Number(b)).toBe(answer);
    await type(page, answer + 1);
    await expect(page.locator('.mx-note')).toContainText(`because ${answer} × ${b} = ${a}`);
  });

  test('the number pad keys are big enough to tap', async ({ page }) => {
    await start(page);
    await asked(page);
    await expectTapTargets(page, '.ts-key');
  });
});
