/* How each letter is written: the strokes, in order, the way it is taught
 * in NSW Foundation style.
 *
 * Every stroke is an SVG path on four writing lines:
 *
 *     y =   0   head line   (tall letters and capitals start here)
 *     y =  50   waist line  (small letters start here)
 *     y = 100   base line
 *     y = 150   tail line   (g j p q y hang down to here)
 *
 * The paths are drawn upright; the games add the slight forward slope of
 * the Foundation hand with a skew, so the data stays easy to check. They
 * follow the school's chart as closely as a handful of lines and curves
 * can: letters that start like c (a d g o q) start at the same place as c,
 * the down-and-up letters go back up their own stem, and a d i l t u end in
 * a small flick. They are an approximation of the model, not a font, and a
 * letter the school teaches differently should be changed here, in one
 * place.
 *
 * Only M, L, C and Q, with absolute coordinates; a path that is only a move
 * is a dot. src/lib/strokes.ts walks them, and the content test checks every
 * one. */

import { REAL_WORDS, picturable, type Word } from './index';

export interface Glyph {
  /** the letter */
  ch: string;
  /** how wide it is on the lines, in the same units */
  width: number;
  /** the strokes in the order they are written */
  strokes: string[];
}

/* the bowl that c, a, d, g, o and q all start with: from the one o'clock
   spot, over the top, round the left and along the bottom */
const BOWL = 'M48 60 C44 53 37 50 30 50 C19 50 10 61 10 75 C10 89 19 100 30 100';
/* the bowl, closing up into a stem on the right (a d g q) */
const BOWL_UP = `${BOWL} C38 100 45 95 50 86`;
/* straight down to the base line and a small flick to the right */
const FLICK = (x: number): string => `L${x} 93 Q${x + 1} 100 ${x + 7} 100`;

const LOWER: Glyph[] = [
  /* around letters */
  { ch: 'c', width: 56, strokes: [`${BOWL} C37 100 44 97 48 91`] },
  { ch: 'a', width: 62, strokes: [`${BOWL_UP} L50 50 ${FLICK(50)}`] },
  { ch: 'd', width: 62, strokes: [`${BOWL_UP} L50 0 ${FLICK(50)}`] },
  { ch: 'g', width: 58, strokes: [`${BOWL_UP} L50 50 L50 135 C50 149 39 153 29 151 C22 150 17 146 13 141`] },
  { ch: 'o', width: 58, strokes: [`${BOWL} C41 100 50 89 50 75 C50 67 49 63 47 59`] },
  { ch: 'q', width: 58, strokes: [`${BOWL_UP} L50 50 L50 150`] },
  { ch: 'e', width: 58, strokes: ['M12 76 L49 76 C49 60 41 50 30 50 C18 50 10 61 10 75 C10 89 19 100 30 100 C38 100 44 97 48 92'] },
  { ch: 's', width: 56, strokes: ['M47 57 C43 52 37 50 30 50 C20 50 13 55 13 62 C13 70 22 73 30 75 C40 77 48 81 48 88 C48 96 40 100 30 100 C22 100 15 97 11 92'] },

  /* down and up letters */
  { ch: 'r', width: 52, strokes: ['M12 50 L12 100 L12 72 C16 58 26 50 36 50 C41 50 45 51 48 54'] },
  { ch: 'n', width: 60, strokes: ['M12 50 L12 100 L12 70 C16 57 24 50 32 50 C42 50 48 57 48 68 L48 100'] },
  { ch: 'm', width: 66, strokes: ['M8 50 L8 100 L8 68 C11 56 16 50 22 50 C29 50 32 56 32 64 L32 100 L32 68 C35 56 40 50 46 50 C53 50 56 56 56 64 L56 100'] },
  { ch: 'h', width: 60, strokes: ['M12 0 L12 100 L12 70 C16 57 24 50 32 50 C42 50 48 57 48 68 L48 100'] },
  { ch: 'b', width: 60, strokes: ['M12 0 L12 100 L12 72 C16 58 24 50 32 50 C43 50 50 61 50 75 C50 89 42 100 30 100 C22 100 16 97 12 92'] },
  { ch: 'p', width: 60, strokes: ['M12 50 L12 150 L12 70 C16 57 24 50 32 50 C43 50 50 61 50 75 C50 89 42 100 30 100 C22 100 16 97 12 92'] },
  { ch: 'k', width: 56, strokes: ['M12 0 L12 100', 'M46 52 L14 76 L48 100'] },

  /* straight down letters */
  { ch: 'i', width: 34, strokes: [`M14 50 ${FLICK(14)}`, 'M14 30'] },
  { ch: 'l', width: 34, strokes: [`M14 0 ${FLICK(14)}`] },
  { ch: 't', width: 42, strokes: [`M18 15 ${FLICK(18)}`, 'M6 50 L34 50'] },
  { ch: 'j', width: 40, strokes: ['M28 50 L28 135 C28 148 20 152 10 148', 'M28 30'] },
  { ch: 'u', width: 64, strokes: [`M12 50 L12 82 C12 94 20 100 30 100 C40 100 48 93 48 82 L48 50 ${FLICK(48)}`] },
  { ch: 'y', width: 58, strokes: ['M12 50 L12 80 C12 92 20 100 30 100 C40 100 48 92 48 80 L48 50 L48 135 C48 149 38 153 29 151 C22 150 17 146 13 141'] },
  { ch: 'f', width: 46, strokes: ['M44 8 C40 2 36 0 31 0 C23 0 18 6 18 15 L18 100', 'M6 50 L36 50'] },

  /* slide letters */
  { ch: 'v', width: 56, strokes: ['M8 50 L28 100 L48 50'] },
  { ch: 'w', width: 66, strokes: ['M6 50 L18 100 L32 60 L46 100 L58 50'] },
  { ch: 'x', width: 56, strokes: ['M10 50 L46 100', 'M46 50 L10 100'] },
  { ch: 'z', width: 56, strokes: ['M10 50 L46 50 L10 100 L46 100'] },
];

const UPPER: Glyph[] = [
  { ch: 'A', width: 62, strokes: ['M30 0 L6 100', 'M30 0 L54 100', 'M15 64 L45 64'] },
  { ch: 'B', width: 64, strokes: ['M10 0 L10 100', 'M10 0 L30 0 C42 0 50 9 50 24 C50 39 42 48 30 48 C46 48 56 58 56 74 C56 91 46 100 30 100 L10 100'] },
  { ch: 'C', width: 84, strokes: ['M76 18 C68 6 59 0 48 0 C24 0 6 22 6 50 C6 78 24 100 48 100 C59 100 68 95 76 83'] },
  { ch: 'D', width: 78, strokes: ['M10 0 L10 100', 'M10 0 L32 0 C56 0 70 22 70 50 C70 78 56 100 32 100 L10 100'] },
  { ch: 'E', width: 58, strokes: ['M10 0 L10 100', 'M10 0 L50 0', 'M10 50 L44 50', 'M10 100 L50 100'] },
  { ch: 'F', width: 56, strokes: ['M10 0 L10 100', 'M10 0 L50 0', 'M10 50 L44 50'] },
  { ch: 'G', width: 84, strokes: ['M76 18 C68 6 59 0 48 0 C24 0 6 22 6 50 C6 78 24 100 48 100 C64 100 76 90 78 72 L78 56 L54 56'] },
  { ch: 'H', width: 70, strokes: ['M10 0 L10 100', 'M60 0 L60 100', 'M10 50 L60 50'] },
  { ch: 'I', width: 36, strokes: ['M18 0 L18 100'] },
  { ch: 'J', width: 54, strokes: ['M44 0 L44 72 C44 90 36 100 24 100 C14 100 7 94 4 86'] },
  { ch: 'K', width: 64, strokes: ['M10 0 L10 100', 'M56 0 L12 54 L58 100'] },
  { ch: 'L', width: 56, strokes: ['M10 0 L10 100 L52 100'] },
  { ch: 'M', width: 74, strokes: ['M8 0 L8 100', 'M8 0 L37 64 L66 0 L66 100'] },
  { ch: 'N', width: 70, strokes: ['M10 0 L10 100', 'M10 0 L60 100 L60 0'] },
  { ch: 'O', width: 100, strokes: ['M50 0 C22 0 4 24 4 50 C4 78 22 100 50 100 C78 100 96 78 96 50 C96 25 79 2 54 0'] },
  { ch: 'P', width: 64, strokes: ['M10 0 L10 100', 'M10 0 L32 0 C46 0 54 10 54 26 C54 42 46 52 32 52 L10 52'] },
  { ch: 'Q', width: 100, strokes: ['M50 0 C22 0 4 24 4 50 C4 78 22 100 50 100 C78 100 96 78 96 50 C96 25 79 2 54 0', 'M58 70 L84 104'] },
  { ch: 'R', width: 66, strokes: ['M10 0 L10 100', 'M10 0 L32 0 C46 0 54 10 54 26 C54 42 46 52 32 52 L10 52 L56 100'] },
  { ch: 'S', width: 84, strokes: ['M74 16 C68 6 58 0 44 0 C26 0 12 9 12 25 C12 41 28 46 44 50 C62 54 76 60 76 76 C76 92 62 100 44 100 C28 100 14 94 8 82'] },
  { ch: 'T', width: 64, strokes: ['M32 0 L32 100', 'M4 0 L60 0'] },
  { ch: 'U', width: 72, strokes: ['M10 0 L10 66 C10 88 22 100 36 100 C50 100 62 88 62 66 L62 0'] },
  { ch: 'V', width: 64, strokes: ['M4 0 L32 100 L60 0'] },
  { ch: 'W', width: 76, strokes: ['M4 0 L18 100 L36 30 L54 100 L70 0'] },
  { ch: 'X', width: 64, strokes: ['M6 0 L58 100', 'M58 0 L6 100'] },
  { ch: 'Y', width: 64, strokes: ['M4 0 L32 50', 'M60 0 L32 50 L32 100'] },
  { ch: 'Z', width: 64, strokes: ['M6 0 L58 0 L6 100 L58 100'] },
];

export const GLYPHS: ReadonlyMap<string, Glyph> = new Map([...LOWER, ...UPPER].map((g) => [g.ch, g]));

export function glyph(ch: string): Glyph {
  const g = GLYPHS.get(ch);
  if (!g) throw new Error(`no strokes for "${ch}"`);
  return g;
}

/* ── letter families ─────────────────────────────────────────────────────
   The order the school teaches them in: letters that start the same way are
   learnt together, so one movement is practised until it is automatic. */

export interface Family {
  id: string;
  name: string;
  /** what to say about how they start */
  how: string;
  /** each item is one or two letters traced side by side (Aa) */
  items: string[];
}

const pairs = [...'abcdefghijklmnopqrstuvwxyz'].map((l) => l.toUpperCase() + l);

export const FAMILIES: Family[] = [
  { id: 'around', name: 'Around letters', how: 'Start at the dot and go back round, like c.', items: [...'cadgoqes'] },
  { id: 'down-up', name: 'Down and up letters', how: 'Down, then back up the same line and over.', items: [...'rnmhbpk'] },
  { id: 'down', name: 'Straight down letters', how: 'Start at the top and go straight down.', items: [...'iltjuyf'] },
  { id: 'slides', name: 'Slide letters', how: 'Slide down and slide back up.', items: [...'vwxz'] },
  { id: 'caps-straight', name: 'Capitals: straight lines', how: 'Down first, then across.', items: [...'LIHTEF'] },
  { id: 'caps-slides', name: 'Capitals: slides', how: 'Slide down from the top line.', items: [...'VWXYZNMKA'] },
  { id: 'caps-curves', name: 'Capitals: curves', how: 'Down first, then round.', items: [...'DPBRCGOQSUJ'] },
  { id: 'pairs', name: 'Big and little', how: 'The capital first, then the little one.', items: pairs },
];

export function family(id: string): Family {
  const f = FAMILIES.find((x) => x.id === id);
  if (!f) throw new Error(`no letter family "${id}"`);
  return f;
}

/* ── tall, small and tail ────────────────────────────────────────────────
   Where a letter sits on the lines, which is most of what makes writing look
   neat: tall letters touch the head line, tails reach the tail line, and
   small ones stay between the waist and the base. */

export type Height = 'tall' | 'small' | 'tail';

export const HEIGHTS: Record<Height, string> = {
  tall: 'bdfhklt',
  small: 'aceimnorsuvwxz',
  tail: 'gjpqy',
};

export const heightOf = (ch: string): Height =>
  (Object.keys(HEIGHTS) as Height[]).find((h) => HEIGHTS[h].includes(ch)) ?? 'small';

/** the letters that turn round into each other */
export const MIRRORS = [...'bdpq'];

/* ── a word for each letter ──────────────────────────────────────────────
   From the content file, so there is still only one word list: a word with
   a picture that starts with the letter if there is one, else one that ends
   with it (x: box). */

const WITH_PICTURES = picturable(REAL_WORDS).slice().sort((a, b) => a.level - b.level || a.text.length - b.text.length);

export function exampleFor(ch: string): Word | null {
  const l = ch.toLowerCase();
  return WITH_PICTURES.find((w) => w.text.startsWith(l))
    ?? WITH_PICTURES.find((w) => w.text.endsWith(l))
    ?? null;
}
