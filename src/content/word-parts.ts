/* Word Parts: endings and fronts.
 *
 * The words are in words.ts (DOING_WORDS, DESCRIBING_WORDS, WORD_MEANINGS),
 * each one he can already read. The endings are put on here, by the
 * spelling rules the game teaches, never written out by hand:
 *
 *   - most words just take it: jump, jumping;
 *   - s, x, z, ch and sh take es: fish, fishes;
 *   - one short vowel and one last letter, and that letter doubles before an
 *     ending that starts with a vowel: hop, hopping, big, bigger;
 *   - an e at the end goes before an ending that starts with a vowel:
 *     smile, smiling, smiled (just a d);
 *   - a y after a consonant turns into i: cry, cried, cries, happier;
 *     but before ing it stays: crying.
 *
 * So the rules are checked, not just written down: the content test makes
 * every word they give and looks each one up in the dictionary, and checks
 * what the -ed says (t, d or id) against how the word is said. */

import { ALL_SIGHT_WORDS, REAL_WORDS, type Level } from './index';
import { DESCRIBING_WORDS, DOING_WORDS, WORD_MEANINGS } from './words';
import type { Step } from './maths';
import { pick, shuffle } from '../lib/random';

export type Ending = 's' | 'ing' | 'ed' | 'er' | 'est';
export type Rule = 'add' | 'es' | 'double' | 'drop-e' | 'y-to-i' | 'keep-y';
export type EdSays = 't' | 'd' | 'id';

const VOWEL = /[aeiou]/;

/** the rule an ending follows on this word */
export function ruleFor(base: string, ending: string): Rule {
  const vowelNext = VOWEL.test(ending[0]);
  if (/[^aeiou]y$/.test(base)) return ending === 'ing' ? 'keep-y' : (vowelNext || ending === 's' ? 'y-to-i' : 'add');
  if (ending === 's') return /(s|x|z|ch|sh)$/.test(base) ? 'es' : 'add';
  if (!vowelNext) return 'add';
  if (/[^aeiou]e$/.test(base)) return 'drop-e';
  /* one vowel letter, then one consonant that is not w, x or y: hop, big */
  if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(base)) return 'double';
  return 'add';
}

/** the word with its ending on, by the rule */
export function withEnding(base: string, ending: string): string {
  switch (ruleFor(base, ending)) {
    case 'es': return `${base}es`;
    case 'double': return base + base.at(-1) + ending;
    case 'drop-e': return base.slice(0, -1) + ending;
    case 'y-to-i': return `${base.slice(0, -1)}i${ending === 's' ? 'es' : ending}`;
    default: return base + ending;
  }
}

/**
 * The spellings a child really tries, for the wrong answers: the ending
 * just stuck on, a letter doubled that should not be, an e kept, a y kept.
 * Never the right one, and two of them for every word.
 */
export function misspellings(base: string, ending: string): string[] {
  const right = withEnding(base, ending);
  const rule = ruleFor(base, ending);
  const stem = base.replace(/e$/, '');
  const tries: Record<Rule, string[]> = {
    add: ending === 's'
      ? [`${base}es`, base.endsWith('e') ? `${base.slice(0, -1)}s` : `${base}z`]
      : [base + base.at(-1) + ending, `${base}e${ending}`],
    es: [`${base}s`, `${base}ez`],
    double: [base + ending, `${base}e${ending}`],
    'drop-e': [base + ending, stem + stem.at(-1) + ending],
    'y-to-i': ending === 's'
      ? [`${base}s`, `${base}es`]
      : [base + ending, base.slice(0, -1) + ending.replace(/^e/, '')],
    'keep-y': [`${base.slice(0, -1)}iing`, `${base.slice(0, -1)}ing`],
  };
  return [...new Set(tries[rule])].filter((w) => w !== right && w !== base).slice(0, 2);
}

/** what the -ed says at the end: t after a sound like p, k or sh; id after t or d; d after the rest */
export function edSays(base: string): EdSays {
  const sounded = base.replace(/([^aeiou])e$/, '$1');
  if (/[td]$/.test(sounded)) return 'id';
  if (/(p|k|ck|f|ss|s|x|sh|ch|c)$/.test(sounded)) return 't';
  return 'd';
}

/** why the word is spelt that way, in a sentence */
export function spellWhy(base: string, ending: string): string {
  const word = withEnding(base, ending);
  switch (ruleFor(base, ending)) {
    case 'es': return `${base} ends in ${base.match(/(ch|sh|s|x|z)$/)![1]}, so it takes es: ${word}.`;
    case 'double': return `${base} has one vowel and one letter after it, so the ${base.at(-1)} doubles: ${word}.`;
    case 'drop-e': return ending === 'ed' || ending === 'er' || ending === 'est'
      ? `${base} ends in e, so it just takes ${ending.slice(1)}: ${word}.`
      : `${base} ends in e: the e goes, then ${ending}: ${word}.`;
    case 'y-to-i': return `${base} ends in y, and the y turns into i: ${word}.`;
    case 'keep-y': return `Before ing, the y stays: ${word}.`;
    default: return `${base} just takes ${ending}: ${word}.`;
  }
}

/* ── the words ───────────────────────────────────────────────────────── */

const list = (raw: string): string[] => raw.split('|').map((w) => w.trim()).filter(Boolean);

/** the lowest level each word he could read is taught at */
const READABLE = new Map<string, Level>();
for (const w of REAL_WORDS) {
  const t = w.text.toLowerCase();
  READABLE.set(t, Math.min(READABLE.get(t) ?? w.level, w.level) as Level);
}
for (const w of ALL_SIGHT_WORDS) {
  const t = w.text.toLowerCase();
  const level = (w.level ?? 8) as Level;
  READABLE.set(t, Math.min(READABLE.get(t) ?? level, level) as Level);
}
/** the level a word can be read at, or undefined if it is not one he meets */
export const levelOf = (word: string): Level | undefined => READABLE.get(word.toLowerCase());

export interface PartWord { base: string; level: Level; kind: 'doing' | 'describing' }

export const PART_WORDS: PartWord[] = [
  ...list(DOING_WORDS).map((base) => ({ base, level: levelOf(base)!, kind: 'doing' as const })),
  ...list(DESCRIBING_WORDS).map((base) => ({ base, level: levelOf(base)!, kind: 'describing' as const })),
];

/** the endings each kind of word takes */
export const ENDINGS_OF: Record<PartWord['kind'], Ending[]> = { doing: ['s', 'ing', 'ed'], describing: ['er', 'est'] };

export interface Meaning {
  /** the word put together: unhappy, runner */
  text: string;
  base: string;
  /** the front or the ending */
  part: string;
  front: boolean;
  /** what it means: not happy */
  means: string;
  /** the level of its hardest word, the meaning's words included */
  level: Level;
}

/** a word he can read, or a word the rules make from one (plays, runs) */
export function readableAt(word: string): Level | undefined {
  const w = word.toLowerCase();
  if (READABLE.has(w)) return READABLE.get(w);
  for (const [base, level] of READABLE) {
    if ((['s', 'ing', 'ed'] as const).some((e) => withEnding(base, e) === w)) return level;
  }
  return undefined;
}

const FRONTS = ['un', 'dis', 're', 'mis', 'pre'];

export const MEANINGS: Meaning[] = WORD_MEANINGS.map((raw) => {
  const m = /^([a-z]+)\+([a-z]+) = (.+)$/.exec(raw);
  if (!m) throw new Error(`Word Parts: "${raw}" should be like un+happy = not happy`);
  const front = FRONTS.includes(m[1]);
  const [base, part] = front ? [m[2], m[1]] : [m[1], m[2]];
  const words = [base, ...(m[3].match(/[a-z]+/gi) ?? [])];
  const level = Math.max(1, ...words.map((w) => readableAt(w) ?? 99)) as Level;
  return { text: front ? part + base : withEnding(base, part), base, part, front, means: m[3], level };
});

/* ── the game ────────────────────────────────────────────────────────── */

export interface PartStep extends Step {
  /**
   * find: hear one of jumps, jumping and jumped, and pick it;
   * ed: what the -ed says at the end, t, d or id;
   * spell: hop + ing, and pick how it is spelt;
   * mean: what a word with a front or an ending means
   */
  task: 'find' | 'ed' | 'spell' | 'mean';
  /** for spell: the rules asked about */
  rules?: Rule[];
  /** for mean: the fronts and endings asked about */
  parts?: string[];
}

export const PART_STEPS: PartStep[] = [
  { name: 'Hear the ending', task: 'find' },
  { name: 'What does ed say?', task: 'ed' },
  /* Year 2: the spelling rules, one at a time and then together */
  { name: 'Double it', task: 'spell', rules: ['double'] },
  { name: 'Drop the e', task: 'spell', rules: ['drop-e'] },
  { name: 'y turns into i', task: 'spell', rules: ['y-to-i', 'keep-y'] },
  { name: 'Every rule', task: 'spell', rules: ['add', 'es', 'double', 'drop-e', 'y-to-i', 'keep-y'] },
  /* Years 3–4: endings and fronts that change what a word means */
  { name: 'ful, less, ly and er', task: 'mean', parts: ['ful', 'less', 'ly', 'er'] },
  { name: 'un, dis and re', task: 'mean', parts: ['un', 'dis', 're'] },
  { name: 'Every front and ending', task: 'mean', parts: ['ful', 'less', 'ly', 'er', 'un', 'dis', 're', 'mis', 'pre'] },
];

export interface PartQuestion {
  task: PartStep['task'];
  base: string;
  /** the word asked about: jumped, hopping, unhappy */
  word: string;
  /** the ending or front on it */
  part: string;
  front: boolean;
  /** the answers offered, the right one among them */
  options: string[];
  answer: string;
  /** for mean: what it means */
  means?: string;
  /** what is said or shown after he answers */
  why: string;
}

/** the ones at his level, or the easiest few when there are not enough */
function atLevel<T extends { level: Level }>(all: T[], top: number, atLeast = 6): T[] {
  const ok = all.filter((x) => x.level <= top);
  return ok.length >= atLeast ? ok : [...all].sort((a, b) => a.level - b.level).slice(0, atLeast);
}

/** every word and ending a spell question can ask about at these rules */
function spellPairs(rules: Rule[]): { w: PartWord; ending: Ending }[] {
  return PART_WORDS.flatMap((w) => ENDINGS_OF[w.kind].map((ending) => ({ w, ending })))
    .filter(({ w, ending }) => rules.includes(ruleFor(w.base, ending)));
}

/** where the part is in the word, for marking it */
export function partSpan(q: Pick<PartQuestion, 'word' | 'part' | 'front' | 'base'>): { at: number; len: number } {
  if (q.front) return { at: 0, len: q.part.length };
  /* the letters after what is left of the base: hop|ping is hop + ping, cr|ied */
  let keep = 0;
  while (keep < q.base.length && keep < q.word.length && q.base[keep] === q.word[keep]) keep += 1;
  return { at: keep, len: q.word.length - keep };
}

export function partQuestion(step: PartStep, top: number, avoid: string[] = []): PartQuestion {
  if (step.task === 'mean') {
    const parts = step.parts ?? [];
    let pool = atLevel(MEANINGS.filter((m) => parts.includes(m.part)), top, 4).filter((m) => !avoid.includes(m.text));
    if (!pool.length) pool = MEANINGS.filter((m) => parts.includes(m.part));
    const m = pick(pool);
    /* the same word with another part first (careful, careless), then the same part on another word */
    const others = [
      ...shuffle(MEANINGS.filter((o) => o.base === m.base && o.text !== m.text)),
      ...shuffle(MEANINGS.filter((o) => o.part === m.part && o.base !== m.base)),
      ...shuffle(MEANINGS.filter((o) => o.base !== m.base)),
    ].map((o) => o.text).filter((t, i, all) => t !== m.text && all.indexOf(t) === i).slice(0, 2);
    return {
      task: 'mean', base: m.base, word: m.text, part: m.part, front: m.front, means: m.means,
      options: shuffle([m.text, ...others]), answer: m.text, why: `${m.text}: ${m.means}.`,
    };
  }
  if (step.task === 'spell') {
    let pairs = spellPairs(step.rules ?? ['add']).filter((p) => !avoid.includes(withEnding(p.w.base, p.ending)));
    const mine = pairs.filter((p) => p.w.level <= top);
    if (mine.length >= 4) pairs = mine;
    const { w, ending } = pick(pairs);
    const word = withEnding(w.base, ending);
    return {
      task: 'spell', base: w.base, word, part: ending, front: false,
      options: shuffle([word, ...misspellings(w.base, ending)]), answer: word, why: spellWhy(w.base, ending),
    };
  }
  const doing = atLevel(PART_WORDS.filter((w) => w.kind === 'doing'), top).filter((w) => !avoid.includes(w.base));
  if (step.task === 'ed') {
    const w = pick(doing.length ? doing : PART_WORDS.filter((x) => x.kind === 'doing'));
    const word = withEnding(w.base, 'ed');
    const says = edSays(w.base);
    return {
      task: 'ed', base: w.base, word, part: 'ed', front: false,
      options: ['t', 'd', 'id'], answer: says, why: `${word}: the ed says ${says}.`,
    };
  }
  /* find: only the words that just take their endings, so the ending is all that differs */
  const plain = doing.filter((w) => ruleFor(w.base, 'ing') === 'add');
  const w = pick(plain.length ? plain : PART_WORDS.filter((x) => x.kind === 'doing' && ruleFor(x.base, 'ing') === 'add'));
  const ending = pick(ENDINGS_OF.doing);
  const word = withEnding(w.base, ending);
  return {
    task: 'find', base: w.base, word, part: ending, front: false,
    options: shuffle(ENDINGS_OF.doing.map((e) => withEnding(w.base, e))), answer: word,
    why: `${w.base} and ${ending === 's' && word.endsWith('es') ? 'es' : ending}: ${word}.`,
  };
}
