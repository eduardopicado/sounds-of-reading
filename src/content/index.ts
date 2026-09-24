/* Turns the hand-written content file into typed data the games can use.
 *
 * The one job that matters here: work out exactly which letters to underline,
 * and refuse to guess. A spelling that appears twice in a word with no
 * brackets to say which one is meant throws, and the content test turns that
 * into a failing build rather than a child seeing "in *the* bath". */

import {
  SOUNDS, FAMILIES, PHRASES, LEVELS, BLOCKLIST, SIGHT_WORDS,
  type SoundSpec, type FamilySpec, type Level, type Slot,
} from './words';
import { tonesFor, type Tones } from '../lib/colour';
import { ContentError, resolveSpans, unmark, type Span } from './spans';

export type { Level, Slot, SoundSpec, FamilySpec };
export { LEVELS, BLOCKLIST };
export { ContentError, resolveSpans, unmark, type Span } from './spans';

export interface Sound extends SoundSpec {
  tones: Tones;
}

export interface Word {
  text: string;
  picture?: string;
  /** the level a child needs to decode this, not just to know its sound */
  level: Level;
  sound: string;
  spans: Span[];
  real: boolean;
}

/**
 * A word that cannot be sounded out, and the part of it that misbehaves.
 *
 * Deliberately not a Word: a Word carries the sound it practises, and a
 * tricky word practises no sound at all — the whole point is that the letters
 * lie. Forcing one into the other would mean inventing a sound for "said".
 */
export interface SightWord {
  text: string;
  /** the letters that do not say what they should */
  spans: Span[];
  /** which set it was taught in, for the parent to choose between */
  set: string;
}

export interface Phrase {
  text: string;
  slot: Slot;
  sound: string;
  level: Level;
  spans: Span[];
}

const LEVEL_RE = /^@([1-8])$/;

function parseWordList(raw: string, sound: SoundSpec, real: boolean): Word[] {
  if (!raw.trim()) return [];
  return raw.split('|').map((chunk) => {
    const bits = chunk.trim().split(/\s+/).filter(Boolean);
    const marked = bits.shift();
    if (!marked) throw new ContentError(`${sound.id}: empty entry in word list`);
    let level: Level = sound.level;
    let picture: string | undefined;
    for (const bit of bits) {
      const m = LEVEL_RE.exec(bit);
      if (m) level = Number(m[1]) as Level;
      else picture = bit;
    }
    const { text, spans } = resolveSpans(marked, sound.spellings, `${sound.id} ${real ? 'words' : 'silly'}`);
    return { text, picture, level, sound: sound.id, spans, real };
  });
}

/* ── the loaded content ──────────────────────────────────────────────────── */

export const ALL_SOUNDS: Sound[] = SOUNDS.map((s) => ({
  ...s,
  tones: tonesFor(s.hue ?? 0),
}));

export const SOUND_BY_ID: ReadonlyMap<string, Sound> = new Map(ALL_SOUNDS.map((s) => [s.id, s]));

export function sound(id: string): Sound {
  const s = SOUND_BY_ID.get(id);
  if (!s) throw new ContentError(`no sound "${id}"`);
  return s;
}

/** the sounds a game may offer as a target */
export const PRACTICE_SOUNDS: Sound[] = ALL_SOUNDS.filter((s) => s.practice);

export const REAL_WORDS: Word[] = PRACTICE_SOUNDS.flatMap((s) => parseWordList(s.words ?? '', s, true));
export const SILLY_WORDS: Word[] = PRACTICE_SOUNDS.flatMap((s) => parseWordList(s.silly ?? '', s, false));

export const ALL_SIGHT_WORDS: SightWord[] = Object.entries(SIGHT_WORDS).flatMap(([set, raw]) =>
  raw.split('|').map((chunk) => {
    const marked = chunk.trim();
    if (!marked) throw new ContentError(`${set}: empty entry in the tricky word list`);
    /* unmark, not resolveSpans: the brackets here mark the letters that lie,
       and there is no sound they are supposed to be spelling */
    const { text, spans } = unmark(marked);
    if (!spans.length) {
      throw new ContentError(`${set}: "${text}" has no bracketed part — if nothing about it is irregular, it is a word to sound out, not one to memorise`);
    }
    return { text, spans, set };
  }),
);

/** the sets a parent can choose between, in the order they are taught */
export const SIGHT_SETS: string[] = Object.keys(SIGHT_WORDS);

export const ALL_FAMILIES: FamilySpec[] = FAMILIES;

/** what a family build spells out: onset + rime, either way round */
export function buildWord(family: FamilySpec, part: string): string {
  return family.kind === 'rime' ? part + family.fixed : family.fixed + part;
}

/** where the practised sound sits in a built word */
export function familySpans(family: FamilySpec, part: string): Span[] {
  const word = buildWord(family, part);
  const s = sound(family.sound);
  try {
    return resolveSpans(word, s.spellings, `family ${family.id}`).spans;
  } catch {
    return [];
  }
}

export const ALL_PHRASES: Phrase[] = (Object.keys(PHRASES) as Slot[]).flatMap((slot) =>
  PHRASES[slot].split('|').map((chunk) => {
    const raw = chunk.trim();
    const m = /^(.*?)\s*~(\S+)(?:\s*@([1-8]))?$/.exec(raw);
    if (!m) throw new ContentError(`phrase "${raw}" needs a ~sound tag`);
    const [, marked, soundId, lvl] = m;
    const s = sound(soundId);
    const { text, spans } = resolveSpans(marked, s.spellings, `phrase "${marked}"`);
    return { text, slot, sound: soundId, level: (lvl ? Number(lvl) : s.level) as Level, spans };
  }),
);

/* ── queries the games use ───────────────────────────────────────────────── */

export interface Filter {
  sounds?: readonly string[];
  levels?: readonly Level[];
}

const inLevels = (level: Level, levels?: readonly Level[]) => !levels || levels.length === 0 || levels.includes(level);
const inSounds = (id: string, sounds?: readonly string[]) => !sounds || sounds.length === 0 || sounds.includes(id);

export const realWords = (f: Filter = {}): Word[] =>
  REAL_WORDS.filter((w) => inSounds(w.sound, f.sounds) && inLevels(w.level, f.levels));

export const sillyWords = (f: Filter = {}): Word[] =>
  SILLY_WORDS.filter((w) => inSounds(w.sound, f.sounds) && inLevels(w.level, f.levels));

export const phrases = (f: Filter = {}): Phrase[] =>
  ALL_PHRASES.filter((p) => inSounds(p.sound, f.sounds) && inLevels(p.level, f.levels));

export const families = (f: Filter = {}): FamilySpec[] =>
  ALL_FAMILIES.filter((fam) => inSounds(fam.sound, f.sounds) && inLevels(fam.level, f.levels));

/** practice sounds that survive a filter, in level order */
export const soundsFor = (f: Filter = {}): Sound[] =>
  PRACTICE_SOUNDS.filter((s) => inSounds(s.id, f.sounds) && inLevels(s.level, f.levels));

/** words with a picture, for the games that show one */
export const picturable = (words: Word[]): Word[] => words.filter((w) => !!w.picture);
