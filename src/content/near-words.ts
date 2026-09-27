/* The wrong answers that sit next to a right one.
 *
 * A reading question is only as good as its wrong answers. With fish beside
 * cat and sun, a child can pick fish from the f alone, or from its length,
 * without reading it. With fish beside dish and fist he has to read every
 * letter, because the first letter or the ending is all that separates them.
 *
 * So the nearest real words win, by how many letters would have to change to
 * turn one into the other. Two rules sit on top, because without them the
 * question has no single right answer:
 *
 *   - never a word that sounds the same (pair and pear), when the word is
 *     heard rather than seen — see SOUNDS_ALIKE;
 *   - never a word with the same picture, when a picture is the question.
 *
 * The pool is whatever the caller passes, so it is always words the child
 * can read at his level: a lookalike he has never been taught to decode is
 * a guess, not a distractor. */

import { soundsAlike, type Word } from './index';
import { shuffle } from '../lib/random';

/** how many single-letter changes turn one word into the other */
export function editDistance(a: string, b: string): number {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= y.length; j += 1) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[y.length];
}

export interface NearOptions {
  /** the question is a picture, so no other word may share it */
  picture?: boolean;
}

/** the `n` real words from `pool` that look most like `target` and could never be mistaken for its answer */
export function nearWords(target: Word, pool: readonly Word[], n: number, options: NearOptions = {}): Word[] {
  const seen = new Set([target.text.toLowerCase()]);
  const fair: Word[] = [];
  /* shuffled first, so words at the same distance take turns rather than
     the same two turning up every time */
  for (const w of shuffle(pool)) {
    const key = w.text.toLowerCase();
    if (seen.has(key)) continue;
    if (soundsAlike(key, target.text)) continue;
    if (options.picture && w.picture && w.picture === target.picture) continue;
    seen.add(key);
    fair.push(w);
  }
  return fair
    .map((w) => ({ w, d: editDistance(w.text, target.text) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.w);
}
