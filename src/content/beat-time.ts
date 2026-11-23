/* Beat Your Time: a story read aloud three times, a grown-up timing each
 * read, and the three reads raced against each other.
 *
 * Reading the same text again is the best-evidenced way to build reading
 * speed: each read is quicker and smoother than the one before, and the
 * race makes that something he can see. The stories are Read and Point's
 * (STORIES in words.ts), so every word is one he can read at its level.
 *
 * Here is what the game works out and says; the game draws it. */

import { ALL_STORIES, type Level, type Story } from './index';
import { pieces } from './stories';

/** a story is read this many times */
export const READS = 3;

/** the words he reads in a story, not counting the title */
export const wordCount = (story: Story): number => pieces(story).filter((p) => p.word).length;

/** the stories up to a level: his own level and the one below first, then the
 * rest, easiest first within each */
export function storiesUpTo(upTo: Level): Story[] {
  const fit = ALL_STORIES.filter((s) => s.level <= upTo);
  const near = fit.filter((s) => s.level >= upTo - 1).sort((a, b) => b.level - a.level);
  const rest = fit.filter((s) => s.level < upTo - 1).sort((a, b) => b.level - a.level);
  return [...near, ...rest];
}

/** whole seconds, the way a time is shown: "48 seconds", "1 minute 5 seconds" */
export function timeText(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  const secs = `${s} second${s === 1 ? '' : 's'}`;
  if (!m) return secs;
  const mins = `${m} minute${m === 1 ? '' : 's'}`;
  return s ? `${mins} ${secs}` : mins;
}

/** the running clock, 0:48 */
export function clockText(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** words read right in a minute, for the grown-up: the words he got stuck on
 * do not count */
export function perMinute(words: number, stuck: number, ms: number): number {
  if (ms <= 0) return 0;
  return Math.round((Math.max(0, words - stuck) * 60000) / ms);
}

/** under half a second either way is the same time */
const SAME_MS = 500;

export type Outcome = 'first' | 'faster' | 'same' | 'slower';

/** how a read went against the one before it */
export function outcome(before: number | null, now: number): Outcome {
  if (before === null) return 'first';
  if (now < before - SAME_MS) return 'faster';
  if (now > before + SAME_MS) return 'slower';
  return 'same';
}

/** what is shown after a read, against the one before */
export function compareText(before: number | null, now: number): string {
  switch (outcome(before, now)) {
    case 'first': return `${timeText(now)}. Now read it again!`;
    case 'faster': {
      const gap = Math.max(1, Math.round((before! - now) / 1000));
      return `${gap} second${gap === 1 ? '' : 's'} faster!`;
    }
    case 'same': return 'Just the same time!';
    case 'slower': return 'A little slower this time. That is OK!';
  }
}

/** each read's place in the race, 1 for the fastest; the same time shares a place */
export function places(times: readonly number[]): number[] {
  return times.map((t) => 1 + times.filter((o) => o < t - SAME_MS).length);
}

export const MEDALS = ['🥇', '🥈', '🥉'] as const;

/** everything the game says: each is recorded once */
export const SAYS = {
  go: 'Ready, set, go!',
  first: 'Now read it again. Can you beat your time?',
  faster: 'You beat your time!',
  same: 'Just the same! Try again.',
  slower: 'Good reading! Try again.',
  best: 'Your fastest read ever!',
  doneFaster: 'Three reads! Look how much faster you got.',
  done: 'Three reads! Great reading.',
} as const;

/** what is said after a read */
export function afterSays(before: number | null, now: number, last: boolean): string {
  const o = outcome(before, now);
  if (last) return SAYS[o === 'faster' ? 'faster' : o === 'same' ? 'same' : 'slower'];
  return SAYS[o];
}

/** the lines to record: these, and the stories, which Read and Point records */
export const beatLines = (): string[] => [...new Set(Object.values(SAYS))];

/** a best time kept for each story, by title; anything else saved there is ignored */
export function cleanBests(saved: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return out;
  const titles = new Set(ALL_STORIES.map((s) => s.title));
  for (const [k, v] of Object.entries(saved as Record<string, unknown>)) {
    if (titles.has(k) && typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = v;
  }
  return out;
}
