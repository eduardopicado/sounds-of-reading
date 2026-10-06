/* The maths games, played through by reading the screen the way he does. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, openSetup, seed, watchPage } from './helpers';

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

  test('Year 2: the number line goes to 1000', async ({ page }) => {
    await seed(page, { 'maths-step:number-line-penalty': 7 });
    await startGame(page, 'number-line-penalty');
    await expect(page.locator('.mx-label').last()).toHaveText('1000');
    await expect(page.locator('.mx-line[data-ready="1"]')).toBeVisible();
    expect(Number(await page.locator('.mx-line').getAttribute('data-asked')) % 100).toBe(0);
    await kickToNumber(page, true);
    await expect(page.locator('.mx-note')).toContainText('GOAL!');
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
    await page.getByRole('button', { name: 'Jump on 1', exact: true }).click();
    await page.getByRole('button', { name: 'Jump on 1', exact: true }).click();
    await expect(page.locator('.jl-arc.his')).toHaveCount(2);
    await page.getByRole('button', { name: 'Undo a jump' }).click();
    await expect(page.locator('.jl-arc.his')).toHaveCount(1);
    await expect(line).toHaveAttribute('data-at', String(a + 1));
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
      if (await page.locator('.cw-grid').count()) await page.locator(`.cw-cell[data-at="${answer}"]`).click();
      else await page.locator(`.mx-choice[data-n="${answer}"]`).click();
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

  test('the home screen has a maths section with every maths game', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.tiles-head').nth(1)).toHaveText('Maths');
    await expect(page.locator('.tiles').nth(1).locator('.tile-link')).toHaveCount(15);
  });
});
