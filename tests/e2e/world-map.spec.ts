/* World Map: find the continents and the oceans, name them, and say where they are. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, noRecordings, openGame, recordSpeech, seed, watchPage } from './helpers';
import { MAP_H, MAP_W, project } from '../../src/content/projection';
import { place, type PlaceId } from '../../src/content/world';

async function startAt(page: Page, step: number): Promise<void> {
  await seed(page, { 'maths-step:world-map': step });
  await openGame(page, 'world-map');
  await page.getByRole('button', { name: '▶ Start' }).click();
}

/** the place the question is after, once it is up */
async function wanted(page: Page, n: number): Promise<PlaceId> {
  await expect(page.locator('.score')).toContainText(`Question ${n}`, { timeout: 8000 });
  return (await page.locator('.wm-stage').getAttribute('data-answer')) as PlaceId;
}

/** where a longitude and latitude are on the screen */
async function spot(page: Page, lon: number, lat: number): Promise<{ x: number; y: number }> {
  const box = (await page.locator('.wm-map').boundingBox())!;
  const [x, y] = project(lon, lat);
  return { x: box.x + (box.width * x) / MAP_W, y: box.y + (box.height * y) / MAP_H };
}

/** a tap on a place, where its name goes */
async function tap(page: Page, id: PlaceId, which = 0): Promise<void> {
  const [lon, lat] = place(id).labels[which];
  const at = await spot(page, lon, lat);
  await page.mouse.click(at.x, at.y);
}

test.describe('World Map', () => {
  /* a voice that says at once when it has finished, as an iPad's does: the
     game waits for the end of what is said before the next question */
  test.beforeEach(async ({ page }) => { await recordSpeech(page); });

  test('a whole round finding the continents by their names, to the sticker', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0);
    /* the continents' names are on the map, and only theirs */
    await expect(page.locator('.wm-label.continent:visible')).toHaveCount(7);
    await expect(page.locator('.wm-label.ocean:visible')).toHaveCount(0);
    for (let i = 1; i <= 8; i += 1) {
      const want = await wanted(page, i);
      /* three right in a row climbs a step, as in every game here: to the
         oceans with their names, then the continents without */
      expect(place(want).kind).toBe(['continent', 'ocean', 'continent'][Math.floor((i - 1) / 3)]);
      await tap(page, want);
      await expect(page.locator('.mx-note')).toHaveText(`Yes! ${place(want).fact}`);
      await expect(page.locator(`.wm-map [data-place="${want}"]`)).toHaveClass(/right/);
    }
    await expect(page.locator('.results .sticker')).toHaveText('🌏', { timeout: 8000 });
    noProblems(watch);
  });

  test('a wrong tap says what he found, and shows where the right one is', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 2);
    const want = await wanted(page, 1);
    const other: PlaceId = want === 'asia' ? 'africa' : 'asia';
    await tap(page, other);
    await expect(page.locator('.mx-note')).toHaveText(`That is ${place(other).name}. ${place(want).name} is here.`);
    await expect(page.locator(`.wm-land[data-place="${other}"]`)).toHaveClass(/wrong/);
    await expect(page.locator(`.wm-land[data-place="${want}"]`)).toHaveClass(/right/);
    /* and the two names come up, on a step with no names */
    await expect(page.locator(`.wm-label[data-place="${want}"]`)).toBeVisible();
    await expect(page.locator(`.wm-label[data-place="${other}"]`)).toBeVisible();
    await expect(page.locator('.wm-label:visible')).toHaveCount(2);
    await expect(page.locator('.score')).toContainText('Right first time 0');
    noProblems(watch);
  });

  test('a tap just off the coast still finds the continent', async ({ page }) => {
    await startAt(page, 2);
    for (let i = 1; i <= 3; i += 1) {
      const want = await wanted(page, i);
      const [lon, lat] = place(want).labels[0];
      const from = await spot(page, lon, lat);
      /* from the middle of the continent, out to the first water, then a little further */
      const off = await page.evaluate(([x, y, id]) => {
        const what = (px: number, py: number): string | null => {
          const r = document.elementFromPoint(px, py)?.closest('[data-place], [data-sea]');
          return r ? (r.getAttribute('data-place') ?? r.getAttribute('data-sea')) : null;
        };
        const water = (v: string | null): boolean =>
          !!v && !document.querySelector(`.wm-land[data-place="${v}"]`);
        for (let a = 0; a < 16; a += 1) {
          const dx = Math.cos((a * Math.PI) / 8);
          const dy = Math.sin((a * Math.PI) / 8);
          for (let d = 0; d < 400; d += 1) {
            const v = what(x + dx * d, y + dy * d);
            if (v === id) continue;
            if (water(v) && water(what(x + dx * (d + 4), y + dy * (d + 4)))) return { x: x + dx * (d + 4), y: y + dy * (d + 4) };
            break;
          }
        }
        return null;
      }, [from.x, from.y, want] as const);
      expect(off, want).not.toBeNull();
      await page.mouse.click(off!.x, off!.y);
      await expect(page.locator('.mx-note')).toHaveText(`Yes! ${place(want).fact}`);
    }
  });

  test('looking for an ocean, a tap on a little island finds the sea round it', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 3);
    const islands: Partial<Record<PlaceId, string>> = { pacific: 'NCL', indian: 'LKA', atlantic: 'JAM' };
    let tried = 0;
    /* no ocean comes up twice in four questions, so one with an island soon does */
    for (let i = 1; i <= 4 && !tried; i += 1) {
      const want = await wanted(page, i);
      const island = islands[want];
      if (island) {
        const country = page.locator(`path[data-country="${island}"]`);
        await expect(country).toHaveClass(/wm-island/);
        const box = (await country.boundingBox())!;
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        tried += 1;
      } else {
        await tap(page, want);
      }
      await expect(page.locator('.mx-note')).toHaveText(`Yes! ${place(want).fact}`);
    }
    expect(tried).toBe(1);
    noProblems(watch);
  });

  test('names the place that glows, from three of the same kind', async ({ page }) => {
    await startAt(page, 4);
    const want = await wanted(page, 1);
    await expect(page.locator(`.wm-stage [data-place="${want}"].glow`).first()).toBeAttached();
    const names = await page.locator('.mx-choice').allTextContents();
    expect(names).toHaveLength(3);
    expect(names).toContain(place(want).name);
    await page.locator('.mx-choice', { hasText: place(want).name }).click();
    await expect(page.locator('.mx-note')).toHaveText(`Yes! ${place(want).fact}`);
    /* and a wrong name is told which one it is */
    const next = await wanted(page, 2);
    await page.locator('.mx-choice').filter({ hasNotText: place(next).name }).first().click();
    const called = place(next).kind === 'ocean' ? `the ${place(next).name}` : place(next).name;
    await expect(page.locator('.mx-note')).toHaveText(`This is ${called}. ${place(next).fact}`);
  });

  test('around Australia: Australia has its name on the map, and the answer is found', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 5);
    for (let i = 1; i <= 3; i += 1) {
      const want = await wanted(page, i);
      await expect(page.locator('.wm-label[data-place="australia"]')).toBeVisible();
      await tap(page, want);
      await expect(page.locator('.mx-note')).toContainText(`Yes! `);
      await expect(page.locator('.mx-note')).toContainText(' of Australia.');
    }
    noProblems(watch);
  });

  test('which ocean is between two continents', async ({ page }) => {
    await startAt(page, 6);
    const want = await wanted(page, 1);
    const ask = (await page.locator('.mx-ask').textContent()) ?? '';
    expect(ask).toMatch(/^Which (ocean|continent) is between .+ and .+\?$/);
    /* the two it is between have their names up */
    await expect(page.locator('.wm-label.given')).toHaveCount(2);
    await tap(page, want);
    await expect(page.locator('.mx-note')).toContainText(' is between ');
    await expect(page.locator('.mx-note')).toContainText('Yes! ');
  });

  test('the flags switch to Portuguese mid-question: the question, the names on the map, the fact', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 0);
    const want = await wanted(page, 1);
    await expect(page.locator('.mx-ask')).toHaveText(`Where is ${place(want).name}?`);
    await page.getByRole('button', { name: 'Português' }).click();
    await expect(page.locator('.mx-ask')).toHaveText(`Onde fica a ${place(want).pt.name}?`); // the continents all take "a"
    await expect(page.locator('.wm-label[data-place="south-america"]')).toHaveText('América do Sul');
    await tap(page, want);
    await expect(page.locator('.mx-note')).toHaveText(`Isso! ${place(want).factPt}`);
    /* remembered next time */
    await page.reload();
    await page.getByRole('button', { name: '▶ Start' }).click();
    await expect(page.getByRole('button', { name: 'Português' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.mx-ask')).toContainText('Onde fica');
    noProblems(watch);
  });

  test('two misses finding the continents bring their names back, with the compass, and not the oceans', async ({ page }) => {
    const watch = watchPage(page);
    await startAt(page, 2);
    await expect(page.locator('.score')).toContainText('Continents');
    /* no names and no compass on the harder step */
    await expect(page.locator('.wm-label:visible')).toHaveCount(0);
    await expect(page.locator('.wm-compass')).toBeHidden();
    for (let n = 1; n <= 2; n += 1) {
      await wanted(page, n);
      /* the middle of the Pacific: never a continent */
      const at = await spot(page, -150, 0);
      await page.mouse.click(at.x, at.y);
    }
    await wanted(page, 3);
    await expect(page.locator('.score')).toContainText('Continents, with their names');
    await expect(page.locator('.mx-ask')).toHaveText(/^Where is /);
    await expect(page.locator('.wm-label.continent:visible')).toHaveCount(7);
    await expect(page.locator('.wm-label.ocean:visible')).toHaveCount(0);
    /* north, south, east and west, in his language */
    const compass = page.locator('.wm-compass');
    await expect(compass).toBeVisible();
    await expect(compass).toHaveText('NW✦ES');
    await page.getByRole('button', { name: 'Português' }).click();
    await expect(compass).toHaveText('NO✦LS');
    noProblems(watch);
  });

  test('the fact after a right answer is said to the end before the next question starts', async ({ page }) => {
    /* a voice as slow as a real one: 70 ms a letter, so a fact takes
       several seconds, more than the pause after a right answer */
    await noRecordings(page);
    await page.addInitScript(() => {
      const log: string[] = [];
      (window as unknown as { __log: string[] }).__log = log;
      class FakeUtterance {
        text: string; lang = ''; rate = 1; pitch = 1; volume = 1; voice: unknown = null;
        onend: (() => void) | null = null; onerror: (() => void) | null = null;
        constructor(text: string) { this.text = text; }
      }
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
      let current: { u: FakeUtterance; t: number } | null = null;
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          getVoices: () => [{ name: 'Karen', lang: 'en-AU', localService: true, default: true, voiceURI: 'karen' }],
          speak: (u: FakeUtterance) => {
            log.push(`start ${u.text}`);
            const t = window.setTimeout(() => { if (current?.u === u) { current = null; log.push(`end ${u.text}`); u.onend?.(); } }, 70 * u.text.length);
            current = { u, t };
          },
          cancel: () => {
            const c = current;
            current = null;
            if (c) { window.clearTimeout(c.t); log.push(`cut ${c.u.text}`); window.setTimeout(() => c.u.onerror?.(), 0); }
          },
          addEventListener: () => undefined,
        },
      });
    });
    await startAt(page, 0);
    const want = await wanted(page, 1);
    await tap(page, want);
    const fact = place(want).fact;
    await expect(page.locator('.mx-note')).toHaveText(`Yes! ${fact}`);
    await wanted(page, 2);
    const log = await page.evaluate(() => (window as unknown as { __log: string[] }).__log);
    /* the fact was said to the end, and only then the next question */
    expect(log, log.join('\n')).not.toContain(`cut ${fact}`);
    const ended = log.indexOf(`end ${fact}`);
    const next = log.findIndex((l, i) => i > log.indexOf(`start ${fact}`) && l.startsWith('start Where is'));
    expect(ended).toBeGreaterThan(-1);
    expect(next).toBeGreaterThan(ended);
  });
});

