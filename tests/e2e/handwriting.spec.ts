/* Handwriting: Trace It, and Tall, Small, Tail.
 *
 * The traces here are real pointer strokes along each letter's own path on
 * the screen, through the slope and the scaling, the same way a finger or a
 * pen would draw them. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, openSetup, watchPage } from './helpers';

type Pt = { x: number; y: number };

async function seed(page: Page, items: Record<string, unknown>): Promise<void> {
  await page.addInitScript((pairs) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    for (const [k, v] of Object.entries(pairs)) localStorage.setItem(`sor:${k}`, JSON.stringify(v));
  }, items);
}

/** where the stroke he is on now runs, in screen pixels, start to end */
function strokeOnScreen(page: Page): Promise<Pt[]> {
  return page.evaluate(() => {
    const pad = document.querySelector<SVGSVGElement>('.tr-pad');
    const t = pad?.querySelector<SVGGraphicsElement>(`.tr-track[data-i="${pad.dataset.stroke}"]`);
    const m = t?.getScreenCTM();
    if (!t || !m) return [];
    const at = (x: number, y: number) => { const p = new DOMPoint(x, y).matrixTransform(m); return { x: p.x, y: p.y }; };
    if (t instanceof SVGCircleElement) return [at(t.cx.baseVal.value, t.cy.baseVal.value)];
    const path = t as SVGPathElement;
    const len = path.getTotalLength();
    const out: Pt[] = [];
    for (let s = 0; s < len; s += 3) { const q = path.getPointAtLength(s); out.push(at(q.x, q.y)); }
    const end = path.getPointAtLength(len);
    out.push(at(end.x, end.y));
    return out;
  });
}

async function drawWithMouse(page: Page, pts: Pt[]): Promise<void> {
  await page.mouse.move(pts[0].x, pts[0].y);
  await page.mouse.down();
  for (const p of pts.slice(1)) await page.mouse.move(p.x, p.y);
  await page.mouse.up();
}

/** a stylus that is not an Apple Pencil: pen events, and no pressure at all */
async function drawWithPen(page: Page, pts: Pt[], pointerType = 'pen', pointerId = 3): Promise<void> {
  await page.evaluate(({ pts, pointerType, pointerId }) => {
    const pad = document.querySelector('.tr-pad');
    if (!pad) return;
    const fire = (type: string, p: Pt) => pad.dispatchEvent(new PointerEvent(type, {
      pointerId, pointerType, clientX: p.x, clientY: p.y, pressure: 0, tiltX: 0, tiltY: 0,
      bubbles: true, cancelable: true, isPrimary: true,
    }));
    fire('pointerdown', pts[0]);
    for (const p of pts.slice(1)) fire('pointermove', p);
    fire('pointerup', pts[pts.length - 1]);
  }, { pts, pointerType, pointerId });
}

const where = (page: Page): Promise<string> => page.evaluate(() => {
  const pad = document.querySelector<SVGSVGElement>('.tr-pad');
  return `${document.querySelector('.score')?.textContent}|${pad?.dataset.go}|${pad?.dataset.stroke}`;
});

/** trace whatever comes next until the round is over */
async function writeRound(page: Page, draw = drawWithMouse): Promise<void> {
  const results = page.locator('.results');
  for (let guard = 0; guard < 80; guard += 1) {
    await expect(page.locator('.tr-pad.good')).toHaveCount(0);
    if (await results.isVisible()) return;
    const before = await where(page);
    await draw(page, await strokeOnScreen(page));
    await expect.poll(() => where(page)).not.toBe(before);
  }
  throw new Error('the round never ended');
}

async function pickFamily(page: Page, name: string, length?: string): Promise<void> {
  await openSetup(page);
  await page.getByLabel('Which letters').selectOption({ label: name });
  if (length) await page.getByLabel('How many letters').selectOption(length);
  await page.getByRole('button', { name: 'Set up this game' }).click();
}

test.describe('Trace It', () => {
  test('writes every letter in a family, stroke by stroke, to the end', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'trace-it');
    await pickFamily(page, 'Slide letters', 'all');
    await expect(page.locator('.score')).toContainText('of 4');
    await writeRound(page);
    await expect(page.locator('.tr-results li')).toHaveCount(4);
    await expect(page.locator('.tr-results li.miss')).toHaveCount(0);
    noProblems(watch);
  });

  test('wipes a stroke started at the wrong end and says why', async ({ page }) => {
    await openGame(page, 'trace-it');
    await pickFamily(page, 'Around letters', 'all');
    /* c comes first in its family */
    await expect(page.locator('.tr-big').first()).toHaveText('c');
    const pts = await strokeOnScreen(page);
    await drawWithMouse(page, [...pts].reverse());
    await expect(page.locator('.tr-note')).toHaveText('Start at the green dot.');
    await expect(page.locator('.tr-pad')).toHaveAttribute('data-stroke', '0');
    await expect(page.locator('.tr-ink')).toHaveAttribute('d', '', { timeout: 2000 });
    /* the right way round is fine */
    await drawWithMouse(page, pts);
    await expect(page.locator('.tr-pad')).toHaveClass(/good/);
  });

  test('numbers the strokes, moves the dot on, and a dot is a tap', async ({ page }) => {
    await openGame(page, 'trace-it');
    await pickFamily(page, 'Straight down letters', 'all');
    await expect(page.locator('.tr-big').first()).toHaveText('i');
    await expect(page.locator('.tr-start')).toHaveAttribute('data-n', '1');
    await expect(page.locator('.tr-arrow')).toHaveCount(1);
    await drawWithMouse(page, await strokeOnScreen(page));
    /* the down stroke stays inked; now the dot, with no arrow to follow */
    await expect(page.locator('.tr-start')).toHaveAttribute('data-n', '2');
    await expect(page.locator('.tr-inked')).toHaveCount(1);
    await expect(page.locator('.tr-arrow')).toHaveCount(0);
    const [dot] = await strokeOnScreen(page);
    await page.mouse.click(dot.x, dot.y);
    await expect(page.locator('.tr-pad')).toHaveClass(/good/);
  });

  test('works with a pen that sends no pressure, and ignores a resting hand', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'trace-it');
    await pickFamily(page, 'Slide letters', 'all');
    const pts = await strokeOnScreen(page);
    const box = await page.locator('.tr-pad').boundingBox();
    if (!box) throw new Error('no pad');
    const palm = { x: box.x + box.width - 20, y: box.y + box.height - 20 };

    /* the side of his hand lands first and stays still */
    await page.evaluate((p) => {
      document.querySelector('.tr-pad')?.dispatchEvent(new PointerEvent('pointerdown', {
        pointerId: 9, pointerType: 'touch', clientX: p.x, clientY: p.y, bubbles: true, cancelable: true,
      }));
    }, palm);
    /* then the pen writes the stroke, and it counts */
    await drawWithPen(page, pts);
    await expect(page.locator('.tr-pad')).toHaveClass(/good/);
    /* the hand lifting off afterwards is not a stroke and not a mistake */
    await page.evaluate((p) => {
      document.querySelector('.tr-pad')?.dispatchEvent(new PointerEvent('pointerup', {
        pointerId: 9, pointerType: 'touch', clientX: p.x, clientY: p.y, bubbles: true,
      }));
    }, palm);
    await expect(page.locator('.tr-note')).not.toHaveClass(/oops/);

    /* and a whole round with a stylus that registers as a finger */
    await writeRound(page, (p, s) => drawWithPen(p, s, 'touch', 4));
    await expect(page.locator('.tr-results li.miss')).toHaveCount(0);
    noProblems(watch);
  });

  test('a still touch is ignored, not counted as a miss', async ({ page }) => {
    await openGame(page, 'trace-it');
    await pickFamily(page, 'Slide letters', 'all');
    const box = await page.locator('.tr-pad').boundingBox();
    if (!box) throw new Error('no pad');
    await page.mouse.click(box.x + box.width - 30, box.y + 30);
    await expect(page.locator('.tr-note')).toHaveText('');
  });

  test('two goes per letter, and Pro adds a third on your own', async ({ page }) => {
    await seed(page, { settings: { pro: true } });
    await openGame(page, 'trace-it');
    await pickFamily(page, 'Slide letters', 'all');
    await expect(page.locator('.tr-step')).toHaveText('Trace it');
    await expect(page.locator('.tr-track.solid')).toHaveCount(1);
    await drawWithMouse(page, await strokeOnScreen(page));
    await expect(page.locator('.tr-step')).toHaveText('Follow the dots');
    await expect(page.locator('.tr-track.dots')).toHaveCount(1);
    await drawWithMouse(page, await strokeOnScreen(page));
    await expect(page.locator('.tr-step')).toHaveText('On your own');
    await expect(page.locator('.tr-track.none')).toHaveCount(1);
    await expect(page.locator('.tr-start')).toBeVisible();
    await expect(page.locator('.tr-arrow')).toHaveCount(0);
    await drawWithMouse(page, await strokeOnScreen(page));
    await expect(page.locator('.score')).toContainText('Letter 2');
  });

  test('prints a practice sheet for the whole family', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __printed: number }).__printed = 0;
      window.print = () => { (window as unknown as { __printed: number }).__printed += 1; };
    });
    const watch = watchPage(page);
    await openGame(page, 'trace-it');
    await pickFamily(page, 'Around letters');
    await openSetup(page);
    await page.getByRole('button', { name: '🖨 Print a practice sheet' }).click();
    expect(await page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1);
    await expect(page.locator('.tr-print .pr-line')).toHaveCount(8);
    await expect(page.locator('.tr-print h2')).toHaveText('Around letters');
    /* on screen it stays out of the way; on paper it is all there is */
    await expect(page.locator('.tr-print')).toBeHidden();
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.tr-print')).toBeVisible();
    await expect(page.locator('#app')).toBeHidden();
    await page.emulateMedia({ media: 'screen' });
    /* and it goes when he leaves the game */
    await page.getByRole('button', { name: 'Back to the games' }).click();
    await expect(page.locator('.tr-print')).toHaveCount(0);
    noProblems(watch);
  });

  test('remembers the family the grown-up picked', async ({ page }) => {
    await openGame(page, 'trace-it');
    await pickFamily(page, 'Capitals: curves');
    await page.reload();
    await expect(page.getByLabel('Which letters')).toHaveValue('caps-curves');
    await expect(page.locator('.score')).toContainText('of 6');
  });
});

test.describe('Tall, Small, Tail', () => {
  const TALL = 'bdfhklt';
  const TAIL = 'gjpqy';
  const kindOf = (ch: string): string => (TALL.includes(ch) ? 'Tall' : TAIL.includes(ch) ? 'Tail' : 'Small');

  async function sortAll(page: Page): Promise<void> {
    for (let i = 0; i < 10; i += 1) {
      await expect(page.locator('.score')).toContainText(`Letter ${i + 1}`);
      const ch = (await page.locator('.ts-card').getAttribute('data-letter')) ?? '';
      await page.getByRole('button', { name: kindOf(ch), exact: true }).click();
      await expect(page.locator('.ts-board:not([hidden]) .ts-note')).toContainText(`${ch} is ${kindOf(ch).toLowerCase()}`);
    }
  }

  async function findAll(page: Page): Promise<string> {
    const title = (await page.locator('.ts-hunt-title').textContent()) ?? '';
    const target = title.trim().slice(-1);
    const tiles = page.locator(`.ts-tile[data-ch="${target}"]`);
    const n = await tiles.count();
    for (let i = 0; i < n; i += 1) await tiles.nth(i).click();
    return target;
  }

  test('sorts ten letters by height, then finds every b, to the end', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'tall-small-tail');
    await sortAll(page);
    await expect(page.locator('.ts-hunt-title')).toBeVisible();
    const target = await findAll(page);
    await expect(page.locator('.results')).toBeVisible({ timeout: 4000 });
    await expect(page.locator('.results')).toContainText('10 of 10 letters right first try');
    await expect(page.locator('.results')).toContainText(`Every ${target} found`);
    noProblems(watch);
  });

  test('a wrong height gets a nudge, and does not count as first try', async ({ page }) => {
    await openGame(page, 'tall-small-tail');
    const ch = (await page.locator('.ts-card').getAttribute('data-letter')) ?? '';
    const wrong = kindOf(ch) === 'Small' ? 'Tall' : 'Small';
    await page.getByRole('button', { name: wrong, exact: true }).click();
    await expect(page.locator('.ts-board:not([hidden]) .ts-note')).toContainText('Look again');
    await page.getByRole('button', { name: kindOf(ch), exact: true }).click();
    await expect(page.locator('.ts-card')).toHaveAttribute('data-h', kindOf(ch).toLowerCase());
    await expect(page.locator('.score')).toContainText('Right first try 0');
  });

  test('the hunt on its own, with the rhyme for a wrong tap', async ({ page }) => {
    await openGame(page, 'tall-small-tail');
    await openSetup(page);
    await page.getByLabel('Which part').selectOption('mirrors');
    await expect(page.locator('.ts-hunt-title')).toHaveText(/Find every [bd]/);
    const target = ((await page.locator('.ts-hunt-title').textContent()) ?? '').trim().slice(-1);
    await expect(page.locator('.ts-tile')).toHaveCount(12);
    await page.locator('.ts-tile').filter({ hasNotText: target }).first().click();
    await expect(page.locator('.ts-board:not([hidden]) .ts-note')).toContainText(target === 'b' ? 'bat, then ball' : 'drum, then stick');
    await findAll(page);
    await expect(page.locator('.results')).toContainText('1 wrong tap', { timeout: 4000 });
  });
});
