/* A sticker book.
 *
 * Finishing a round earns a sticker, and the stickers collect on the home
 * screen. A reading game's sticker is for the sound that was practised most
 * in the round; a game that practises no one sound — maths, jiu-jitsu,
 * handwriting, tricky words, the commentator — gives its own. It is the one
 * thing that joins the games together and gives a reason to come back —
 * without scores, streaks against anyone else, or anything to lose.
 *
 * Kept in localStorage, so it is gone if a browser blocks storage. That is
 * fine: the games all work without it. */

import { PRACTICE_SOUNDS } from '../content/index';
import { read, write } from './storage';

/* one sticker per sound, picked by position so a sound always earns the same
   one — the child learns that ai is the rainbow */
const FACES = [
  '🌈', '🐝', '🚀', '🦊', '🌻', '🐳', '🎈', '🍀', '⭐', '🦋', '🐙', '🌵',
  '🍄', '🐢', '🎨', '🦒', '🌙', '🐌', '🍉', '🦉', '🧩', '🚂', '🐠', '🌟',
];

/** the book keeps the last this many, so it does not grow forever */
const KEEP = 60;

export interface Sticker {
  /** the sound a reading game's sticker is for */
  sound?: string;
  /** the game that gave it, for a game that practises no one sound */
  game?: string;
  face: string;
  at: number;
}

export const faceFor = (soundId: string): string => {
  const i = PRACTICE_SOUNDS.findIndex((s) => s.id === soundId);
  return FACES[(i < 0 ? 0 : i) % FACES.length];
};

const KNOWN = new Set(PRACTICE_SOUNDS.map((s) => s.id));

/**
 * The book as saved, keeping only stickers that make sense.
 *
 * A game's own sticker used to be saved with the game's id in `sound`, so a
 * sticker whose "sound" is not a sound is read as the game's. Anything that
 * is not a sticker at all — a hand-edited or half-written entry — is dropped
 * rather than breaking the home screen.
 */
export function stickers(): Sticker[] {
  const raw = read<unknown>('stickers', []);
  if (!Array.isArray(raw)) return [];
  const out: Sticker[] = [];
  for (const s of raw) {
    if (!s || typeof s !== 'object') continue;
    const { sound, game, face, at } = s as Record<string, unknown>;
    if (typeof face !== 'string' || typeof at !== 'number') continue;
    if (typeof game === 'string') out.push({ game, face, at });
    else if (typeof sound === 'string') out.push(KNOWN.has(sound) ? { sound, face, at } : { game: sound, face, at });
  }
  return out;
}

function add(sticker: Sticker): Sticker {
  write('stickers', [...stickers(), sticker].slice(-KEEP));
  return sticker;
}

/** the most-practised sound in a round wins the sticker */
export function award(soundIds: string[]): Sticker | null {
  if (!soundIds.length) return null;
  const counts = new Map<string, number>();
  for (const id of soundIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return add({ sound: best, face: faceFor(best), at: Date.now() });
}

/** a sticker for a game that practises no one sound: its own face */
export function awardFace(game: string, face: string): Sticker {
  return add({ game, face, at: Date.now() });
}

export function clearStickers(): void {
  write('stickers', []);
}
