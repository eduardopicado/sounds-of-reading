/* The sounds on their own, in the games: where a game names a sound it plays
 * the sound's recording first ("sh"), then a word with it ("ship"), and
 * never has the device read the spelling, which comes out as letter names.
 * A sound with no recording yet is skipped, and only the word is said. */

import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PRACTICE_SOUNDS } from '../../src/content/index';
import { noProblems, openGame, plays, recordPlays, watchPage } from './helpers';

const RECORDED = new Set<string>(JSON.parse(readFileSync('public/audio/sounds/sounds.json', 'utf8')));

/** the files played, leaving out the silent play a tap gives the player to unlock it */
const played = async (page: Page): Promise<string[]> => (await plays(page)).filter(Boolean);

/** what should play for a sound: its recording if there is one, then the word's */
async function expectSoundThenWord(page: Page, phoneme: string | undefined): Promise<void> {
  if (phoneme && RECORDED.has(phoneme)) {
    await expect.poll(async () => (await played(page)).length).toBeGreaterThanOrEqual(2);
    const [first, second] = await played(page);
    expect(first).toMatch(new RegExp(`/audio/sounds/${phoneme}\\.mp3$`));
    expect(second).not.toContain('/audio/sounds/');
  } else {
    await expect.poll(async () => (await played(page)).length).toBeGreaterThanOrEqual(1);
    expect((await played(page)).some((src) => src.includes('/audio/sounds/'))).toBe(false);
  }
}

test.describe('the sounds on their own', () => {
  test("today's sound on home says the sound, then its word", async ({ page }) => {
    const watch = watchPage(page);
    await recordPlays(page);
    await page.goto('./');
    const btn = page.getByRole('button', { name: /Today's sound/ });
    const label = ((await btn.textContent()) ?? '').replace("Today's sound: ", '').split(' · ')[0];
    const star = PRACTICE_SOUNDS.find((s) => s.label === label);
    expect(star, label).toBeTruthy();
    await btn.click();
    await expectSoundThenWord(page, star!.phoneme);
    noProblems(watch);
  });

  test('Roll & Read says the sound it rolled, not the letters', async ({ page }) => {
    const watch = watchPage(page);
    await recordPlays(page);
    await openGame(page, 'roll-and-read');
    await page.getByRole('button', { name: 'Roll the die' }).click();
    await expect(page.locator('.dice-hint')).toContainText('out loud', { timeout: 8000 });
    const hint = (await page.locator('.dice-hint').textContent()) ?? '';
    const label = hint.replace('Read these ', '').replace(' words out loud', '');
    /* the two th sounds merged under one chip have no one sound to say */
    const face = label === 'th' ? undefined : PRACTICE_SOUNDS.find((s) => s.label === label);
    await expectSoundThenWord(page, face?.phoneme);
    noProblems(watch);
  });
});
