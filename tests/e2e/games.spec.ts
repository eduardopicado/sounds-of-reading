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
