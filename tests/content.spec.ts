/* The content test. It is the reason a six-year-old is not told that "vain"
 * is a made-up word, or shown "in *the* bath" with the wrong th underlined.
 *
 * Run it before committing any content change:  npm run validate:content */

import { describe, expect, it } from 'vitest';
import {
  ALL_FAMILIES, ALL_PHRASES, ALL_SOUNDS, BLOCKLIST, PRACTICE_SOUNDS,
  REAL_WORDS, SILLY_WORDS, buildWord, familySpans, realWords, sound, type Level,
  ALL_SIGHT_WORDS, SIGHT_SETS, PRACTICE_SOUNDS as ALL_PRACTICE, mightContain,
} from '../src/content/index';
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
