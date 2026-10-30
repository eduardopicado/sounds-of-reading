/* The maths games, played through by reading the screen the way he does. */

import { expect, test, type Page } from '@playwright/test';
import { expectTapTargets, noProblems, openGame, openSetup, seed, watchPage } from './helpers';
import { GAMES } from '../../src/games/catalog';

/** open a maths game and tap Start, as he does */
async function startGame(page: Page, id: string): Promise<void> {
  await openGame(page, id);
  await page.getByRole('button', { name: '▶ Start' }).click();
}

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
  /* players on the pitch, or fans in the stadium */
  const on = await page.locator('.mx-spot .pk-player, .mx-spot.fan').count();
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
  /* the ends of the line on show, as written (0.7 on a line of tenths) */
  const lo = Number(await line.getAttribute('data-lo'));
  const hi = Number(await line.getAttribute('data-hi'));
  /* rounding: the right answer is the nearer end, not the number itself */
  const answer = await line.getAttribute('data-answer');
  const target = right ? Number(answer ?? asked) : (asked > (lo + hi) / 2 ? lo : hi);
  const box = await line.boundingBox();
  if (!box) throw new Error('no line');
  /* the line runs from 40 to 960 of the svg's 1000 units */
  const x = box.x + box.width * (40 + ((target - lo) / (hi - lo)) * 920) / 1000;
  await page.mouse.click(x, box.y + box.height / 2);
}

/** the last number under the line is inside the goal, not cut off at its edge */
async function lastLabelFits(page: Page): Promise<void> {
  const goal = await page.locator('.mx-goal').boundingBox();
  const label = await page.locator('.mx-label').last().boundingBox();
  expect(label!.x + label!.width).toBeLessThanOrEqual(goal!.x + goal!.width);
}

async function playRound(page: Page, answer: () => Promise<void>): Promise<void> {
  await openSetup(page);
  await page.getByLabel('How many questions').selectOption('8');
  await page.getByRole('button', { name: 'Set up this game' }).click();
  await page.getByRole('button', { name: '▶ Start' }).click();
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
    await startGame(page, 'off-the-bench');
    const need = await answerBench(page, false);
    await expect(page.locator('.mx-choice.wrong')).toHaveCount(1);
    await expect(page.locator('.mx-choice.right')).toHaveText(String(need));
    await expect(page.locator('.mx-spot.counted')).toHaveCount(need);
    await expect(page.locator('.mx-note')).toContainText('make');
  });

  test('Scoreboard Sums: a whole round of sums', async ({ page }) => {
    const watch = watchPage(page);
    await startGame(page, 'scoreboard-sums');
    /* the goals are there to count at first */
    await expect(page.locator('.mx-balls .mx-ball').first()).toBeVisible();
    await playRound(page, () => answerSum(page));
    await expect(page.locator('.results')).toContainText('8 of 8');
    noProblems(watch);
  });

  test('Scoreboard Sums: the take-away step shows the offside goals', async ({ page }) => {
    await seed(page, { 'maths-step:scoreboard-sums': 3 });
    await startGame(page, 'scoreboard-sums');
    await expect(page.locator('.mx-sum')).toContainText('−');
    await expect(page.locator('.mx-ball.offside').first()).toBeVisible();
  });

  test('Number Line Penalty: kicking to the number scores, missing it is saved', async ({ page }) => {
    const watch = watchPage(page);
    await startGame(page, 'number-line-penalty');
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
    await startGame(page, 'number-line-penalty');
    await expect(page.locator('.mx-label').last()).toHaveText('120');
    await kickToNumber(page, true);
    await expect(page.locator('.mx-note')).toContainText('GOAL!');
  });

  test('Flash Count: the numbers only appear once the dots have gone', async ({ page }) => {
    const watch = watchPage(page);
    await startGame(page, 'flash-count');
    await expect(page.locator('.mx-flash .mx-dot').first()).toBeVisible();
    await expect(page.locator('.mx-choice')).toHaveCount(0);
    await expect(page.locator('.mx-choice').first()).toBeVisible({ timeout: 4000 });
    await expect(page.locator('.mx-flash .mx-dot')).toHaveCount(0);
    noProblems(watch);
  });

  test('nothing is asked until he taps Start, and a setup change waits for Start again', async ({ page }) => {
    const watch = watchPage(page);
    for (const id of ['flash-count', 'off-the-bench', 'scoreboard-sums', 'number-line-penalty']) {
      await openGame(page, id);
      await expect(page.locator('.mx-ready')).toBeVisible();
      await expect(page.locator('.mx-board')).toBeHidden();
      await expect(page.locator('.score')).toBeHidden();
      await page.waitForTimeout(600);
      await expect(page.locator('.mx-choice, .mx-flash .mx-dot, .mx-line[data-ready="1"]')).toHaveCount(0);
    }
    await page.getByRole('button', { name: '▶ Start' }).click();
    await expect(page.locator('.score')).toContainText('Question 1');
    await openSetup(page);
    await page.getByLabel('How many questions').selectOption('12');
    await expect(page.locator('.mx-ready')).toBeVisible();
    await expect(page.locator('.mx-board')).toBeHidden();
    noProblems(watch);
  });

  test('Flash Count: a long first look that closes in as he gets them right', async ({ page }) => {
    await seed(page, { 'flash-speed': 'normal' });
    await startGame(page, 'flash-count');
    const card = page.locator('.mx-flash');
    const looks: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i + 1}`, { timeout: 8000 });
      await expect(card.locator('.mx-dot').first()).toBeVisible({ timeout: 8000 });
      looks.push(Number(await card.getAttribute('data-ms')));
      await answerFlash(page);
    }
    /* Dice to 5 is 2 seconds; the first look is half as long again */
    expect(looks).toEqual([3000, 2700, 2400]);
  });

  test('Flash Count: the speed in setup slows the look down, and is remembered', async ({ page }) => {
    await openGame(page, 'flash-count');
    await openSetup(page);
    await page.getByLabel('Speed').selectOption('slow');
    await page.getByRole('button', { name: 'Set up this game' }).click();
    await page.getByRole('button', { name: '▶ Start' }).click();
    await expect(page.locator('.mx-flash .mx-dot').first()).toBeVisible();
    expect(Number(await page.locator('.mx-flash').getAttribute('data-ms'))).toBe(4800);
    await page.reload();
    await expect(page.getByLabel('Speed')).toHaveValue('slow');
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
    await expect(page.locator('.mx-ready-step')).toHaveText('Make 20');
    await page.getByRole('button', { name: '▶ Start' }).click();
    await expect(page.locator('.mx-step')).toHaveText('Make 20');
    await expect(page.locator('.mx-spot')).toHaveCount(20);
  });

  test('Year 2: Off the Bench fills a stadium of 100, in tens', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:off-the-bench': 4 });
    await startGame(page, 'off-the-bench');
    await expect(page.locator('.mx-step')).toHaveText('Fill 100 in tens');
    await expect(page.locator('.mx-spot')).toHaveCount(100);
    /* only tens to choose from */
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
    for (const t of await page.locator('.mx-choice').allTextContents()) expect(Number(t) % 10).toBe(0);
    const need = await answerBench(page, true);
    expect(need % 10).toBe(0);
    await expect(page.locator('.mx-spot.fan')).toHaveCount(100);
    noProblems(watch);
  });

  test('Year 2: a wrong answer in the stadium fills up the row, then counts in tens', async ({ page }) => {
    await seed(page, { 'maths-step:off-the-bench': 5 });
    await startGame(page, 'off-the-bench');
    const need = await answerBench(page, false);
    /* the last label on the empty seats is the answer */
    await expect(page.locator('.mx-spot.counted').last()).toHaveText(String(need));
    await expect(page.locator('.mx-spot.counted')).toHaveCount(need);
  });

  test('Years 3–4: Off the Bench fills a stadium of 1000, in whole stands', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:off-the-bench': 6 });
    await startGame(page, 'off-the-bench');
    await expect(page.locator('.mx-step')).toHaveText('Fill 1000 in hundreds');
    await expect(page.locator('.ob-stand')).toHaveCount(10);
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
    for (const t of await page.locator('.mx-choice').allTextContents()) expect(Number(t) % 100).toBe(0);
    const on = Number(await page.locator('.ob-1000').getAttribute('data-on'));
    await tapNumber(page, 1000 - on);
    await expect(page.locator('.mx-note')).toContainText(`${on} and ${1000 - on} make 1000`);
    /* every seat is full */
    await expect(page.locator('.ob-row.gap, .ob-seat.gap')).toHaveCount(0);
    noProblems(watch);
  });

  test('Years 3–4: a miss on 1000 fills up the row, then the stand, then counts the stands', async ({ page }) => {
    await seed(page, { 'maths-step:off-the-bench': 8 });
    await startGame(page, 'off-the-bench');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
    const on = Number(await page.locator('.ob-1000').getAttribute('data-on'));
    const wrong = (await page.locator('.mx-choice').allTextContents()).map(Number).find((x) => x !== 1000 - on)!;
    await tapNumber(page, wrong);
    await expect(page.locator('.mx-note')).toContainText(`Fill up the row: ${10 - (on % 10)} more makes`);
    await expect(page.locator('.ob-seat.counted')).toHaveCount(10 - (on % 10));
    await expect(page.locator('.ob-stand.counted')).toHaveCount(Math.floor((1000 - on) / 100));
  });

  test('Year 2: Scoreboard Sums to 100 in racks of ten, and splits a miss into tens and ones', async ({ page }) => {
    await seed(page, { 'maths-step:scoreboard-sums': 7 });
    await startGame(page, 'scoreboard-sums');
    await expect(page.locator('.mx-step')).toHaveText('Add tens and ones');
    await expect(page.locator('.mx-ten').first()).toBeVisible();
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
    const [a, , b] = ((await page.locator('.mx-sum').textContent()) ?? '').split(' ').map(Number);
    expect(await page.locator('.mx-ten').count()).toBe(Math.floor(a / 10) + Math.floor(b / 10));
    const answer = a + b;
    const wrong = (await page.locator('.mx-choice').allTextContents()).map(Number).find((x) => x !== answer)!;
    await tapNumber(page, wrong);
    await expect(page.locator('.mx-note')).toHaveText(`${a} and ${b - (b % 10)} is ${a + b - (b % 10)}, and ${b % 10} more is ${answer}.`);
  });

  test('Years 3–4: Scoreboard Sums counts the crowd, in crates of a hundred', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:scoreboard-sums': 12 });
    await startGame(page, 'scoreboard-sums');
    await expect(page.locator('.mx-step')).toHaveText('Add to 1000');
    await expect(page.locator('.mx-ask')).toContainText('come through the gates');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
    const [a, , b] = ((await page.locator('.mx-sum').textContent()) ?? '').split(' ').map(Number);
    await expect(page.locator('.mx-hundred')).toHaveCount(Math.floor(a / 100) + Math.floor(b / 100));
    await expect(page.locator('.mx-hundred.new')).toHaveCount(Math.floor(b / 100));
    await expectTapTargets(page, '.mx-choice');
    await tapNumber(page, a + b);
    await expect(page.locator('.mx-note')).toHaveText(`Yes! ${a} and ${b} make ${a + b}.`);
    noProblems(watch);
  });

  test('Years 3–4: a miss past a hundred is split into hundreds, tens and ones, and the carry slip is offered', async ({ page }) => {
    await seed(page, { 'maths-step:scoreboard-sums': 14 });
    await startGame(page, 'scoreboard-sums');
    await expect(page.locator('.mx-step')).toHaveText('Add past a ten or a hundred');
    await expect(page.locator('.mx-hundred')).toHaveCount(0);
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
    const [a, , b] = ((await page.locator('.mx-sum').textContent()) ?? '').split(' ').map(Number);
    const answer = a + b;
    /* each column added on its own, forgetting to carry */
    const column = [1, 10, 100].reduce((sum, p) => sum + ((Math.floor(a / p) % 10 + Math.floor(b / p) % 10) % 10) * p, 0);
    const offered = (await page.locator('.mx-choice').allTextContents()).map(Number);
    expect(offered).toContain(column);
    await tapNumber(page, column);
    const [h, t, o] = [b - (b % 100), b % 100 - (b % 10), b % 10];
    await expect(page.locator('.mx-note')).toHaveText(`${a} and ${h} is ${a + h}, and ${t} more is ${a + h + t}, and ${o} more is ${answer}.`);
    /* and the crates come out to see it */
    await expect(page.locator('.mx-hundred')).toHaveCount(Math.floor(a / 100) + Math.floor(b / 100));
  });

  test('Years 3–4: Scoreboard Sums goes on to 10 000', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:scoreboard-sums': 17 });
    await startGame(page, 'scoreboard-sums');
    await expect(page.locator('.mx-step')).toHaveText('Add and take away to 10 000');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
    const [a, op, b] = ((await page.locator('.mx-sum').textContent()) ?? '').split(' ');
    expect(a).toHaveLength(4);
    expect(b).toHaveLength(4);
    const answer = op === '+' ? Number(a) + Number(b) : Number(a) - Number(b);
    await tapNumber(page, answer);
    await expect(page.locator('.mx-note')).toContainText('Yes!');
    noProblems(watch);
  });

  test('Year 2: the number line goes to 1000', async ({ page }) => {
    await seed(page, { 'maths-step:number-line-penalty': 7 });
    await startGame(page, 'number-line-penalty');
    await expect(page.locator('.mx-label').last()).toHaveText('1000');
    await lastLabelFits(page);
    await expect(page.locator('.mx-line[data-ready="1"]')).toBeVisible();
    expect(Number(await page.locator('.mx-line').getAttribute('data-asked')) % 100).toBe(0);
    await kickToNumber(page, true);
    await expect(page.locator('.mx-note')).toContainText('GOAL!');
  });

  test('Years 3–4: the number line goes to 10 000, in thousands', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:number-line-penalty': 9 });
    await startGame(page, 'number-line-penalty');
    await expect(page.locator('.mx-step')).toHaveText('0 to 10 000 in thousands');
    await expect(page.locator('.mx-label')).toHaveText(['0', '5000', '10 000']);
    await lastLabelFits(page);
    await expect(page.locator('.mx-line[data-ready="1"]')).toBeVisible();
    expect(Number(await page.locator('.mx-line').getAttribute('data-asked')) % 1000).toBe(0);
    await kickToNumber(page, true);
    await expect(page.locator('.mx-note')).toContainText('GOAL!');
    noProblems(watch);
  });

  test('Years 3–4: rounding is a kick to the nearer end of one ten', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:number-line-penalty': 11 });
    await startGame(page, 'number-line-penalty');
    await expect(page.locator('.mx-step')).toHaveText('Nearest ten');
    const line = page.locator('.mx-line[data-ready="1"]');
    await expect(line).toBeVisible();
    const n = Number(await line.getAttribute('data-asked'));
    const answer = Number(await line.getAttribute('data-answer'));
    const lo = Math.floor(n / 10) * 10;
    expect(n % 10).not.toBe(0);
    expect(n % 10).not.toBe(5);
    expect(answer).toBe(Math.round(n / 10) * 10);
    /* the line is just that ten, with the number marked and halfway dashed */
    await expect(page.locator('.mx-label')).toHaveText([String(lo), String(lo + 10)]);
    await expect(page.locator('.mx-ask')).toContainText(`Kick it to the ten nearest ${n}`);
    await expect(page.locator('.mx-asked')).toBeVisible();
    await expect(page.locator('.mx-half')).toHaveCount(1);
    await kickToNumber(page, true);
    await expect(page.locator('.mx-note')).toContainText(`GOAL! ${n} is nearer ${answer}.`);
    /* a kick to the far end is saved, and says how far each end is */
    await expect(page.locator('.score')).toContainText('Question 2', { timeout: 8000 });
    const m = Number(await line.getAttribute('data-asked'));
    const near = Math.round(m / 10) * 10;
    const far = near === Math.floor(m / 10) * 10 ? near + 10 : near - 10;
    await kickToNumber(page, false);
    await expect(page.locator('.mx-note')).toContainText(
      `Saved! ${m} is ${Math.abs(near - m)} from ${near} and ${Math.abs(far - m)} from ${far}, so it is nearer ${near}.`);
    noProblems(watch);
  });

  test('Years 3–4: the line from 0 to 1 counts in tenths', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:number-line-penalty': 13 });
    await startGame(page, 'number-line-penalty');
    await expect(page.locator('.mx-step')).toHaveText('0 to 1 in tenths');
    await expect(page.locator('.mx-label')).toHaveText(['0', '0.5', '1']);
    await expect(page.locator('.mx-line[data-ready="1"]')).toBeVisible();
    const asked = await page.locator('.mx-line').getAttribute('data-asked');
    expect(asked).toMatch(/^0\.[1-9]$/);
    await expect(page.locator('.mx-ask .mx-big')).toHaveText(asked!);
    await kickToNumber(page, true);
    await expect(page.locator('.mx-note')).toContainText(`GOAL! ${asked} is right there.`);
    noProblems(watch);
  });

  test('Years 3–4: Flash Count flashes a times-table fact in blocks of five, and a miss splits it', async ({ page }) => {
    const top = 10;
    await seed(page, { 'maths-step:flash-count': top, 'flash-speed': 'slow' });
    await startGame(page, 'flash-count');
    await expect(page.locator('.mx-step')).toHaveText('Any rows, to 12 × 12');
    await expect(page.locator('.mx-array.facts')).toBeVisible();
    const dots = await page.locator('.mx-flash .mx-dot').count();
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 15000 });
    const offered = (await page.locator('.mx-choice').allTextContents()).map(Number);
    expect(offered).toContain(dots);
    await tapNumber(page, offered.find((x) => x !== dots)!);
    /* the fact, built in rows or counted along them, and the array again */
    await expect(page.locator('.mx-note')).toContainText(`= ${dots}.`);
    await expect(page.locator('.mx-note')).toContainText(/ rows of |Count in /);
    await expect(page.locator('.mx-flash .mx-dot')).toHaveCount(dots);
  });

  test('Year 2: Flash Count shows rows and columns', async ({ page }) => {
    await seed(page, { 'maths-step:flash-count': 5, 'flash-speed': 'slow' });
    await startGame(page, 'flash-count');
    await expect(page.locator('.mx-array')).toBeVisible();
    const dots = await page.locator('.mx-flash .mx-dot').count();
    expect(dots).toBeGreaterThanOrEqual(4);
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const wrong = (await page.locator('.mx-choice').allTextContents()).map(Number).find((x) => x !== dots)!;
    await tapNumber(page, wrong);
    await expect(page.locator('.mx-note')).toHaveText(new RegExp(`^\\d rows of \\d make ${dots}\\.$`));
  });

  test('Team Buses: reading buses and fans, a whole round', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'team-buses');
    await playRound(page, async () => {
      await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
      const n = Number(await page.locator('.tb-yard').getAttribute('data-n'));
      /* climbing to loading the buses part way through the round */
      if (await page.locator('.tb-row.crowd').count()) {
        await tapNumber(page, Math.floor(n / 10));
        await expect(page.locator('.mx-ask')).toContainText('left over', { timeout: 6000 });
        await tapNumber(page, n % 10);
        return;
      }
      /* 1 bus and 6 fans */
      expect(await page.locator('.tb-bus').count()).toBe(Math.floor(n / 10));
      expect(await page.locator('.tb-row.fans .tb-fan').count()).toBe(n % 10);
      await tapNumber(page, n);
    });
    await expect(page.locator('.results')).toContainText('8 of 8');
    noProblems(watch);
  });

  test('Team Buses: a wrong read swaps the digits, and is explained', async ({ page }) => {
    await seed(page, { 'maths-step:team-buses': 1 });
    await startGame(page, 'team-buses');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
    const n = Number(await page.locator('.tb-yard').getAttribute('data-n'));
    const wrong = (await page.locator('.mx-choice').allTextContents()).map(Number).find((x) => x !== n)!;
    await tapNumber(page, wrong);
    await expect(page.locator('.mx-note')).toContainText(`That's ${n}.`);
  });

  test('Team Buses: loading a crowd into buses', async ({ page }) => {
    await seed(page, { 'maths-step:team-buses': 2 });
    await startGame(page, 'team-buses');
    await expect(page.locator('.tb-row.crowd')).toBeVisible();
    const n = Number(await page.locator('.tb-yard').getAttribute('data-n'));
    await expect(page.locator('.tb-row.crowd .tb-fan')).toHaveCount(n);
    await tapNumber(page, Math.floor(n / 10));
    await expect(page.locator('.tb-bus')).toHaveCount(Math.floor(n / 10));
    await expect(page.locator('.mx-ask')).toContainText('left over', { timeout: 6000 });
    await tapNumber(page, n % 10);
    await expect(page.locator('.mx-note')).toContainText(`make ${n}.`);
    await expect(page.locator('.mx-note')).toHaveClass(/good/);
  });

  test('Year 2: Team Buses reads trains of 100', async ({ page }) => {
    await seed(page, { 'maths-step:team-buses': 4 });
    await startGame(page, 'team-buses');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
    const n = Number(await page.locator('.tb-yard').getAttribute('data-n'));
    await expect(page.locator('.tb-train')).toHaveCount(Math.floor(n / 100));
    await tapNumber(page, n);
    await expect(page.locator('.mx-note')).toContainText(`That's ${n}.`);
  });

  test('Year 2: Team Buses builds a crowd from trains, buses and fans', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:team-buses': 5 });
    await startGame(page, 'team-buses');
    await expect(page.getByRole('button', { name: 'Done ✓' })).toBeVisible();
    const n = Number(await page.locator('.tb-yard').getAttribute('data-n'));
    /* one fan too many, sent home again with a tap */
    await page.getByRole('button', { name: 'Add a fan' }).click();
    await page.locator('.tb-fan.walking').first().click();
    await expect(page.locator('.tb-fan.walking')).toHaveCount(0);
    for (let i = 0; i < Math.floor(n / 100); i += 1) await page.getByRole('button', { name: 'Add a train of 100' }).click();
    for (let i = 0; i < Math.floor(n / 10) % 10; i += 1) await page.getByRole('button', { name: 'Add a bus of 10' }).click();
    for (let i = 0; i < n % 10; i += 1) await page.getByRole('button', { name: 'Add a fan' }).click();
    await page.getByRole('button', { name: 'Done ✓' }).click();
    await expect(page.locator('.mx-note')).toContainText(`Yes! ${n} is`);
    noProblems(watch);
  });

  test('Year 2: Team Buses, a bus breaks down and the number stays the same', async ({ page }) => {
    await seed(page, { 'maths-step:team-buses': 6 });
    await startGame(page, 'team-buses');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const n = Number(await page.locator('.tb-yard').getAttribute('data-n'));
    await expect(page.locator('.tb-bus.broken')).toHaveCount(1);
    await tapNumber(page, (n % 10) + 10);
    await expect(page.locator('.mx-note')).toContainText(`Still ${n}!`);
    await expect(page.locator('.tb-bus')).toHaveCount(Math.floor(n / 10) - 1);
  });

  test('Years 3–4: Team Buses reads planes of 1000', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:team-buses': 7 });
    await startGame(page, 'team-buses');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
    const n = Number(await page.locator('.tb-yard').getAttribute('data-n'));
    await expect(page.locator('.tb-plane')).toHaveCount(Math.floor(n / 1000));
    await expect(page.locator('.tb-train')).toHaveCount(Math.floor(n / 100) % 10);
    await tapNumber(page, n);
    await expect(page.locator('.mx-note')).toContainText(`That's ${n}.`);
    noProblems(watch);
  });

  test('Years 3–4: Team Buses builds a crowd to 10 000 with planes', async ({ page }) => {
    await seed(page, { 'maths-step:team-buses': 8 });
    await startGame(page, 'team-buses');
    await expect(page.getByRole('button', { name: 'Add a plane of 1000' })).toBeVisible();
    const n = Number(await page.locator('.tb-yard').getAttribute('data-n'));
    for (let i = 0; i < Math.floor(n / 1000); i += 1) await page.getByRole('button', { name: 'Add a plane of 1000' }).click();
    for (let i = 0; i < Math.floor(n / 100) % 10; i += 1) await page.getByRole('button', { name: 'Add a train of 100' }).click();
    for (let i = 0; i < Math.floor(n / 10) % 10; i += 1) await page.getByRole('button', { name: 'Add a bus of 10' }).click();
    for (let i = 0; i < n % 10; i += 1) await page.getByRole('button', { name: 'Add a fan' }).click();
    await page.getByRole('button', { name: 'Done ✓' }).click();
    await expect(page.locator('.mx-note')).toContainText(`Yes! ${n} is`);
  });

  test('Years 3–4: no trains, so 350 fans need 35 buses; reading only the tens is the slip', async ({ page }) => {
    await seed(page, { 'maths-step:team-buses': 9 });
    await startGame(page, 'team-buses');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const n = Number(await page.locator('.tb-yard').getAttribute('data-n'));
    await expect(page.locator('.tb-train.broken')).toHaveCount(Math.floor(n / 100));
    const tens = Math.floor(n / 10) % 10;
    await tapNumber(page, tens);
    await expect(page.locator('.mx-note')).toContainText(`${n} is ${n / 10} tens!`);
    await expect(page.locator('.tb-bus')).toHaveCount(n / 10);
    await expect(page.locator('.tb-train')).toHaveCount(0);
  });

  test('Years 3–4: no plane, so 1250 fans need 12 trains and 5 buses', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:team-buses': 10 });
    await startGame(page, 'team-buses');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const n = Number(await page.locator('.tb-yard').getAttribute('data-n'));
    await expect(page.locator('.tb-plane.broken')).toHaveCount(Math.floor(n / 1000));
    const trains = Math.floor(n / 100);
    const buses = (n % 100) / 10;
    await tapNumber(page, trains);
    await expect(page.locator('.mx-note')).toContainText(`Yes! A plane is 10 trains`);
    await expect(page.locator('.mx-note')).toContainText(`${n} is ${trains} hundreds and ${buses} ${buses === 1 ? 'ten' : 'tens'}!`);
    await expect(page.locator('.tb-train')).toHaveCount(trains);
    await expect(page.locator('.tb-bus')).toHaveCount(buses);
    noProblems(watch);
  });

  test('Keepy-Uppy Count: a whole round, filling the gaps', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'keepy-uppy');
    await playRound(page, async () => {
      await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
      await tapNumber(page, Number(await page.locator('.ku-touches').getAttribute('data-answer')));
    });
    await expect(page.locator('.results')).toContainText('8 of 8');
    noProblems(watch);
  });

  test('Keepy-Uppy Count: a miss writes the step on every jump', async ({ page }) => {
    await seed(page, { 'maths-step:keepy-uppy': 4 });
    await startGame(page, 'keepy-uppy');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const answer = Number(await page.locator('.ku-touches').getAttribute('data-answer'));
    const wrong = (await page.locator('.mx-choice').allTextContents()).map(Number).find((x) => x !== answer)!;
    await tapNumber(page, wrong);
    await expect(page.locator('.ku-hop').first()).toHaveText('+2');
    await expect(page.locator('.mx-note')).toContainText('Up in 2s');
    await expect(page.locator('.ku-ball.filled')).toHaveText(String(answer));
  });

  test('Year 2: Keepy-Uppy counts back in 10s and 5s', async ({ page }) => {
    await seed(page, { 'maths-step:keepy-uppy': 8 });
    await startGame(page, 'keepy-uppy');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const shown = (await page.locator('.ku-ball:not(.gap)').allTextContents()).map(Number);
    expect(shown[0]).toBeGreaterThan(shown[1]);
    await tapNumber(page, Number(await page.locator('.ku-touches').getAttribute('data-answer')));
    await expect(page.locator('.mx-note')).toContainText('Keepy-uppy!');
  });

  test('Years 3–4: Keepy-Uppy counts by 7s and 9s, and says the fact', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:keepy-uppy': 11 });
    await startGame(page, 'keepy-uppy');
    for (let i = 1; i <= 3; i += 1) {
      await expect(page.locator('.score')).toContainText(`Question ${i}`, { timeout: 10000 });
      await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
      const shown = (await page.locator('.ku-ball:not(.gap)').allTextContents()).map(Number);
      const by = shown[1] - shown[0];
      expect([7, 9]).toContain(by);
      const answer = Number(await page.locator('.ku-touches').getAttribute('data-answer'));
      await tapNumber(page, answer);
      await expect(page.locator('.mx-note')).toHaveText(`Keepy-uppy! ${answer}! ${answer / by} × ${by} = ${answer}.`);
    }
    noProblems(watch);
  });

  test('Years 3–4: Keepy-Uppy back down a times table, a miss naming the table', async ({ page }) => {
    await seed(page, { 'maths-step:keepy-uppy': 12 });
    await startGame(page, 'keepy-uppy');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const shown = (await page.locator('.ku-ball:not(.gap)').allTextContents()).map(Number);
    const by = shown[0] - shown[1];
    expect(by).toBeGreaterThan(2);
    const answer = Number(await page.locator('.ku-touches').getAttribute('data-answer'));
    const wrong = (await page.locator('.mx-choice').allTextContents()).map(Number).find((x) => x !== answer)!;
    await tapNumber(page, wrong);
    await expect(page.locator('.ku-hop').first()).toHaveText(`−${by}`);
    await expect(page.locator('.mx-note')).toContainText(`Back in ${by}s: `);
    await expect(page.locator('.mx-note')).toContainText(`The ${by} times table: ${answer / by} × ${by} = ${answer}.`);
  });

  test('Training Drills: a whole round of groups and sharing', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'training-drills');
    await playRound(page, async () => {
      await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
      await tapNumber(page, Number(await page.locator('.td-field').getAttribute('data-answer')));
    });
    await expect(page.locator('.results')).toContainText('8 of 8');
    noProblems(watch);
  });

  test('Training Drills: a miss counts the hoops in steps', async ({ page }) => {
    await startGame(page, 'training-drills');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const hoops = await page.locator('.td-hoop').count();
    const each = await page.locator('.td-hoop').first().locator('.td-ball').count();
    const answer = Number(await page.locator('.td-field').getAttribute('data-answer'));
    expect(answer).toBe(hoops * each);
    const wrong = (await page.locator('.mx-choice').allTextContents()).map(Number).find((x) => x !== answer)!;
    await tapNumber(page, wrong);
    await expect(page.locator('.td-count').last()).toHaveText(String(answer));
    await expect(page.locator('.mx-note')).toContainText(`groups of ${each} make ${answer}`);
  });

  test('Training Drills: sharing deals the balls out fairly', async ({ page }) => {
    await seed(page, { 'maths-step:training-drills': 1 });
    await startGame(page, 'training-drills');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const total = await page.locator('.td-pile .td-ball').count();
    const hoops = await page.locator('.td-hoop').count();
    await tapNumber(page, total / hoops);
    await expect(page.locator('.td-pile .td-ball')).toHaveCount(0, { timeout: 6000 });
    for (let i = 0; i < hoops; i += 1) await expect(page.locator('.td-hoop').nth(i).locator('.td-ball')).toHaveCount(total / hoops);
    await expect(page.locator('.mx-note')).toContainText(`each`);
  });

  test('Year 2: Training Drills sets cones out in rows, and finds how many rows', async ({ page }) => {
    await seed(page, { 'maths-step:training-drills': 2 });
    await startGame(page, 'training-drills');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const rows = await page.locator('.td-row').count();
    const cols = await page.locator('.td-row').first().locator('.td-cone').count();
    await tapNumber(page, rows * cols);
    await expect(page.locator('.mx-note')).toContainText(`${rows} rows of ${cols} make ${rows * cols}`);
  });

  test('Year 2: Training Drills, cones into rows', async ({ page }) => {
    await seed(page, { 'maths-step:training-drills': 4 });
    await startGame(page, 'training-drills');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    await expect(page.locator('.td-pile .td-cone').first()).toBeVisible();
    const answer = Number(await page.locator('.td-field').getAttribute('data-answer'));
    await tapNumber(page, answer);
    await expect(page.locator('.td-row')).toHaveCount(answer);
  });

  /* Years 3–4: teams for the rest of the times tables, a miss worked out
     from facts he knows: 5 teams and the rest, counting on, or tens */
  test('Years 3–4: Training Drills works a miss out from 5 teams and the rest', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:training-drills': 6 });
    await startGame(page, 'training-drills');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const teams = await page.locator('.td-team').count();
    const each = await page.locator('.td-team').first().locator('.td-fan').count();
    const answer = Number(await page.locator('.td-field').getAttribute('data-answer'));
    expect(answer).toBe(teams * each);
    expect([6, 7, 8, 9]).toContain(each);
    const wrong = (await page.locator('.mx-choice').allTextContents()).map(Number).find((x) => x !== answer)!;
    await tapNumber(page, wrong);
    await expect(page.locator('.mx-note')).toContainText(`${teams} teams of ${each} make ${answer}.`);
    if (teams > 5 && teams < 10) {
      await expect(page.locator('.mx-note')).toContainText(`That is 5 teams and ${teams - 5} more: ${5 * each} and ${(teams - 5) * each} make ${answer}.`);
      await expect(page.locator('.td-team.td-first')).toHaveCount(5);
      await expect(page.locator('.td-team').nth(4).locator('.td-count')).toHaveText(String(5 * each));
      await expect(page.locator('.td-team').last().locator('.td-count')).toHaveText(String((teams - 5) * each));
    } else {
      await expect(page.locator('.td-team.td-first')).toHaveCount(0);
      await expect(page.locator('.td-team').last().locator('.td-count')).toHaveText(String(answer));
    }
    noProblems(watch);
  });

  test('Years 3–4: Training Drills puts a crowd of players into teams', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:training-drills': 8 });
    await startGame(page, 'training-drills');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const players = await page.locator('.td-pile .td-fan').count();
    await expect(page.locator('.mx-ask')).toHaveText(new RegExp(`^${players} players, in teams of \\d+\\. How many teams\\?$`));
    const answer = Number(await page.locator('.td-field').getAttribute('data-answer'));
    await tapNumber(page, answer);
    await expect(page.locator('.td-team')).toHaveCount(answer);
    await expect(page.locator('.td-team .td-fan')).toHaveCount(players);
    await expect(page.locator('.mx-note')).toContainText(`${players} players in teams of ${players / answer} make ${answer} teams.`);
    noProblems(watch);
  });

  test('Years 3–4: teams of 11 and 12 fit the screen, answers and all', async ({ page }) => {
    await seed(page, { 'maths-step:training-drills': 7 });
    await startGame(page, 'training-drills');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    expect([11, 12]).toContain(await page.locator('.td-team').first().locator('.td-fan').count());
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    const field = (await page.locator('.td-field').boundingBox())!;
    expect(field.x).toBeGreaterThanOrEqual(0);
    expect(field.x + field.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await expectTapTargets(page, '.mx-choice');
  });

  test('Foosball Line-Up: a whole round of counting the rods', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'foosball-line-up');
    await playRound(page, async () => {
      await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
      await tapNumber(page, Number(await page.locator('.lu-field').getAttribute('data-answer')));
    });
    await expect(page.locator('.results')).toContainText('8 of 8');
    noProblems(watch);
  });

  test('Foosball Line-Up: a real table, 1, 2, 5 and 3 a side', async ({ page }) => {
    await startGame(page, 'foosball-line-up');
    await expect(page.locator('.lu-rod')).toHaveCount(8);
    const counts = await page.locator('.lu-rod').evaluateAll((rods) => rods.map((r) => r.querySelectorAll('.lu-man').length));
    expect(counts).toEqual([1, 2, 3, 5, 5, 3, 2, 1]);
    await expect(page.locator('.lu-rod.ours')).toHaveCount(4);
    /* the first step: the glowing rod's players are the answer */
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    expect(await page.locator('.lu-rod.lit .lu-man').count()).toBe(Number(await page.locator('.lu-field').getAttribute('data-answer')));
  });

  test('Foosball Line-Up: a miss on who is hiding lifts the towel and makes 11', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:foosball-line-up': 2 });
    await startGame(page, 'foosball-line-up');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    await expect(page.locator('.lu-towel')).toHaveCount(1);
    const answer = Number(await page.locator('.lu-field').getAttribute('data-answer'));
    await tapNumber(page, answer === 11 ? 1 : 11);
    await expect(page.locator('.lu-towel')).toHaveCount(0);
    await expect(page.locator('.lu-rod.lit .lu-man').filter({ hasText: String(answer) })).not.toHaveCount(0);
    await expect(page.locator('.mx-note')).toContainText(`${11 - answer} and ${answer} more make 11, so ${answer}`);
    noProblems(watch);
  });

  test('Year 2: Foosball Line-Up counts the spare rods in steps', async ({ page }) => {
    await seed(page, { 'maths-step:foosball-line-up': 3 });
    await startGame(page, 'foosball-line-up');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const rods = await page.locator('.lu-rod.spare').count();
    const each = await page.locator('.lu-rod.spare').first().locator('.lu-man').count();
    await tapNumber(page, rods * each);
    await expect(page.locator('.lu-count').last()).toHaveText(String(rods * each));
    await expect(page.locator('.mx-note')).toContainText(`${rods} rods of ${each} make ${rods * each}`);
  });

  test('Years 3–4: Foosball Line-Up, a tournament: one table, then all of them', async ({ page }) => {
    await seed(page, { 'maths-step:foosball-line-up': 4 });
    await startGame(page, 'foosball-line-up');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const tables = await page.locator('.lu-chip').count();
    const perTable = await page.locator('.lu-rod.lit .lu-man').count();
    const answer = Number(await page.locator('.lu-field').getAttribute('data-answer'));
    expect(answer).toBe(tables * perTable);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    const wrong = (await page.locator('.mx-choice').allTextContents()).map(Number).find((x) => x !== answer)!;
    await tapNumber(page, wrong);
    await expect(page.locator('.mx-note')).toContainText(`${tables} tables of ${perTable}`);
    await expect(page.locator('.lu-rod.lit .lu-man').last()).toHaveText(String(perTable));
  });

  test('Half-Time Oranges: a whole round of halves', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'half-time-oranges');
    await playRound(page, async () => {
      await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
      await page.locator(`.mx-choice[data-n="${await page.locator('.ht-board').getAttribute('data-answer')}"]`).click();
    });
    await expect(page.locator('.results')).toContainText('8 of 8');
    noProblems(watch);
  });

  test('Half-Time Oranges: an unfair cut is explained', async ({ page }) => {
    await startGame(page, 'half-time-oranges');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const answer = await page.locator('.ht-board').getAttribute('data-answer');
    await page.locator(`.mx-choice[data-n="${answer === 'Yes' ? 'No' : 'Yes'}"]`).click();
    await expect(page.locator('.mx-choice.wrong')).toHaveCount(1);
    await expect(page.locator('.mx-note')).toContainText(answer === 'Yes' ? 'the same size' : 'not the same size');
  });

  test('Half-Time Oranges: half the bibs to each team, with flags', async ({ page }) => {
    await seed(page, { 'maths-step:half-time-oranges': 1 });
    await startGame(page, 'half-time-oranges');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const total = await page.locator('.ht-pile .ht-bib').count();
    await tapNumber(page, total / 2);
    await expect(page.locator('.ht-share')).toHaveCount(2);
    await expect(page.locator('.ht-share').first().locator('.ht-bib')).toHaveCount(total / 2);
    expect((await page.locator('.ht-flag').first().textContent())?.length).toBeGreaterThan(0);
  });

  test('Years 3–4: Half-Time Oranges names thirds and fifths', async ({ page }) => {
    await seed(page, { 'maths-step:half-time-oranges': 6 });
    await startGame(page, 'half-time-oranges');
    await expect(page.locator('.mx-choice')).toHaveText(['a half', 'a third', 'a quarter', 'a fifth', 'an eighth'], { timeout: 10000 });
    const answer = (await page.locator('.ht-board').getAttribute('data-answer'))!;
    expect(['a third', 'a fifth']).toContain(answer);
    await page.locator(`.mx-choice[data-n="${answer}"]`).click();
    await expect(page.locator('.mx-note.good')).toContainText(`each one is ${answer}`);
  });

  test('Years 3–4: Half-Time Oranges, two thirds of the bibs, the shares counted', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:half-time-oranges': 8 });
    await startGame(page, 'half-time-oranges');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    await expect(page.locator('.mx-ask')).toHaveText(/^\d+ bibs shared between \d teams\. How many is \d (thirds|quarters|fifths) of them\?$/);
    const answer = Number(await page.locator('.ht-board').getAttribute('data-answer'));
    const wrong = (await page.locator('.mx-choice').allTextContents()).map(Number).find((x) => x !== answer)!;
    await tapNumber(page, wrong);
    await expect(page.locator('.mx-note')).toContainText(`= ${answer}.`);
    expect(await page.locator('.ht-share.counted').count()).toBeGreaterThanOrEqual(2);
    noProblems(watch);
  });

  test('Years 3–4: Half-Time Oranges, is it the same amount?', async ({ page }) => {
    await seed(page, { 'maths-step:half-time-oranges': 9 });
    await startGame(page, 'half-time-oranges');
    await expect(page.locator('.ht-fig')).toHaveCount(2, { timeout: 10000 });
    await expect(page.locator('.mx-choice')).toHaveText(['Yes', 'No']);
    const answer = (await page.locator('.ht-board').getAttribute('data-answer'))!;
    await page.locator(`.mx-choice[data-n="${answer}"]`).click();
    await expect(page.locator('.mx-note.good')).toContainText(answer === 'Yes' ? 'covers just the same as' : 'than');
  });

  test('Year 2: Half-Time Oranges names halves, quarters and eighths', async ({ page }) => {
    await seed(page, { 'maths-step:half-time-oranges': 2 });
    await startGame(page, 'half-time-oranges');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const parts = Number(await page.locator('.ht-board').getAttribute('data-parts'));
    await expect(page.locator('.ht-shape > path, .ht-shape > rect')).toHaveCount(parts);
    const name = { 2: 'a half', 4: 'a quarter', 8: 'an eighth' }[parts]!;
    await page.locator(`.mx-choice[data-n="${name}"]`).click();
    await expect(page.locator('.mx-note')).toContainText(`each one is ${name}`);
  });

  test('Jump Line: a whole round of jumps', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'jump-line');
    await playRound(page, async () => {
      await expect(page.getByRole('button', { name: 'Done ✓' })).toBeVisible({ timeout: 10000 });
      const line = page.locator('.jl-line');
      const b = Number(await line.getAttribute('data-b'));
      const back = Number(await line.getAttribute('data-answer')) < Number(await line.getAttribute('data-a'));
      for (let i = 0; i < b; i += 1) await page.getByRole('button', { name: `Jump ${back ? 'back' : 'on'} 1`, exact: true }).click();
      await page.getByRole('button', { name: 'Done ✓' }).click();
    });
    await expect(page.locator('.results')).toContainText('8 of 8');
    noProblems(watch);
  });

  test('Jump Line: undo takes a jump back, and a miss shows the way', async ({ page }) => {
    await startGame(page, 'jump-line');
    await expect(page.getByRole('button', { name: 'Done ✓' })).toBeVisible({ timeout: 10000 });
    const line = page.locator('.jl-line');
    const a = Number(await line.getAttribute('data-a'));
    const b = Number(await line.getAttribute('data-b'));
    const one = page.getByRole('button', { name: 'Jump on 1', exact: true });
    const asked = `the question was ${a} + ${b}`;
    /* tap by tap, each one landing before the next */
    await one.click();
    await expect(line, asked).toHaveAttribute('data-at', String(a + 1));
    /* from 9 a second jump would leave the line, which is refused, and
       there is no way to miss by jumping on: that is all there is to see */
    if (a + 2 > 10) {
      await one.click();
      await expect(line, asked).toHaveAttribute('data-at', String(a + 1));
      await page.getByRole('button', { name: 'Undo a jump' }).click();
      await expect(page.locator('.jl-arc.his')).toHaveCount(0);
      return;
    }
    await one.click();
    await expect(line, asked).toHaveAttribute('data-at', String(a + 2));
    await expect(page.locator('.jl-arc.his')).toHaveCount(2);
    await page.getByRole('button', { name: 'Undo a jump' }).click();
    await expect(page.locator('.jl-arc.his')).toHaveCount(1);
    await expect(line, asked).toHaveAttribute('data-at', String(a + 1));
    /* one jump is never right here: the smallest jump on is 1, so stop short unless it was 1 */
    if (b === 1) await page.getByRole('button', { name: 'Jump on 1', exact: true }).click();
    await page.getByRole('button', { name: 'Done ✓' }).click();
    await expect(page.locator('.mx-note')).toContainText('You landed on');
    await expect(page.locator('.jl-arc.way')).toHaveCount(b);
  });

  test('Year 2: Jump Line jumps a ten at a time', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:jump-line': 5 });
    await startGame(page, 'jump-line');
    await expect(page.getByRole('button', { name: 'Jump on 10' })).toBeVisible({ timeout: 10000 });
    const b = Number(await page.locator('.jl-line').getAttribute('data-b'));
    for (let i = 0; i < Math.floor(b / 10); i += 1) await page.getByRole('button', { name: 'Jump on 10' }).click();
    for (let i = 0; i < b % 10; i += 1) await page.getByRole('button', { name: 'Jump on 1', exact: true }).click();
    await expect(page.locator('.jl-hop')).toHaveCount(Math.floor(b / 10));
    await page.getByRole('button', { name: 'Done ✓' }).click();
    await expect(page.locator('.mx-note')).toContainText(/jumps? of ten/);
    await expect(page.locator('.mx-note')).toHaveClass(/good/);
    noProblems(watch);
  });

  test('Years 3–4: Jump Line jumps a hundred at a time, to 1000', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:jump-line': 7 });
    await startGame(page, 'jump-line');
    await expect(page.getByRole('button', { name: 'Jump on 100', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Jump on 10', exact: true })).toBeVisible();
    await expect(page.locator('.jl-label').last()).toHaveText('1000');
    const b = Number(await page.locator('.jl-line').getAttribute('data-b'));
    for (let i = 0; i < b / 100; i += 1) await page.getByRole('button', { name: 'Jump on 100', exact: true }).click();
    await expect(page.locator('.jl-hop')).toHaveCount(b / 100);
    await page.getByRole('button', { name: 'Done ✓' }).click();
    await expect(page.locator('.mx-note')).toContainText(/jumps? of a hundred/);
    await expect(page.locator('.mx-note')).toHaveClass(/good/);
    noProblems(watch);
  });

  test('Years 3–4: Jump Line goes to the next ten first, then jumps the rest', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:jump-line': 10 });
    await startGame(page, 'jump-line');
    await expect(page.locator('.mx-ask')).toContainText('how far is it to the next ten?', { timeout: 10000 });
    const line = page.locator('.jl-line');
    const [a, b, first] = await Promise.all(['data-a', 'data-b', 'data-bridge'].map(async (k) => Number(await line.getAttribute(k))));
    expect((a + first) % 10).toBe(0);
    await tapNumber(page, first);
    /* the jump to the ten is drawn, and the ball is on the ten */
    await expect(line).toHaveAttribute('data-at', String(a + first));
    await expect(page.locator('.mx-ask')).toHaveText(`Now jump the rest: ${b - first} more.`);
    const rest = b - first;
    for (let i = 0; i < Math.floor(rest / 10); i += 1) await page.getByRole('button', { name: 'Jump on 10', exact: true }).click();
    for (let i = 0; i < rest % 10; i += 1) await page.getByRole('button', { name: 'Jump on 1', exact: true }).click();
    await page.getByRole('button', { name: 'Done ✓' }).click();
    await expect(page.locator('.mx-note')).toHaveText(`Yes! ${a} + ${b}: ${first} to ${a + first}, then ${rest} more is ${a + b}.`);
    noProblems(watch);
  });

  test('Years 3–4: back to the ten first, and the other part of the ten is the slip', async ({ page }) => {
    await seed(page, { 'maths-step:jump-line': 11 });
    await startGame(page, 'jump-line');
    await expect(page.locator('.mx-ask')).toContainText('how far is it back to the ten?', { timeout: 10000 });
    const line = page.locator('.jl-line');
    const [a, b, first] = await Promise.all(['data-a', 'data-b', 'data-bridge'].map(async (k) => Number(await line.getAttribute(k))));
    /* 63: 3 back to 60, and the 7 that makes the ten is offered too */
    await tapNumber(page, 10 - first);
    await expect(page.locator('.mx-note')).toHaveText(`${a} is ${first} from ${a - first}.`);
    await expect(line).toHaveAttribute('data-at', String(a - first), { timeout: 4000 });
    const rest = b - first;
    for (let i = 0; i < Math.floor(rest / 10); i += 1) await page.getByRole('button', { name: 'Jump back 10', exact: true }).click();
    for (let i = 0; i < rest % 10; i += 1) await page.getByRole('button', { name: 'Jump back 1', exact: true }).click();
    await page.getByRole('button', { name: 'Done ✓' }).click();
    /* he got there, but not by knowing the first jump: it does not count, and the way is said */
    await expect(page.locator('.mx-note')).toHaveText(`${a} − ${b}: back ${first} to ${a - first}, then ${rest} more back is ${a - b}.`);
    await expect(page.locator('.mx-note')).not.toHaveClass(/good/);
  });

  test('Years 3–4: Jump Line to 10 000 in thousands and hundreds', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:jump-line': 13 });
    await startGame(page, 'jump-line');
    await expect(page.getByRole('button', { name: 'Jump on 1000', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.jl-label').last()).toHaveText('10 000');
    /* the last number fits inside the line */
    const svgBox = (await page.locator('.jl-line').boundingBox())!;
    const label = (await page.locator('.jl-label').last().boundingBox())!;
    expect(label.x + label.width).toBeLessThanOrEqual(svgBox.x + svgBox.width + 1);
    const b = Number(await page.locator('.jl-line').getAttribute('data-b'));
    for (let i = 0; i < Math.floor(b / 1000); i += 1) await page.getByRole('button', { name: 'Jump on 1000', exact: true }).click();
    for (let i = 0; i < (b % 1000) / 100; i += 1) await page.getByRole('button', { name: 'Jump on 100', exact: true }).click();
    await page.getByRole('button', { name: 'Done ✓' }).click();
    await expect(page.locator('.mx-note')).toContainText(/of a thousand and \d+ of a hundred on/);
    await expect(page.locator('.mx-note')).toHaveClass(/good/);
    noProblems(watch);
  });

  test('Match Clock: a whole round of reading the clock', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'match-clock');
    await playRound(page, async () => {
      await expect(page.locator('.mx-choice, .mc-turn').first()).toBeVisible({ timeout: 10000 });
      const board = page.locator('.mc-board');
      /* climbing to setting the clock part way through */
      if (await page.locator('.mc-turn').count()) {
        const minutes = Number(await board.getAttribute('data-minutes'));
        for (let i = 0; i < Math.floor(minutes / 60); i += 1) await page.getByRole('button', { name: '+1 hour' }).click();
        for (let i = 0; i < (minutes % 60) / 30; i += 1) await page.getByRole('button', { name: '+30 minutes' }).click();
        await page.getByRole('button', { name: 'Done ✓' }).click();
        return;
      }
      await expect(page.locator('.mx-choice').first()).toBeEnabled();
      await page.locator(`.mx-choice[data-n="${await board.getAttribute('data-answer')}"]`).click();
    });
    await expect(page.locator('.results')).toContainText('8 of 8');
    noProblems(watch);
  });

  test('Match Clock: the clock shows the time it asks about', async ({ page }) => {
    await seed(page, { 'maths-step:match-clock': 1 });
    await startGame(page, 'match-clock');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const want = await page.locator('.mc-board').getAttribute('data-minutes');
    await expect(page.locator('.mc-clock')).toHaveAttribute('data-minutes', want!);
    const answer = await page.locator('.mc-board').getAttribute('data-answer');
    await expect(page.locator('.mc-clock')).toHaveAttribute('aria-label', `A clock showing ${answer}`);
  });

  test('Match Clock: setting the wrong time shows the right one', async ({ page }) => {
    await seed(page, { 'maths-step:match-clock': 2 });
    await startGame(page, 'match-clock');
    await expect(page.getByRole('button', { name: '+1 hour' })).toBeVisible({ timeout: 10000 });
    const want = Number(await page.locator('.mc-board').getAttribute('data-minutes'));
    if (want === 0) await page.getByRole('button', { name: '+1 hour' }).click();
    await page.getByRole('button', { name: 'Done ✓' }).click();
    await expect(page.locator('.mx-note')).toContainText('looks like this');
    await expect(page.locator('.mc-clock')).toHaveAttribute('data-minutes', String(want));
  });

  /** answer this Match Clock question wrong, to see how it explains */
  async function missClock(page: Page): Promise<string> {
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const answer = (await page.locator('.mc-board').getAttribute('data-answer'))!;
    await page.locator(`.mx-choice:not([data-n="${answer}"])`).first().click();
    return answer;
  }

  test('Years 3–4: Match Clock to five minutes, then to the minute', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:match-clock': 8 });
    await startGame(page, 'match-clock');
    await expect(page.locator('.mx-step')).toHaveText('Five minutes');
    const five = await missClock(page);
    await expect(page.locator('.mc-clock')).toHaveAttribute('aria-label', `A clock showing ${five}`);
    await expect(page.locator('.mx-note')).toContainText('The long hand points at the');
    noProblems(watch);
  });

  test('Years 3–4: Match Clock to the minute, written 3:47', async ({ page }) => {
    await seed(page, { 'maths-step:match-clock': 9 });
    await startGame(page, 'match-clock');
    const answer = await missClock(page);
    expect(answer).toMatch(/^\d{1,2}:\d\d$/);
    await expect(page.locator('.mx-note')).toContainText(`It's ${answer}. The long hand is`);
  });

  test('Years 3–4: Match Clock am or pm on match day', async ({ page }) => {
    await seed(page, { 'maths-step:match-clock': 10 });
    await startGame(page, 'match-clock');
    await expect(page.locator('.mx-choice')).toHaveCount(2, { timeout: 10000 });
    await expect(page.locator('.mx-choice').first()).toHaveText(/ am$/);
    await expect(page.locator('.mc-digital')).toBeVisible();
    const answer = (await page.locator('.mc-board').getAttribute('data-answer'))!;
    await page.locator(`.mx-choice[data-n="${answer}"]`).click();
    await expect(page.locator('.mx-note.good')).toContainText(`It's ${answer}.`);
  });

  test('Years 3–4: Match Clock counts on to kick-off', async ({ page }) => {
    await seed(page, { 'maths-step:match-clock': 11 });
    await startGame(page, 'match-clock');
    await expect(page.locator('.mc-clock')).toHaveCount(2);
    await expect(page.locator('.mc-fig figcaption')).toHaveText([/^Now \d{1,2}:\d\d$/, /^Kick-off \d{1,2}:\d\d$/]);
    await missClock(page);
    await expect(page.locator('.mx-note')).toContainText(/^From \d{1,2}:\d\d, /);
  });

  test('Years 3–4: Match Clock reads a 24-hour ticket', async ({ page }) => {
    await seed(page, { 'maths-step:match-clock': 12 });
    await startGame(page, 'match-clock');
    await expect(page.locator('.mc-ticket-time')).toHaveText(/^Kick-off (1[3-9]|2[0-2]):\d\d$/);
    const answer = await missClock(page);
    expect(answer).toMatch(/ pm$/);
    await expect(page.locator('.mx-note')).toContainText('After midday, take 12 away from the hour');
  });

  test('Match Clock: the day after training', async ({ page }) => {
    await seed(page, { 'maths-step:match-clock': 3 });
    await startGame(page, 'match-clock');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    await expect(page.locator('.mc-cell')).toHaveCount(7);
    const answer = await page.locator('.mc-board').getAttribute('data-answer');
    await page.locator(`.mx-choice[data-n="${answer}"]`).click();
    await expect(page.locator('.mc-cell.target')).toHaveText(answer!.slice(0, 3));
  });

  test('Year 2: Match Clock sets quarter times, and knows the seasons', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:match-clock': 5 });
    await startGame(page, 'match-clock');
    await expect(page.getByRole('button', { name: '+15 minutes' })).toBeVisible({ timeout: 10000 });
    const minutes = Number(await page.locator('.mc-board').getAttribute('data-minutes'));
    for (let i = 0; i < Math.floor(minutes / 60); i += 1) await page.getByRole('button', { name: '+1 hour' }).click();
    for (let i = 0; i < (minutes % 60) / 15; i += 1) await page.getByRole('button', { name: '+15 minutes' }).click();
    await page.getByRole('button', { name: 'Done ✓' }).click();
    await expect(page.locator('.mx-note')).toContainText('The clock says');
    noProblems(watch);
  });

  test('Year 2: summer is December to February', async ({ page }) => {
    await seed(page, { 'maths-step:match-clock': 7 });
    await startGame(page, 'match-clock');
    await expect(page.locator('.mx-choice')).toHaveCount(4, { timeout: 10000 });
    const answer = await page.locator('.mc-board').getAttribute('data-answer');
    await page.locator(`.mx-choice[data-n="${answer}"]`).click();
    await expect(page.locator('.mc-season')).toContainText(answer!);
  });

  test('Fan Survey: a whole round of counting and graphs', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'fan-survey');
    await playRound(page, async () => {
      await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
      await page.locator(`.mx-choice[data-n="${await page.locator('.fs-board').getAttribute('data-answer')}"]`).click();
    });
    await expect(page.locator('.results')).toContainText('8 of 8');
    noProblems(watch);
  });

  test('Fan Survey: counting the flags, and a miss lights them up', async ({ page }) => {
    await startGame(page, 'fan-survey');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const answer = Number(await page.locator('.fs-board').getAttribute('data-answer'));
    const wrong = (await page.locator('.mx-choice').allTextContents()).map(Number).find((x) => x !== answer)!;
    await tapNumber(page, wrong);
    await expect(page.locator('.fs-fan.lit')).toHaveCount(answer);
  });

  test('Fan Survey: tally marks in gates of five', async ({ page }) => {
    await seed(page, { 'maths-step:fan-survey': 1 });
    await startGame(page, 'fan-survey');
    await expect(page.locator('.fs-tally')).toHaveCount(3, { timeout: 10000 });
    const answer = Number(await page.locator('.fs-board').getAttribute('data-answer'));
    await tapNumber(page, answer);
    await expect(page.locator('.mx-note')).toContainText(`${answer} for`);
  });

  test('Year 2: Fan Survey reads a column graph, and how many more', async ({ page }) => {
    await seed(page, { 'maths-step:fan-survey': 4 });
    await startGame(page, 'fan-survey');
    await expect(page.locator('.fs-bar')).toHaveCount(4, { timeout: 10000 });
    await expect(page.locator('.mx-ask')).toContainText('How many more');
    const answer = Number(await page.locator('.fs-board').getAttribute('data-answer'));
    await tapNumber(page, answer);
    await expect(page.locator('.mx-note')).toContainText(`That's ${answer} more.`);
  });

  test('Years 3–4: Fan Survey, each picture is 5 fans, and counting the pictures is the slip', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:fan-survey': 6 });
    await startGame(page, 'fan-survey');
    await expect(page.locator('.fs-key')).toHaveText('Each ● is 5 fans', { timeout: 10000 });
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 8000 });
    const answer = Number(await page.locator('.fs-board').getAttribute('data-answer'));
    await tapNumber(page, answer / 5);
    const fives = Array.from({ length: answer / 5 }, (_, i) => (i + 1) * 5).join(', ');
    await expect(page.locator('.mx-note')).toContainText(`each ● is 5 fans: ${fives}. That's ${answer} fans.`);
    noProblems(watch);
  });

  test('Years 3–4: Fan Survey reads a line with no number on the scale', async ({ page }) => {
    await seed(page, { 'maths-step:fan-survey': 8 });
    await startGame(page, 'fan-survey');
    await expect(page.locator('.fs-bar')).toHaveCount(4, { timeout: 10000 });
    /* numbered every 10, a line every 5 */
    await expect(page.locator('.fs-scale')).toHaveText(['0', '10', '20', '30', '40', '50']);
    await expect(page.locator('.fs-grid')).toHaveCount(10);
    const answer = Number(await page.locator('.fs-board').getAttribute('data-answer'));
    expect(answer % 10).toBe(5);
    await tapNumber(page, answer);
    await expect(page.locator('.mx-note')).toContainText(`halfway between ${answer - 5} and ${answer + 5}: that's ${answer}.`);
  });

  test('Years 3–4: Fan Survey turns tallies into a table, then adds it up', async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:fan-survey': 9 });
    await startGame(page, 'fan-survey');
    await expect(page.locator('.fs-sheet .fs-tally')).toHaveCount(4, { timeout: 10000 });
    await expect(page.locator('.fs-gap')).toHaveText('?');
    const answer = Number(await page.locator('.fs-board').getAttribute('data-answer'));
    await tapNumber(page, answer);
    await expect(page.locator('.fs-gap')).toHaveText(String(answer));
    await expect(page.locator('.mx-note')).toContainText('Count the gates of five, then the rest');
    noProblems(watch);
  });

  test('Years 3–4: Fan Survey adds up a table, and leaving a row out is the slip', async ({ page }) => {
    await seed(page, { 'maths-step:fan-survey': 10 });
    await startGame(page, 'fan-survey');
    await expect(page.locator('.fs-total')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.mx-ask')).toHaveText('How many fans voted altogether?');
    const numbers = (await page.locator('.fs-sheet .fs-n').allTextContents()).map(Number);
    const answer = numbers.reduce((a, b) => a + b, 0);
    expect(Number(await page.locator('.fs-board').getAttribute('data-answer'))).toBe(answer);
    const offered = (await page.locator('.mx-choice').allTextContents()).map(Number);
    expect(offered).toContain(answer - Math.min(...numbers));
    await tapNumber(page, answer - Math.min(...numbers));
    await expect(page.locator('.mx-note')).toHaveText(`${numbers.join(' + ')} = ${answer}.`);
  });

  test('Fact Family Formation: a whole round', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'fact-family');
    await playRound(page, async () => {
      await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
      await tapNumber(page, Number(await page.locator('.ff-formation').getAttribute('data-answer')));
    });
    await expect(page.locator('.results')).toContainText('8 of 8');
    noProblems(watch);
  });

  test('Fact Family Formation: a miss says the family', async ({ page }) => {
    await seed(page, { 'maths-step:fact-family': 1 });
    await startGame(page, 'fact-family');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    await expect(page.locator('.ff-known')).toContainText('so…');
    await expect(page.locator('.mx-sum')).toContainText('−');
    const answer = Number(await page.locator('.ff-formation').getAttribute('data-answer'));
    const wrong = (await page.locator('.mx-choice').allTextContents()).map(Number).find((x) => x !== answer)!;
    await tapNumber(page, wrong);
    await expect(page.locator('.mx-note')).toContainText('make');
    await expect(page.locator('.mx-sum')).not.toContainText('?');
  });

  test('Year 2: Fact Family Formation, missing tens', async ({ page }) => {
    await seed(page, { 'maths-step:fact-family': 5 });
    await startGame(page, 'fact-family');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    await expect(page.locator('.ff-number', { hasText: '?' })).toHaveCount(1);
    for (const t of await page.locator('.mx-choice').allTextContents()) expect(Number(t) % 10).toBe(0);
    await tapNumber(page, Number(await page.locator('.ff-formation').getAttribute('data-answer')));
    await expect(page.locator('.mx-note')).toHaveClass(/good/);
  });

  test('Kit and Ball Shapes: a whole round', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'kit-shapes');
    await playRound(page, async () => {
      await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
      await page.locator(`.mx-choice[data-n="${await page.locator('.ks-board').getAttribute('data-answer')}"]`).click();
    });
    await expect(page.locator('.results')).toContainText('8 of 8');
    noProblems(watch);
  });

  test('Kit and Ball Shapes: a miss on sides lights up the corners', async ({ page }) => {
    await seed(page, { 'maths-step:kit-shapes': 1 });
    await startGame(page, 'kit-shapes');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    const answer = await page.locator('.ks-board').getAttribute('data-answer');
    await expect(page.locator('.ks-corner')).toHaveCount(Number(answer));
    await page.locator('.mx-choice').filter({ hasNotText: answer! }).first().click();
    await expect(page.locator('.ks-board.explain .ks-corner').first()).toBeVisible();
    await expect(page.locator('.mx-note')).toContainText(`${answer} sides and ${answer} corners`);
  });

  test('Year 2: is the shirt the same on both sides?', async ({ page }) => {
    await seed(page, { 'maths-step:kit-shapes': 5 });
    await startGame(page, 'kit-shapes');
    await expect(page.locator('.mx-choice').first()).toBeEnabled({ timeout: 10000 });
    await expect(page.locator('.ks-mirror')).toHaveCount(1);
    const answer = await page.locator('.ks-board').getAttribute('data-answer');
    await page.locator(`.mx-choice[data-n="${answer}"]`).click();
    await expect(page.locator('.mx-note')).toContainText(answer === 'Yes' ? 'like a mirror' : 'No:');
  });

  test("Coach's Whiteboard: a whole round", async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'coach-whiteboard');
    await playRound(page, async () => {
      const board = page.locator('.cw-board');
      await expect(page.locator('.mx-choice, .cw-cell:enabled').first()).toBeVisible({ timeout: 10000 });
      const answer = await board.getAttribute('data-answer');
      if (await page.locator('.mx-choice').count()) await page.locator(`.mx-choice[data-n="${answer}"]`).click();
      else await page.locator(`.cw-cell[data-at="${answer}"]`).click();
    });
    await expect(page.locator('.results')).toContainText('8 of 8');
    noProblems(watch);
  });

  test("Coach's Whiteboard: a wrong square shows the path", async ({ page }) => {
    await seed(page, { 'maths-step:coach-whiteboard': 2 });
    await startGame(page, 'coach-whiteboard');
    await expect(page.locator('.cw-cell').first()).toBeEnabled({ timeout: 10000 });
    const answer = await page.locator('.cw-board').getAttribute('data-answer');
    await page.locator(`.cw-cell:not([data-at="${answer}"])`).first().click();
    await expect(page.locator('.cw-cell.wrong')).toHaveCount(1);
    await expect(page.locator(`.cw-cell.end[data-at="${answer}"]`)).toHaveCount(1);
    await expect(page.locator('.mx-note')).toContainText('Count the squares');
  });

  test("Year 2: Coach's Whiteboard turns, and flips, slides and turns", async ({ page }) => {
    await seed(page, { 'maths-step:coach-whiteboard': 3 });
    await startGame(page, 'coach-whiteboard');
    await expect(page.locator('.mx-choice')).toHaveCount(4, { timeout: 10000 });
    const answer = await page.locator('.cw-board').getAttribute('data-answer');
    await page.locator(`.mx-choice[data-n="${answer}"]`).click();
    await expect(page.locator('.mx-note')).toContainText('leaves him facing');
  });

  test("Years 3–4: Coach's Whiteboard grid references, found and then named", async ({ page }) => {
    const watch = watchPage(page);
    await seed(page, { 'maths-step:coach-whiteboard': 5 });
    await startGame(page, 'coach-whiteboard');
    await expect(page.locator('.mx-step')).toHaveText('Grid references');
    /* first, find the square: a wrong one lights up the column and the row */
    await expect(page.locator('.cw-cell:enabled').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.cw-head')).toHaveText(['', 'A', 'B', 'C', 'D', 'E', '1', '2', '3', '4', '5']);
    const at = (await page.locator('.cw-board').getAttribute('data-answer'))!;
    const [x, y] = at.split(',').map(Number);
    const ref = `${'ABCDE'[x]}${y + 1}`;
    await expect(page.locator('.mx-ask')).toContainText(`Put the ball on ${ref}`);
    await expect(page.locator(`.cw-cell[data-at="${at}"]`)).toHaveAttribute('aria-label', ref);
    await page.locator(`.cw-cell:not([data-at="${at}"])`).first().click();
    await expect(page.locator('.cw-cell.wrong')).toHaveCount(1);
    await expect(page.locator('.cw-head.on')).toHaveText(['ABCDE'[x], String(y + 1)]);
    await expect(page.locator(`.cw-cell.end[data-at="${at}"]`)).toHaveCount(1);
    await expect(page.locator('.mx-note')).toHaveText(
      `${ref}: along the letters to ${'ABCDE'[x]}, then down the numbers to ${y + 1}. The ball goes where they meet.`);
    /* then name the square the ball is on */
    await expect(page.locator('.score')).toContainText('Question 2', { timeout: 8000 });
    await expect(page.locator('.mx-choice')).toHaveCount(4, { timeout: 10000 });
    await expect(page.locator('.mx-ask')).toHaveText('Which square is the ball on?');
    await expect(page.locator('.cw-cell:enabled')).toHaveCount(0);
    const named = (await page.locator('.cw-board').getAttribute('data-answer'))!;
    const [nx, ny] = [named.charCodeAt(0) - 65, Number(named.slice(1)) - 1];
    await expect(page.locator(`.cw-cell[data-at="${nx},${ny}"] .cw-ball`)).toBeVisible();
    await page.locator(`.mx-choice[data-n="${named}"]`).click();
    await expect(page.locator('.mx-note.good')).toContainText(`Yes! ${named}: along the letters`);
    noProblems(watch);
  });

  test("Years 3–4: Coach's Whiteboard moves by the compass, north up the board", async ({ page }) => {
    await seed(page, { 'maths-step:coach-whiteboard': 6 });
    await startGame(page, 'coach-whiteboard');
    await expect(page.locator('.cw-cell:enabled').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.cw-rose')).toBeVisible();
    await expect(page.locator('.cw-rose-between')).toHaveCount(0);
    await expect(page.locator('.mx-ask')).toHaveText(/^Run \d squares? (north|south|east|west), then \d squares? (north|south|east|west)\. Tap/);
    const answer = (await page.locator('.cw-board').getAttribute('data-answer'))!;
    await page.locator(`.cw-cell:not([data-at="${answer}"])`).first().click();
    await expect(page.locator(`.cw-cell.end[data-at="${answer}"]`)).toHaveCount(1);
    /* the miss says which way on the board each point is */
    await expect(page.locator('.mx-note')).toContainText(/(North is up|South is down|East is to the right|West is to the left)/i);
  });

  test("Years 3–4: Coach's Whiteboard north-east and the points between", async ({ page }) => {
    await seed(page, { 'maths-step:coach-whiteboard': 9 });
    await startGame(page, 'coach-whiteboard');
    await expect(page.locator('.cw-cell:enabled').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.cw-rose-between')).toHaveCount(4);
    await expect(page.locator('.mx-ask')).toHaveText(/^Run \d squares? (north|south)-(east|west)\. Tap/);
    const answer = (await page.locator('.cw-board').getAttribute('data-answer'))!;
    await page.locator(`.cw-cell[data-at="${answer}"]`).click();
    await expect(page.locator('.mx-note.good')).toContainText('Yes!');
    await expect(page.locator('.cw-cell.path').first()).toHaveText(/[↗↘↙↖]/);
  });

  test("Years 3–4: Coach's Whiteboard right angles, held against the corner of a page", async ({ page }) => {
    await seed(page, { 'maths-step:coach-whiteboard': 7 });
    await startGame(page, 'coach-whiteboard');
    await expect(page.locator('.mx-choice')).toHaveText(['Smaller', 'Right angle', 'Bigger'], { timeout: 10000 });
    await expect(page.locator('.cw-corner .cw-angle')).toBeVisible();
    await expect(page.locator('.cw-right')).toHaveCount(0);
    const answer = (await page.locator('.cw-board').getAttribute('data-answer'))!;
    await page.locator(`.mx-choice:not([data-n="${answer}"])`).first().click();
    await expect(page.locator('.cw-right')).toBeVisible();
    await expect(page.locator('.mx-note')).toContainText('corner of a page');
  });

  test("Years 3–4: Coach's Whiteboard three-quarter turns, in compass points", async ({ page }) => {
    await seed(page, { 'maths-step:coach-whiteboard': 8 });
    await startGame(page, 'coach-whiteboard');
    await expect(page.locator('.mx-choice')).toHaveText(['North', 'East', 'South', 'West'], { timeout: 10000 });
    await expect(page.locator('.mx-ask')).toHaveText(/^He is facing (north|east|south|west)\. He makes a /);
    await expect(page.locator('.cw-turn .cw-rose')).toBeVisible();
    const answer = (await page.locator('.cw-board').getAttribute('data-answer'))!;
    await page.locator(`.mx-choice[data-n="${answer}"]`).click();
    await expect(page.locator('.mx-note.good')).toContainText(`Yes! From `);
    await expect(page.locator('.mx-note.good')).toContainText(answer.toLowerCase());
  });

  test('the home screen has a maths section and a jiu-jitsu section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.tiles-head', { hasText: /^Maths$/ })).toBeVisible();
    /* one tile for every game in the section, from the catalog */
    await expect(page.locator('.tiles[data-section="maths"] .tile-link')).toHaveCount(GAMES.filter((g) => g.section === 'maths').length);
    await expect(page.locator('.tiles-head', { hasText: 'Jiu-jitsu' })).toBeVisible();
    await expect(page.locator('.tiles[data-section="bjj"] .tile-link')).toHaveCount(GAMES.filter((g) => g.section === 'bjj').length);
  });
});
