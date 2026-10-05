/* The maths games, played through by reading the screen the way he does. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, openSetup, seed, watchPage } from './helpers';

/** wait for the number buttons, then tap one */
async function tapNumber(page: Page, n: number): Promise<void> {
  const btn = page.locator(`.mx-choice[data-n="${n}"]`);
  await expect(btn).toBeEnabled({ timeout: 6000 });
  await btn.click();
}

/** answer whatever is asked, right or deliberately wrong */
async function answerBench(page: Page, right: boolean): Promise<number> {
  await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
  const total = await page.locator('.mx-spot').count();
  const on = await page.locator('.mx-spot .pk-player').count();
  const need = total - on;
  const options = (await page.locator('.mx-choice').allTextContents()).map(Number);
  await tapNumber(page, right ? need : options.find((x) => x !== need)!);
  return need;
}

async function answerSum(page: Page): Promise<void> {
  await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
  const [a, op, b] = ((await page.locator('.mx-sum').textContent()) ?? '').split(' ');
  await tapNumber(page, op === '+' ? Number(a) + Number(b) : Number(a) - Number(b));
}

async function answerFlash(page: Page): Promise<void> {
  /* count during the look, then answer once the dots have gone */
  await expect(page.locator('.mx-flash .mx-dot').first()).toBeVisible({ timeout: 8000 });
  const n = await page.locator('.mx-flash .mx-dot').count();
  await tapNumber(page, n);
}

async function kickToNumber(page: Page, right: boolean): Promise<void> {
  const line = page.locator('.mx-line[data-ready="1"]');
  await expect(line).toBeVisible({ timeout: 8000 });
  const asked = Number(await line.getAttribute('data-asked'));
  const labels = (await page.locator('.mx-label').allTextContents()).map(Number);
  const lo = labels[0];
  const hi = labels[labels.length - 1];
  const target = right ? asked : (asked > (lo + hi) / 2 ? lo : hi);
  const box = await line.boundingBox();
  if (!box) throw new Error('no line');
  /* the line runs from 40 to 960 of the svg's 1000 units */
  const x = box.x + box.width * (40 + ((target - lo) / (hi - lo)) * 920) / 1000;
  await page.mouse.click(x, box.y + box.height / 2);
}

async function playRound(page: Page, answer: () => Promise<void>): Promise<void> {
  await openSetup(page);
  await page.getByLabel('How many questions').selectOption('8');
  await page.getByRole('button', { name: 'Set up this game' }).click();
  for (let i = 0; i < 8; i += 1) {
    await expect(page.locator('.score')).toContainText(`Question ${i + 1}`, { timeout: 8000 });
    await answer();
  }
  await expect(page.locator('.results')).toBeVisible({ timeout: 8000 });
}

test.describe('maths games', () => {
  test('Off the Bench: every answer right, he climbs a step and wins a sticker', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'off-the-bench');
    await playRound(page, async () => { await answerBench(page, true); });
    await expect(page.locator('.results')).toContainText('8 of 8 right first time');
    await expect(page.locator('.results')).toContainText('You went up to');
    await expect(page.locator('.results .sticker')).toHaveText('🧤');
    noProblems(watch);
  });

  test('Off the Bench: a wrong answer counts the gaps with him', async ({ page }) => {
    await openGame(page, 'off-the-bench');
    const need = await answerBench(page, false);
    await expect(page.locator('.mx-choice.wrong')).toHaveCount(1);
    await expect(page.locator('.mx-choice.right')).toHaveText(String(need));
    await expect(page.locator('.mx-spot.counted')).toHaveCount(need);
    await expect(page.locator('.mx-note')).toContainText('make');
  });

  test('Scoreboard Sums: a whole round of sums', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'scoreboard-sums');
    /* the goals are there to count at first */
    await expect(page.locator('.mx-balls .mx-ball').first()).toBeVisible();
    await playRound(page, () => answerSum(page));
    await expect(page.locator('.results')).toContainText('8 of 8');
    noProblems(watch);
  });

  test('Scoreboard Sums: the take-away step shows the offside goals', async ({ page }) => {
    await seed(page, { 'maths-step:scoreboard-sums': 3 });
    await openGame(page, 'scoreboard-sums');
    await expect(page.locator('.mx-sum')).toContainText('−');
    await expect(page.locator('.mx-ball.offside').first()).toBeVisible();
  });

  test('Number Line Penalty: kicking to the number scores, missing it is saved', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'number-line-penalty');
    await kickToNumber(page, false);
    await expect(page.locator('.mx-note')).toContainText('Saved!');
    await expect(page.locator('.mx-answer')).toHaveCount(1);
    await expect(page.locator('.score')).toContainText('Question 2', { timeout: 8000 });
    for (let i = 1; i < 8; i += 1) {
      await kickToNumber(page, true);
      await expect(page.locator('.mx-note')).toContainText('GOAL!');
      if (i < 7) await expect(page.locator('.score')).toContainText(`Question ${i + 2}`, { timeout: 8000 });
    }
    await expect(page.locator('.results')).toContainText('7 of 8', { timeout: 8000 });
    noProblems(watch);
  });

  test('Number Line Penalty: the long lines go up to 100 and 120', async ({ page }) => {
    await seed(page, { 'maths-step:number-line-penalty': 5 });
    await openGame(page, 'number-line-penalty');
    await expect(page.locator('.mx-label').last()).toHaveText('120');
    await kickToNumber(page, true);
    await expect(page.locator('.mx-note')).toContainText('GOAL!');
  });

  test('Flash Count: the numbers only appear once the dots have gone', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'flash-count');
    await expect(page.locator('.mx-flash .mx-dot').first()).toBeVisible();
    await expect(page.locator('.mx-choice')).toHaveCount(0);
    await expect(page.locator('.mx-choice').first()).toBeVisible({ timeout: 4000 });
    await expect(page.locator('.mx-flash .mx-dot')).toHaveCount(0);
    noProblems(watch);
  });

  test('Flash Count: a whole round', async ({ page }) => {
    await openGame(page, 'flash-count');
    await playRound(page, () => answerFlash(page));
    await expect(page.locator('.results')).toContainText('8 of 8');
  });

  test('remembers the step he reached, and Pro starts one higher', async ({ page }) => {
    await seed(page, { 'maths-step:off-the-bench': 2, settings: { pro: true } });
    await openGame(page, 'off-the-bench');
    await expect(page.getByLabel('Start at')).toHaveValue('3');
    await expect(page.locator('.mx-step')).toHaveText('Make 20');
    await expect(page.locator('.mx-spot')).toHaveCount(20);
  });

  test('the home screen has a maths section with all four', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.tiles-head').nth(1)).toHaveText('Maths');
    await expect(page.locator('.tiles').nth(1).locator('.tile-link')).toHaveCount(4);
  });
});
