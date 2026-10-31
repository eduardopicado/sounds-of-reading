/* Flash Phrases: the phrase he reads at a glance, and the lookalikes it
 * stands beside.
 *
 * The phrases are in words.ts (FLASH_PHRASES), each at the level of its
 * hardest word. A lookalike is the same phrase with one word changed by one
 * letter into another real word he can read at that level: "a big dog" sits
 * beside "a big dot" and "a bag dog", so he has to have read every word,
 * not just the first one or the length of the line. */

import { ALL_FLASH_PHRASES, REAL_WORDS, type FlashPhrase, type Level } from './index';
import { editDistance } from './near-words';
import { shuffle } from '../lib/random';
import type { Step } from './maths';

export interface PhraseStep extends Step {
  /** how many words the phrase has, least and most */
  words: [number, number];
  /** how long it shows, in ms, once he has a run of right answers going */
  ms: number;
}

export const PHRASE_STEPS: PhraseStep[] = [
  { name: 'Two and three words', words: [2, 3], ms: 1800 },
  { name: 'Four words', words: [4, 4], ms: 2200 },
  { name: 'Five and six words', words: [5, 6], ms: 2600 },
  { name: 'Quicker', words: [2, 4], ms: 1200 },
  { name: 'Quickest', words: [3, 6], ms: 1000 },
];

const wordCount = (text: string): number => text.split(' ').length;

/** the phrases at his levels with the step's number of words; any number of
    words if his levels have too few, and level 1 if he has chosen none */
export function phrasePool(step: PhraseStep, levels: readonly Level[]): FlashPhrase[] {
  const top = levels.length ? Math.max(...levels) : 1;
  const mine = ALL_FLASH_PHRASES.filter((p) => p.level <= top);
  const sized = mine.filter((p) => wordCount(p.text) >= step.words[0] && wordCount(p.text) <= step.words[1]);
  return sized.length >= 3 ? sized : mine;
}

/** the real words he can read by a level, in lower case */
const wordsUpTo = (level: Level): string[] =>
  [...new Set(REAL_WORDS.filter((w) => w.level <= level).map((w) => w.text.toLowerCase()))];

/** the words from the phonics lists, any level: the ones a lookalike may change */
const DECODABLE = new Set(REAL_WORDS.map((w) => w.text.toLowerCase()));

/**
 * Up to `n` lookalikes of a phrase: one word with one letter swapped for
 * another, making a real word at the phrase's level, a different word
 * changed in each where it can be, and never one of the other phrases.
 * A changed word never repeats another in the phrase ("a song song"). Only
 * words from the phonics lists change, and only those of three letters
 * or more: a sight word (the, said) turned into another (then, sad) changes
 * the grammar more than the look, and a short one (in, on) barely shows.
 */
export function lookalikePhrases(phrase: FlashPhrase, n = 2, rand: () => number = Math.random): string[] {
  return pickLookalikes(changes(phrase), n, rand);
}

/** for each word of the phrase, every lookalike changing that word */
function changes(phrase: FlashPhrase): string[][] {
  const pool = wordsUpTo(phrase.level);
  const words = phrase.text.split(' ');
  const taken = new Set(ALL_FLASH_PHRASES.map((p) => p.text.toLowerCase()));
  /* for each word that can change, every phrase it changes into */
  const byWord = words.map((w, i) => (w.length < 3 || !DECODABLE.has(w.toLowerCase()) ? [] : pool
    .filter((x) => x.length === w.length && editDistance(x, w) === 1 && !words.some((y) => y.toLowerCase() === x))
    .map((x) => words.map((y, j) => (j === i ? x : y)).join(' '))
    .filter((t) => !taken.has(t.toLowerCase()))));
  return byWord;
}

/** every lookalike a phrase has, for the content test */
export const allLookalikes = (phrase: FlashPhrase): string[] => changes(phrase).flat();

/** `n` of them, a different word changed in each where it can be */
function pickLookalikes(byWord: string[][], n: number, rand: () => number): string[] {
  const out: string[] = [];
  /* a different word each time first, then any */
  for (const i of shuffle(byWord.map((_, k) => k))) {
    const options = byWord[i].filter((t) => !out.includes(t));
    if (options.length && out.length < n) out.push(options[Math.floor(rand() * options.length)]);
  }
  const rest = shuffle(byWord.flat().filter((t) => !out.includes(t)));
  while (out.length < n && rest.length) out.push(rest.shift()!);
  return out;
}

/** where a lookalike differs from the phrase: the word it has, and the right one */
export function difference(phrase: string, other: string): { right: string; wrong: string } | null {
  const a = phrase.split(' ');
  const b = other.split(' ');
  const i = a.findIndex((w, k) => w !== b[k]);
  return i < 0 ? null : { right: a[i], wrong: b[i] };
}

/** how much longer the first look at a step is than its usual time */
export const FIRST_LOOK = 1.5;
/** how much shorter each right answer in a row makes the next look */
export const QUICKER_BY = 0.15;

/**
 * How long the phrase stays up, in ms: a long first look, closing in by 15%
 * for every right answer in a row down to the step's own time, as in Flash
 * Count. A miss gives the long look back; a device set to reduce motion
 * gets half as long again.
 */
export function phraseMs(step: PhraseStep, rightInARow: number, reduced = false): number {
  const lead = Math.max(1, FIRST_LOOK - QUICKER_BY * rightInARow);
  return Math.round(step.ms * lead * (reduced ? 1.5 : 1));
}

/** what is said after a phrase misread */
export const itSaid = (text: string): string => `It said: ${text}.`;

/** everything Flash Phrases says, so each can be recorded: each phrase, and
    the same after a miss */
export function phraseLines(): string[] {
  return ALL_FLASH_PHRASES.flatMap((p) => [p.text, itSaid(p.text)]);
}
