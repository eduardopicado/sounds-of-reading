/* A word cut into the letters that make each of its sounds: sh · i · p.
 *
 * Pass and Shoot gives each sound to a player and has him pass along the
 * line, so the cut has to be right — a player holding "s" and another holding
 * "h" in ship would be teaching him to say it wrong.
 *
 * The content file marks only the one sound a word is practising. That piece
 * is taken as given and never re-cut. The rest is cut with the spellings a
 * child has been taught by the word's level, longest first, so "sh" beats
 * "s" and "igh" beats "i".
 *
 * Only words of one syllable are cut at all, and never one with a split
 * spelling like a_e. That is deliberate, not a limit to fix: a single vowel
 * means no join between two parts of a word where "t" meets "h" (hothouse),
 * which is the one place longest-first would guess wrong, and a split
 * spelling cannot stand on one player. Anything else comes back null and
 * the game leaves it out, rather than guess. */

import { ALL_SOUNDS, sound, type Word } from './index';
import { NOT_SOUNDED_OUT } from './words';

export interface Piece {
  /** the letters, exactly as written in the word */
  text: string;
  at: number;
  /** true for the piece the word is practising, the only one with a known sound */
  target: boolean;
}

const VOWEL = /[aeiou]/;

/* ve says v, and only ever ends a word (no English word ends in v): have is
   h · a · ve, but vet is v · e · t and oven keeps its e */
const LAST_ONLY = new Set(['ve']);
const CONSONANT = new Set(['qu', 've']);

/** every plain spelling a child knows by this level, longest first */
function spellingsUpTo(level: number): string[] {
  const all = new Set<string>();
  for (const s of ALL_SOUNDS) {
    if (s.level > level) continue;
    for (const sp of s.spellings) if (!sp.includes('_')) all.add(sp);
  }
  return [...all].sort((a, b) => b.length - a.length);
}

/** cut a stretch with no marked sound in it, longest known spelling first */
function cutFree(text: string, from: number, known: string[], wordLength: number): Piece[] | null {
  const out: Piece[] = [];
  let i = 0;
  while (i < text.length) {
    const sp = known.find((k) =>
      text.startsWith(k, i) && (!LAST_ONLY.has(k) || from + i + k.length === wordLength));
    if (!sp) return null;
    out.push({ text: sp, at: from + i, target: false });
    i += sp.length;
  }
  return out;
}

/** the word's sounds in order, or null if it cannot be cut without guessing */
export function pieces(word: Word): Piece[] | null {
  /* a split spelling is two spans; one span is one piece */
  if (word.spans.length !== 1) return null;
  const text = word.text.toLowerCase();
  if (!/^[a-z]+$/.test(text)) return null;
  const [span] = word.spans;
  const known = spellingsUpTo(word.level);
  const before = cutFree(text.slice(0, span.at), 0, known, text.length);
  const after = cutFree(text.slice(span.at + span.len), span.at + span.len, known, text.length);
  if (!before || !after) return null;
  const cut = [...before, { text: text.slice(span.at, span.at + span.len), at: span.at, target: true }, ...after];

  /* qu is a consonant for all its u, ve for its e; y is a vowel anywhere but
     the start (yes against sky, and the second syllable of country) */
  const vowels = cut.filter((p) =>
    (VOWEL.test(p.text) && !CONSONANT.has(p.text)) || (p.text === 'y' && p.at > 0));
  if (vowels.length !== 1) return null;
  return cut;
}

/**
 * The sound of each piece of a word (keys of PHONEMES), for sounding it out
 * with the recorded sounds: sh · i · p.
 *
 * The piece the word practises has the word's own sound. Any other piece has
 * the sound of every spelling it could be by the word's level, and only if
 * they all agree: "i" in a level 4 word can only be the i in pin, but "th"
 * could be them or thin, and then the word is not sounded out at all (null)
 * rather than guessed. The content test checks every word this answers for
 * against the pronunciation dictionary.
 */
export function soundsOf(word: Word): string[] | null {
  if (NOT_SOUNDED_OUT.includes(word.text)) return null;
  const cut = pieces(word);
  if (!cut) return null;
  const out: string[] = [];
  for (const piece of cut) {
    if (piece.target) {
      const own = sound(word.sound).phoneme;
      if (!own) return null;
      out.push(own);
      continue;
    }
    const could = new Set(ALL_SOUNDS
      .filter((s) => s.level <= word.level && s.spellings.includes(piece.text))
      .map((s) => s.phoneme));
    const [only] = could;
    if (could.size !== 1 || !only) return null;
    out.push(only);
  }
  /* a doubled letter split in two is still one sound: e · gg, not e · g · g */
  return out.filter((p, i) => p !== out[i - 1]);
}
