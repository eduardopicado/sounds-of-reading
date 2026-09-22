/* Two spellings of one sound, and the rule that picks between them.
 *
 * This is a fact about the content rather than about any game, which is why
 * it lives here: it is derived from the grapheme positions in words.ts, and
 * the content test checks it against every word rather than trusting it.
 *
 * English does not like ending a word in i, so the vowel teams that use i
 * mid-word switch to y at the end — rain/day, soil/boy — and oa does the same
 * thing with w, boat/slow. One rule, three pairs.
 *
 * Pairs that look like this and are NOT this: ee/ea and ie/igh both sit
 * mid-word, so the choice between them is word-by-word memory with no rule
 * behind it. They are left out on purpose. Asking a child to choose where no
 * rule exists is a coin toss he is told he got wrong. */

import type { Word } from './index';

export interface Contrast {
  id: string;
  label: string;
  /** the spelling used inside a word */
  middle: string;
  /** the spelling used at the end of one */
  end: string;
}

export const CONTRASTS: Contrast[] = [
  { id: 'ai-ay', label: 'ai / ay', middle: 'ai', end: 'ay' },
  { id: 'oa-ow', label: 'oa / ow', middle: 'oa', end: 'ow-slow' },
  { id: 'oi-oy', label: 'oi / oy', middle: 'oi', end: 'oy' },
];

/** the single span this rule is about, or null when the word cannot be used */
export function contrastSpan(word: Word): { at: number; len: number } | null {
  if (word.spans.length !== 1) return null;
  return word.spans[0];
}

/**
 * Does this word do what the rule says it should?
 *
 * Real words that do not — crayon, always, royal, loyal, oyster, voyage,
 * bowl — are all more than one syllable, where the spelling belongs to the
 * syllable rather than the word. They are found by reading each word's own
 * grapheme position rather than by keeping a list here, so adding words to
 * words.ts cannot leave this stale.
 */
export function obeysRule(word: Word, contrast: Contrast): boolean {
  const span = contrastSpan(word);
  if (!span) return false;
  const atEnd = span.at + span.len === word.text.length;
  if (word.sound === contrast.end) return atEnd;
  if (word.sound === contrast.middle) return !atEnd;
  return false;
}

export const contrastFor = (soundId: string): Contrast | undefined =>
  CONTRASTS.find((c) => c.middle === soundId || c.end === soundId);
