# Sounds of Reading

Seven small phonics games for a six-year-old learning to read, played on an
iPad from the home screen and shared with his school friends.

No accounts, no tracking, no ads, no third-party requests. It works offline
once opened, and nothing ever leaves the device.

## The games

| Game | What the child does |
|---|---|
| **Memory Match** | Flips cards to find pairs — a word with its picture, or two words that share a sound. |
| **Bingo** | The app says a word and shows its picture; he finds it written on his card. |
| **Sound Sort** | A word appears with nothing marked. He drops it in the right bin, and the sound lights up. |
| **Word Builder** | One part of the word stays put, he swaps the other. Each build is spoken and judged real or silly. |
| **Roll & Read** | Taps a die, reads the words it lands on aloud. A parent taps ✅ or 🔁, and a bar chart builds up. |
| **Real or Silly?** | Reads a word with no help, then decides whether it is a word at all. |
| **Sentence Smash** | Picks a phrase from each of four rows and hears the silly sentence read back. |

Finishing a round anywhere wins a sticker for the sound it practised, and the
stickers collect in a book on the home screen. It is the only thing that keeps
score, and there is nothing to lose — every game is completable and no answer
is ever marked with a red X.

## The sounds

The school's eight-level program, from `s a t p i n` up to `aw air are ear eer
ore dge tch`, plus `ph` from the class sound sheet. 78 sounds a child can
practise, 1100 real words, 750 silly ones, 50 word families and 170 sentence
phrases.

Levels are cumulative, so every word carries the level a child needs to decode
it — not just the level of the sound it practises. "phone" practises `ph` from
level 4, but its split digraph `o_e` is level 7, so it is a level 7 word and a
level 4 child never meets it. Any combination of levels can be chosen, in
"This week's sounds" on the home screen or per game behind the ⚙ button.

## Running it

```sh
npm install
npm run dev              # http://localhost:5173
npm run build            # typecheck, then build to dist/
npm test                 # the content test, then Playwright
```

`dist/` is a static site. It has no backend and no build-time configuration,
and every path in it is relative, so it can be dropped on GitHub Pages,
Cloudflare Pages, Netlify or a folder without changing anything.

## Deploying

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every
push to `main`. It runs the content test first, so a bad word cannot reach a
child even if someone pushes one.

Set up once: **Settings → Pages → Source → GitHub Actions**. The app is at
`https://eduardopicado.github.io/sounds-of-reading/` and every merge to `main`
updates it.

The URL is public but unlisted — there is no login, because there is nothing
to log in to and nothing stored anywhere but the child's own device. Share it
with the school friends as it is.

To add it to an iPad: open the URL in Safari, tap Share, then **Add to Home
Screen**. It then runs full screen with no browser bar, and keeps working with
no signal.

## The content file

Everything the games say lives in `src/content/words.ts`. Adding a word means
editing that one file:

```ts
words: 'ship 🚢 | fish 🐟 | shed 🏚 | brush 🪥 | shark 🦈 @6'
```

The emoji is optional. `@6` says the word needs level 6 to decode.

The app has to know exactly which letters to underline. Usually it works that
out, because the sound's spelling appears once. When it appears twice, the word
says which one it means:

```ts
'ba[th] 🛁'            underline the th in bath, not the one that isn't there
'the whole [wh]eelbarrow'   wheelbarrow, not whole, which is /h/
'c[a]k[e] 🎂'          a split digraph is two pieces, both underlined
```

A word where the spelling appears twice with no brackets **fails the content
test** rather than being guessed at. That is deliberate: guessing with
`indexOf` is how the prototypes came to underline "in *the* bath".

## The content test

```sh
npm run validate:content
```

It checks that every real word is a real English word, that no silly word
secretly is one, that every Word Builder build comes out the way it is labelled
both ways round, that nothing is on the blocklist, that no word is both real
and silly, that every grapheme really sits where the file says it does, and
that both tones of every sound colour clear WCAG AA.

This is what holds the handover's section 8 fixed: *vain*, *zip*, *ding*,
*zing*, *gone*, *zone*, *vice*, *mink*, *gale*, *vat*, *thatch*, *mace*,
*mage* and *vale* are real words and are treated as such; *thong* is out of the
`-ong` silly list; *shink* is out of `-ink`; and the silly words that had no
target sound in them (*zuck*, *vhale*, *zhen*) or could not be pronounced at
all (*vquid*, *glquz*, *glwhi*, *drwhe*) are gone. Below level 4 a silly word
only uses letters the child has actually been taught.

`tools/regen-silly.ts` rebuilds those lists when a sound is added, proposing
only non-words that are pronounceable and contain the grapheme.

## The reading voice

Speech uses the browser's own engine, so nothing is fetched and it works with
no signal. Which voice you get is up to the device, and on Apple hardware that
is worth knowing about: each voice ships in three tiers and **only the worst is
installed by default**. They are told apart by identifier, not name, so an iPad
can list two voices called Karen that sound nothing alike:

```
com.apple.voice.compact.en-AU.Karen     preinstalled, robotic
com.apple.voice.enhanced.en-AU.Karen    much better, a free download
com.apple.voice.premium.en-AU.Karen     best, a free download
```

The app ranks by accent first — an Australian child is learning Australian
vowels — then by tier, then by whether the voice works offline. "This week's
sounds" has a picker listing everything installed, with a Try it button.

No web page can install a voice, and Siri's voices are not available to the web
at all. To get a better one on an iPad: **Settings › Accessibility › Spoken
Content › Voices › English**, then download an Enhanced or Premium voice. It
appears in the picker straight away.

## Design rules

- **Colour identifies a sound; it never carries text.** Letters stay dark ink
  and the sound colour becomes a thick underline plus a translucent wash
  behind them. Sentence Smash shipped mustard-on-cream letters once and was
  unreadable.
- Andika throughout for anything the child reads, for its single-storey **a**
  and **g** — the letterforms on the school sheet. Self-hosted, latin subset,
  72 KB.
- Feedback is kind: a shake for wrong, a bounce for right, no red X, no losing.
  Every game is completable.
- 48px minimum tap targets, `prefers-reduced-motion` respected, rounds of two
  to five minutes.
- Sound effects are synthesised with WebAudio rather than loaded, so there is
  nothing to fetch and nothing to cache. Both speech and effects can be turned
  off on the home screen.

## Tests

- `tests/content.spec.ts` — the content test above.
- `tests/e2e/` — Playwright: loading, a full round of each game, changing
  settings, the win screen, the sticker book, offline after first load, speech
  falling back to `en-AU`, and the app surviving both blocked `localStorage`
  and a browser where touching `speechSynthesis` throws. Every test asserts
  zero console errors and no request to any other domain.
- `tests/e2e/a11y.spec.ts` — axe against WCAG 2.1 AA on all eight screens.

They run on three viewports: an iPad at 820×1180 and 1180×820, and a 375px
phone.

Lighthouse is not a dependency, but the build is kept clean against it:

```sh
npm run build && npx vite preview --port 4173 &
npx lighthouse http://localhost:4173/ --only-categories=accessibility,best-practices,performance
```

Last run: accessibility 100, best practices 100, performance 99.

## Background

`docs/HANDOVER.md` is the original brief, `docs/original-games/` the seven
standalone prototypes this replaces, and `docs/reference/` the school's sound
sheet and its eight-level chart.
