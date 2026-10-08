/* The content test. It is the reason a six-year-old is not told that "vain"
 * is a made-up word, or shown "in *the* bath" with the wrong th underlined.
 *
 * Run it before committing any content change:  npm run validate:content */

import { describe, expect, it } from 'vitest';
import {
  ALL_FAMILIES, ALL_PHRASES, ALL_SOUNDS, BLOCKLIST, PRACTICE_SOUNDS,
  REAL_WORDS, SILLY_WORDS, buildWord, familySpans, realWords, sound, type Level,
  ALL_SIGHT_WORDS, SIGHT_SETS, PRACTICE_SOUNDS as ALL_PRACTICE, mightContain,
  SOUNDS_ALIKE, soundsAlike, ALL_COMMENTARY,
} from '../src/content/index';
import { editDistance, nearWords } from '../src/content/near-words';
import { pieces } from '../src/content/graphemes';
import { confusions, tilesFor } from '../src/content/spelling';
import { FAMILIES, GLYPHS, HEIGHTS, exampleFor, glyph, heightOf } from '../src/content/handwriting';
import { SORT_SETS } from '../src/content/sort-sets';
import { fitsAnother, uniqueWords, SOUND_BY_ID } from '../src/content/index';
import { judge, parsePath, samplePath, type Point } from '../src/lib/strokes';
import { dictionary as CMU } from 'cmu-pronouncing-dictionary';
import { CONTRASTS, contrastSpan, obeysRule } from '../src/content/contrasts';
import { clipId } from '../src/lib/clip-id';
import { wanted } from '../tools/make-audio';
import { contrast, INK, PAPER } from '../src/lib/colour';

import ENGLISH from 'an-array-of-english-words/index.json';

const DICTIONARY = new Set(ENGLISH as string[]);

const isRealWord = (w: string) => DICTIONARY.has(w.toLowerCase());
/** a blocked word, or a word that has one sitting inside it */
const blocked = (w: string) => BLOCKLIST.find((bad) => w.toLowerCase() === bad);

describe('sounds', () => {
  it('every id is unique', () => {
    const seen = new Set<string>();
    const dupes = ALL_SOUNDS.filter((s) => (seen.has(s.id) ? true : (seen.add(s.id), false)));
    expect(dupes.map((d) => d.id)).toEqual([]);
  });

  it('every sound that a game can offer has a hue and words', () => {
    const thin = PRACTICE_SOUNDS.filter((s) => s.hue === undefined || !s.words?.trim());
    expect(thin.map((s) => s.id)).toEqual([]);
  });

  it('every level from 1 to 8 has something to practise', () => {
    for (let level = 1; level <= 8; level += 1) {
      const here = PRACTICE_SOUNDS.filter((s) => s.level === level);
      expect(here.length, `level ${level} has no practice sounds`).toBeGreaterThan(0);
    }
  });

  it('both tones of every sound meet WCAG AA', () => {
    const failures = PRACTICE_SOUNDS.flatMap((s) => {
      const out: string[] = [];
      if (contrast(s.tones.deep, PAPER) < 4.5) out.push(`${s.id} deep ${s.tones.deep} on paper`);
      if (contrast(s.tones.light, INK) < 4.5) out.push(`${s.id} light ${s.tones.light} under ink`);
      return out;
    });
    expect(failures).toEqual([]);
  });
});

describe('real words', () => {
  it('each one really contains its grapheme where it says it does', () => {
    const wrong = REAL_WORDS.filter((w) => {
      const spellings = sound(w.sound).spellings;
      const marked = w.spans.map((s) => w.text.slice(s.at, s.at + s.len).toLowerCase()).join('_');
      return !spellings.some((sp) => sp === marked || sp === marked.replace(/_/g, ''));
    });
    expect(wrong.map((w) => `${w.text} (${w.sound})`)).toEqual([]);
  });

  it('each one is a real English word', () => {
    const fake = REAL_WORDS.filter((w) => /^[a-z]+$/.test(w.text) && !isRealWord(w.text));
    expect(fake.map((w) => `${w.text} (${w.sound})`)).toEqual([]);
  });

  it('none is on the blocklist', () => {
    const bad = REAL_WORDS.filter((w) => blocked(w.text));
    expect(bad.map((w) => w.text)).toEqual([]);
  });

  it('a sound a child practises has enough words not to repeat straight away', () => {
    const thin = PRACTICE_SOUNDS
      .filter((s) => s.level >= 4)
      .map((s) => ({ id: s.id, n: REAL_WORDS.filter((w) => w.sound === s.id).length }))
      .filter((x) => x.n < 12);
    expect(thin).toEqual([]);
  });
});

describe('silly words', () => {
  it('none is secretly a real English word', () => {
    const real = SILLY_WORDS.filter((w) => isRealWord(w.text));
    expect(real.map((w) => `${w.text} (${w.sound})`)).toEqual([]);
  });

  it('each one still contains the sound it is meant to practise', () => {
    const missing = SILLY_WORDS.filter((w) => {
      const spellings = sound(w.sound).spellings;
      const marked = w.spans.map((s) => w.text.slice(s.at, s.at + s.len).toLowerCase()).join('_');
      return !spellings.some((sp) => sp === marked || sp === marked.replace(/_/g, ''));
    });
    expect(missing.map((w) => `${w.text} (${w.sound})`)).toEqual([]);
  });

  it('none is on the blocklist', () => {
    const bad = SILLY_WORDS.filter((w) => blocked(w.text));
    expect(bad.map((w) => w.text)).toEqual([]);
  });

  it('no word is both real and silly', () => {
    const reals = new Set(REAL_WORDS.map((w) => w.text.toLowerCase()));
    const both = SILLY_WORDS.filter((w) => reals.has(w.text.toLowerCase()));
    expect(both.map((w) => w.text)).toEqual([]);
  });
});

describe('word families', () => {
  it('every family practises a sound that exists', () => {
    expect(() => ALL_FAMILIES.forEach((f) => sound(f.sound))).not.toThrow();
  });

  it('every "real" build really is a word', () => {
    const fake = ALL_FAMILIES.flatMap((f) =>
      f.real.map((p) => buildWord(f, p)).filter((w) => !isRealWord(w)).map((w) => `${f.id}: ${w}`),
    );
    expect(fake).toEqual([]);
  });

  it('every "silly" build really is not a word', () => {
    const real = ALL_FAMILIES.flatMap((f) =>
      f.silly.map((p) => buildWord(f, p)).filter((w) => isRealWord(w)).map((w) => `${f.id}: ${w}`),
    );
    expect(real).toEqual([]);
  });

  it('no build is on the blocklist', () => {
    const bad = ALL_FAMILIES.flatMap((f) =>
      [...f.real, ...f.silly].map((p) => buildWord(f, p)).filter(blocked).map((w) => `${f.id}: ${w}`),
    );
    expect(bad).toEqual([]);
  });

  it('no onset is listed as both real and silly', () => {
    const clash = ALL_FAMILIES.flatMap((f) =>
      f.real.filter((p) => f.silly.includes(p)).map((p) => `${f.id}: ${p}`),
    );
    expect(clash).toEqual([]);
  });

  /* Most builds in a family do not contain the target sound — the point of
     the -ent family is that "gent" stands out among sent, tent and went. What
     matters is that at least one real build does, so the family teaches it. */
  it('every family has at least one real build containing its sound', () => {
    const useless = ALL_FAMILIES
      .filter((f) => !f.real.some((p) => familySpans(f, p).length > 0))
      .map((f) => `${f.id} (~${f.sound})`);
    expect(useless).toEqual([]);
  });

  it('a family has enough real words to be worth finishing', () => {
    const thin = ALL_FAMILIES.filter((f) => f.real.length < 4).map((f) => f.id);
    expect(thin).toEqual([]);
  });
});

describe('sentence phrases', () => {
  it('every phrase underlines letters that really are its sound', () => {
    const wrong = ALL_PHRASES.filter((p) => {
      const spellings = sound(p.sound).spellings;
      const marked = p.spans.map((s) => p.text.slice(s.at, s.at + s.len).toLowerCase()).join('_');
      return !spellings.some((sp) => sp === marked || sp === marked.replace(/_/g, ''));
    });
    expect(wrong.map((p) => `${p.text} (~${p.sound})`)).toEqual([]);
  });

  it('every slot has phrases at a range of levels', () => {
    for (const slot of ['who', 'did', 'what', 'where'] as const) {
      const here = ALL_PHRASES.filter((p) => p.slot === slot);
      expect(here.length, `slot ${slot}`).toBeGreaterThan(8);
    }
  });

  it('no phrase contains a blocked word', () => {
    const bad = ALL_PHRASES.filter((p) => p.text.split(/\s+/).some(blocked));
    expect(bad.map((p) => p.text)).toEqual([]);
  });
});

describe('spelling contrasts', () => {
  const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8] as Level[];

  it('every pair has enough words on both sides to play with', () => {
    for (const c of CONTRASTS) {
      for (const id of [c.middle, c.end]) {
        const usable = realWords({ sounds: [id], levels: LEVELS }).filter((w) => obeysRule(w, c));
        expect(usable.length, `${c.label} — ${id}`).toBeGreaterThan(7);
      }
    }
  });

  /* The game only ever asks about a word the rule gets right, so the child is
     never marked wrong for applying what he has just been taught. This is the
     check that keeps that true as words.ts grows. */
  it('the rule it teaches is the rule the words follow', () => {
    for (const c of CONTRASTS) {
      const asked = realWords({ sounds: [c.middle, c.end], levels: LEVELS }).filter((w) => obeysRule(w, c));
      const wrong = asked.filter((w) => {
        const span = contrastSpan(w);
        if (!span) return true;
        const atEnd = span.at + span.len === w.text.length;
        return w.sound === c.end ? !atEnd : atEnd;
      });
      expect(wrong.map((w) => w.text), c.label).toEqual([]);
    }
  });

  /* The words the rule would get wrong are real and must stay in the app for
     every other game — they are only kept out of this one. If this list ever
     empties, the exclusion has silently stopped working. */
  it('still recognises the words that break the rule', () => {
    const broken: string[] = [];
    for (const c of CONTRASTS) {
      for (const w of realWords({ sounds: [c.middle, c.end], levels: LEVELS })) {
        if (!obeysRule(w, c)) broken.push(w.text);
      }
    }
    expect(broken.sort()).toEqual(
      ['always', 'bowl', 'crayon', 'loyal', 'oyster', 'royal', 'voyage'],
    );
  });

  it('leaves out the pairs that have no rule behind them', () => {
    const ids = CONTRASTS.flatMap((c) => [c.middle, c.end]);
    /* ee/ea and ie/igh both sit mid-word: there is nothing to teach */
    for (const id of ['ee', 'ea', 'ie', 'igh']) expect(ids).not.toContain(id);
  });
});

describe('recorded audio', () => {
  /* One word playing another word's recording is the sort of fault nobody
     reports and everybody notices, so the ids are checked for collisions
     across every string the app actually speaks. */
  it('gives every spoken string its own clip id', () => {
    const byId = new Map<string, string>();
    const clash: string[] = [];
    for (const text of wanted()) {
      const id = clipId(text);
      const other = byId.get(id);
      if (other) clash.push(`${text} / ${other}`);
      byId.set(id, text);
    }
    expect(clash).toEqual([]);
  });

  it('records real words and never made-up ones', () => {
    const list = new Set(wanted());
    const silly = SILLY_WORDS.filter((w) => list.has(w.text.toLowerCase()));
    expect(silly.map((w) => w.text)).toEqual([]);
    /* and the real ones really are all there */
    const missing = REAL_WORDS.filter((w) => !list.has(w.text.toLowerCase()));
    expect(missing.map((w) => w.text)).toEqual([]);
  });

  it('is the same id in the tool and in the app', () => {
    /* the generator and the browser must agree or every word silently falls
       back to the device voice */
    expect(clipId('rain')).toBe(clipId(' Rain '));
    expect(clipId('rain')).not.toBe(clipId('rayn'));
    expect(clipId('rain')).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('tricky words', () => {
  it('is a real English word, every one of them', () => {
    /* on the school list, and too short for the dictionary to hold as words */
    const abbreviations = new Set(['ok', 'Mr', 'Mrs']);
    const unknown = ALL_SIGHT_WORDS.filter((w) => !isRealWord(w.text) && !abbreviations.has(w.text));
    expect(unknown.map((w) => w.text)).toEqual([]);
  });

  /* A word with nothing bracketed has nothing irregular about it, so it is
     only a sight word until its sounds are taught. It has to contain a sound
     taught at its level or later — otherwise he could already sound it out,
     and telling a child to memorise a word he can read is teaching him to
     stop reading. A word outside the school's levels has no such excuse. */
  it('leaves a word unmarked only while its sounds are still to come', () => {
    const readable = ALL_SIGHT_WORDS
      .filter((w) => !w.spans.length)
      .filter((w) => w.level === null || !ALL_SOUNDS.some((s) => s.level >= (w.level ?? 9) && mightContain(w.text, s)));
    expect(readable.map((w) => `${w.text} (${w.set})`)).toEqual([]);
  });

  it('marks letters that are really in the word', () => {
    const wrong = ALL_SIGHT_WORDS.filter((w) =>
      w.spans.some((s) => s.at < 0 || s.at + s.len > w.text.length));
    expect(wrong.map((w) => w.text)).toEqual([]);
  });

  it('never lists the same word twice', () => {
    const seen = new Set<string>();
    const twice = ALL_SIGHT_WORDS.filter((w) => !seen.has(w.text) ? (seen.add(w.text), false) : true);
    expect(twice.map((w) => w.text)).toEqual([]);
  });

  it('has enough words in every set to fill a round of four choices', () => {
    for (const set of SIGHT_SETS) {
      const here = ALL_SIGHT_WORDS.filter((w) => w.set === set);
      expect(here.length, set).toBeGreaterThan(3);
    }
  });

  it('shows no blocked word', () => {
    expect(ALL_SIGHT_WORDS.filter((w) => blocked(w.text)).map((w) => w.text)).toEqual([]);
  });
});

describe('dodge words', () => {
  /* In Sound Rocket a word without the sound costs a shield. If a dodge word
     secretly had the sound, a child would be punished for reading correctly. */
  it('recognises a sound hiding inside another sound\'s word', () => {
    expect(mightContain('bed', sound('e'))).toBe(true);
    expect(mightContain('fish', sound('sh'))).toBe(true);
    expect(mightContain('chip', sound('sh'))).toBe(false);
  });

  it('sees split digraphs through the consonant between', () => {
    expect(mightContain('shake', sound('a-e'))).toBe(true);
    expect(mightContain('snake', sound('a-e'))).toBe(true);
    expect(mightContain('shack', sound('a-e'))).toBe(false);
  });

  /* The filter is generous, and for a sound like e it throws out a lot. Every
     sound the game can offer must still leave plenty to dodge, or the round
     would be nothing but targets. */
  it('leaves enough dodge words for every sound the game can offer', () => {
    const all = [1, 2, 3, 4, 5, 6, 7, 8] as Level[];
    const thin: string[] = [];
    for (const target of ALL_PRACTICE) {
      if (realWords({ sounds: [target.id], levels: all }).length < 6) continue;
      const others = ALL_PRACTICE.filter((s) => s.id !== target.id).map((s) => s.id);
      const dodges = realWords({ sounds: others, levels: all }).filter((w) => !mightContain(w.text, target));
      if (dodges.length < 40) thin.push(`${target.id}: ${dodges.length}`);
    }
    expect(thin).toEqual([]);
  });
});

/* ── words that sound alike ─────────────────────────────────────────────── */

const ARPA_VOWEL = /^(AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)$/;

/**
 * A word's pronunciation as an Australian says it, from the CMU dictionary.
 *
 * CMU is American, and one difference matters here: an r after a vowel is
 * silent in Australia, so saw and sore are the same word out loud. That r is
 * dropped. The vowel of "car" is kept apart from the vowel of "cod", which
 * American English merges, so the two do not come out as twins by mistake.
 * Only the main pronunciation is used, since the regional ones (when said as
 * "win") would make twins no Australian child hears.
 */
function sayAustralian(word: string): string | null {
  const us = (CMU as Record<string, string>)[word.toLowerCase()];
  if (!us) return null;
  const ph = us.replace(/[0-9]/g, '').split(' ');
  const out: string[] = [];
  for (let i = 0; i < ph.length; i += 1) {
    const x = ph[i];
    const afterVowel = i > 0 && ARPA_VOWEL.test(ph[i - 1]);
    const beforeVowel = i + 1 < ph.length && ARPA_VOWEL.test(ph[i + 1]);
    if (x === 'R' && afterVowel && !beforeVowel) {
      if (out[out.length - 1] === 'AA') out[out.length - 1] = 'AR';
      continue;
    }
    /* a final unstressed -er is a plain schwa: tuna and tuner */
    out.push(x === 'ER' && i === ph.length - 1 ? 'AH' : x);
  }
  return out.join(' ');
}

describe('words that sound alike', () => {
  it('knows the Australian twins the American dictionary would miss', () => {
    expect(sayAustralian('saw')).toBe(sayAustralian('sore'));
    expect(sayAustralian('car')).not.toBe(sayAustralian('cod'));
    expect(sayAustralian('win')).not.toBe(sayAustralian('when'));
  });

  /* A game that says a word and asks him to find it written has no right
     answer if its twin is on screen too. This names any pair missing. */
  it('lists every pair of real words that are said the same way', () => {
    const byVoice = new Map<string, Set<string>>();
    for (const w of REAL_WORDS) {
      const key = sayAustralian(w.text);
      if (!key) continue;
      byVoice.set(key, (byVoice.get(key) ?? new Set()).add(w.text.toLowerCase()));
    }
    const missing: string[] = [];
    for (const twins of byVoice.values()) {
      const list = [...twins];
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          if (!soundsAlike(list[i], list[j])) missing.push(`${list[i]} ${list[j]}`);
        }
      }
    }
    expect(missing, 'add these to SOUNDS_ALIKE').toEqual([]);
  });

  it('lists only words that are in the content', () => {
    const known = new Set(REAL_WORDS.map((w) => w.text.toLowerCase()));
    const stray = SOUNDS_ALIKE.flatMap((line) => line.split(/\s+/)).filter((w) => w && !known.has(w));
    expect(stray).toEqual([]);
  });
});

/* ── Penalty Shootout ───────────────────────────────────────────────────── */

describe('penalty shootout', () => {
  /* Every word is tried as the answer, with only the words at or below its
     own level to choose lookalikes from: the smallest pool the game can ever
     be working with. */
  const upTo = (level: Level): Level[] => ([1, 2, 3, 4, 5, 6, 7, 8] as Level[]).filter((n) => n <= level);

  it('counts letter changes the way a reader would', () => {
    expect(editDistance('fish', 'dish')).toBe(1);
    expect(editDistance('fish', 'fist')).toBe(1);
    expect(editDistance('ship', 'shop')).toBe(1);
    expect(editDistance('cat', 'sun')).toBe(3);
  });

  it('always finds two words to put in the goal beside the answer', () => {
    const short = REAL_WORDS.filter((w) => nearWords(w, realWords({ levels: upTo(w.level) }), 2, { picture: !!w.picture }).length < 2);
    expect(short.map((w) => `${w.text} (level ${w.level})`)).toEqual([]);
  });

  it('never puts a word in the goal that sounds like the answer', () => {
    const twins: string[] = [];
    for (const w of REAL_WORDS) {
      for (const other of nearWords(w, REAL_WORDS, 2)) {
        if (soundsAlike(w.text, other.text)) twins.push(`${w.text} / ${other.text}`);
      }
    }
    expect(twins).toEqual([]);
    /* and the pairs the list exists for really are kept apart */
    const pair = REAL_WORDS.find((w) => w.text === 'pair');
    if (pair) expect(nearWords(pair, REAL_WORDS, 50).map((w) => w.text)).not.toContain('pear');
  });

  it('never puts a second word with the same picture in the goal', () => {
    const clash: string[] = [];
    for (const w of REAL_WORDS.filter((x) => x.picture)) {
      for (const other of nearWords(w, REAL_WORDS, 2, { picture: true })) {
        if (other.picture === w.picture) clash.push(`${w.text} / ${other.text} ${w.picture}`);
      }
    }
    expect(clash).toEqual([]);
  });

  it('never offers the answer twice', () => {
    const doubled = REAL_WORDS.filter((w) =>
      nearWords(w, REAL_WORDS, 2).some((o) => o.text.toLowerCase() === w.text.toLowerCase()));
    expect(doubled.map((w) => w.text)).toEqual([]);
  });
});

/* ── Pass and Shoot ─────────────────────────────────────────────────────── */

describe('pass and shoot', () => {
  const cut = (text: string) => {
    const w = REAL_WORDS.find((x) => x.text === text);
    return w ? pieces(w)?.map((p) => p.text).join(' ') ?? null : undefined;
  };

  it('cuts a word into the letters of each sound, longest spelling first', () => {
    expect(cut('ship')).toBe('sh i p');
    expect(cut('light')).toBe('l igh t');
    expect(cut('queen')).toBe('qu ee n');
    expect(cut('duck')).toBe('d u ck');
    expect(cut('catch')).toBe('c a tch');
  });

  /* a player can hold one sound, and a word of two syllables or a split
     spelling would need a guess to cut, so the game never gets one */
  it('leaves out what it cannot cut without guessing', () => {
    expect(cut('cake')).toBeNull();
    expect(cut('country')).toBeNull();
  });

  it('puts every letter of the word on exactly one player, in order', () => {
    const broken = REAL_WORDS.filter((w) => {
      const p = pieces(w);
      return p && p.map((x) => x.text).join('') !== w.text.toLowerCase();
    });
    expect(broken.map((w) => w.text)).toEqual([]);
  });

  it('keeps the sound the content marks as one piece, never re-cut', () => {
    const recut = REAL_WORDS.filter((w) => {
      const p = pieces(w);
      if (!p) return false;
      const target = p.filter((x) => x.target);
      return target.length !== 1 || target[0].at !== w.spans[0].at || target[0].text.length !== w.spans[0].len;
    });
    expect(recut.map((w) => w.text)).toEqual([]);
  });

  /* five players across a phone is the most that stays readable */
  it('never needs more than five players', () => {
    const long = REAL_WORDS.filter((w) => (pieces(w)?.length ?? 0) > 5);
    expect(long.map((w) => w.text)).toEqual([]);
  });

  it('has words with pictures to play at every level', () => {
    for (const level of [1, 2, 3, 4, 5, 6, 7, 8] as Level[]) {
      const usable = REAL_WORDS.filter((w) => w.level === level && w.picture && pieces(w));
      expect(usable.length, `level ${level}`).toBeGreaterThanOrEqual(8);
    }
  });
});

/* ── Be the Commentator ─────────────────────────────────────────────────── */

describe('commentary', () => {
  /* the lowest level each word can be read at, from the word lists and the
     school's sight words */
  const readableAt = new Map<string, number>();
  for (const w of REAL_WORDS) {
    const t = w.text.toLowerCase();
    readableAt.set(t, Math.min(readableAt.get(t) ?? 9, w.level));
  }
  for (const w of ALL_SIGHT_WORDS) {
    const t = w.text.toLowerCase();
    readableAt.set(t, Math.min(readableAt.get(t) ?? 9, w.level ?? 8));
  }
  const wordsOf = (text: string) => text.replace(/\{us\}|\{them\}/g, '').toLowerCase().match(/[a-z]+/g) ?? [];

  /* the game is about expression; a word he cannot read yet turns it back
     into decoding */
  it('uses only words he can read, from the lists or the sight words', () => {
    const unknown = ALL_COMMENTARY.flatMap((l) => wordsOf(l.text).filter((w) => !readableAt.has(w)).map((w) => `${w} in "${l.text}"`));
    expect(unknown).toEqual([]);
  });

  it('puts each line at the level of its hardest word, no earlier and no later', () => {
    const wrong = ALL_COMMENTARY.filter((l) => Math.max(1, ...wordsOf(l.text).map((w) => readableAt.get(w) ?? 9)) !== l.level)
      .map((l) => `${l.text} @${l.level}`);
    expect(wrong).toEqual([]);
  });

  it('has lines for every way of saying it', () => {
    for (const mood of ['excited', 'asking', 'calm'] as const) {
      expect(ALL_COMMENTARY.some((l) => l.mood === mood), mood).toBe(true);
    }
  });

  it('has a match worth of lines from level 2 up', () => {
    for (let level = 2; level <= 8; level += 1) {
      expect(ALL_COMMENTARY.filter((l) => l.level <= level).length, `level ${level}`).toBeGreaterThanOrEqual(6);
    }
  });

  it('shows no blocked word', () => {
    expect(ALL_COMMENTARY.filter((l) => wordsOf(l.text).some((w) => blocked(w))).map((l) => l.text)).toEqual([]);
  });
});

/* ── Build the Word ─────────────────────────────────────────────────────── */

describe('build the word', () => {
  const spellable = REAL_WORDS.filter((w) => w.picture && pieces(w));

  it('offers the mistakes children really make', () => {
    expect(confusions('ai')).toContain('ay');
    expect(confusions('ee')).toContain('ea');
    expect(confusions('ck')).toContain('k');
    expect(confusions('i')).toContain('e');
    expect(confusions('b')).toContain('d');
  });

  it('always has at least two wrong tiles to choose from', () => {
    const thin = spellable.filter((w) => {
      const set = tilesFor(w, 'sounds', 2);
      return !set || set.tiles.length - set.answer.length < 2;
    });
    expect(thin.map((w) => w.text)).toEqual([]);
  });

  it('never makes a wrong tile that is the same as a right one', () => {
    const clash: string[] = [];
    for (const w of spellable) {
      for (const mode of ['sounds', 'letters'] as const) {
        const set = tilesFor(w, mode, 3);
        if (!set) continue;
        const extra = [...set.tiles];
        for (const a of set.answer) extra.splice(extra.indexOf(a), 1);
        if (extra.some((t) => set.answer.includes(t))) clash.push(`${w.text} (${mode})`);
      }
    }
    expect(clash).toEqual([]);
  });

  /* the word is heard, so a wrong tile must never spell its twin */
  it('never lets a single wrong tile spell a word that sounds the same', () => {
    const twins: string[] = [];
    for (const w of spellable) {
      const set = tilesFor(w, 'sounds', 3);
      if (!set) continue;
      const extra = [...set.tiles];
      for (const a of set.answer) extra.splice(extra.indexOf(a), 1);
      set.answer.forEach((_, i) => {
        for (const e of extra) {
          const built = [...set.answer.slice(0, i), e, ...set.answer.slice(i + 1)].join('');
          if (soundsAlike(built, w.text)) twins.push(`${w.text} -> ${built}`);
        }
      });
    }
    expect(twins).toEqual([]);
  });

  it('builds the word exactly from its right tiles', () => {
    const wrong = spellable.filter((w) => {
      const s1 = tilesFor(w, 'sounds', 2);
      const s2 = tilesFor(w, 'letters', 2);
      return s1?.answer.join('') !== w.text.toLowerCase() || s2?.answer.join('') !== w.text.toLowerCase();
    });
    expect(wrong.map((w) => w.text)).toEqual([]);
  });
});

describe('handwriting', () => {
  const letters = [...'abcdefghijklmnopqrstuvwxyz'];
  const strokes = [...GLYPHS.values()].flatMap((g) => g.strokes.map((d, i) => ({ g, d, i })));

  it('has the strokes for every letter, big and little', () => {
    const missing = [...letters, ...letters.map((l) => l.toUpperCase())].filter((l) => !GLYPHS.has(l));
    expect(missing).toEqual([]);
  });

  it('draws every stroke with M, L, C and Q only, inside the lines', () => {
    const bad: string[] = [];
    for (const { g, d, i } of strokes) {
      try {
        parsePath(d);
        for (const p of samplePath(d)) {
          if (p.x < 0 || p.x > g.width || p.y < 0 || p.y > 155) bad.push(`${g.ch} stroke ${i + 1} at ${Math.round(p.x)},${Math.round(p.y)}`);
        }
      } catch (e) {
        bad.push(`${g.ch} stroke ${i + 1}: ${(e as Error).message}`);
      }
    }
    expect(bad).toEqual([]);
  });

  /* the small letters start at the waist line, capitals and tall ones at the top */
  it('sits every letter on the lines the way its height says', () => {
    const wrong: string[] = [];
    for (const l of letters) {
      const ys = glyph(l).strokes.flatMap((d) => samplePath(d)).map((p) => p.y);
      const top = Math.min(...ys);
      const bottom = Math.max(...ys);
      const h = heightOf(l);
      /* the dot of i and j is above the waist but is not a tall letter */
      const body = l === 'i' || l === 'j' ? Math.min(...samplePath(glyph(l).strokes[0]).map((p) => p.y)) : top;
      const seen = bottom > 120 ? 'tail' : body < 40 ? 'tall' : 'small';
      if (seen !== h) wrong.push(`${l} is drawn ${seen} but listed ${h}`);
      if (h !== 'tail' && Math.abs(bottom - 100) > 1) wrong.push(`${l} does not sit on the base line`);
    }
    for (const l of letters.map((x) => x.toUpperCase())) {
      const ys = glyph(l).strokes.flatMap((d) => samplePath(d)).map((p) => p.y);
      if (Math.min(...ys) > 1 || Math.max(...ys) < 99) wrong.push(`${l} is not a full capital`);
    }
    expect(wrong).toEqual([]);
    expect(Object.values(HEIGHTS).join('').split('').sort()).toEqual(letters);
  });

  it('puts every letter in a family, and every family item has strokes', () => {
    const inFamilies = new Set(FAMILIES.filter((f) => f.id !== 'pairs').flatMap((f) => f.items));
    expect([...letters, ...letters.map((l) => l.toUpperCase())].filter((l) => !inFamilies.has(l))).toEqual([]);
    for (const f of FAMILIES) for (const item of f.items) for (const ch of item) expect(GLYPHS.has(ch)).toBe(true);
  });

  /* a wobbly trace of the stroke itself passes; the same stroke drawn from
     the other end, or only halfway, or beside the line, does not */
  it('passes a wobbly trace of each stroke and fails a backwards one', () => {
    const wobble = (pts: Point[]): Point[] => pts.map((p, i) => ({ x: p.x + Math.sin(i) * 4, y: p.y + Math.cos(i * 1.3) * 4 }));
    const wrong: string[] = [];
    for (const { g, d, i } of strokes) {
      const pts = samplePath(d);
      const name = `${g.ch} stroke ${i + 1}`;
      if (!judge(pts, wobble(pts)).ok) wrong.push(`${name}: a good trace failed`);
      if (pts.length === 1) continue;
      if (judge(pts, [...pts].reverse()).ok) wrong.push(`${name}: backwards passed`);
      if (judge(pts, pts.slice(0, Math.floor(pts.length / 2))).ok) wrong.push(`${name}: half passed`);
      if (judge(pts, pts.map((p) => ({ x: p.x + 30, y: p.y + 30 }))).ok) wrong.push(`${name}: off the line passed`);
    }
    expect(wrong).toEqual([]);
  });

  it('says why a trace failed', () => {
    const c = samplePath(glyph('c').strokes[0]);
    expect(judge(c, [...c].reverse()).why).toBe('start');
    const o = samplePath(glyph('o').strokes[0]);
    expect(judge(o, [...o].reverse()).why).toBe('direction');
    expect(judge(c, c.slice(0, 10)).why).toBe('short');
  });

  it('finds a picture word for most letters', () => {
    const none = letters.filter((l) => !exampleFor(l));
    expect(none.length).toBeLessThanOrEqual(3);
    for (const l of letters) {
      const w = exampleFor(l);
      if (w) expect(w.text.includes(l)).toBe(true);
    }
  });
});

describe('sorting between sounds', () => {
  it('knows a word that would fit another bin by its letters', () => {
    const word = (text: string, id: string) => {
      const w = realWords({ sounds: [id] }).find((x) => x.text === text);
      if (!w) throw new Error(`${text} is not a ${id} word`);
      return w;
    };
    /* which is a wh word with a ch in it */
    expect(fitsAnother(word('which', 'wh'), sound('ch'))).toBe(true);
    /* further has an er after its ur */
    expect(fitsAnother(word('further', 'ur'), sound('er'))).toBe(true);
    /* moon's oo is the question in an oo/oo sort, not a trap */
    expect(fitsAnother(word('moon', 'oo-moon'), sound('oo-book'))).toBe(false);
    /* nor is them's th in a th/th sort */
    expect(fitsAnother(word('them', 'th-voiced'), sound('th-unvoiced'))).toBe(false);
    /* and a word never fits against its own sound */
    expect(fitsAnother(word('rain', 'ai'), sound('ai'))).toBe(false);
  });

  it('gives every sort in Sound Sort enough words that fit only one bin', () => {
    const short: string[] = [];
    for (const set of SORT_SETS) {
      expect(set.sounds.every((id) => SOUND_BY_ID.has(id)), set.id).toBe(true);
      const bins = set.sounds.map(sound);
      for (const bin of bins) {
        const clean = uniqueWords(realWords({ sounds: [bin.id] })).filter((w) => !bins.some((o) => fitsAnother(w, o)));
        if (clean.length < 6) short.push(`${set.id}: ${bin.id} has ${clean.length}`);
      }
    }
    expect(short).toEqual([]);
  });

  it('never lets a word into a sort where it fits two bins', () => {
    const both: string[] = [];
    for (const set of SORT_SETS) {
      const bins = set.sounds.map(sound);
      const inBins = bins.map((b) => realWords({ sounds: [b.id] }).filter((w) => !bins.some((o) => fitsAnother(w, o))));
      const seen = new Map<string, string>();
      inBins.forEach((words, i) => {
        for (const w of words) {
          const other = seen.get(w.text);
          if (other && other !== bins[i].id) both.push(`${set.id}: ${w.text} in ${other} and ${bins[i].id}`);
          seen.set(w.text, bins[i].id);
        }
      });
    }
    expect(both).toEqual([]);
  });
});

/* ── Coach Says ─────────────────────────────────────────────────────────── */

import { PLACES, SAYS_STEPS, TEMPLATES, THINGS, saysQuestion } from '../src/content/coach-says';

describe('coach says', () => {
  const readableAt = new Map<string, number>();
  for (const w of REAL_WORDS) {
    const t = w.text.toLowerCase();
    readableAt.set(t, Math.min(readableAt.get(t) ?? 9, w.level));
  }
  for (const w of ALL_SIGHT_WORDS) {
    const t = w.text.toLowerCase();
    readableAt.set(t, Math.min(readableAt.get(t) ?? 9, w.level ?? 8));
  }
  const wordsOf = (text: string) => text.replace(/\{\w+\}/g, '').toLowerCase().match(/[a-z]+/g) ?? [];

  it('draws every thing and place with its own picture, none the same', () => {
    const pictures = [...THINGS, ...PLACES].map((t) => t.picture);
    const twice = pictures.filter((p, i) => pictures.indexOf(p) !== i);
    expect(twice).toEqual([]);
    expect([...THINGS, ...PLACES].filter((t) => blocked(t.word)).map((t) => t.word)).toEqual([]);
  });

  it('writes the instructions in words he can read at their level, and puts each at its hardest word', () => {
    const unknown = Object.values(TEMPLATES).flatMap((t) => wordsOf(t.text).filter((w) => !readableAt.has(w)).map((w) => `${w} in "${t.text}"`));
    expect(unknown).toEqual([]);
    const wrong = Object.values(TEMPLATES).filter((t) => Math.max(1, ...wordsOf(t.text).map((w) => readableAt.get(w) ?? 9)) !== t.level)
      .map((t) => `${t.text} @${t.level}`);
    expect(wrong).toEqual([]);
  });

  it('has every step a template, and enough to play with at every level', () => {
    for (const step of SAYS_STEPS) expect(TEMPLATES[step.task], step.name).toBeTruthy();
    for (let level = 2; level <= 8; level += 1) {
      expect(THINGS.filter((t) => t.level <= level).length, `things at ${level}`).toBeGreaterThanOrEqual(6);
      expect(PLACES.filter((t) => t.level <= level).length, `places at ${level}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('asks every question with exactly one answer, naming what it means', () => {
    for (const step of SAYS_STEPS) {
      for (let level = 1; level <= 8; level += 1) {
        for (let i = 0; i < 40; i += 1) {
          const q = saysQuestion(step, level);
          const said = q.text.toLowerCase().match(/[a-z]+/g)!;
          for (const a of q.answer) {
            const shown = q.shown[a.item];
            expect(shown, q.text).toBeTruthy();
            expect(said, q.text).toContain(shown.thing.word);
            if (a.kind === 'put') expect(said, q.text).toContain(q.places[a.place].word);
          }
          if (q.task === 'big' || q.task === 'notBig') {
            /* only one picture is that thing at that size */
            const a = q.shown[q.answer[0].item];
            expect(q.shown.filter((s) => s.thing === a.thing && s.big === a.big)).toHaveLength(1);
            expect(a.big, q.text).toBe(q.task === 'big');
          } else {
            const words = q.shown.map((s) => s.thing.word);
            expect(new Set(words).size, q.text).toBe(words.length);
            /* a thing named in the instruction is never also a place, nor two places the same */
            expect(new Set(q.places.map((p) => p.word)).size).toBe(q.places.length);
          }
        }
      }
    }
  });
});
