# Phonics Games - Handover for a Web App

Seven small phonics games for a 6-year-old, built as standalone HTML prototypes. They work, the child is the real user, and the next step is one proper web app. This document is the brief.

**Read in this order:** this file, then `reference/school-sound-sheet.jpeg`, then open each file in `original-games/` in a browser and play it for a minute.

---

## 1. Who it's for and where it runs

- **Player:** a 6-year-old learning to read at an Australian primary school. Plays alone or with a parent next to him. Can't read instructions, so every screen must be usable from pictures, colour, sound and big buttons.
- **Device:** iPad, Safari, launched from a **home screen icon** (Add to Home Screen). Must feel like an app: full screen, no browser bar, no scroll-jank, big tap targets (minimum 48px, ideally larger).
- **Also:** the family wants to **share it with his school friends**. So it needs a public URL that works for anyone, on any tablet or phone, with no login.
- **Parent:** sets things up (which sounds this week, difficulty) and glances at results. Not a strong engineer, so content changes must be easy.

## 2. Hard requirements

1. **No accounts, no tracking, no analytics, no ads, no third-party requests.** It's a children's app shared with other people's children. Self-host the fonts (the prototypes load Google Fonts; don't). Nothing leaves the device.
2. **Works offline** once opened (PWA with a service worker and web manifest, proper icons, `display: standalone`). The kid will want it in the car.
3. **Static site.** No backend. Deployable to GitHub Pages, Cloudflare Pages or Netlify for free.
4. **Settings and progress live in `localStorage`** only, and the app must work fine if storage is empty or blocked.
5. **Contrast:** WCAG AA minimum. See section 6, this already bit us once.
6. **iPad Safari is the primary test target.** Test at 820x1180 and 1180x820, plus a 375px-wide phone.

## 3. The games (all seven stay)

Each one exists in `original-games/` and is the behavioural reference. Match the behaviour; you don't need to match the code.

| Game | What the child does | Settings |
|---|---|---|
| **Memory Match** (`sound-match.html`) | Flips cards to find pairs. Mode A: word + its picture. Mode B: two different words with the same sound (*rain / day*). Matched sounds collect in a rail at the bottom. | sounds on/off, mode, 4/6/8 pairs, speech on/off |
| **Bingo** (`sound-bingo.html`) | App calls a word (spoken + picture, spelling hidden). Child finds the written word on his card. Wrong taps shake. Every called word is always on his card, so it's always winnable. | sounds, 3x3 (free centre) or 4x4, win on line or full card, print card |
| **Sound Sort** (`sound-sort.html`) | Word + picture appears, pattern NOT highlighted. Drag or tap it into the right bin (*ai* vs *ay*). On a correct drop the pattern is revealed. Hint after 2 misses. End review list flags retries. | which bins, 8/12/16 words |
| **Word Builder** (`word-builder.html`) | Ending stays fixed (*-ain*). Tap a start tile to swap the front (*r → rain*, *z → zain*). Each build is spoken and judged real or silly. Goal: find every real word in the family. | word family, real+silly or real only |
| **Roll & Read** (`roll-and-read.html`) | Tap a 3D die, it lands on a sound, 1/3/5 words slide in to read aloud. Parent taps ✅ or 🔁 per word. A per-sound bar chart builds up (this is the parent's most useful signal). | words per roll, underline on/off, which 6 sounds on the die |
| **Real or Silly** (`real-or-silly.html`) | A word appears with no highlight and no audio. Child reads it and picks Real or Silly. Then it's revealed with picture/highlight. "Sound it out for me" button exists but is logged in results. Half real, half silly. | sounds, 8/12/16 words |
| **Sentence Smash** (`sentence-smash.html`) | Pick one phrase from each of four rows (Who / Did what / To what / Where) to build a silly sentence, then hear it read. Keep favourites. | sound filter, underline on/off |

Screenshots of each, mid-game, are in `reference/screenshots/`.

## 4. The sounds

From the school sheet (`reference/school-sound-sheet.jpeg`), plus two vowel teams the class is also on:

| id | Grapheme | Sound as in | Notes |
|---|---|---|---|
| sh | sh | ship | |
| ch | ch | chip | not *chef* (that's /sh/) |
| th-voiced | th | **them** | the sheet lists both th sounds separately |
| th-unvoiced | th | **thin** | |
| qu | qu | queen | |
| ng | ng | ring | |
| wh | wh | whale | not *whole* (that's /h/) |
| ph | ph | phone | |
| soft-g | g | **gent**, giant | g before e/i/y |
| soft-c | c | **circle**, city | c before e/i/y |
| ai / ay | ai, ay | rain, day | same sound, two spellings |
| ee / ea | ee, ea | tree, sea | same sound, two spellings |

The two th sounds are hard for a 6-year-old to tell apart. Keep them as separate options (the teacher listed them that way) but let the parent merge them into one "th" in settings.

**Letterforms:** the school sheet uses a beginner print font with single-storey **a** and **g**. The prototypes use **Andika** for exactly that reason. Keep a font with single-storey a and g for all words the child reads.

## 5. Content model (the most important change)

Right now every game has its own copy of the word lists, in slightly different shapes (`content/current-word-data.json` has all of them extracted, per game). That's why adding sounds meant editing seven files, and why errors crept in.

Build **one content file** that every game reads, for example `src/content/words.ts` or JSON:

```ts
type SoundId = 'sh' | 'ch' | 'th-voiced' | 'th-unvoiced' | 'qu' | 'ng' | 'wh' | 'ph'
             | 'soft-g' | 'soft-c' | 'ai' | 'ay' | 'ee' | 'ea';

interface Word {
  text: string;               // "sheep"
  picture?: string;           // emoji for now
  sounds: { id: SoundId; at: number; len: number }[];   // where the pattern is, explicitly
  real: true;
}
interface SillyWord { text: string; sound: SoundId; at: number; len: number; real: false }
interface Family { rime: string; sound: SoundId; realOnsets: string[]; sillyOnsets: string[] }
interface Phrase { text: string; slot: 'who' | 'did' | 'what' | 'where'; sound: SoundId; at: number; len: number }
```

The explicit `at`/`len` position matters: the prototypes find the pattern with `indexOf`, which highlights the wrong letters in phrases like "in **th**e bath" (voiced *the* instead of unvoiced *bath*) and would do the same for any word where the grapheme appears twice.

Then add a **build-time validation test** that fails if:
- a word doesn't contain its grapheme at the stated position
- a silly word is actually a real English word (use a word list package)
- a Word Builder "real" combination isn't a real word
- a word appears as both real and silly
- anything is on a small blocklist of words unsuitable for kids

Sound colours also belong in this one file (they currently differ between games).

## 6. Design rules to keep

- The visual family is consistent across all seven: deep green background, cream "paper" cards, mustard primary buttons with a solid drop shadow, Baloo 2 for headings, Andika for anything the child reads. Keep it; it works.
- **Colour identifies a sound; it never carries text.** Sentence Smash first shipped with mustard and mint text on cream and it was unreadable. The fix, now used there: the letters stay dark ink, the sound colour becomes a thick underline plus a translucent highlighter wash behind them. Apply that pattern everywhere a grapheme is highlighted.
- Feedback is gentle: shake for wrong, bounce for right, no red X, no losing. Games are always completable.
- Respect `prefers-reduced-motion`.
- Short sessions. A round should take 2 to 5 minutes.

## 7. Speech

- Uses the browser `speechSynthesis`. Wrap every call in try/catch (touching `window.speechSynthesis` itself can throw in some contexts, which caused an unattributed "Script error." in the prototypes).
- The family is in **Australia**: prefer an `en-AU` voice, fall back to `en-GB`, then any English voice. Never inherit the device language (the family also speaks Portuguese, and English words through a Portuguese voice are mangled).
- On iOS, speech only works after a user gesture. Make sure the first tap in every game "unlocks" it.
- Later, optionally: pre-recorded audio for the fixed word list, for consistency. Not phase 1.

## 8. Known bugs and content problems in the prototypes

**Must fix (content wrong for a child):**
- Word Builder marks real words as silly: *zip, ding, zing, gone, zone, vice, mink, gale, vat, thatch, mace, mage, vain, vale*. The child would be told a real word is made up.
- Word Builder `-ong` silly list contains **thong**. Remove.
- Word Builder `-ink` marks **shink** as real. It isn't.
- Word Builder `uick` family is just the `-ick` family with one qu word; only *quick* practises qu. Replace with a real qu set (*quick, quack, quilt, quiz, quit, queen*) or drop the family.
- Sentence Smash: *"tickled"* is tagged unvoiced th (no th in it); *"ate"* tagged ee/ea (no ee or ea); *"juggled"* tagged soft g (the g's are hard); *"the chef"* tagged ch (it's /sh/); *"the whole wheelbarrow"* highlights *whole* (/h/); *"in the bath"* highlights *the*.
- Real or Silly silly words that lack their target pattern: *zuck* (qu), *vhale*, *zhen* (wh). And some are unpronounceable: *vquid, glquz, glwhi, drwhe*. Silly words must be pronounceable pseudo-words that contain the target grapheme (*quog, whib, chep*).

**Behaviour:**
- Roll & Read: the rotated 3D die could overlap the Roll button and the hint text, so taps landed on the die's edge. Patched in the included file by giving the die area a fixed height; keep that in mind when rebuilding.
- Each game has its own sound picker. The parent wants to set "this week's sounds" once. Make it one global setting, overridable per game.
- Word lists with only a few words per sound (soft g/c, ph) repeat quickly. Aim for 12+ real words per sound.

## 9. Suggested stack

A suggestion, not a mandate: **Vite + TypeScript**, with either plain TS or a small framework (Preact or Svelte). The games are simple state machines; a heavy framework isn't needed. `vite-plugin-pwa` for offline. Playwright for tests.

Shared pieces: content module, speech module, settings store, and UI components (header, setup panel, chip, big button, results list, win overlay). One route per game plus a home screen with seven big tiles.

## 10. Phases

1. **Parity.** Home screen with seven tiles, every game ported, one shared content file, self-hosted fonts. Fix everything in section 8.
2. **App-ness.** PWA offline + home screen icon, global "this week's sounds" setting, en-AU speech, content validation test in CI.
3. **Parent corner.** Behind a simple adult gate (e.g. "hold for 3 seconds"), not a login: pick sounds, see the Roll & Read / Real or Silly results over the last few sessions (local only), add a custom word.
4. **Deploy** to a free static host and share the URL.

Out of scope: accounts, cloud sync, leaderboards, anything competitive between children.

## 11. Definition of done (each phase)

- All seven games playable start to finish on iPad Safari (portrait and landscape) and a phone, with zero console errors. Playwright tests cover: load, one full round, settings change, win screen.
- Content validation test passes.
- Lighthouse: PWA installable, accessibility 95+.
- Works in airplane mode after first load.
- No network requests to any domain other than the app's own.

## Files in this bundle

```
HANDOVER.md                         this brief
CLAUDE.md                           short rules for Claude Code
original-games/*.html               the 7 working prototypes (behavioural reference)
content/current-word-data.json      every game's word data, extracted as-is (contains the bugs in section 8)
reference/school-sound-sheet.jpeg   the school's digraph sheet
reference/screenshots/*.png         each game mid-play, iPad size
```
