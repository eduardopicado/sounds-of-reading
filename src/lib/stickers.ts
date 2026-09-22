/* A sticker book.
 *
 * Finishing a round earns a sticker for the sound that was practised most in
 * it, and the stickers collect on the home screen. It is the one thing that
 * joins the eight games together and gives a reason to come back — without
 * scores, streaks against anyone else, or anything to lose.
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

export interface Sticker { sound: string; face: string; at: number }

export const faceFor = (soundId: string): string => {
  const i = PRACTICE_SOUNDS.findIndex((s) => s.id === soundId);
  return FACES[(i < 0 ? 0 : i) % FACES.length];
};

export const stickers = (): Sticker[] => read<Sticker[]>('stickers', []);

/** the most-practised sound in a round wins the sticker */
export function award(soundIds: string[]): Sticker | null {
  if (!soundIds.length) return null;
  const counts = new Map<string, number>();
  for (const id of soundIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const sticker: Sticker = { sound: best, face: faceFor(best), at: Date.now() };
  /* keep the book from growing forever */
  write('stickers', [...stickers(), sticker].slice(-60));
  return sticker;
}

export function clearStickers(): void {
  write('stickers', []);
}
