# CLAUDE.md

Phonics, writing, maths and jiu-jitsu games web app for a 6-year-old, played
on an iPad from the home screen and shared with his school friends. The original brief is `docs/HANDOVER.md`;
the prototypes it came from are in `docs/original-games/`.

## Rules

- No accounts, analytics, ads, or third-party network requests. Fonts are
  self-hosted. Nothing leaves the device. The built page carries a
  Content-Security-Policy (`vite.config.ts`) that makes the browser refuse
  any other origin; a new kind of resource has to be allowed there.
- Static site, offline-capable PWA. State in `localStorage` only, through
  `src/lib/storage.ts`, which guards every call and returns the fallback for
  a saved value of the wrong kind.
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
  microphone — happens after he has left the game. Leaving also cancels
  speech (whose `onEnd` then never runs) and stops sound effects still
  playing; the router does both.
- A round never shows the same word twice (`uniqueWords`), and a word offered
  between several sounds must fit only one of them (`fitsAnother`).

## Commands

```
npm run dev              # local dev server
npm run build            # typecheck, then build to dist/
npm run validate:content # the content test on its own
npm run test:unit        # unit tests for the shared code (speech, audio, sfx, lifetime, coach, settings)
npm test                 # content and unit tests, then the Playwright suite
```

CI runs all of these on every pull request and push, the browser tests as
one job per device, side by side. GitHub Pages deploys
only after CI has passed on a push to `main` (`.github/workflows/deploy.yml`).

The recordings are made by hand, never in CI, with the ElevenLabs key in the
environment (`public/audio/README.md`):

```
npm run make:audio       # the words
npm run make:sfx         # the sound effects
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
src/content/spelling.ts the tiles for spelling a word, wrong ones included (Build the Word)
src/content/contrasts.ts two spellings of one sound and the rule between them
                       (Same Sound, Two Ways)
src/content/big-words.ts two-syllable words from words.ts, each level worked out
                       from the spellings in its parts
src/content/coach-says.ts Coach Says: the things, places and instructions from
                       words.ts, made into questions with exactly one answer
src/content/foosball.ts Foosball Words: words cut into sounds (graphemes.ts), one
                       rod each, with the swaps that make other real words
src/content/word-search.ts Word Search: the themed lists from words.ts, the grid
                       steps, and the grids, checked so no blocked word is
                       spelt by chance and every hidden word appears once
src/content/maths.ts   the maths games' questions and levels (NSW K–Year 2; the
                       Year 2 steps sit at the top of each game's ladder; Times
                       Table Sprint goes on to 12 × 12, Years 3–4), and
                       timeWords(), the one way the app says a time
src/content/chess.ts   chess: how each piece moves, the fewest moves to a square,
                       and the first chess games' questions
src/content/world.ts   World Map: the continents and oceans, a fact for each,
                       and the direction and "between" questions;
                       world-shapes.ts is the map itself (made by
                       tools/make-world.ts from Natural Earth, never edited),
                       projection.ts puts a longitude and latitude on it, and
                       seas.ts says which ocean a point of water is in
src/content/flags.ts   Flags: the countries, their flags, what is on each one,
                       the look-alikes, and the questions
src/content/capitals.ts Capital Cities: Australia's states and their capitals,
                       and the world's; australia-shapes.ts is the map of the
                       states (tools/make-australia.ts), australia-projection.ts
                       puts a city on it
src/content/botao.ts   Futebol de Botão: the table, the physics of a flick (only
                       + − × ÷ and square roots, so a flick does the same thing
                       everywhere), the three-touch rule, and set pieces that
                       come with a way to score, checked to work a little off
src/content/bjj.ts     jiu-jitsu: the moves, their IBJJF points, and what the BJJ
                       games ask and say (Weigh-In's things and weight classes
                       too), every word in English and Portuguese
src/content/commentary.ts what the football commentator shouts, both languages
src/lib/               speech.ts (voices, and saying things), sfx.ts (sound
                       effects, made from tones or recorded), audio.ts and
                       clip-id.ts (recorded words; none ship yet, see
                       public/audio/README.md), storage.ts,
                       settings.ts, coach.ts (the record of how each sound is
                       going), stickers.ts, crests.ts (team crests a grown-up adds,
                       kept on the device), colour.ts, highlight.ts (a word with
                       its sound marked), router.ts, life.ts (a game's timers),
                       strokes.ts (judging a traced stroke), recorder.ts (the
                       microphone, for Be the Commentator), dom.ts, random.ts
src/ui/components.ts   header, setup panel, chips, win overlay
src/ui/writing.ts      letters on writing lines, for the screen and the printed sheet
src/games/catalog.ts   every game, once: its address, tile, section, ladder and
                       where its code is. A new game is one entry here; the
                       routes, the home tiles, the progress card and the
                       tests are made from it. Each game's code is fetched
                       when it is first opened
src/games/             one file per game, plus home.ts (tiles by section, the
                       coach's picks) and grown-ups.ts (the settings, opened
                       by holding a button on home for three seconds)
                       maths-kit.ts: the frame every maths game sits in (round,
                       levels, results, the Start screen); a maths game only
                       asks one question. A new maths game that needs a team
                       picture uses a country with its flag; club kits are
                       fine where it is a shirt
                       chess-kit.ts draws the board and the pieces the chess
                       games share (src/content/chess.ts has the rules);
                       bjj-art.ts draws the moves and the referee's signals;
                       bjj-kit.ts is the 🇦🇺/🇧🇷 language switch, speech and
                       belt the BJJ games share
                       world-kit.ts is the world map the geography games
                       share, with its taps (a little off a coast counts)
                       teams.ts: the football teams, their flags and kits;
                       narration.ts: the commentator ("Goooool do Brasil!")
                       voices.ts: #/voices, the voice diagnostics, linked
                       from nowhere
tools/                 content maintenance scripts (not shipped); make-audio.ts and
                       make-sfx.ts make the recordings in public/audio/;
                       make-world.ts and make-australia.ts the maps, sharing
                       shapes.ts
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
