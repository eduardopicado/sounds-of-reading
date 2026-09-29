/* The coach: a quiet record of how each sound is going.
 *
 * Every answer in a game that has a right answer is noted against the sound
 * the word practises and the level it belongs to. Nothing else is kept — no
 * words, no times, no names — and none of it leaves the device.
 *
 * The record is used three ways:
 *
 *   - the games draw more words from the sounds he is missing, so practice
 *     goes where it is needed instead of where it is easy (coachPick);
 *   - once the top level he is on is mastered, the coach moves the week up a
 *     level on its own, and says so on the home screen with an undo, because
 *     the parent may be keeping in step with school (maybeLevelUp);
 *   - the home screen tells the parent which sounds are going well and which
 *     need practice (report).
 *
 * The thresholds are deliberately plain. "Mastered" is 23 right out of the
 * last 25 at that level: high enough that a lucky run does not count, low
 * enough that one slip of the finger does not hold him back. */

import type { Level } from '../content/index';
import { read, write } from './storage';
import { settings, updateSettings } from './settings';
import { shuffle } from './random';

/** answers remembered for each sound */
const PER_SOUND = 12;
/** a sound is judged only after this many answers */
const JUDGE_AFTER = 6;
/** below this share right, a sound needs practice */
const WEAK_BELOW = 0.75;
/** at or above this share right, a sound is going well */
const STRONG_FROM = 0.9;
/** answers at a level that decide a move up, and how many of them must be right */
const LEVEL_RUN = 25;
const LEVEL_UP_AT = 23;

export interface Move {
  from: Level[];
  fromSounds: string[];
  to: Level[];
  at: number;
  /** the parent has seen the note on the home screen and closed it */
  seen: boolean;
}

interface CoachRecord {
  /** per sound id, the last answers as a string of 1s and 0s, oldest first */
  sounds: Record<string, string>;
  /** the same, per level */
  levels: Record<string, string>;
  moved?: Move;
}

function load(): CoachRecord {
  const r = read<Partial<CoachRecord>>('coach', {});
  return { sounds: r.sounds ?? {}, levels: r.levels ?? {}, moved: r.moved };
}

const rights = (run: string): number => [...run].filter((c) => c === '1').length;

/** note one answer against the word's sound and level */
export function mark(word: { sound: string; level: Level }, ok: boolean): void {
  const rec = load();
  const bit = ok ? '1' : '0';
  rec.sounds[word.sound] = ((rec.sounds[word.sound] ?? '') + bit).slice(-PER_SOUND);
  rec.levels[word.level] = ((rec.levels[word.level] ?? '') + bit).slice(-LEVEL_RUN);
  write('coach', rec);
}

export interface SoundReport { id: string; tries: number; right: number }

/** every sound with enough answers to judge */
export function report(): SoundReport[] {
  return Object.entries(load().sounds)
    .map(([id, run]) => ({ id, tries: run.length, right: rights(run) }))
    .filter((r) => r.tries >= JUDGE_AFTER);
}

export const weakSounds = (): string[] =>
  report().filter((r) => r.right / r.tries < WEAK_BELOW).map((r) => r.id);

export const strongSounds = (): string[] =>
  report().filter((r) => r.right / r.tries >= STRONG_FROM).map((r) => r.id);

/**
 * `n` items from the pool, shuffled, with up to half of them from the sounds
 * he is finding hard. Never more than half: a round made only of the things
 * he gets wrong is no fun, and fun is what keeps him playing.
 */
export function coachPick<T extends { sound: string }>(pool: readonly T[], n: number): T[] {
  const mixed = shuffle(pool);
  const weak = new Set(settings().coach ? weakSounds() : []);
  if (!weak.size) return mixed.slice(0, n);
  const hard = mixed.filter((w) => weak.has(w.sound));
  const rest = mixed.filter((w) => !weak.has(w.sound));
  const first = hard.slice(0, Math.ceil(n / 2));
  const fill = [...rest, ...hard.slice(first.length)].slice(0, n - first.length);
  return shuffle([...first, ...fill]);
}

/**
 * Called when the home screen opens. If the top level of the week is
 * mastered, move the week up one: the level just mastered and the next.
 * The sound picks are cleared, since the ones chosen belonged to the old
 * levels, and everything is kept so the parent can undo it.
 */
export function maybeLevelUp(): Move | null {
  const s = settings();
  if (!s.coach || !s.levels.length) return null;
  const top = Math.max(...s.levels);
  if (top >= 8) return null;
  const rec = load();
  const run = rec.levels[top] ?? '';
  if (run.length < LEVEL_RUN || rights(run) < LEVEL_UP_AT) return null;

  const to = [top, top + 1] as Level[];
  const move: Move = { from: [...s.levels], fromSounds: [...s.sounds], to, at: Date.now(), seen: false };
  rec.moved = move;
  write('coach', rec);
  updateSettings({ levels: to, sounds: [] });
  return move;
}

/** the last move, while the parent has not yet closed the note about it */
export function unseenMove(): Move | null {
  const m = load().moved;
  return m && !m.seen ? m : null;
}

export function closeMove(): void {
  const rec = load();
  if (rec.moved) rec.moved.seen = true;
  write('coach', rec);
}

/** put the week back where it was, and make the coach earn the move again */
export function undoMove(): void {
  const rec = load();
  const m = rec.moved;
  if (!m) return;
  updateSettings({ levels: m.from, sounds: m.fromSounds });
  const top = Math.max(...m.from);
  rec.levels[top] = '';
  rec.moved = { ...m, seen: true };
  write('coach', rec);
}

export function resetCoach(): void {
  write('coach', {});
}
