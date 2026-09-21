/* Rebuilds every silly word list.
 *
 * A silly word has to be three things at once: not a real English word,
 * pronounceable by a six-year-old, and genuine practice for its sound. The
 * prototypes managed none of them reliably — "zuck" had no qu in it, "vquid"
 * and "glwhi" cannot be said at all, and "chum" is a real word.
 *
 * Candidates are built the way English builds words: a legal onset cluster, a
 * vowel, a legal coda, with the target grapheme dropped into the slot it
 * really occupies (sh at the front, ng at the back, ai in the middle) — the
 * slot is read off the sound's own real words rather than guessed. Below level
 * 4 only letters the child has met are allowed, so a level 1 silly word is
 * built from s a t p i n and nothing else.
 *
 * Run:  npx vite-node tools/regen-silly.ts
 */
import ENGLISH from 'an-array-of-english-words/index.json';
import { SOUNDS, FAMILIES, BLOCKLIST, type SoundSpec } from '../src/content/words';
import { resolveSpans, unmark } from '../src/content/spans';

const DICT = new Set(ENGLISH as string[]);
const real = (w: string) => DICT.has(w.toLowerCase());
const blocked = (w: string) => BLOCKLIST.includes(w.toLowerCase());

const LETTERS_BY_LEVEL: Record<number, string[]> = {
  1: ['s', 'a', 't', 'p', 'i', 'n'],
  2: ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k', 'e', 'u', 'r'],
  3: ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k', 'e', 'u', 'r', 'b', 'h', 'f', 'l', 'j', 'v', 'w', 'x', 'y', 'z'],
};
const VOWELS = ['a', 'e', 'i', 'o', 'u'];
const ONSETS = ['z', 'v', 'gl', 'pr', 'sm', 'dr', 'kl', 'fr', 'pl', 'sn', 'bl', 'tw', 'shr', 'thr', 'str', 'gr', 'cl', 'fl', 'sk', 'sw', 'br', 'tr', 'sp', 'scr', 'th', 'sh', 'ch'];
const CODAS = ['b', 'd', 'g', 'k', 'm', 'n', 'p', 't', 'f', 'l', 'sh', 'ch', 'st', 'nd', 'nk', 'mp', 'sk', 'lt', 'lp', 'ft', 'nt'];
/* after a long vowel team English only tolerates a light ending: feast, beach,
   fiend — never frailt or proank */
const TEAM_CODAS = ['b', 'd', 'f', 'g', 'k', 'l', 'm', 'n', 'p', 't', 's', 'st', 'ch', 'sh', 'th', 'nd'];
/* a few teams only ever take one ending: light and night, never blighsh */
const TEAM_CODAS_BY_SOUND: Record<string, string[]> = {
  igh: ['t'],
  'ow-cow': ['l', 'n', 'nd', 'd', 't'],
  'ou-loud': ['d', 'n', 'nd', 't', 'st', 'p', 'l'],
};
/* the only two-consonant endings a beginner reader meets */
const LEGAL_PAIRS = new Set(['st', 'nd', 'nt', 'nk', 'mp', 'sk', 'lt', 'lp', 'ft', 'll', 'ss', 'ff', 'zz', 'ck', 'sh', 'ch', 'th', 'ng', 'sp', 'lf', 'lk', 'nc', 'rd', 'rk', 'rt', 'rn', 'rm', 'rl',
  /* the doubled endings the program teaches: nn, ss, ll, ff, zz, then gg bb tt rr pp dd mm */
  'nn', 'pp', 'tt', 'dd', 'mm', 'rr', 'gg', 'bb']);
/* codas a child at level 1-3 could actually blend */
const EARLY_CODAS = ['b', 'd', 'g', 'k', 'm', 'n', 'p', 't', 'f', 'l', 's', 'st', 'nd', 'nk', 'mp', 'sk', 'lt', 'ft', 'nt', 'ck'];
/* A doubled ending is a grapheme in its own right, and the program teaches
   them one at a time — so a level 1 silly word may end in nn but not in pp,
   which a child does not meet until level 4. */
const DOUBLES_BY_LEVEL: Record<number, string[]> = {
  1: ['nn'],
  2: ['nn', 'ss'],
  3: ['nn', 'ss', 'll', 'ff', 'zz'],
};

function sayable(w: string, sp = ''): boolean {
  if (w.length < 2 || w.length > 9) return false;
  if (!/[aeiouy]/.test(w)) return false;
  /* The grapheme is one unit, however many letters it has: "ght" in zight and
     "tch" in zatch are not consonant pile-ups, so blank the grapheme out
     before looking at the shape of what is left. */
  const body = sp.length > 1 ? sp.split('_').reduce((acc, part) => (part.length > 1 ? acc.split(part).join('a') : acc), w) : w;
  if (/[bcdfghjklmnpqrstvwxz]{4}/.test(body)) return false;
  if (/(.)\1\1/.test(w)) return false;
  if (/[aeiou]{3}/.test(body)) return false;
  /* h, j, q, v and x do not end English words — unless that letter is the
     very thing being practised, in which case the child needs to see it. */
  const tail = /([hjqvx])$/.exec(w);
  if (tail && !sp.endsWith(tail[1])) return false;
  /* no three-consonant pile-up at the end, and any pair has to be one a
     beginner actually meets — dogck, tisnt and pevl are not words a child
     could sound out */
  const end = /([bcdfghjklmnpqrstvwxz]+)$/.exec(body);
  if (end) {
    const cluster = end[1];
    if (cluster.length > 2) return false;
    if (cluster.length === 2 && !LEGAL_PAIRS.has(cluster)) return false;
  }
  return true;
}

const count = (w: string, sp: string) => w.split(sp).length - 1;

/** a fixed shuffle, so the same content file always produces the same list */
function spread(words: string[], seed: string): string[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rank = (w: string) => {
    let x = h;
    for (const ch of w) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
    return x >>> 0;
  };
  return [...words].sort((a, b) => rank(a) - rank(b));
}

type Place = 'initial' | 'medial' | 'final';

/** reads the grapheme's usual slot off the sound's own real words */
function placeOf(s: SoundSpec): Place {
  let initial = 0; let final = 0; let n = 0;
  for (const chunk of (s.words ?? '').split('|')) {
    const marked = chunk.trim().split(/\s+/)[0];
    if (!marked) continue;
    let e;
    try { e = resolveSpans(marked, s.spellings, s.id); } catch { continue; }
    const first = e.spans[0];
    const last = e.spans[e.spans.length - 1];
    if (!first || !last) continue;
    n += 1;
    if (first.at === 0) initial += 1;
    if (last.at + last.len === e.text.length) final += 1;
  }
  if (!n) return 'medial';
  if (initial / n >= 0.5) return 'initial';
  if (final / n >= 0.4) return 'final';
  return 'medial';
}

function candidatesFor(s: SoundSpec): string[] {
  const sp = s.spellings[0];
  const out: string[] = [];

  /* split digraph: the two halves straddle a consonant */
  if (sp.includes('_')) {
    const [a, b] = sp.split('_');
    for (const on of ONSETS) for (const mid of ['k', 'p', 't', 'd', 'm', 'n', 'f', 'l', 'b', 'v', 's', 'g', 'z']) {
      if (sayable(on + a + mid + b, sp)) out.push(`${on}[${a}]${mid}[${b}]`);
    }
    return out;
  }

  /* soft g and soft c are only soft in front of e, i or y — keep them there */
  /* g and c are only soft in front of e, i or y, so that is where they stay */
  if (s.id === 'soft-g' || s.id === 'soft-c') {
    for (const soft of ['e', 'i']) {
      for (const co of ['b', 'd', 'f', 'k', 'l', 'm', 'n', 'p', 't', 'st', 'nt', 'lt', 'mp']) out.push(sp + soft + co);
      for (const v of VOWELS) for (const c1 of ['b', 'd', 'f', 'k', 'l', 'm', 'n', 'p', 't', 'r', 'v', 'z'])
        for (const end of ['n', 't', 'l']) out.push(c1 + v + sp + soft + end);
    }
    return out;
  }

  if (s.level <= 3) {
    const pool = LETTERS_BY_LEVEL[s.level];
    const cons = pool.filter((c) => !VOWELS.includes(c));
    const vows = pool.filter((c) => VOWELS.includes(c));
    const codas = [
      ...EARLY_CODAS.filter((c) => [...c].every((ch) => pool.includes(ch))),
      ...DOUBLES_BY_LEVEL[s.level],
    ];
    if (VOWELS.includes(sp)) {
      for (const c1 of cons) for (const co of codas) out.push(c1 + sp + co);
    } else {
      /* a consonant keeps the slot it really occupies — h only ever starts a
         word, x only ever ends one — but the letter set this early is so small
         that the other slot is kept as a fallback when the first runs dry */
      const front: string[] = [];
      const back: string[] = [];
      for (const c1 of cons) for (const v of vows) front.push(c1 + v + sp);
      for (const v of vows) for (const co of codas) back.push(sp + v + co);
      return placeOf(s) === 'final' ? [...spread(front, s.id), ...spread(back, s.id)]
                                    : [...spread(back, s.id), ...spread(front, s.id)];
    }
    return out;
  }

  const place = placeOf(s);
  const isVowel = VOWELS.includes(sp[0]);
  for (const on of ONSETS) {
    for (const v of VOWELS) {
      for (const co of CODAS) {
        if (isVowel) {
          /* a vowel team needs a consonant either side, or nothing after it
             when it is the kind that ends a word (day, few, boy) */
          if (place === 'final') out.push(on + sp);
          else if ((TEAM_CODAS_BY_SOUND[s.id] ?? TEAM_CODAS).includes(co)) out.push(on + sp + co);
        } else if (place === 'final') {
          out.push(on + v + sp);
        } else {
          /* every other consonant grapheme reads best at the front: phog,
             shig, quen — rather than wedged mid-word as treph-n */
          out.push(sp + v + co);
        }
      }
    }
  }
  return out;
}

const sounds: string[] = [];
for (const s of SOUNDS) {
  if (!s.practice) continue;
  const sp = s.spellings[0];
  const existing = new Set((s.words ?? '').split('|').filter((c) => c.trim())
    .map((c) => unmark(c.trim().split(/\s+/)[0]).text.toLowerCase()));
  const seen = new Set<string>();
  const picked: string[] = [];
  const usedShape = new Set<string>();
  const vowelUse = new Map<string, number>();
  const ordered = s.level <= 3 ? candidatesFor(s) : spread(candidatesFor(s), s.id);
  for (const c of ordered) {
    if (picked.length >= 10) break;
    const plain = unmark(c).text;
    const key = plain.toLowerCase();
    if (seen.has(key) || existing.has(key)) continue;
    if (real(plain) || blocked(plain) || !sayable(plain, sp)) continue;
    const hits = count(plain, sp);
    let entry = c;
    if (!c.includes('[')) {
      if (hits === 0) continue;
      if (hits > 1) {
        /* bracket the first one, the way a person would write ba[th] */
        const at = plain.indexOf(sp);
        entry = plain.slice(0, at) + '[' + sp + ']' + plain.slice(at + sp.length);
      }
    }
    /* keep the ten looking different from each other */
    /* Below level 4 the child knows so few letters that almost everything
       spellable is already a real word, so take what there is. */
    if (s.level >= 4) {
      const shape = plain.replace(new RegExp(sp.replace('_', '.'), 'g'), '~');
      if (usedShape.has(shape)) continue;
      const v = (/[aeiou]/.exec(shape.replace('~', '')) ?? [''])[0];
      if (v && (vowelUse.get(v) ?? 0) >= 3) continue;
      if (v) vowelUse.set(v, (vowelUse.get(v) ?? 0) + 1);
      usedShape.add(shape);
    }
    seen.add(key);
    picked.push(entry);
  }
  if (picked.length < (s.level <= 2 ? 4 : 8)) console.error(`!! ${s.id} produced only ${picked.length}`);
  sounds.push(`${s.id}\u0001    silly: '${picked.join(' | ')}' }`);
}

const PARTS_RIME = ['z', 'v', 'gl', 'thr', 'shr', 'pr', 'sm', 'dw', 'fr', 'pl', 'sn', 'zw', 'bl', 'tw', 'spl', 'scr', 'sw', 'kn', 'st'];
const PARTS_ONSET = ['og', 'ib', 'em', 'an', 'op', 'az', 'ud', 'esk', 'ont', 'im'];
const families: string[] = [];
for (const f of FAMILIES) {
  const build = (p: string) => (f.kind === 'rime' ? p + f.fixed : f.fixed + p);
  const kept = f.silly.filter((p) => !real(build(p)) && !blocked(build(p)) && sayable(build(p), f.fixed));
  const extra = (f.kind === 'rime' ? PARTS_RIME : PARTS_ONSET)
    .filter((p) => !f.real.includes(p) && !kept.includes(p))
    .filter((p) => !real(build(p)) && !blocked(build(p)) && sayable(build(p), f.fixed));
  const out = [...kept, ...extra].slice(0, 6);
  if (out.length < 4) console.error(`!! family ${f.id} produced only ${out.length}`);
  families.push(`${f.id}\u0001[${out.map((p) => `'${p}'`).join(', ')}]`);
}

console.log(JSON.stringify({ sounds, families }));
