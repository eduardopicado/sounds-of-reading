# CLAUDE.md

Phonics games web app for a 6-year-old, played on an iPad from the home screen
and shared with his school friends. The original brief is `docs/HANDOVER.md`;
the prototypes it came from are in `docs/original-games/`.

## Rules

- No accounts, analytics, ads, or third-party network requests. Fonts are
  self-hosted. Nothing leaves the device.
- Static site, offline-capable PWA. State in `localStorage` only, always
  wrapped in try/catch.
- One shared content file: `src/content/words.ts`. Never duplicate word lists
  per game.
- Grapheme highlights use the explicit positions in the content file, never
  `indexOf`. A spelling that appears twice must be bracketed — `ba[th]` — and
  an unbracketed ambiguous word fails the content test rather than guessing.
- Sound colour is an underline and a wash behind dark text, never the text
  colour itself. WCAG AA, checked by the content test.
- Keep single-storey a/g letterforms (Andika) for anything the child reads.
- Speech: `en-AU` voice, falling back to `en-GB`; every speech call wrapped in
  try/catch; unlocked on the first tap for iOS.
- Test at iPad Safari sizes (820×1180 both ways) and 375px wide. Zero console
  errors.
- Run the content test before committing any content change.
- A game schedules its timers through `lifetime()` (`src/lib/life.ts`) and
  ends it on unmount, so nothing it planned — a word, a fanfare, a
  microphone — happens after he has left the game.
- A round never shows the same word twice (`uniqueWords`), and a word offered
  between several sounds must fit only one of them (`fitsAnother`).

## Commands

```
npm run dev              # local dev server
npm run build            # typecheck, then build to dist/
npm run validate:content # the content test on its own
npm run test:unit        # unit tests for src/lib (audio, lifetime, coach, settings)
npm test                 # content and unit tests, then the Playwright suite
```

## Layout

```
src/content/words.ts   the content file — sounds, words, families, phrases
src/content/index.ts   loads it into typed data with explicit positions
src/content/spans.ts   works out which letters carry a sound; refuses to guess
src/content/graphemes.ts  cuts a one-syllable word into its sounds (Pass and Shoot)
src/content/near-words.ts the nearest real words, for wrong answers that need reading
src/content/handwriting.ts how each letter is written: strokes, families, heights
src/content/sort-sets.ts the sound sets Sound Sort offers
src/lib/               speech, sound effects, storage, settings, colour, router,
                       strokes.ts (judging a traced stroke), life.ts (a game's timers)
src/ui/components.ts   header, setup panel, chips, win overlay
src/ui/writing.ts      letters on writing lines, for the screen and the printed sheet
src/games/             one file per game, plus home.ts
tools/                 content maintenance scripts (not shipped)
tests/content.spec.ts  the content test
tests/unit/            unit tests for the shared code, in Node with small fakes
tests/e2e/             Playwright (review.spec.ts: regressions from the 2026-09 review)
```

## Adding words

Edit `src/content/words.ts`, then `npm run validate:content`. The test checks
every real word against an English dictionary, every silly word against it the
other way round, every Word Builder build both ways, the blocklist, the
grapheme positions, and the colour contrast. It also checks every pair of real
words that sound the same with an Australian accent is listed in
`SOUNDS_ALIKE` (Penalty Shootout says a word and must never offer its twin).
If it fails it names the word.

`tools/regen-silly.ts` rebuilds the silly word lists from scratch when a sound
is added; it only ever proposes non-words that are pronounceable and contain
the target grapheme.
