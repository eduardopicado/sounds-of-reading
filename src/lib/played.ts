/* When he last finished a round of each game, for the coach's picks.
 *
 * The picks used to read this off the sticker book: a maths game's sticker
 * carried the game's id. But the book keeps only the last sixty stickers, so
 * after a busy week of reading games the maths games he had played fell out
 * of it and were offered as "Not tried yet" again; and a round with fewer
 * than half right wins no sticker, so it never counted as played at all.
 * This keeps one date per game instead, whatever the score. */

import { read, write } from './storage';
import { stickers } from './stickers';

const KEY = 'played';

/** game id → when a round of it last finished */
export function played(): Record<string, number> {
  const raw = read<unknown>(KEY, null);
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const out: Record<string, number> = {};
    for (const [game, at] of Object.entries(raw)) if (typeof at === 'number') out[game] = at;
    return out;
  }
  /* before this was kept, a game's own stickers were the only record */
  const out: Record<string, number> = {};
  for (const s of stickers()) if (s.game) out[s.game] = Math.max(out[s.game] ?? 0, s.at);
  return out;
}

/** a round of this game has just finished */
export function markPlayed(game: string): void {
  write(KEY, { ...played(), [game]: Date.now() });
}
