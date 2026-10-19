/* Foosball Words: a word cut into its sounds, one rod of the table each.
 *
 * The cut is Pass and Shoot's (graphemes.ts), so sh in ship is one player
 * and never two. Each rod holds the right sound and a few others, and the
 * others are chosen, not random: first the sounds that make another real
 * word in that place (ship, chip, shop, shin), so swapping one rod is the
 * whole lesson, and a wrong word he builds is one the game can name.
 *
 * A rod never offers a second spelling of the sound it needs (c beside k,
 * ai beside ay): he hears the word, so he could not tell which was meant. No
 * setting of the rods may spell a word that sounds like the one asked for
 * (pair, pear). And none may spell a word on the blocklist, or have one
 * inside it, unless it is a real word from the lists (shell, with hell in
 * it): the lane's letters are on the screen, whatever they spell. */

import { BLOCKLIST, REAL_WORDS, SILLY_WORDS, SOUND_BY_ID, soundsAlike, uniqueWords, type Word } from './index';
import { NOT_BY_CHANCE } from './words';
import { pieces } from './graphemes';
import type { Step } from './maths';

export interface FoosStep extends Step {
  /** how many sounds, so how many rods */
  rods: 3 | 4;
  /** how many players on each rod */
  players: number;
}

export const FOOS_STEPS: FoosStep[] = [
  { name: 'Three sounds', rods: 3, players: 3 },
  { name: 'Three sounds, more players', rods: 3, players: 4 },
  { name: 'Four sounds', rods: 4, players: 3 },
  { name: 'Four sounds, more players', rods: 4, players: 4 },
];

/** a word and its sounds, as the rods hold them */
export interface Cut { word: Word; parts: string[] }

const cutOf = (w: Word): Cut | null => {
  const p = pieces(w);
  return p ? { word: w, parts: p.map((x) => x.text) } : null;
};

/** every real word that cuts cleanly, once each */
export const CUTS: Cut[] = uniqueWords(REAL_WORDS).map(cutOf).filter((c): c is Cut => c !== null);

/* Spellings of one sound. The content groups some (ai and ay); the rest are
   the doubled letters and the other ways a one-syllable word writes a sound. */
const SAME: string[][] = [
  ['c', 'k', 'ck'], ['s', 'ss'], ['f', 'ff', 'ph'], ['l', 'll'], ['z', 'zz'], ['ch', 'tch'], ['j', 'dge'],
  ['w', 'wh'], ['n', 'nn'], ['r', 'rr'], ['g', 'gg'], ['b', 'bb'], ['t', 'tt'], ['p', 'pp'], ['d', 'dd'], ['m', 'mm'],
  ['or', 'ore', 'aw'], ['air', 'are', 'ear'], ['oo', 'ew', 'ue'],
  ...Object.values([...SOUND_BY_ID.values()].reduce<Record<string, string[]>>((groups, s) => {
    if (s.group) (groups[s.group] ??= []).push(...s.spellings.filter((sp) => !sp.includes('_')));
    return groups;
  }, {})),
];

/** could these two spellings be the same sound? */
export const sameSound = (a: string, b: string): boolean => a === b || SAME.some((g) => g.includes(a) && g.includes(b));

const isVowel = (part: string, at: number): boolean =>
  (/[aeiou]/.test(part) && part !== 'qu') || (part === 'y' && at > 0);

const BY_TEXT = new Map(CUTS.map((c) => [c.word.text, c]));

/** the real word these parts spell, if there is one */
export const wordOf = (parts: readonly string[]): Cut | undefined => BY_TEXT.get(parts.join(''));

const NEVER = new Set([...BLOCKLIST, ...NOT_BY_CHANCE]);
/* The blocked words that are only a problem on their own: the toilet words,
   the drinks and the fighting. Inside other letters (weet, gunt) they are
   nothing. The rest, the swearing and the slurs, are rude wherever they sit
   (shits), unless the whole row is a real word (shell). */
const ALONE = new Set(['wee', 'pee', 'poo', 'bum', 'butt', 'fart', 'ass', 'willy', 'gut', 'hell', 'damn', 'hate',
  'die', 'dead', 'death', 'kill', 'gun', 'stab', 'blood', 'gin', 'rum', 'beer', 'wine', 'drug']);
const RUDE = [...NEVER].filter((w) => !ALONE.has(w));

/**
 * A row of players not fit to show: a blocked word, or a rude one inside
 * letters that are not a real word. With the word being built, rude letters
 * that are all its own players in its own places (the "tit" in st·i·tch,
 * with another first sound) are not a new word, so they do not count.
 */
export function unfit(parts: readonly string[], own?: readonly string[]): boolean {
  const text = parts.join('');
  if (NEVER.has(text)) return true;
  if (BY_TEXT.has(text)) return false;
  const ends = parts.reduce<number[]>((acc, p) => [...acc, (acc.at(-1) ?? 0) + p.length], []);
  for (const bad of RUDE) {
    for (let at = text.indexOf(bad); at >= 0; at = text.indexOf(bad, at + 1)) {
      /* the rods those letters are on */
      const from = parts.map((_, k) => k).filter((k) => ends[k] - parts[k].length < at + bad.length && ends[k] > at);
      if (!own || from.some((k) => parts[k] !== own[k])) return true;
    }
  }
  return false;
}

export interface FoosQuestion {
  target: Cut;
  /** the players on each rod, top to bottom, the right one among them */
  rods: string[][];
  /** which player each rod starts on */
  start: number[];
}

type Rand = () => number;
const shuffled = <T>(items: readonly T[], rand: Rand): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** every word the rods could spell */
function settings(rods: string[][]): string[][] {
  return rods.reduce<string[][]>((acc, rod) => acc.flatMap((a) => rod.map((p) => [...a, p])), [[]]);
}

/**
 * The rods for a word: on each, its own sound and the others it can be
 * swapped for. Words that differ from it by one sound come first; then any
 * sound of the same kind (a vowel for a vowel) in that place in the words of
 * that length, then anywhere in them. `avoid` holds, for each rod, players
 * taken off because the rods could spell something unfit with them.
 */
export function foosQuestion(
  target: Cut, step: FoosStep, rand: Rand = Math.random, tries = 0,
  avoid: string[][] = target.parts.map(() => []),
): FoosQuestion {
  const n = target.parts.length;
  /* only sounds taught by the word's own level, so every player is one he knows */
  const same = CUTS.filter((c) => c.parts.length === n && c.word.level <= target.word.level);
  const rods = target.parts.map((part, i) => {
    const near = same.filter((c) => c.parts.every((p, j) => (j === i ? p !== part : p === target.parts[j])))
      .map((c) => c.parts[i]);
    const kind = (p: string, at: number): boolean => isVowel(p, at) === isVowel(part, i);
    const here = same.map((c) => c.parts[i]).filter((p) => kind(p, i));
    /* a word that starts with a vowel (ants) may be the only one: then any
       vowel he knows, from anywhere in those words */
    const anywhere = isVowel(part, i) ? same.flatMap((c) => c.parts.filter((p, at) => isVowel(p, at))) : [];
    const out = [part];
    for (const p of [...shuffled([...new Set(near)], rand), ...shuffled([...new Set(here)], rand), ...shuffled([...new Set(anywhere)], rand)]) {
      if (out.length >= step.players) break;
      if (avoid[i].includes(p) || out.some((o) => sameSound(o, p))) continue;
      /* a swap that sounds like the word asked for is no wrong answer */
      const swapped = target.parts.map((q, j) => (j === i ? p : q)).join('');
      if (soundsAlike(swapped, target.word.text)) continue;
      out.push(p);
    }
    return shuffled(out, rand);
  });
  /* nothing unfit, in any setting of the rods: take off a player that
     makes it (never the word's own) and build the rods again. The word
     itself is fit, so each time one player goes, and it ends */
  for (const parts of settings(rods)) {
    if (!unfit(parts, target.parts)) continue;
    /* from the rod with the most players, so none is left with only its own */
    const j = parts.map((_, k) => k).filter((k) => parts[k] !== target.parts[k])
      .reduce((best, k) => (rods[k].length >= rods[best].length ? k : best));
    return foosQuestion(target, step, rand, tries, avoid.map((a, k) => (k === j ? [...a, parts[j]] : a)));
  }
  /* nor may two swaps together spell one that sounds like it */
  for (const parts of settings(rods)) {
    const text = parts.join('');
    if (text !== target.word.text && soundsAlike(text, target.word.text) && tries < 20) {
      return foosQuestion(target, step, rand, tries + 1, avoid);
    }
  }
  /* start away from the answer: most rods on a wrong player */
  let start: number[];
  /* (a rod left with only its own player can only start on it) */
  const alone = rods.filter((rod) => rod.length === 1).length;
  do {
    start = rods.map((rod) => Math.floor(rand() * rod.length));
  } while (start.filter((s, i) => rods[i][s] === target.parts[i]).length > alone + (n > 3 ? 1 : 0));
  return { target, rods, start };
}

/* ── Make any word: the second way to play ───────────────────────────── */

const SILLY_BY_TEXT = new Map(SILLY_WORDS.map((w) => [w.text, w]));

/** a made-up word from the lists, the kind Real or Silly calls silly */
export const sillyOf = (parts: readonly string[]): Word | undefined => SILLY_BY_TEXT.get(parts.join(''));

/** every real word a table's rods can spell, the one they were built for among them */
export function wordsOn(rods: string[][]): Cut[] {
  const found = new Map<string, Cut>();
  for (const parts of settings(rods)) {
    const c = wordOf(parts);
    if (c) found.set(c.word.text, c);
  }
  return [...found.values()];
}

/**
 * A table for making any word he can. The rods are built for one word as
 * usual, so the swaps that make other real words come first; of a few
 * tries, the table with the most words on it is kept.
 */
export function makeTable(pool: readonly Cut[], step: FoosStep, rand: Rand = Math.random, tries = 12): { q: FoosQuestion; words: Cut[] } {
  let best: { q: FoosQuestion; words: Cut[] } | null = null;
  for (let i = 0; i < tries; i += 1) {
    const q = foosQuestion(pool[Math.floor(rand() * pool.length)], step, rand);
    const words = wordsOn(q.rods);
    if (!best || words.length > best.words.length) best = { q, words };
  }
  return best!;
}

/** words he can play at these levels: with a picture, cut into this many sounds */
export function foosWords(levels: readonly number[], rods: number): Cut[] {
  return CUTS.filter((c) => c.parts.length === rods && !!c.word.picture
    && (!levels.length || levels.includes(c.word.level)));
}
