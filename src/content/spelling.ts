/* The tiles for spelling a word: the right ones, and the wrong ones that
 * make it worth doing.
 *
 * Spelling is harder than reading because English offers several ways to
 * write most sounds, and a child has to choose. So the wrong tiles are the
 * choices a child actually gets wrong, not random letters:
 *
 *   - the same sound, spelled another way: rain with ay, feet with ea,
 *     duck with k — the mistake that shows he is listening but has not
 *     yet learnt which spelling goes where;
 *   - a short vowel swapped for its neighbour: pin with e, bed with i —
 *     the commonest error of all at this age;
 *   - letters that look alike: b and d, m and n.
 *
 * Two kinds of tile set. Sound tiles give one tile per sound (sh, i, p),
 * using the same cut as Pass and Shoot, so a word is built the way it is
 * sounded out. Letter tiles give one per letter, the harder step that comes
 * after, and what Pro mode uses.
 *
 * One rule is absolute: a wrong tile never spells another real word that
 * sounds the same (see / sea), because the word is heard, and hearing
 * cannot tell them apart. */

import { ALL_SOUNDS, REAL_WORDS, soundsAlike, type Word } from './index';
import { pieces } from './graphemes';
import { shuffle } from '../lib/random';

export type TileMode = 'sounds' | 'letters';

export interface TileSet {
  /** what goes in the slots, in order */
  answer: string[];
  /** every tile on the table: the answer's, and the wrong ones, shuffled */
  tiles: string[];
}

const SHORT_VOWELS = ['a', 'e', 'i', 'o', 'u'];
const LOOKALIKE: Record<string, string[]> = {
  b: ['d'], d: ['b'], m: ['n'], n: ['m'], p: ['b'], w: ['v'], v: ['w'],
};
/* sounds made the same way in the mouth, one voiced and one not, which a
   child hears as nearly the same: t and d, s and z, sh and ch */
const NEAR_SOUND: Record<string, string[]> = {
  t: ['d'], d: ['t'], p: ['b'], b: ['p'], f: ['v', 'th'], v: ['f'], s: ['z'], z: ['s'],
  k: ['g'], g: ['k'], c: ['g'], sh: ['ch', 's'], ch: ['sh', 'j'], j: ['ch', 'g'],
  th: ['f', 'v'], l: ['r'], r: ['w', 'l'], ng: ['n'],
};
/* long vowels and their other spellings, including the ones outside the
   content's sound groups (zoo could be zew; hay could be ha) */
const LONG_VOWEL: Record<string, string[]> = {
  oo: ['ew', 'ue', 'u'], ew: ['oo', 'ue'], ue: ['ew', 'oo'], ay: ['ai', 'a'], ai: ['ay', 'a'],
  ee: ['ea', 'e'], ea: ['ee', 'e'], ie: ['igh', 'y'], igh: ['ie', 'i'], y: ['ie', 'i'],
  oa: ['ow', 'o'], ow: ['oa', 'ou'], ou: ['ow', 'oo'], oi: ['oy'], oy: ['oi'],
  ar: ['a', 'or'], or: ['aw', 'ore'], aw: ['or'], ore: ['or', 'aw'], er: ['ir', 'ur'],
  air: ['are', 'ear'], are: ['air', 'ear'], ear: ['air', 'are'], eer: ['ear', 'ee'],
};

/** spellings that make the same sound as this one: ai for ay, ck for k */
function sameSound(spelling: string): string[] {
  const out = new Set<string>();
  for (const s of ALL_SOUNDS) {
    if (!s.spellings.includes(spelling)) continue;
    /* the other spellings in the same group (ai-ay, ee-ea, er-ir-ur ...) */
    for (const t of ALL_SOUNDS) {
      if (t !== s && s.group && t.group === s.group) for (const sp of t.spellings) out.add(sp);
    }
  }
  /* the /k/ family is not one group in the content, but it is one choice */
  const k = ['c', 'k', 'ck'];
  if (k.includes(spelling)) for (const sp of k) out.add(sp);
  out.delete(spelling);
  return [...out].filter((sp) => !sp.includes('_'));
}

/** the likely wrong tiles for one right one */
export function confusions(tile: string): string[] {
  const out = new Set<string>(sameSound(tile));
  if (SHORT_VOWELS.includes(tile)) for (const v of SHORT_VOWELS) if (v !== tile) out.add(v);
  for (const l of LOOKALIKE[tile] ?? []) out.add(l);
  for (const l of NEAR_SOUND[tile] ?? []) out.add(l);
  for (const l of LONG_VOWEL[tile] ?? []) out.add(l);
  return [...out];
}

const REAL = new Set(REAL_WORDS.map((w) => w.text.toLowerCase()));

/** the right tiles for a word, or null if it cannot be built that way */
export function answerFor(word: Word, mode: TileMode): string[] | null {
  if (mode === 'letters') return /^[a-z]+$/i.test(word.text) ? [...word.text.toLowerCase()] : null;
  return pieces(word)?.map((p) => p.text) ?? null;
}

/**
 * The tiles for one word. `wrong` is how many wrong tiles to add; fewer
 * come back if the word has fewer good ones to offer.
 */
export function tilesFor(word: Word, mode: TileMode, wrong: number): TileSet | null {
  const answer = answerFor(word, mode);
  if (!answer) return null;
  const inAnswer = new Set(answer);
  /* each right tile's likely mistakes, fair ones only */
  const options = answer.map((right, i) => shuffle(confusions(right)).filter((c) => {
    if (inAnswer.has(c)) return false;
    /* the one rule: never a wrong tile that spells a real twin of the word */
    const swapped = [...answer.slice(0, i), c, ...answer.slice(i + 1)].join('');
    return !(REAL.has(swapped) && soundsAlike(swapped, word.text));
  }));
  /* one from each sound in turn, in a random order, so the wrong tiles do
     not all gather round the first sound; a sound with more to offer gives
     a second when the others have run out */
  const candidates: string[] = [];
  const order = shuffle(answer.map((_, n) => n));
  for (let round = 0; candidates.length < wrong && round < 4; round += 1) {
    for (const i of order) {
      const c = options[i].find((x) => !candidates.includes(x));
      if (!c) continue;
      candidates.push(c);
      options[i] = options[i].filter((x) => x !== c);
      if (candidates.length >= wrong) break;
    }
  }
  /* last of all, a short vowel he did not need: a plain mistake, but a fair one */
  for (const v of shuffle(SHORT_VOWELS)) {
    if (candidates.length >= wrong) break;
    if (!inAnswer.has(v) && !candidates.includes(v)) candidates.push(v);
  }
  return { answer, tiles: shuffle([...answer, ...candidates.slice(0, wrong)]) };
}
