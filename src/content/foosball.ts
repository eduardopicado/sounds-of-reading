/* Foosball Words: a word cut into its sounds, one rod of the table each.
 *
 * The cut is Pass and Shoot's (graphemes.ts), so sh in ship is one player
 * and never two. Each rod holds the right sound and a few others, and the
 * others are chosen, not random: first the sounds that make another real
 * word in that place (ship, chip, shop, shin), so swapping one rod is the
 * whole lesson, and a wrong word he builds is one the game can name.
 *
 * A rod never offers a second spelling of the sound it needs (c beside k,
 * ai beside ay): he hears the word, so he could not tell which was meant. And
 * no setting of the rods may spell a word that sounds like the one asked for
 * (pair, pear). */

import { REAL_WORDS, SOUND_BY_ID, soundsAlike, uniqueWords, type Word } from './index';
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

/** the real word these parts spell, if there is one */
export const wordOf = (parts: readonly string[]): Cut | undefined => {
  const text = parts.join('');
  return CUTS.find((c) => c.word.text === text);
};

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
 * that length, then anywhere in them.
 */
export function foosQuestion(target: Cut, step: FoosStep, rand: Rand = Math.random, tries = 0): FoosQuestion {
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
      if (out.some((o) => sameSound(o, p))) continue;
      /* a swap that sounds like the word asked for is no wrong answer */
      const swapped = target.parts.map((q, j) => (j === i ? p : q)).join('');
      if (soundsAlike(swapped, target.word.text)) continue;
      out.push(p);
    }
    return shuffled(out, rand);
  });
  /* nor may two swaps together spell one */
  for (const parts of settings(rods)) {
    const text = parts.join('');
    if (text !== target.word.text && soundsAlike(text, target.word.text) && tries < 20) {
      return foosQuestion(target, step, rand, tries + 1);
    }
  }
  /* start away from the answer: most rods on a wrong player */
  let start: number[];
  do {
    start = rods.map((rod) => Math.floor(rand() * rod.length));
  } while (start.filter((s, i) => rods[i][s] === target.parts[i]).length > (n > 3 ? 1 : 0));
  return { target, rods, start };
}

/** words he can play at these levels: with a picture, cut into this many sounds */
export function foosWords(levels: readonly number[], rods: number): Cut[] {
  return CUTS.filter((c) => c.parts.length === rods && !!c.word.picture
    && (!levels.length || levels.includes(c.word.level)));
}
