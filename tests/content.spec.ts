/* The content test. It is the reason a six-year-old is not told that "vain"
 * is a made-up word, or shown "in *the* bath" with the wrong th underlined.
 *
 * Run it before committing any content change:  npm run validate:content */

import { describe, expect, it } from 'vitest';
import {
  ALL_FAMILIES, ALL_PHRASES, ALL_SOUNDS, BLOCKLIST, PRACTICE_SOUNDS,
  REAL_WORDS, SILLY_WORDS, buildWord, familySpans, sound,
} from '../src/content/index';
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
