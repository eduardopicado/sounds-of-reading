import { expect, test } from '@playwright/test';
import { expectTapTargets, noProblems, openGame, watchPage } from './helpers';
import { GAMES, SECTIONS } from '../../src/games/catalog';

test.describe('home screen', () => {
  test('shows every game and opens each one', async ({ page }) => {
    const watch = watchPage(page);
    await page.goto('/');

    const names = await page.locator('.tile-link .name').allTextContents();
    /* every game in the catalog, section by section, in the catalog's order */
    expect(names).toEqual(SECTIONS.flatMap((s) => GAMES.filter((g) => g.section === s.id).map((g) => g.name)));

    for (const { path } of GAMES) {
      await page.goto('/');
      await page.locator(`.tile-link[data-game="${path}"]`).click();
      await expect(page.locator('.topbar h1')).toBeVisible();
      expect(page.url()).toContain('#/' + path);
      /* the tab, the app switcher and a screen reader name the game */
      await expect(page).toHaveTitle(`${GAMES.find((g) => g.path === path)!.name} · Sounds of Reading`);
      /* and back out again, the way a child leaves a game */
      await page.getByRole('button', { name: 'Back to the games' }).click();
      await expect(page.locator('.tiles').first()).toBeVisible();
    }
    noProblems(watch);
  });

  test('tiles and chips are big enough to tap', async ({ page }) => {
    await page.goto('/');
    await expectTapTargets(page, '.tile-link');
    await expectTapTargets(page, '.pick-link');
    await openGame(page, 'grown-ups');
    await expectTapTargets(page, '.week .chip');
  });

  test('nothing leaves the device and nothing is fetched from elsewhere', async ({ page }) => {
    const watch = watchPage(page);
    await page.goto('/');
    await page.waitForTimeout(600);
    noProblems(watch);
    /* the fonts are ours, not Google's */
    const fontUrls = await page.evaluate(() =>
      [...document.fonts].map((f) => f.family));
    expect(fontUrls.join(' ')).toContain('Andika');
  });

  test('works when localStorage is unavailable', async ({ page }) => {
    const watch = watchPage(page);
    await page.addInitScript(() => {
      /* what a locked-down or private-mode browser does */
      Object.defineProperty(window, 'localStorage', {
        get() { throw new Error('storage blocked'); },
      });
    });
    /* every tile a browser with storage shows */
    const normal = await page.context().newPage();
    await normal.goto('/');
    const tiles = await normal.locator('.tiles .tile-link').count();
    await normal.close();
    expect(tiles).toBeGreaterThan(20);
    await page.goto('/');
    await expect(page.locator('.tiles .tile-link')).toHaveCount(tiles);
    await openGame(page, 'real-or-silly');
    await expect(page.locator('.theword')).toBeVisible();
    noProblems(watch);
  });
});

test.describe("this week's sounds", () => {
  test('a change in the grown-ups corner reaches the games and survives a reload', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'grown-ups');

    /* pick level 4 only, then sh only */
    const levels = page.locator('.week .row').filter({ hasText: 'LEVELS' });
    await page.locator('.week .chip', { hasText: /^5/ }).click();
    await expect(page.locator('.week .now')).toHaveText(/Level 4/);
    await page.locator('.week .chip').filter({ hasText: /^sh$/ }).click();
    await expect(page.locator('.week .now')).toHaveText(/Level 4 — sh/);
    expect(await levels.count()).toBeGreaterThan(0);

    /* a game opened now starts from that choice */
    await openGame(page, 'roll-and-read');
    const faces = await page.locator('.cube .face').allTextContents();
    expect(new Set(faces)).toEqual(new Set(['sh']));

    /* and it is still there after a reload, because it is in localStorage */
    await openGame(page, 'grown-ups');
    await expect(page.locator('.week .now')).toHaveText(/Level 4 — sh/);
    noProblems(watch);
  });

  test('merging the two th sounds shows one chip instead of two', async ({ page }) => {
    await openGame(page, 'grown-ups');
    await expect(page.locator('.week .chip', { hasText: 'th (them)' })).toBeVisible();
    await page.locator('.week .chip', { hasText: 'Merge the two th sounds' }).click();
    await expect(page.locator('.week .chip', { hasText: 'th (them)' })).toHaveCount(0);
    await expect(page.locator('.week .chip').filter({ hasText: /^th$/ })).toBeVisible();
  });
});

test.describe('sticker book', () => {
  test('finishing a round wins a sticker that lands in the book', async ({ page }) => {
    const watch = watchPage(page);
    await page.goto('/');
    await expect(page.locator('.tray .empty', { hasText: 'first sticker' })).toBeVisible();

    await openGame(page, 'word-builder');
    const tiles = page.locator('.rack .tile');
    for (let i = 0, n = await tiles.count(); i < n; i += 1) {
      await tiles.nth(i).click({ timeout: 5000 }).catch(() => undefined);
      await page.waitForTimeout(70);
    }
    await expect(page.locator('.overlay.show')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.overlay .prize')).not.toBeEmpty();
    const won = await page.locator('.overlay .prize').textContent();

    await page.goto('/');
    await expect(page.locator('.sticker')).toHaveCount(1);
    await expect(page.locator('.sticker')).toHaveText(won!);

    /* clearing it is a grown-up's job, and one tap only asks */
    await expect(page.getByRole('button', { name: 'Start a new sticker book' })).toHaveCount(0);
    await openGame(page, 'grown-ups');
    await page.getByRole('button', { name: 'Start a new sticker book' }).click();
    await page.goto('/');
    await expect(page.locator('.sticker')).toHaveCount(1);
    await openGame(page, 'grown-ups');
    await page.getByRole('button', { name: 'Start a new sticker book' }).click();
    await page.getByRole('button', { name: 'Tap again to clear every sticker' }).click();
    await page.goto('/');
    await expect(page.locator('.sticker')).toHaveCount(0);
    noProblems(watch);
  });
});

test.describe('the grown-ups corner', () => {
  test('opens only when the button is held for three seconds', async ({ page }) => {
    const watch = watchPage(page);
    await page.goto('/');
    /* the settings are no longer on the home screen at all */
    await expect(page.locator('.week')).toHaveCount(0);
    const hold = page.locator('.hold-btn');

    /* a tap, or a short press, does nothing but say what to do */
    await hold.click();
    await expect(hold).toContainText('Hold for 3 seconds');
    await hold.dispatchEvent('pointerdown');
    await page.waitForTimeout(1200);
    await hold.dispatchEvent('pointerup');
    await page.waitForTimeout(2200);
    expect(page.url()).not.toContain('grown-ups');

    await hold.dispatchEvent('pointerdown');
    await expect(hold).toContainText('Keep holding');
    await page.waitForURL(/#\/grown-ups/, { timeout: 5000 });
    await expect(page.locator('.week h2')).toHaveText("This week's sounds");
    /* and back to the games */
    await page.getByRole('button', { name: 'Back to the games' }).click();
    await expect(page.locator('.tiles').first()).toBeVisible();
    noProblems(watch);
  });

  test('groups the settings into cards', async ({ page }) => {
    await openGame(page, 'grown-ups');
    await expect(page.locator('.gu-card h2')).toHaveText(["This week's sounds", 'How it is going', 'Challenge', 'Sound', 'Team crests', 'Stickers']);
    /* the sounds of the two default levels, one line each */
    await expect(page.locator('.sound-group .group-name')).toHaveText(['Level 4', 'Level 5']);
  });

  test('shows the step reached in each maths game, and which are not tried yet', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('sor:maths-step:team-buses', '2');
      localStorage.setItem('sor:maths-step:refs-call', '0');
    });
    await openGame(page, 'grown-ups');
    const rows = page.locator('.mp-row');
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toHaveAttribute('data-game', 'team-buses');
    await expect(rows.first().locator('.mp-step')).toContainText('step 3 of');
    /* the first of the games with a ladder he has not tried, in the catalog's order */
    const untried = GAMES.filter((g) => g.ladder && g.path !== 'team-buses' && g.path !== 'refs-call').slice(0, 5).map((g) => g.name);
    await expect(page.locator('.maths-progress')).toContainText(`Not tried yet: ${untried.join(', ')}`);
  });

  test('every maths and jiu-jitsu game has its ladder in the progress card', async ({ page }) => {
    await page.goto('/');
    const paths = await page.locator('.tiles[data-section="maths"] .tile-link, .tiles[data-section="bjj"] .tile-link')
      .evaluateAll((ns) => ns.map((n) => (n as HTMLElement).dataset.game));
    await page.addInitScript((ids: string[]) => {
      for (const id of ids) localStorage.setItem(`sor:maths-step:${id}`, '0');
    }, paths as string[]);
    /* a new hash alone keeps the page; the reload runs the seeding */
    await openGame(page, 'grown-ups');
    await page.reload();
    await expect(page.locator('.mp-row')).toHaveCount(paths.length);
  });
});

test.describe("the coach's picks", () => {
  test('three games for today: reading, maths or jiu-jitsu, and handwriting', async ({ page }) => {
    const watch = watchPage(page);
    await page.addInitScript(() => {
      localStorage.setItem('sor:coach', JSON.stringify({ sounds: { ai: '0101000' }, levels: {} }));
    });
    await page.goto('/');
    const picks = page.locator('.pick-link');
    await expect(picks).toHaveCount(3);
    const games = await picks.evaluateAll((ns) => ns.map((n) => (n as HTMLElement).dataset.game));
    const section = async (id: string): Promise<string | undefined> =>
      page.locator(`.tiles .tile-link[data-game="${id}"]`).evaluate((n) => (n.closest('.tiles') as HTMLElement).dataset.section);
    expect(await section(games[0]!)).toBe('reading');
    expect(['maths', 'bjj']).toContain(await section(games[1]!));
    expect(await section(games[2]!)).toBe('writing');
    /* aimed at the sound that needs practice, and at a game not tried yet */
    await expect(picks.nth(0).locator('.why')).toHaveText('Practise ai');
    await expect(picks.nth(1).locator('.why')).toHaveText('Not tried yet');
    /* the same picks all day */
    await page.reload();
    expect(await picks.evaluateAll((ns) => ns.map((n) => (n as HTMLElement).dataset.game))).toEqual(games);
    await picks.nth(1).click();
    await expect(page.locator('.topbar h1')).toBeVisible();
    noProblems(watch);
  });
});

test.describe('a game that will not open', () => {
  /* with the offline worker out of the way, so the page asks for the file itself */
  test.use({ serviceWorkers: 'block' });

  test('says so, with a way back, instead of a blank page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.route('**/assets/sound-sort-*.js', (route) => route.abort());
    await page.goto('/');
    await page.locator('.tile-link[data-game="sound-sort"]').click();
    await expect(page.locator('.route-error h1')).toHaveText('Oops!');
    expect(errors.some((e) => e.includes('Could not open #/sound-sort'))).toBe(true);
    await page.getByRole('button', { name: 'Back to the games' }).click();
    await expect(page.locator('.tiles').first()).toBeVisible();
  });
});
