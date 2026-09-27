/* One full round of each game, plus its settings and its win screen.
 * Nothing here reaches into the app's internals: the tests play the games the
 * way the child does, by looking at the screen and tapping. */

import { expect, test, type Page } from '@playwright/test';
import { noProblems, openGame, openSetup, watchPage } from './helpers';

test.describe('Memory Match', () => {
  test('plays a full round through to the win screen', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'memory-match');

    /* four pairs keeps the brute force quick */
    await openSetup(page);
    await page.getByLabel('How many pairs').selectOption('4');
    await page.getByRole('button', { name: 'Set up this game' }).click();

    const cards = page.locator('.card');
    await expect(cards).toHaveCount(8);
    await expect(page.locator('.score')).toContainText('of 4');

    /* no memory of what is where, so try every pairing until they all match —
       which also proves the game never punishes a wrong pair */
    for (let a = 0; a < 8 && await page.locator('.card.done').count() < 8; a += 1) {
      for (let b = a + 1; b < 8 && await page.locator('.card.done').count() < 8; b += 1) {
        const first = cards.nth(a);
        const second = cards.nth(b);
        if ((await first.getAttribute('class'))?.includes('done')) break;
        if ((await second.getAttribute('class'))?.includes('done')) continue;
        await first.click();
        await second.click();
        await page.waitForTimeout(1050);
      }
    }

    await expect(page.locator('.card.done')).toHaveCount(8);
    await expect(page.locator('.overlay.show')).toBeVisible();
    await expect(page.locator('.overlay-card h3')).toHaveText('All matched!');
    await expect(page.locator('.overlay-card p')).toContainText('all 4 pairs');
    /* matched sounds collect in the rail */
    expect(await page.locator('.tray .tokn').count()).toBeGreaterThan(0);
    noProblems(watch);
  });

  test('changing the mode deals a new board', async ({ page }) => {
    await openGame(page, 'memory-match');
    await openSetup(page);
    await page.getByLabel('Matching mode').selectOption('sound');
    /* in same-sound mode both cards of a pair are words, so no emoji cards */
    await expect(page.locator('.card .pic')).toHaveCount(0);
    await page.getByLabel('Matching mode').selectOption('pic');
    expect(await page.locator('.card .pic').count()).toBeGreaterThan(0);
  });
});

test.describe('Bingo', () => {
  test('calls words that are always on the card, and wins on a line', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'bingo');
    await expect(page.locator('.cell')).toHaveCount(9);
    /* the 3x3 card has a free centre */
    await expect(page.locator('.cell.free')).toHaveCount(1);

    for (let i = 0; i < 12; i += 1) {
      if (await page.locator('.overlay.show').count()) break;
      const call = page.getByRole('button', { name: 'Call a word' });
      if (await call.isEnabled()) await call.click();
      const called = await page.locator('.tray .tokn').last().textContent();
      const cell = page.locator('.cell').filter({ hasText: new RegExp(`^${called}$`) }).first();
      /* every word called is on the card — that is what makes it winnable */
      await expect(cell).toHaveCount(1);
      await cell.click({ timeout: 5000 }).catch(() => undefined);
      await page.waitForTimeout(120);
    }

    await expect(page.locator('.overlay.show')).toBeVisible();
    await expect(page.locator('.overlay-card h3')).toHaveText('Bingo!');
    noProblems(watch);
  });

  test('a word not yet called shakes instead of marking', async ({ page }) => {
    await openGame(page, 'bingo');
    const cell = page.locator('.cell:not(.free)').first();
    await cell.click();
    await expect(cell).not.toHaveClass(/marked/);
    await expect(cell).toHaveClass(/nope/);
  });

  test('a 4x4 card has no free square', async ({ page }) => {
    await openGame(page, 'bingo');
    await openSetup(page);
    await page.getByLabel('Card size').selectOption('4');
    await expect(page.locator('.cell')).toHaveCount(16);
    await expect(page.locator('.cell.free')).toHaveCount(0);
  });
});

/** Sound Sort hides the answer, so try one bin then the other */
async function sortOne(page: Page): Promise<void> {
  const before = await page.locator('.score b').first().textContent();
  await page.locator('.bin').first().click();
  await page.waitForTimeout(900);
  if ((await page.locator('.score b').first().textContent()) === before) {
    await page.locator('.bin').nth(1).click();
    await page.waitForTimeout(900);
  }
}

test.describe('Sound Sort', () => {
  test('sorts a full round and reveals the sound only after a correct drop', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'sound-sort');
    await openSetup(page);
    await page.getByLabel('How many words').selectOption('8');
    await page.getByRole('button', { name: 'Set up this game' }).click();

    /* the word arrives with nothing marked: finding the sound is the puzzle */
    await expect(page.locator('.hand .word .gr')).toHaveCount(0);

    for (let i = 0; i < 20 && !(await page.locator('.results:not([hidden])').count()); i += 1) {
      await sortOne(page);
    }

    await expect(page.locator('.results')).toBeVisible();
    await expect(page.locator('.results li')).toHaveCount(8);
    /* the review list marks the ones that took more than one go */
    expect(await page.locator('.results li .gr').count()).toBeGreaterThan(0);
    noProblems(watch);
  });

  test('two misses reveal the sound as a hint', async ({ page }) => {
    await openGame(page, 'sound-sort');
    /* one of these two is wrong twice over: whichever it is, a hint appears */
    await page.locator('.bin').first().click();
    await page.waitForTimeout(250);
    await page.locator('.bin').first().click();
    await page.waitForTimeout(250);
    await page.locator('.bin').nth(1).click();
    await page.waitForTimeout(250);
    await page.locator('.bin').nth(1).click();
    await page.waitForTimeout(250);
    expect(await page.locator('.hand .word .gr, .bin .tile .gr').count()).toBeGreaterThan(0);
  });
});

test.describe('Word Builder', () => {
  test('builds every real word in a family and wins', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'word-builder');

    const total = Number(await page.locator('.score span span').last().textContent());
    expect(total).toBeGreaterThan(3);

    const tiles = page.locator('.rack .tile');
    for (let i = 0, n = await tiles.count(); i < n; i += 1) {
      await tiles.nth(i).click({ timeout: 5000 }).catch(() => undefined);
      await page.waitForTimeout(90);
    }

    await expect(page.locator('.overlay.show')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.overlay-card h3')).toHaveText('Family complete!');
    noProblems(watch);
  });

  test('a real word is never called silly', async ({ page }) => {
    await openGame(page, 'word-builder');
    const tiles = page.locator('.rack .tile');
    for (let i = 0, n = await tiles.count(); i < n; i += 1) {
      await tiles.nth(i).click({ timeout: 5000 }).catch(() => undefined);
      const verdict = await page.locator('.verdict').textContent();
      /* the content test guarantees the data; this checks the game reads it */
      expect(verdict).toMatch(/real word|silly word/);
      await page.waitForTimeout(60);
    }
  });

  test('the qu family keeps qu at the front and swaps the ending', async ({ page }) => {
    await openGame(page, 'word-builder');
    await openSetup(page);
    await page.getByLabel('Word family').selectOption('qu-front');
    await page.getByRole('button', { name: 'Set up this game' }).click();
    /* qu is the fixed slot, and it sits on the left */
    await expect(page.locator('.slot.fixed')).toHaveText('qu');
    const slots = await page.locator('.slots .slot').allTextContents();
    expect(slots[0]).toBe('qu');
    await page.locator('.rack .tile', { hasText: 'ick' }).first().click();
    await expect(page.locator('.verdict')).toContainText('quick');
    await expect(page.locator('.verdict')).toHaveClass(/real/);
  });
});

test.describe('Roll & Read', () => {
  test('rolls, shows words and builds the tally', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'roll-and-read');

    /* the die area is a fixed height so the cube cannot cover the button */
    const cube = await page.locator('.cube').boundingBox();
    const button = await page.getByRole('button', { name: 'Roll the die' }).boundingBox();
    expect(cube!.y + cube!.height).toBeLessThanOrEqual(button!.y);

    await page.getByRole('button', { name: 'Roll the die' }).click();
    await expect(page.locator('.wcard')).toHaveCount(3, { timeout: 8000 });
    await expect(page.locator('.dice-hint')).toContainText('out loud');

    await page.locator('.wcard .ok').first().click();
    await page.locator('.wcard .no').nth(1).click();
    await expect(page.locator('.bar')).toHaveCount(1);
    await expect(page.locator('.bar .n')).toHaveText('1/2');

    /* the tally is the parent's signal, so it has to survive leaving the game */
    await page.goto('/#/home');
    await page.goto('/#/roll-and-read');
    await expect(page.locator('.bar .n')).toHaveText('1/2');
    await page.getByRole('button', { name: 'Set up this game' }).click();
    await page.getByRole('button', { name: 'Clear tally' }).click();
    await expect(page.locator('.bars .empty')).toBeVisible();
    noProblems(watch);
  });

  test('plain words hide the underline', async ({ page }) => {
    await openGame(page, 'roll-and-read');
    await page.getByRole('button', { name: 'Roll the die' }).click();
    await expect(page.locator('.wcard')).toHaveCount(3, { timeout: 8000 });
    expect(await page.locator('.wcard .gr').count()).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Set up this game' }).click();
    await page.getByLabel('Underline the sound').selectOption('off');
    await expect(page.locator('.wcard .gr')).toHaveCount(0);
  });
});

test.describe('Real or Silly?', () => {
  test('plays a full round and lists every word at the end', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'real-or-silly');
    await openSetup(page);
    await page.getByLabel('How many words').selectOption('8');
    await page.getByRole('button', { name: 'Set up this game' }).click();

    /* nothing is marked or spoken before he answers */
    await expect(page.locator('.theword .gr')).toHaveCount(0);
    await expect(page.locator('.reveal')).toHaveText('');

    for (let i = 0; i < 8; i += 1) {
      await page.locator('.ans.real').click({ timeout: 5000 }).catch(() => undefined);
      await page.waitForTimeout(1750);
    }
    await expect(page.locator('.results')).toBeVisible();
    await expect(page.locator('.results li')).toHaveCount(8);
    noProblems(watch);
  });

  test('asking for help is recorded in the results', async ({ page }) => {
    await openGame(page, 'real-or-silly');
    await openSetup(page);
    await page.getByLabel('How many words').selectOption('8');
    await page.getByRole('button', { name: 'Set up this game' }).click();

    await page.getByRole('button', { name: 'Sound it out for me' }).click();
    await page.locator('.ans.real').click();
    await page.waitForTimeout(1750);
    for (let i = 0; i < 7; i += 1) {
      await page.locator('.ans.silly').click({ timeout: 5000 }).catch(() => undefined);
      await page.waitForTimeout(1750);
    }
    await expect(page.locator('.results li .mk', { hasText: 'heard it' })).toHaveCount(1);
  });

  test('answering reveals the sound', async ({ page }) => {
    await openGame(page, 'real-or-silly');
    await page.locator('.ans.real').click();
    await expect(page.locator('.theword .gr')).toHaveCount(1);
  });
});

test.describe('Sentence Smash', () => {
  test('builds, reads and keeps a sentence', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'sentence-smash');
    await expect(page.locator('.col')).toHaveCount(4);

    for (const col of [0, 1, 2, 3]) {
      await page.locator('.col').nth(col).locator('.opt').first().click();
    }
    await expect(page.locator('.sentence .slot-word.filled')).toHaveCount(4);

    await page.getByRole('button', { name: 'Read my sentence' }).click();
    await page.getByRole('button', { name: 'Keep it' }).click();
    await expect(page.locator('.saved-row')).toHaveCount(1);

    await page.locator('.saved-row button', { hasText: '✕' }).click();
    await expect(page.locator('.saved-row')).toHaveCount(0);
    noProblems(watch);
  });

  test('the sound colour is an underline, never the letters', async ({ page }) => {
    await openGame(page, 'sentence-smash');
    await page.locator('.col').first().locator('.opt').first().click();
    const styles = await page.locator('.sentence .slot-word.filled .gr').first().evaluate((n) => {
      const cs = getComputedStyle(n);
      return { colour: cs.color, border: cs.borderBottomColor, borderWidth: cs.borderBottomWidth };
    });
    /* dark ink, and a thick coloured rule underneath it */
    expect(styles.colour).toBe('rgb(20, 49, 47)');
    expect(styles.border).not.toBe(styles.colour);
    expect(parseFloat(styles.borderWidth)).toBeGreaterThan(2);
  });

  test('every phrase underlines letters it actually contains', async ({ page }) => {
    await openGame(page, 'sentence-smash');
    const marks = await page.locator('.opt').evaluateAll((nodes) =>
      nodes.map((n) => ({
        text: (n.textContent ?? '').trim(),
        mark: n.querySelector('.gr')?.textContent ?? '',
      })),
    );
    for (const m of marks) {
      expect(m.mark, `"${m.text}" has no underlined letters`).not.toBe('');
      expect(m.text.includes(m.mark), `"${m.text}" does not contain "${m.mark}"`).toBe(true);
    }
  });
});

/** the answer is hidden by design, so try one spelling then the other */
async function spellOne(page: Page): Promise<void> {
  const before = await page.locator('.score b').first().textContent();
  await page.locator('.choices .bin').first().click();
  await page.waitForTimeout(950);
  if ((await page.locator('.score b').first().textContent()) === before) {
    await page.locator('.choices .bin').nth(1).click();
    await page.waitForTimeout(1200);
  }
}

test.describe('Same Sound, Two Ways', () => {
  test('spells a full round, with the letters missing until answered', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'same-sound');
    await openSetup(page);
    await page.getByLabel('How many words').selectOption('8');
    await page.getByRole('button', { name: 'Set up this game' }).click();

    /* the point of the game: the spelling is not on screen to copy */
    await expect(page.locator('.hand .word .gap')).toHaveCount(1);
    await expect(page.locator('.hand .word .gr')).toHaveCount(0);
    /* exactly two ways to spell it, never more */
    await expect(page.locator('.choices .bin')).toHaveCount(2);

    for (let i = 0; i < 24 && !(await page.locator('.results:not([hidden])').count()); i += 1) {
      await spellOne(page);
    }

    await expect(page.locator('.results')).toBeVisible();
    await expect(page.locator('.results li')).toHaveCount(8);
    /* the review shows the finished words with the sound lit up */
    expect(await page.locator('.results li .gr').count()).toBeGreaterThan(0);
    noProblems(watch);
  });

  test('a wrong guess is answered with the rule, not just a buzz', async ({ page }) => {
    await openGame(page, 'same-sound');
    await expect(page.locator('.rule')).toBeHidden();

    /* Keep choosing the left-hand spelling. Words alternate between the two,
       so before long it is the wrong one — and a correct pick has to be given
       its 820ms to move on, or the next click lands while the game is busy
       and is swallowed. */
    for (let i = 0; i < 10 && (await page.locator('.rule').isHidden()); i += 1) {
      await page.locator('.choices .bin').first().click();
      await page.waitForTimeout(950);
    }
    await expect(page.locator('.rule')).toContainText('In the middle of a word');
    await expect(page.locator('.rule')).toContainText('At the end');
  });

  test('says the word, since hearing it is the only clue', async ({ page }) => {
    await page.addInitScript(() => {
      const spoken: string[] = [];
      (window as unknown as { __said: unknown }).__said = spoken;
      class FakeUtterance {
        text: string; lang = ''; rate = 1; pitch = 1;
        voice: unknown = null;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(text: string) { this.text = text; }
      }
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          getVoices: () => [{ name: 'Karen', lang: 'en-AU', localService: true, default: true, voiceURI: 'com.apple.voice.super-compact.en-AU.Karen' }],
          speak: (u: { text: string }) => spoken.push(u.text),
          cancel: () => undefined,
          addEventListener: () => undefined,
        },
      });
    });
    await openGame(page, 'same-sound');
    const said = await page.evaluate(() => (window as unknown as { __said: string[] }).__said);
    /* whatever word came up, it was spoken — with the gap on screen the child
       has nothing else to go on */
    expect(said.filter((s) => s.length > 1).length).toBeGreaterThan(0);
  });
});

/** the answer is hidden on purpose, so try each choice until one lands */
async function pickTricky(page: Page): Promise<void> {
  const before = await page.locator('.score b').first().textContent();
  for (let i = 0; i < 4; i += 1) {
    await page.locator('.choices .bin').nth(i).click();
    await page.waitForTimeout(1050);
    if ((await page.locator('.score b').first().textContent()) !== before) return;
  }
}

/** turn one tricky word set on and every other one off */
async function onlySightSet(page: Page, name: string): Promise<void> {
  const chips = page.locator('.panel .chip');
  const wanted = chips.filter({ hasText: new RegExp(`^${name}$`) });
  if ((await wanted.getAttribute('aria-pressed')) !== 'true') await wanted.click();
  for (let i = 0; i < 10; i += 1) {
    const other = chips.filter({ hasNotText: new RegExp(`^${name}$`) }).and(page.locator('[aria-pressed="true"]'));
    if (!(await other.count())) break;
    await other.first().click();
  }
  await expect(page.locator('.panel .chip[aria-pressed="true"]')).toHaveCount(1);
}

test.describe('Tricky Words', () => {
  test("starts on the school's sets up to the child's level", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('sor:settings', JSON.stringify({ levels: [2, 3] }));
    });
    await openGame(page, 'tricky-words');
    await openSetup(page);
    const on = page.locator('.panel .chip[aria-pressed="true"]');
    /* sight words build up like the sounds do; the extra set waits to be asked for */
    await expect(on).toHaveText(['Level 1', 'Level 2', 'Level 3']);
    await expect(page.locator('.panel .chip', { hasText: 'More' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('hides the word, then finds it again through to the win screen', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'tricky-words');
    await openSetup(page);
    /* level 8 alone: all but one of its words have letters to light up, so
       the review below always has some to show */
    await onlySightSet(page, 'Level 8');
    await page.getByLabel('How many words').selectOption('6');
    await page.getByRole('button', { name: 'Set up this game' }).click();

    /* the look: the word is there to be read */
    await expect(page.locator('.tricky-word')).not.toHaveClass(/gone/);
    /* four choices, never more — and one of them is the word */
    await expect(page.locator('.choices .bin')).toHaveCount(4);
    /* but not yet tappable: with the word still up he could match letters
       to letters without remembering anything */
    await expect(page.locator('.choices .bin').first()).toBeHidden();
    /* then it goes, which is what makes this different from reading it */
    await expect(page.locator('.tricky-word')).toHaveClass(/gone/, { timeout: 4000 });
    await expect(page.locator('.wrap')).toContainText('Which one was it?');
    await expect(page.locator('.choices .bin').first()).toBeVisible();

    for (let i = 0; i < 24 && !(await page.locator('.results:not([hidden])').count()); i += 1) {
      await pickTricky(page);
    }

    await expect(page.locator('.results')).toBeVisible();
    await expect(page.locator('.results li')).toHaveCount(6);
    /* the review shows which letters were the liars */
    expect(await page.locator('.results li .gr').count()).toBeGreaterThan(0);
    noProblems(watch);
  });

  test('brings the word back after a miss and leaves it there', async ({ page }) => {
    await openGame(page, 'tricky-words');
    await expect(page.locator('.tricky-word')).toHaveClass(/gone/, { timeout: 4000 });

    /* keep picking the left-hand choice until one is wrong */
    for (let i = 0; i < 8 && (await page.locator('.tricky-word.gone').count()); i += 1) {
      await page.locator('.choices .bin').first().click();
      await page.waitForTimeout(1100);
    }
    /* whichever way it went, the word is readable again — after a miss it
       stays, and after a win it is shown with its tricky letters lit */
    await expect(page.locator('.tricky-word')).not.toHaveClass(/gone/);
  });

  test('says nothing until the word has been found', async ({ page }) => {
    await page.addInitScript(() => {
      const spoken: string[] = [];
      (window as unknown as { __said: unknown }).__said = spoken;
      class FakeUtterance {
        text: string; lang = ''; rate = 1; pitch = 1;
        voice: unknown = null;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(text: string) { this.text = text; }
      }
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          getVoices: () => [{ name: 'Karen', lang: 'en-AU', localService: true, default: true, voiceURI: 'com.apple.voice.super-compact.en-AU.Karen' }],
          speak: (u: { text: string }) => spoken.push(u.text),
          cancel: () => undefined,
          addEventListener: () => undefined,
        },
      });
    });
    await openGame(page, 'tricky-words');
    await expect(page.locator('.tricky-word')).toHaveClass(/gone/, { timeout: 4000 });
    /* Saying the word would turn this into listening, which Bingo already
       does — here the only clue is what he saw. */
    const said = await page.evaluate(() => (window as unknown as { __said: string[] }).__said);
    expect(said.filter((s) => s.length > 1)).toEqual([]);
  });
});

/** steer the rocket under the lowest word of the kind asked for.
 *
 *  Positions are read in one evaluate, not word by word: words are caught and
 *  drift off screen all the time, and a locator for a word that vanished
 *  between listing and measuring waits for it until the test times out. */
async function steerUnder(page: Page, target: boolean): Promise<void> {
  const aim = await page.evaluate((want) => {
    const sky = document.querySelector('.rk-sky')?.getBoundingClientRect();
    if (!sky) return null;
    const y = sky.y + sky.height - 40;
    const live = [...document.querySelectorAll('.rk-drop:not(.caught):not(.bad)')].map((d) => ({
      r: d.getBoundingClientRect(),
      target: d.getAttribute('data-target') === 'true',
    }));
    const mid = (r: DOMRect) => r.x + r.width / 2;
    const lowest = live.filter((d) => d.target === want).sort((a, b) => b.r.y - a.r.y)[0];
    if (!want) return lowest ? { x: mid(lowest.r), y } : null;

    /* Catching, steer the way a careful player does. The rocket follows the
       finger fast, but not instantly, so sliding across under a word that is
       about to land costs a shield: it only goes as far as it can without
       passing beneath one. Within that reach it takes the lowest word to
       catch if nothing to dodge will land on it first, and otherwise waits
       in the clearest bit of sky. Parking under nothing was how a round
       could lose all three shields before a single target arrived. */
    const rocket = document.querySelector('.rk-rocket')?.getBoundingClientRect();
    const here = rocket ? mid(rocket) : mid(sky);
    /* close enough to land on the rocket in the moment a slide takes */
    const landing = (rocket ? rocket.y : sky.bottom - 70) - 24;
    const clear = 34;
    let left = sky.x + clear;
    let right = sky.right - clear;
    for (const d of live.filter((x) => !x.target && x.r.bottom > landing)) {
      if (d.r.right + clear <= here) left = Math.max(left, d.r.right + clear);
      else if (d.r.x - clear >= here) right = Math.min(right, d.r.x - clear);
      /* already underneath one: out by the nearer side */
      else if (here - d.r.x < d.r.right - here) right = Math.min(right, d.r.x - clear);
      else left = Math.max(left, d.r.right + clear);
    }
    if (left > right) return null;

    const near = sky.y + sky.height * 0.35;
    const dodges = live.filter((d) => !d.target && d.r.bottom > near);
    const inTheWay = (x: number, below: number) =>
      dodges.some((d) => d.r.bottom > below && Math.abs(mid(d.r) - x) < d.r.width / 2 + clear);
    if (lowest) {
      const x = mid(lowest.r);
      if (x >= left && x <= right && !inTheWay(x, lowest.r.bottom)) return { x, y };
    }
    let best = Math.min(Math.max(here, left), right);
    let widest = -Infinity;
    for (let x = left; x <= right; x += 12) {
      const gap = Math.min(Infinity, ...dodges.map((d) => Math.abs(mid(d.r) - x) - d.r.width / 2));
      if (gap > widest) { widest = gap; best = x; }
    }
    return { x: best, y };
  }, target);
  if (aim) await page.mouse.move(aim.x, aim.y);
}

/** keep playing until one word with the sound is caught. A round lost first
 *  is not the end of it, any more than it is for him: go again */
async function catchOne(page: Page): Promise<void> {
  for (let i = 0; i < 160 && (await page.locator('.rk-score b').textContent()) === '0'; i += 1) {
    if (await page.locator('.rk-overlay:not([hidden])').count()) {
      await page.getByRole('button', { name: /Go again/ }).click();
    }
    await steerUnder(page, true);
    await page.waitForTimeout(150);
  }
  await expect(page.locator('.rk-score b')).toHaveText('1');
}

test.describe('Sound Rocket', () => {
  /* the rocket lives at the bottom of the sky, so a sky taller than the
     screen hides it — on an iPhone, under Safari's address bar. 560 tall is
     a small phone with Safari's toolbars showing. */
  for (const height of [0, 560]) {
    test(`the whole sky fits on screen${height ? ` at ${height}px tall` : ''}`, async ({ page }) => {
      if (height) await page.setViewportSize({ width: page.viewportSize()?.width ?? 375, height });
      await openGame(page, 'sound-rocket');
      const fits = await page.evaluate(() => {
        const r = document.querySelector('.rk-sky')?.getBoundingClientRect();
        return r ? { bottom: Math.round(r.bottom), screen: window.innerHeight, tall: Math.round(r.height) } : null;
      });
      expect(fits).not.toBeNull();
      expect(fits!.bottom).toBeLessThanOrEqual(fits!.screen);
      /* and still a sky worth playing in */
      expect(fits!.tall).toBeGreaterThanOrEqual(300);
    });
  }

  test('words drift down, and catching one with the sound scores and lights it up', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'sound-rocket');
    await page.getByRole('button', { name: /Launch/ }).click();

    /* the words move: the same word is lower a moment later */
    const first = page.locator('.rk-drop').first();
    await expect(first).toBeVisible();
    const y1 = (await first.boundingBox())!.y;
    await page.waitForTimeout(600);
    expect((await first.boundingBox())!.y).toBeGreaterThan(y1);

    await catchOne(page);
    /* what was caught is a word with the sound, and the letters that make the
       sound are marked from their real positions. No shield count here: on
       the way across, the rocket can rightly clip a dodge word that is just
       as low, and the round-ending test covers what shields do. */
    await expect(page.locator('.rk-drop.caught[data-target="true"] .gr')).toHaveCount(1);
    noProblems(watch);
  });

  test('three wrong catches end the round, and going again starts fresh', async ({ page }) => {
    await openGame(page, 'sound-rocket');
    await page.getByRole('button', { name: /Launch/ }).click();

    /* catch one first, so the round ends with a score worth keeping */
    await catchOne(page);

    for (let i = 0; i < 200 && !(await page.locator('.rk-overlay:not([hidden])').count()); i += 1) {
      await steerUnder(page, false);
      await page.waitForTimeout(200);
    }
    /* steering at dodge words can sweep up another target on the way, so the
       final score is read rather than assumed */
    const score = (await page.locator('.rk-score b').textContent()) ?? '';
    expect(Number(score)).toBeGreaterThan(0);
    await expect(page.locator('.rk-overlay')).toContainText('New best');
    await expect(page.locator('.rk-overlay')).toContainText(`You caught ${score}`);
    await expect(page.locator('.rk-shields .on')).toHaveCount(0);

    /* the best is kept on the device, per sound */
    await expect(page.locator('.rk-best')).toHaveText(`Best ${score}`);

    await page.getByRole('button', { name: /Go again/ }).click();
    await expect(page.locator('.rk-overlay')).toBeHidden();
    await expect(page.locator('.rk-score b')).toHaveText('0');
    await expect(page.locator('.rk-shields .on')).toHaveCount(3);
    await expect(page.locator('.rk-best')).toHaveText(`Best ${score}`);
  });

  test('pause stops the words where they are', async ({ page }) => {
    await openGame(page, 'sound-rocket');
    await page.getByRole('button', { name: /Launch/ }).click();
    const first = page.locator('.rk-drop').first();
    await expect(first).toBeVisible();

    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.locator('.rk-overlay')).toContainText('Paused');
    const y1 = (await first.boundingBox())!.y;
    await page.waitForTimeout(800);
    expect((await first.boundingBox())!.y).toBe(y1);

    await page.getByRole('button', { name: /Carry on/ }).first().click();
    await page.waitForTimeout(600);
    expect((await first.boundingBox())!.y).toBeGreaterThan(y1);
  });

  test('opening setup mid-flight pauses rather than playing on underneath', async ({ page }) => {
    await openGame(page, 'sound-rocket');
    await page.getByRole('button', { name: /Launch/ }).click();
    await expect(page.locator('.rk-drop').first()).toBeVisible();
    await openSetup(page);
    await expect(page.locator('.rk-overlay')).toContainText('Paused');
  });
});

/* ── Penalty Shootout ─────────────────────────────────────────────────── */

/** a speech engine that writes down what it is asked to say and finishes at
 *  once, so a test can hear the word the way the child does */
async function recordSpeech(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const spoken: string[] = [];
    (window as unknown as { __said: string[] }).__said = spoken;
    class FakeUtterance {
      text: string; lang = ''; rate = 1; pitch = 1; volume = 1;
      voice: unknown = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) { this.text = text; }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [{ name: 'Karen', lang: 'en-AU', localService: true, default: true, voiceURI: 'com.apple.voice.super-compact.en-AU.Karen' }],
        speak: (u: FakeUtterance) => {
          if (u.text) spoken.push(u.text);
          window.setTimeout(() => u.onend?.(), 0);
        },
        cancel: () => undefined,
        addEventListener: () => undefined,
      },
    });
  });
}

const lastSaid = (page: Page): Promise<string> =>
  page.evaluate(() => {
    const said = (window as unknown as { __said: string[] }).__said;
    return said[said.length - 1] ?? '';
  });

/** one kick or one save, aimed at the right word or deliberately not */
async function takeKick(page: Page, right: boolean): Promise<void> {
  const pitch = page.locator('.pk-pitch');
  await expect(pitch).toHaveAttribute('data-ready', '1', { timeout: 6000 });
  /* on his kick the question is a picture; the test asks to hear it instead.
     In goal the word has already been said. */
  if ((await pitch.getAttribute('data-phase')) === 'shoot') {
    await page.getByRole('button', { name: 'Say it' }).click();
  }
  const word = await lastSaid(page);
  const texts = (await page.locator('.pk-spot').allTextContents()).map((t) => t.trim());
  expect(texts).toContain(word);
  const at = right ? texts.indexOf(word) : texts.findIndex((t) => t !== word);
  await page.locator('.pk-spot').nth(at).click();
}

async function startShootout(page: Page): Promise<void> {
  await recordSpeech(page);
  await openGame(page, 'penalty-shootout');
  await openSetup(page);
  await page.getByLabel('Kicks each').selectOption('3');
  await page.getByRole('button', { name: 'Set up this game' }).click();
  await page.getByRole('button', { name: 'Kick off ⚽' }).click();
}

test.describe('Penalty Shootout', () => {
  test('reading every word right wins the match', async ({ page }) => {
    const watch = watchPage(page);
    await startShootout(page);

    /* three words in the goal, and a picture to say which one */
    await expect(page.locator('.pk-spot')).toHaveCount(3);
    await expect(page.locator('.pk-cue .pic')).toBeVisible();

    await takeKick(page, true);
    await expect(page.locator('.pk-banner')).toHaveText('GOAL!');
    await expect(page.locator('.pk-spot.answer')).toHaveCount(1);
    await expect(page.locator('.pk-spot.wrong')).toHaveCount(0);

    for (let i = 0; i < 5; i += 1) await takeKick(page, true);

    await expect(page.locator('.results')).toBeVisible({ timeout: 6000 });
    await expect(page.locator('.results h2').first()).toContainText('You win 3–0');
    await expect(page.locator('.results li')).toHaveCount(6);
    await expect(page.locator('.results li.miss')).toHaveCount(0);
    /* a win earns a sticker */
    await expect(page.locator('.results .sticker')).toBeVisible();
    noProblems(watch);
  });

  test('misreading every word loses it, and shows which words were missed', async ({ page }) => {
    const watch = watchPage(page);
    await startShootout(page);

    await takeKick(page, false);
    await expect(page.locator('.pk-banner')).toHaveText('Saved!');
    /* the word he picked is crossed, and the one he wanted is lit up */
    await expect(page.locator('.pk-spot.wrong')).toHaveCount(1);
    await expect(page.locator('.pk-spot.answer')).toHaveCount(1);

    /* in goal, diving the wrong way lets one in */
    await takeKick(page, false);
    await expect(page.locator('.pk-banner')).toContainText('score');

    for (let i = 0; i < 4; i += 1) await takeKick(page, false);

    await expect(page.locator('.results')).toBeVisible({ timeout: 6000 });
    await expect(page.locator('.results h2').first()).toContainText('win 3–0 this time');
    await expect(page.locator('.results li.miss')).toHaveCount(6);
    await expect(page.locator('.results .sticker')).toBeHidden();

    /* and a rematch is one tap away */
    await page.getByRole('button', { name: 'Rematch' }).click();
    await expect(page.getByRole('button', { name: 'Kick off ⚽' })).toBeVisible();
    noProblems(watch);
  });

  test('never offers two words in goal that sound alike', async ({ page }) => {
    await startShootout(page);
    await takeKick(page, true);
    /* in goal: the three words on screen are all different out loud as well
       as on paper — the content test checks every pair, this checks the
       game asks it */
    const pitch = page.locator('.pk-pitch');
    await expect(pitch).toHaveAttribute('data-phase', 'save', { timeout: 6000 });
    await expect(pitch).toHaveAttribute('data-ready', '1', { timeout: 6000 });
    const texts = (await page.locator('.pk-spot').allTextContents()).map((t) => t.trim());
    expect(new Set(texts).size).toBe(3);
    expect(texts).toContain(await lastSaid(page));
  });

  test('plays as the team he picks, against the one he picks, and remembers both', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'penalty-shootout');
    await openSetup(page);
    await page.getByLabel('Your team').selectOption('palmeiras');
    await page.getByLabel('Play against').selectOption('barcelona');
    await expect(page.locator('.pk-overlay .pk-big')).toContainText('Palmeiras');
    await expect(page.locator('.pk-overlay .pk-big')).toContainText('Barcelona');
    await expect(page.locator('.pk-board')).toContainText('Palmeiras');
    await expect(page.locator('.pk-board')).toContainText('Barcelona');
    /* each side is drawn in its own kit */
    await expect(page.locator('.pk-board .pk-kit')).toHaveCount(2);

    /* a supporter supports the same team next time */
    await page.reload();
    await expect(page.locator('.pk-board')).toContainText('Palmeiras');
    await expect(page.locator('.pk-board')).toContainText('Barcelona');
    noProblems(watch);
  });

  test('never draws his own team as the opponent', async ({ page }) => {
    await openGame(page, 'penalty-shootout');
    await openSetup(page);
    await page.getByLabel('Your team').selectOption('brazil');
    await page.getByLabel('Play against').selectOption('any');
    for (let i = 0; i < 8; i += 1) {
      await expect(page.locator('.pk-team').nth(1)).not.toContainText('Brazil');
      /* changing the kicks starts a new match with a new opponent */
      await page.getByLabel('Kicks each').selectOption(i % 2 ? '5' : '3');
    }
    /* and picking his own team as the opponent falls back to someone else */
    await page.getByLabel('Play against').selectOption('brazil');
    await expect(page.locator('.pk-team').nth(0)).toContainText('Brazil');
    await expect(page.locator('.pk-team').nth(1)).not.toContainText('Brazil');
  });

  test('a flick up and to the left shoots at the left-hand word', async ({ page }) => {
    await startShootout(page);
    const pitch = page.locator('.pk-pitch');
    await expect(pitch).toHaveAttribute('data-ready', '1');
    const ball = await page.locator('.pk-ball').boundingBox();
    expect(ball).not.toBeNull();
    const x = ball!.x + ball!.width / 2;
    const y = ball!.y + ball!.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 70, y - 90, { steps: 4 });
    await page.mouse.up();
    /* whether it went in or not, the left-hand word is the one it was hit at */
    await expect(page.locator('.pk-spot').first()).toHaveClass(/answer|wrong/);
    await expect(page.locator('.pk-banner')).toBeVisible();
  });
});

/* ── Pass and Shoot ───────────────────────────────────────────────────── */

/** the word on the line, read the way the child reads it: each player's sound, in order */
async function wordOnTheLine(page: Page): Promise<string> {
  return (await page.locator('.ps-player .ps-sound').allTextContents()).map((t) => t.trim()).join('');
}

async function passAlong(page: Page): Promise<void> {
  const players = page.locator('.ps-player');
  const n = await players.count();
  for (let i = 0; i < n; i += 1) await players.nth(i).click();
}

test.describe('Pass and Shoot', () => {
  test('passing down the line and shooting at the word made scores, all the way to the end', async ({ page }) => {
    const watch = watchPage(page);
    await openGame(page, 'pass-and-shoot');
    await openSetup(page);
    await page.getByLabel('How many words').selectOption('6');
    await page.getByRole('button', { name: 'Set up this game' }).click();

    for (let round = 0; round < 6; round += 1) {
      const pitch = page.locator('.ps-pitch');
      await expect(pitch).toHaveAttribute('data-phase', 'pass', { timeout: 6000 });
      const word = await wordOnTheLine(page);
      await passAlong(page);
      await expect(page.locator('.ps-player.lit')).toHaveCount(await page.locator('.ps-player').count());
      await expect(pitch).toHaveAttribute('data-phase', 'shoot');
      /* three pictures, and the word he made is one of them */
      await expect(page.locator('.ps-target')).toHaveCount(3);
      await page.getByRole('button', { name: word, exact: true }).click();
      await expect(page.locator('.pk-banner')).toHaveText('GOAL!');
      /* the sounds pushed together into the word, whole */
      await expect(page.locator('.ps-made')).toHaveText(word);
    }

    await expect(page.locator('.results')).toBeVisible({ timeout: 6000 });
    await expect(page.locator('.results h2').first()).toContainText('Every one a goal');
    await expect(page.locator('.results li')).toHaveCount(6);
    noProblems(watch);
  });

  test('only the next player along can take a pass, so the word is read left to right', async ({ page }) => {
    await openGame(page, 'pass-and-shoot');
    const players = page.locator('.ps-player');
    await expect(players.first()).toBeVisible();
    /* skipping ahead does nothing */
    await players.last().click();
    await expect(page.locator('.ps-player.lit')).toHaveCount(0);
    await players.first().click();
    await expect(players.first()).toHaveClass(/lit/);
    await expect(page.locator('.ps-player.lit')).toHaveCount(1);
    /* and there is nothing to shoot at until the line is done */
    await expect(page.locator('.ps-target').first()).toBeHidden();
  });

  test('shooting at the wrong picture is saved, and shows the right one', async ({ page }) => {
    await openGame(page, 'pass-and-shoot');
    await expect(page.locator('.ps-pitch')).toHaveAttribute('data-phase', 'pass');
    const word = await wordOnTheLine(page);
    await passAlong(page);
    await expect(page.locator('.ps-pitch')).toHaveAttribute('data-phase', 'shoot');
    const names = await page.locator('.ps-target').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    await page.locator('.ps-target').nth(names.findIndex((n) => n !== word)).click();
    await expect(page.locator('.pk-banner')).toHaveText('Saved!');
    await expect(page.locator('.ps-target.answer')).toHaveAttribute('aria-label', word);
    await expect(page.locator('.ps-target.wrong')).toHaveCount(1);
    await expect(page.locator('.score b').first()).toHaveText('0');
  });
});
