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
- Kind feedback only: no losing states, every game completable.
- Test at iPad Safari sizes (820×1180 both ways) and 375px wide. Zero console
  errors.
- Run the content test before committing any content change.

## Commands

```
npm run dev              # local dev server
npm run build            # typecheck, then build to dist/
npm run validate:content # the content test on its own
npm test                 # content test, then the Playwright suite
```

## Layout

```
src/content/words.ts   the content file — sounds, words, families, phrases
src/content/index.ts   loads it into typed data with explicit positions
src/content/spans.ts   works out which letters carry a sound; refuses to guess
src/lib/               speech, sound effects, storage, settings, colour, router
src/ui/components.ts   header, setup panel, chips, win overlay
src/games/             one file per game, plus home.ts
tools/                 content maintenance scripts (not shipped)
tests/content.spec.ts  the content test
tests/e2e/             Playwright
```

## Adding words

Edit `src/content/words.ts`, then `npm run validate:content`. The test checks
every real word against an English dictionary, every silly word against it the
other way round, every Word Builder build both ways, the blocklist, the
grapheme positions, and the colour contrast. If it fails it names the word.

`tools/regen-silly.ts` rebuilds the silly word lists from scratch when a sound
is added; it only ever proposes non-words that are pronounceable and contain
the target grapheme.
