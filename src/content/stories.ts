/* Read and Point: a story cut into the words he can tap, and the sight words
 * worth hunting for in it.
 *
 * The stories are in words.ts (STORIES), read at the level of their hardest
 * word. Here a story becomes a row of pieces, a word each with the marks
 * that stick to it, so the game can make every word a thing to tap and keep
 * "start." on one line, and each word knows the sentence it is in, for
 * reading the story aloud a sentence at a time. */

import { ALL_SIGHT_WORDS, ALL_STORIES, type SightWord, type Story } from './index';

export interface Piece {
  /** the word as written, "The"; or, for a piece with no word, its marks */
  text: string;
  /** the word in lower case, for matching; null for a piece with no word */
  word: string | null;
  /** marks before and after the word, kept on its line: "start." and "\"You" */
  lead: string;
  tail: string;
  /** which sentence it is in, counting from 0 */
  sentence: number;
}

/** the story word by word, each with the marks that stick to it, sentence by sentence */
export function pieces(story: Story): Piece[] {
  const out: Piece[] = [];
  story.sentences.forEach((sentence, n) => {
    for (const chunk of sentence.split(/\s+/).filter(Boolean)) {
      const m = /^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$/.exec(chunk);
      out.push(m
        ? { text: m[2], word: m[2].toLowerCase(), lead: m[1], tail: m[3], sentence: n }
        : { text: chunk, word: null, lead: '', tail: '', sentence: n });
    }
  });
  return out;
}

/** each sight word in the story, in lower case, and how many times it comes */
export function sightCounts(story: Story, sight: readonly SightWord[]): Map<string, number> {
  const known = new Set(sight.map((w) => w.text.toLowerCase()));
  const counts = new Map<string, number>();
  for (const p of pieces(story)) {
    if (p.word && known.has(p.word)) counts.set(p.word, (counts.get(p.word) ?? 0) + 1);
  }
  return counts;
}

/**
 * The sight word to hunt for in a story: one that comes at least twice, so
 * finding one is not the end of it, and not a single letter (every a on a
 * page is no hunt) unless the story has nothing else. Among those, any; the
 * caller's random number picks, so a story read again asks for another.
 */
export function huntFor(story: Story, sight: readonly SightWord[], rand: () => number = Math.random): string | null {
  const counts = [...sightCounts(story, sight).entries()];
  const good = counts.filter(([w, n]) => n >= 2 && w.length > 1);
  const pool = good.length ? good : counts.filter(([, n]) => n >= 2).length ? counts.filter(([, n]) => n >= 2) : counts;
  if (!pool.length) return null;
  return pool[Math.floor(rand() * pool.length)][0];
}

/** what he is asked to find: one sight word, or all of them */
export const findLine = (target: string | null): string => (target ? `Find every ${target}.` : 'Find every sight word.');

/**
 * Everything Read and Point says, so each can be recorded: every sentence of
 * every story (read aloud a sentence at a time), every word he can tap, and
 * what he is asked to find, for every sight word a story has.
 */
export function storyLines(): string[] {
  const out = new Set<string>([findLine(null)]);
  for (const story of ALL_STORIES) {
    for (const sentence of story.sentences) out.add(sentence);
    for (const p of pieces(story)) if (p.word) out.add(p.text);
    for (const w of sightCounts(story, ALL_SIGHT_WORDS).keys()) out.add(findLine(w));
  }
  return [...out];
}
