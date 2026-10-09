# Handover: "Short Hand, Long Hand" clock trainer

An interactive analog clock that teaches a ~6 year old how to read the time. It targets one specific confusion: the clock has **two scales on one face** (hours 1-12 and minutes 0-59), and kids read the long hand against the hour numbers (e.g. read 3:25 as "3:5").

Deliverable: `index.html`, one self-contained file (vanilla HTML/CSS/JS, no build step, no dependencies except Google Fonts). Open it directly in a browser to run it.

## Task for Claude Code

Add this as a feature/page in the existing web app. Keep the behaviour and teaching logic below intact. Adapt styling and structure to the host app's conventions.

## Teaching design (keep this)

| Idea | How it shows up |
|---|---|
| Hours are red, minutes are blue | Short hand + hour numerals use `--hour`; long hand + ticks + outer ring use `--min`. Digital readout colours HH red and MM blue. |
| Minutes have their own scale | Outer blue ring with 0, 5, 10 ... 55. The ring segment the long hand points at is enlarged, and a filled arc shows minutes elapsed since the top. |
| "Hour zone" | Shaded wedge between hour H and H+1. Fixes the 3:50 "it's nearly 4" error: the hour is the zone, not the nearest number. |
| Count in fives | Explanation panel shows chips 5, 10, 15 ... plus "+N little steps" for non-multiples of 5. |
| Hands are geared | Dragging the long hand past 12 advances/rewinds the hour. "Watch one whole hour go by" animates 12 jumps of 5 minutes. |
| Fading scaffolds | "Minute numbers" and "Hour zone" toggles let a parent remove the helpers. |

Copy is written for a young child: short sentences, "short hand / long hand", "little steps", Australian phrasing ("25 past 3", "20 to 4", "quarter to 4").

## Modes

1. **Play** (explore): free dragging, digital readout, time in words, two explanation cards, optional "Say it out loud" (Web Speech API, only shown if available).
2. **Set the clock**: shows a target time; child drags hands, presses "Check my clock". Specific hints: wrong hour → "put the short hand in the N zone"; right hour, wrong minute → counting-in-fives hint.
3. **Read the clock**: hands locked at a random time, 3 multiple-choice answers. Distractors are deliberate misconceptions: hands swapped, hour-numeral read as minutes (3:25 → 3:05), and hour + 1. A wrong answer disables that option and switches helpers on.

Levels (both games): 1 o'clock, 2 half past, 3 quarters, 4 fives, 5 any minute. Levels 1-4 snap the long hand to 5-minute steps in "Set the clock" and hide the ±1 minute buttons.

Stars: +1 for a correct answer on the first try.

## Code map (all inside one IIFE in `index.html`)

- **State** `S`: `mode` (explore | make | quiz), `h` (0-11, 0 = 12), `m` (0-59), `ring`, `zone`, `level`, `target`, `stars`, `locked`, `first`, `done`, `timer`.
- **SVG** is built once at start (viewBox 400x400, centre 200,200). Radii: minute ring band 152-196 (r=174), face 150, ticks 133-147, hour numerals 110, hour hand 80, minute hand 143.
- `render()` updates hand rotations, zone wedge, elapsed arc, highlighted minute number, aria-label, and calls `explain()` in Play mode.
- **Dragging** (pointer events with pointer capture, works for mouse and touch; `touch-action:none` on the SVG):
  - Which hand: nearest by angle; if the hands overlap, a touch near the centre (r < 96) picks the short hand.
  - Long hand: angle → minute (snapped), `setMin()` handles wrap past 12 to change the hour.
  - Short hand: snaps to the zone under the finger (`floor(angle/30)`), minutes are preserved. This is intentional, so setting the hour does not wipe the minutes.
- `words(h,m)`: time in words. `fmt(h,m)`: colour-coded HTML digits.
- Games: `pick()` random target per level, `newRound()`, `buildChoices()`, check handler, `lockUI()`, `setMode()`.
- Persistence: `localStorage` key `shlh` stores `{stars, ring, zone, level}`, wrapped in try/catch.

## Integration notes

- **Fastest path**: serve `index.html` as a static file and embed it with an `<iframe>` or link to it. Zero conflicts.
- **Native integration**: the CSS uses global selectors (`*`, `body`, `button`, `h1`) that will leak into the host app. Scope them under a root class (e.g. `.clock-trainer`) or port to the app's styling system (CSS modules, Tailwind, etc.).
- The app relies on `[hidden]{display:none!important}` because several hidden elements have `display:flex/grid`. Keep that rule (or replace `hidden` toggling with the framework's conditional rendering).
- If porting to React/Vue/Svelte: move `S` into component state, render the static SVG parts declaratively, keep the pointer logic in handlers attached to the SVG ref, and clear the "watch an hour" interval on unmount.
- Element IDs are global (`clock`, `fb`, `stars`...). Rename or scope them if more than one instance could exist on a page.
- Light and dark themes come from CSS custom properties on `:root`, switching on `prefers-color-scheme` and on `data-theme="dark|light"` on `<html>`. Map these tokens to the host app's theme if it has one.
- Fonts: Baloo 2 + Nunito from Google Fonts, with system fallbacks. Self-host them if the app has a strict CSP.
- localStorage key `shlh` is per-browser only. If the app has user accounts, consider saving stars/level to the backend per child.

## Not yet verified

- Dragging was not tested on a real touchscreen (tablet/phone). Check that grabbing the correct hand feels natural, especially when the hands overlap.
- "Say it out loud" depends on browser speech voices; untested.
- Layout checked at 1100px and 400px wide, light theme only.

## Test checklist

- [ ] Drag long hand clockwise past 12: hour advances by 1. Anticlockwise past 12: hour goes back.
- [ ] Drag short hand: it jumps zone to zone; minutes unchanged.
- [ ] Play mode explanations correct at 3:00, 3:05, 3:23, 3:45, 3:59 (hour still 3), 12:30.
- [ ] Set the clock, level 4: ±1 minute buttons hidden, long hand snaps to fives, wrong hour/minute hints are specific.
- [ ] Read the clock: 3 distinct options, exactly one correct; star only on first try.
- [ ] Toggles hide/show ring and zone; settings and stars survive reload.
- [ ] No horizontal scroll at 375px; dark mode readable.

## Ideas for later

- Sound effects / tick on drag; celebration animation on level-up.
- Per-child profiles and progress (which level mastered).
- A "time in words" game (match "quarter to 4" to a clock).
- Digital-to-analog daily routine prompts ("School starts at 8:45. Show it.").
