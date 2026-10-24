/* Sight words, for every game that can play them.
 *
 * The school's list (SIGHT_WORDS in words.ts) is the words he has to know on
 * sight. Tricky Words was the first game to use it; Bingo, Memory Match,
 * Build the Word and Roll & Read can switch to it too, so the same sets, the
 * same lookalikes and the same colour for the part that lies are here, once.
 *
 * Two things matter more for sight words than for the rest:
 *
 * Lookalikes. there, their and where; could, should and would; come and
 * some. Muddling those is the mistake a child actually makes, so a wrong
 * answer, a card beside the right one or a wrong tile is chosen from them.
 *
 * Words that sound the same. A game that says the word and asks him to find
 * or build it has no right answer when its twin is there too: there and
 * their, to, too and two, no and know. SOUNDS_ALIKE lists them (the content
 * test checks every pair is there), and the games keep twins apart. */

import { ALL_SIGHT_WORDS, SIGHT_SETS, soundsAlike, type Level, type SightWord } from './index';
import { confusions } from './spelling';
import { tonesFor } from '../lib/colour';
import { shuffle } from '../lib/random';

/* A sight word practises no sound, so there is no sound's colour to borrow.
   One tone stands for "this is the bit that lies", in every game. */
export const TRICKY = tonesFor(350);

/**
 * The school's sets up to the child's level, since sight words build up the
 * way the sounds do: a level 5 child still meets the level 1 words. The extra
 * set outside the school's list waits until a parent turns it on.
 */
export function sightSetsUpTo(levels: readonly Level[]): string[] {
  const upTo = levels.length ? Math.max(...levels) : 8;
  const sets = SIGHT_SETS.filter((name) => {
    const level = ALL_SIGHT_WORDS.find((w) => w.set === name)?.level;
    return level != null && level <= upTo;
  });
  return sets.length ? sets : SIGHT_SETS.slice(0, 1);
}

/** every word in these sets, each once */
export function sightWordsIn(sets: readonly string[]): SightWord[] {
  const seen = new Set<string>();
  return ALL_SIGHT_WORDS.filter((w) => {
    if (!sets.includes(w.set) || seen.has(w.text)) return false;
    seen.add(w.text);
    return true;
  });
}

/**
 * How easily one word could be mistaken for another.
 *
 * Shared letters matter more than order: a child reading "their" as "there"
 * is not misreading the sequence, he is seeing the same handful of letters in
 * a word of the same length. Length difference is a mild penalty rather than
 * a bar, so "who" can still sit beside "how".
 */
export function lookalike(a: string, b: string): number {
  const bag = [...b];
  let shared = 0;
  for (const ch of a) {
    const i = bag.indexOf(ch);
    if (i >= 0) { shared += 1; bag.splice(i, 1); }
  }
  return shared / Math.max(a.length, b.length) - Math.abs(a.length - b.length) * 0.05;
}

/** the n words in the pool most easily confused with this one, most alike first */
export function lookalikes<T extends { text: string }>(target: { text: string }, pool: readonly T[], n: number): T[] {
  return pool
    .filter((w) => w.text !== target.text)
    .map((w) => ({ w, score: lookalike(target.text, w.text) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.w);
}

/** the words in the pool that sound like this one */
export const twinsOf = (word: string, pool: readonly { text: string }[]): string[] =>
  pool.filter((w) => w.text !== word && soundsAlike(w.text, word)).map((w) => w.text);

/**
 * n different sight words for one card or board, dealt in small groups of
 * lookalikes (there with where and here), so finding one means reading it
 * and not just spotting its shape. A game that says the word keeps twins
 * apart: their is never on the card with there, which would leave "there"
 * with two right answers.
 */
export function sightBoard(pool: readonly SightWord[], n: number, { twins = false } = {}): SightWord[] {
  const left = shuffle(pool);
  const out: SightWord[] = [];
  const fits = (w: SightWord): boolean => !out.some((o) => o.text === w.text || (!twins && soundsAlike(o.text, w.text)));
  while (out.length < n && left.length) {
    const seed = left.shift()!;
    if (!fits(seed)) continue;
    out.push(seed);
    for (const w of lookalikes(seed, left, 2)) {
      if (out.length >= n) break;
      if (!fits(w)) continue;
      out.push(w);
      left.splice(left.indexOf(w), 1);
    }
  }
  return out;
}

/* ── building one from letter tiles ──────────────────────────────────────── */

/* fridge magnets: each letter in its own bright plastic, dark enough to read
   on the paper-coloured tile (the content test checks AA) */
export const MAGNETS = ['#C0392B', '#9A5B06', '#1A7840', '#1F5FAD', '#7D3C98', '#C2185B', '#117A80'];
export const magnetFor = (letter: string): string => MAGNETS[letter.toLowerCase().charCodeAt(0) % MAGNETS.length];

/** the longest word for letter tiles: more slots than this do not fit a phone */
export const MAX_TILES = 7;

/** can a sight word be built from lower-case letter tiles at all? "I" and
    "Mr" are names for capitals, and a one-letter word is no build */
export const buildable = (w: SightWord): boolean => /^[a-z]{2,}$/.test(w.text) && w.text.length <= MAX_TILES;

/** could these tiles spell this word? */
function spells(word: string, tiles: readonly string[]): boolean {
  const bag = [...tiles];
  for (const ch of word) {
    const i = bag.indexOf(ch);
    if (i < 0) return false;
    bag.splice(i, 1);
  }
  return true;
}

/**
 * Letter tiles for building a sight word he hears: its letters, and `wrong`
 * more. The wrong ones are the letters he would write if he trusted the
 * sound (an e for the ai in said, a u for the o in come), and the letters
 * that make it one of its lookalikes. None of them may let him build a word
 * that sounds the same (their, from the tiles for there), because the word is
 * heard and hearing cannot tell them apart.
 */
export function sightTiles(word: SightWord, wrong: number, others: readonly { text: string }[]): { answer: string[]; tiles: string[] } {
  const answer = [...word.text];
  const twins = twinsOf(word.text, others).filter((t) => t.length === word.text.length);
  const inAnswer = new Set(answer);
  const liars = word.spans.flatMap((s) => answer.slice(s.at, s.at + s.len));
  /* the lying letters' likely mistakes first, then the lookalikes' letters */
  const near = lookalikes(word, others, 3).flatMap((w) => [...w.text]);
  const ideas = [...shuffle(liars.flatMap((ch) => confusions(ch))), ...shuffle(near), ...shuffle(['a', 'e', 'i', 'o', 'u'])];
  const picked: string[] = [];
  for (const c of ideas) {
    if (picked.length >= wrong) break;
    if (inAnswer.has(c) || picked.includes(c) || !/^[a-z]$/.test(c)) continue;
    if (twins.some((t) => spells(t, [...answer, ...picked, c]))) continue;
    picked.push(c);
  }
  return { answer, tiles: shuffle([...answer, ...picked]) };
}
