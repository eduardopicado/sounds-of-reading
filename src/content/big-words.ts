/* Big Words: two-syllable words, from the content file.
 *
 * Each word in BIG_WORDS (words.ts) is written split, "sun-set", with an
 * optional picture. Its level is worked out here from its parts rather than
 * written by hand: each part is cut into the spellings of ALL_SOUNDS, longest
 * first, and the word's level is the highest level among those spellings
 * (taking the lowest level a spelling is taught at, so "ow" in rainbow is the
 * level 5 ow of slow). A part that does not cut, or is not exactly one
 * syllable, throws — the content test turns that into a failing build.
 *
 * Year 2 splits words himself. Only words where the split is plain are asked
 * that way: two consonant letters between the vowels, not a digraph, split
 * between them (rab|bit, sun|set, pic|nic). */

import { BIG_WORDS } from './words';
import { ALL_SOUNDS, type Level } from './index';
import type { Step } from './maths';
import { pick, shuffle } from '../lib/random';

export interface BigWord {
  text: string;
  parts: [string, string];
  picture?: string;
  level: Level;
}

/** each plain spelling and the lowest level it is taught at, longest first */
const SPELLINGS: [string, number][] = (() => {
  const lowest = new Map<string, number>();
  for (const s of ALL_SOUNDS) {
    for (const sp of s.spellings) {
      if (sp.includes('_')) continue;
      lowest.set(sp, Math.min(lowest.get(sp) ?? 9, s.level));
    }
  }
  return [...lowest].sort((a, b) => b[0].length - a[0].length);
})();

const VOWEL = /[aeiou]/;

/** a part cut into spellings, or null if a letter is left over */
export function cut(part: string): [string, number][] | null {
  const out: [string, number][] = [];
  let i = 0;
  while (i < part.length) {
    const sp = SPELLINGS.find(([k]) => part.startsWith(k, i));
    if (!sp) return null;
    out.push(sp);
    i += sp[0].length;
  }
  return out;
}

/** one syllable: exactly one piece with a vowel in it (qu is a consonant) */
export const oneSyllable = (pieces: [string, number][]): boolean =>
  pieces.filter(([sp], i) => (VOWEL.test(sp) && sp !== 'qu') || (sp === 'y' && i > 0)).length === 1;

function parse(entry: string): BigWord {
  const [split, picture] = entry.trim().split(/\s+/);
  const parts = split.split('-');
  if (parts.length !== 2 || parts.some((p) => !/^[a-z]+$/.test(p))) throw new Error(`Big Words: "${entry}" should be two lowercase parts joined by -`);
  let level = 1;
  for (const p of parts) {
    const pieces = cut(p);
    if (!pieces) throw new Error(`Big Words: "${p}" in ${split} does not cut into known spellings`);
    if (!oneSyllable(pieces)) throw new Error(`Big Words: "${p}" in ${split} is not one syllable`);
    level = Math.max(level, ...pieces.map(([, l]) => l));
  }
  return { text: parts.join(''), parts: parts as [string, string], picture, level: level as Level };
}

export const ALL_BIG_WORDS: BigWord[] = BIG_WORDS.split('|').filter((x) => x.trim()).map(parse);

const DIGRAPHS = ['sh', 'ch', 'th', 'ck', 'ng', 'wh', 'ph', 'qu'];

/** a word whose split is between two consonants, so he can be asked to find it */
export function plainSplit(w: BigWord): boolean {
  const m = w.text.match(/^[^aeiou]*[aeiou]+([^aeiou]+)[aeiou]/);
  if (!m || m[1].length !== 2 || DIGRAPHS.includes(m[1])) return false;
  /* the gap between the two consonants */
  const gap = m[0].length - 1 - m[1].length + 1;
  return gap === w.parts[0].length;
}

export interface BigStep extends Step {
  /**
   * parts: read it split, pick the picture;
   * whole: read it unsplit, pick the picture;
   * build: hear it, tap its two parts in order;
   * split: tap the gap where it splits (Year 2);
   * buildHard: build it from more parts, some nearly right (Year 2)
   */
  task: 'parts' | 'whole' | 'build' | 'split' | 'buildHard';
}

export const BIG_STEPS: BigStep[] = [
  { name: 'Read the parts', task: 'parts' },
  { name: 'Read the whole word', task: 'whole' },
  { name: 'Build it', task: 'build' },
  /* Year 2 */
  { name: 'Where does it split?', task: 'split' },
  { name: 'Build it, no clues', task: 'buildHard' },
];

export interface BigQuestion {
  task: BigStep['task'];
  word: BigWord;
  /** for parts and whole: the words whose pictures are offered, the answer among them */
  pictures: BigWord[];
  /** for build: the part tiles to choose from */
  tiles: string[];
}

/** the big words he can read: up to his top level, or the easiest few */
export function readableBig(maxLevel: number, atLeast = 8): BigWord[] {
  const ok = ALL_BIG_WORDS.filter((w) => w.level <= maxLevel);
  return ok.length >= atLeast ? ok : [...ALL_BIG_WORDS].sort((a, b) => a.level - b.level).slice(0, atLeast);
}

export function bigQuestion(step: BigStep, maxLevel: number, avoid: string[] = []): BigQuestion {
  let pool = readableBig(maxLevel).filter((w) => !avoid.includes(w.text));
  if (step.task === 'parts' || step.task === 'whole') pool = pool.filter((w) => w.picture);
  if (step.task === 'split') pool = pool.filter(plainSplit);
  if (pool.length < 3) {
    pool = ALL_BIG_WORDS.filter((w) => (step.task === 'split' ? plainSplit(w) : step.task === 'build' || step.task === 'buildHard' || w.picture));
  }
  const word = pick(pool);
  const q: BigQuestion = { task: step.task, word, pictures: [], tiles: [] };
  if (step.task === 'parts' || step.task === 'whole') {
    const others = shuffle(ALL_BIG_WORDS.filter((w) => w.picture && w !== word)).slice(0, 2);
    q.pictures = shuffle([word, ...others]);
  }
  if (step.task === 'build' || step.task === 'buildHard') {
    const n = step.task === 'build' ? 2 : 4;
    const decoys = new Set<string>();
    /* the harder build's decoys look alike: parts of other words that start
       with the same letter as one of his. Only real parts from the list, so
       nothing unchecked is ever shown */
    const others = shuffle(ALL_BIG_WORDS.filter((w) => w !== word));
    if (step.task === 'buildHard') {
      for (const w of others) for (const p of w.parts) {
        if (decoys.size < n - 1 && !word.parts.includes(p) && word.parts.some((mine) => mine[0] === p[0])) decoys.add(p);
      }
    }
    for (const w of others) {
      if (decoys.size >= n) break;
      for (const p of w.parts) if (decoys.size < n && !word.parts.includes(p)) decoys.add(p);
    }
    q.tiles = shuffle([...word.parts, ...decoys]);
  }
  return q;
}
