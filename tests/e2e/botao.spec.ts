/* Futebol de Botão: pull a button back, let go, and score in three touches. */

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { expectTapTargets, noProblems, openGame, seed, watchPage } from './helpers';
import { HOW, PULL, VIEW, W, type Flick, type PlanKind } from '../../src/content/botao';

async function start(page: Page, step: number): Promise<void> {
  await seed(page, { 'maths-step:futebol-de-botao': step });
  await openGame(page, 'futebol-de-botao');
  await page.getByRole('button', { name: '▶ Start' }).click();
  await expect(page.locator('.bt-btn.us').first()).toBeVisible();
}

/** where a button is on the screen, from where it is on the table */
async function onScreen(page: Page, button: number): Promise<{ x: number; y: number; scale: number }> {
  const box = (await page.locator('.bt-table').boundingBox())!;
  const scale = box.width / VIEW.w;
  const b = page.locator(`.bt-btn.b${button}`);
  const x = Number(await b.getAttribute('data-x'));
  const y = Number(await b.getAttribute('data-y'));
  return { x: box.x + (x - VIEW.x) * scale, y: box.y + (y - VIEW.y) * scale, scale };
}

/** a finger on the button, pulled back the way that gives this flick, let go */
async function flick(page: Page, f: Flick): Promise<void> {
  const { x, y, scale } = await onScreen(page, f.button);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - (f.vx / PULL) * scale, y - (f.vy / PULL) * scale, { steps: 6 });
  await page.mouse.up();
}

const plan = async (page: Page): Promise<Flick[]> => JSON.parse((await page.locator('.bt-stage').getAttribute('data-plan'))!);

test.describe('Futebol de Botão', () => {
  test('pull back, let go, and the ball goes in: GOL!', async ({ page }) => {
    const watch = watchPage(page);
    await start(page, 0);
    await expectTapTargets(page, '.bt-stage button');
    const [shot] = await plan(page);
    await flick(page, shot);
    await expect(page.locator('.bt-stage')).toHaveAttribute('data-goal', 'scored', { timeout: 10000 });
    await expect(page.locator('.mx-note')).toHaveText('GOL! In one touch!');
    await expect(page.locator('.bt-pip.used')).toHaveCount(1);
    /* it counts once the next attack starts */
    await expect(page.locator('.score')).toContainText('Attack 2 of 8', { timeout: 6000 });
    await expect(page.locator('.score')).toContainText('Goals 1');
    await expect(page.locator('.bt-stage')).not.toHaveAttribute('data-goal');
    noProblems(watch);
  });

  test("shows the ball's way while he aims on the first steps, and not at the top", async ({ page }) => {
    await start(page, 0);
    const { x, y, scale } = await onScreen(page, 0);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 14 * scale, { steps: 4 });
    await expect(page.locator('.bt-arrow')).not.toHaveAttribute('points', '');
    const way = (await page.locator('.bt-path').getAttribute('points'))!.split(' ');
    expect(way.length).toBeGreaterThan(10);
    /* back to where it started: no flick at all */
    await page.mouse.move(x, y, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await expect(page.locator('.bt-stage')).toHaveAttribute('data-touches', '0');
  });

  /* the pull counts from where the finger came down: one resting on the
     edge of a button is no pull, and lifting it is no flick */
  test('a finger resting on a button, anywhere on it, sends nothing anywhere', async ({ page }) => {
    const watch = watchPage(page);
    await start(page, 4);
    const { x, y, scale } = await onScreen(page, 0);
    const edge = y + 3.5 * scale;
    /* down on the lower part of the button, the slightest wobble, and up */
    await page.mouse.move(x, edge);
    await page.mouse.down();
    await page.mouse.move(x + 0.5, edge + 0.5);
    await expect(page.locator('.bt-arrow')).toHaveAttribute('points', '');
    await expect(page.locator('.bt-marks > *')).toHaveCount(0);
    await page.mouse.up();
    await page.waitForTimeout(300);
    await expect(page.locator('.bt-stage')).toHaveAttribute('data-touches', '0');
    /* pulled back from there, the arrow shows; brought back, still nothing */
    await page.mouse.move(x, edge);
    await page.mouse.down();
    await page.mouse.move(x, edge + 8 * scale, { steps: 4 });
    await expect(page.locator('.bt-arrow')).not.toHaveAttribute('points', '');
    await page.mouse.move(x, edge, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await expect(page.locator('.bt-stage')).toHaveAttribute('data-touches', '0');
    noProblems(watch);
  });

  test('no guide at the top of the ladder: the arrow only', async ({ page }) => {
    await start(page, 5);
    await expect(page.locator('.bt-keeper')).toBeVisible();
    const { x, y, scale } = await onScreen(page, 0);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 14 * scale, { steps: 4 });
    await expect(page.locator('.bt-arrow')).not.toHaveAttribute('points', '');
    await expect(page.locator('.bt-path')).toHaveAttribute('points', '');
    await page.mouse.move(x, y, { steps: 4 });
    await page.mouse.up();
  });

  test('three touches, the third by another button; out of touches, a way to score is shown', async ({ page }) => {
    const watch = watchPage(page);
    await start(page, 0);
    const stage = page.locator('.bt-stage');
    /* away from the ball, on the side away from his other button */
    const other = Number(await page.locator('.bt-btn.b1').getAttribute('data-x'));
    const away = other > W / 2 ? -1 : 1;
    for (const n of [1, 2]) {
      await flick(page, { button: 0, vx: away * 25, vy: 0 });
      await expect(stage).toHaveAttribute('data-touches', String(n));
      await expect(page.locator('.mx-note')).toContainText(`${3 - n} touch`, { timeout: 8000 });
    }
    await expect(page.locator('.mx-note')).toContainText('You missed the ball.');
    await expect(page.locator('.mx-note')).toContainText('has to be another button');
    await expect(page.locator('.bt-btn.b0')).toHaveClass(/tired/);
    /* the same button a third time: not allowed */
    await flick(page, { button: 0, vx: away * 25, vy: 0 });
    await expect(page.locator('.mx-note')).toHaveText('That button has had two touches. Use another one!');
    await expect(stage).toHaveAttribute('data-touches', '2');
    /* the other one, away from the ball too: that was the last touch */
    await flick(page, { button: 1, vx: 0, vy: 25 });
    await expect(page.locator('.mx-note')).toContainText('No touches left. Watch: here is one way.', { timeout: 8000 });
    await expect(stage).toHaveAttribute('data-goal', 'shown', { timeout: 15000 });
    const kind = (await stage.getAttribute('data-kind')) as PlanKind;
    await expect(page.locator('.mx-note')).toHaveText(HOW[kind], { timeout: 5000 });
    await expect(page.locator('.score')).toContainText('Attack 2 of 8', { timeout: 10000 });
    await expect(page.locator('.score')).toContainText('Goals 0');
    noProblems(watch);
  });

  test('off the wall: the way shown bounces off the side into the goal, and the angles are drawn', async ({ page }) => {
    const watch = watchPage(page);
    await start(page, 3);
    await expect(page.locator('.bt-btn.them')).toHaveCount(1);
    await expect(page.locator('.bt-stage')).toHaveAttribute('data-kind', 'wall');
    const [shot] = await plan(page);
    await flick(page, shot);
    await expect(page.locator('.bt-stage')).toHaveAttribute('data-goal', 'scored', { timeout: 10000 });
    /* where it came off the wall: the same angle each side, measured from the
       wall, and the same numbers in words. No right angle in it, so no
       right-angle mark: that is only for a ball sent straight at the wall */
    const degrees = page.locator('.bt-marks .bt-deg');
    await expect(degrees).toHaveCount(2);
    const [into, out] = await degrees.allTextContents();
    expect(into).toMatch(/^\d+°$/);
    expect(out).toBe(into);
    await expect(page.locator('.bt-marks .bt-arc')).toHaveCount(2);
    await expect(page.locator('.bt-marks .bt-right')).toHaveCount(0);
    await expect(page.locator('.mx-note')).toHaveText(`GOL! In one touch! It went into the wall at ${into} and came off at ${out}: the same angle.`);
    /* and gone when the next attack starts */
    await expect(page.locator('.score')).toContainText('Attack 2 of 8', { timeout: 6000 });
    await expect(page.locator('.bt-marks > *')).toHaveCount(0);
    noProblems(watch);
  });

  /* the words about a shot, its angles among them, are above the table in
     the instruction's place, so they are on the screen with it */
  test('says what happened above the table, where the instruction was, on the screen', async ({ page }) => {
    const watch = watchPage(page);
    await start(page, 3);
    const tell = page.locator('.bt-tell');
    const note = page.locator('.mx-note');
    await expect(tell).toBeVisible();
    await expect(note).toBeHidden();
    const [shot] = await plan(page);
    await flick(page, shot);
    await expect(page.locator('.bt-stage')).toHaveAttribute('data-goal', 'scored', { timeout: 10000 });
    await expect(note).toContainText('It went into the wall at');
    await expect(tell).toBeHidden();
    const [words, table] = [(await note.boundingBox())!, (await page.locator('.bt-table').boundingBox())!];
    expect(words.y + words.height).toBeLessThanOrEqual(table.y);
    expect(words.y).toBeGreaterThanOrEqual(0);
    /* and the instruction is back for the next attack */
    await expect(page.locator('.score')).toContainText('Attack 2 of 8', { timeout: 6000 });
    await expect(tell).toBeVisible();
    await expect(note).toBeHidden();
    noProblems(watch);
  });

  test('off the wall, while he aims: the angles are on show, and move as he turns his aim', async ({ page }) => {
    const watch = watchPage(page);
    await start(page, 3);
    await expect(page.locator('.bt-stage')).toHaveAttribute('data-guide', 'short');
    const [shot] = await plan(page);
    const { x, y, scale } = await onScreen(page, shot.button);
    const pull = (f: Flick): { x: number; y: number } => ({ x: x - (f.vx / PULL) * scale, y: y - (f.vy / PULL) * scale });
    await page.mouse.move(x, y);
    await page.mouse.down();
    const there = pull(shot);
    await page.mouse.move(there.x, there.y, { steps: 6 });
    /* held, not let go: where it would come off the wall, and the same angle each side */
    const degrees = page.locator('.bt-marks .bt-deg');
    await expect(degrees).toHaveCount(2);
    const [into, out] = await degrees.allTextContents();
    expect(into).toMatch(/^\d+°$/);
    expect(out).toBe(into);
    const wall = await page.locator('.bt-marks .bt-wall-mark').getAttribute('d');
    /* turned a little: the ball meets the wall somewhere else, still at the same angle each side */
    const turn = 4 * Math.PI / 180;
    const turned = { ...shot, vx: shot.vx * Math.cos(turn) - shot.vy * Math.sin(turn), vy: shot.vx * Math.sin(turn) + shot.vy * Math.cos(turn) };
    const moved = pull(turned);
    await page.mouse.move(moved.x, moved.y, { steps: 3 });
    await expect(page.locator('.bt-marks .bt-wall-mark')).not.toHaveAttribute('d', wall!);
    await expect(degrees).toHaveCount(2);
    const [into2, out2] = await degrees.allTextContents();
    expect(out2).toBe(into2);
    /* back on the button and let go: no flick */
    await page.mouse.move(x, y, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await expect(page.locator('.bt-stage')).toHaveAttribute('data-touches', '0');
    noProblems(watch);
  });

  test('off the wall, shown: the angles it will bounce at before the flick, and after it', async ({ page }) => {
    const watch = watchPage(page);
    await start(page, 3);
    await page.getByRole('button', { name: '👀 Show me a way' }).click();
    /* the way to go, all of it, with where it will come off the wall */
    await expect(page.locator('.bt-ghost')).toBeVisible({ timeout: 4000 });
    await expect(page.locator('.bt-marks .bt-deg')).toHaveCount(2);
    const before = await page.locator('.bt-marks .bt-deg').allTextContents();
    await expect(page.locator('.bt-stage')).toHaveAttribute('data-goal', 'shown', { timeout: 15000 });
    await expect(page.locator('.mx-note')).toHaveText(`${HOW.wall} It went into the wall at ${before[0]} and came off at ${before[1]}: the same angle.`, { timeout: 5000 });
    expect(await page.locator('.bt-marks .bt-deg').allTextContents()).toEqual(before);
    noProblems(watch);
  });

  test('pass, then shoot: Show me passes to the other button, scores, and counts as missed', async ({ page }) => {
    const watch = watchPage(page);
    await start(page, 4);
    await expect(page.locator('.bt-keeper')).toBeVisible();
    await page.getByRole('button', { name: '👀 Show me a way' }).click();
    await expect(page.locator('.mx-note')).toHaveText('Stuck? Watch: here is one way.');
    await expect(page.locator('.bt-ghost')).toBeVisible({ timeout: 4000 });
    await expect(page.locator('.bt-stage')).toHaveAttribute('data-goal', 'shown', { timeout: 20000 });
    /* a pass that goes off the wall on its way says its angles after this */
    await expect(page.locator('.mx-note')).toContainText(HOW.pass, { timeout: 5000 });
    await expect(page.locator('.score')).toContainText('Attack 2 of 8', { timeout: 10000 });
    await expect(page.locator('.score')).toContainText('Goals 0');
    noProblems(watch);
  });

  test('a whole team on the table has no accessibility violations', async ({ page }) => {
    await start(page, 6);
    await expect(page.locator('.bt-btn.them')).toHaveCount(4);
    await expect(page.locator('.bt-btn.us')).toHaveCount(3);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
