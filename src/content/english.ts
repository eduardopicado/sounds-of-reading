/* The English games beyond phonics, made from the lists in words.ts:
 *
 * Word Positions: naming, doing and describing words, as positions on a
 *   team (defence, midfield, attack), each tagged in a sentence where only
 *   that reading makes sense.
 * Opposites and Same: opposites, words that mean the same, and compound
 *   words, two words he can read that make one.
 * Story Order: pictures and little stories put in order, then a question
 *   about who or where in each Read and Point story.
 *
 * NSW English K–10 Stage 1 has sequencing events and characters and
 * settings (Reading comprehension; Understanding and responding to
 * literature), noun groups and action verbs (Creating written texts), and
 * word meanings and wordplay (Vocabulary). It does not name word classes,
 * opposites or compound words; the Australian Curriculum's Years 1 and 2
 * name the word classes. */

import type { Step } from './maths';
import {
  COMPOUND_WORDS, OPPOSITES, PICTURE_ORDERS, SAME_MEANING, STORY_ORDERS, STORY_QUESTIONS, WORD_KIND_SENTENCES,
} from './words';
import { ALL_STORIES } from './index';

type Rand = () => number;
const int = (r: Rand, n: number): number => Math.floor(r() * n);
const pickOf = <T>(list: readonly T[], r: Rand): T => list[int(r, list.length)];
const shuffle = <T>(list: readonly T[], r: Rand): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) { const j = int(r, i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};
const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);

/* ── Word Positions ───────────────────────────────────────────────── */

export type Kind = 'n' | 'v' | 'd';
export const KIND_NAME: Record<Kind, string> = { n: 'naming word', v: 'doing word', d: 'describing word' };
export const POSITION: Record<Kind, string> = { n: 'Defence', v: 'Midfield', d: 'Attack' };
export const KIND_WHY: Record<Kind, string> = {
  n: 'names a person, an animal, a place or a thing',
  v: 'says what someone or something does',
  d: 'tells you more about a naming word: what it is like',
};

export interface Tagged { words: string[]; kinds: (Kind | null)[]; end: string }
export const TAGGED: Tagged[] = WORD_KIND_SENTENCES.map((raw) => {
  const end = raw.at(-1)!;
  const parts = raw.slice(0, -1).split(' ');
  return {
    words: parts.map((p) => p.replace(/:[nvd]$/, '')),
    kinds: parts.map((p) => (/:([nvd])$/.exec(p)?.[1] as Kind | undefined) ?? null),
    end,
  };
});
export const sentenceOf = (t: Tagged): string => `${t.words.join(' ')}${t.end}`;
const count = (t: Tagged, k: Kind): number => t.kinds.filter((x) => x === k).length;

export type WordTask = 'naming' | 'doing' | 'describing' | 'position' | 'every';
export interface WordStep extends Step { task: WordTask }
export const WORD_STEPS: WordStep[] = [
  { name: 'Naming words', task: 'naming' },
  { name: 'Doing words', task: 'doing' },
  { name: 'Describing words', task: 'describing' },
  { name: 'Which position?', task: 'position' },
  { name: 'Every naming word', task: 'every' },
];
const TASK_KIND: Record<string, Kind> = { naming: 'n', doing: 'v', describing: 'd' };

export interface WordQuestion {
  task: WordTask;
  sentence: Tagged;
  ask: string;
  /** the word to place, for "which position" */
  at?: number;
  /** the right word places (one, or all of a kind) */
  answer: number[];
  kind: Kind;
  why: string;
}

export function wordQuestion(task: WordTask, r: Rand = Math.random): WordQuestion {
  if (task === 'position') {
    const t = pickOf(TAGGED, r);
    const places = t.kinds.flatMap((k, i) => (k ? [i] : []));
    const at = pickOf(places, r);
    const kind = t.kinds[at]!;
    return {
      task, sentence: t, at, answer: [at], kind, ask: `Where does "${t.words[at]}" play?`,
      why: `"${t.words[at]}" is a ${KIND_NAME[kind]}: it ${KIND_WHY[kind]}. ${POSITION[kind]}!`,
    };
  }
  if (task === 'every') {
    const t = pickOf(TAGGED.filter((x) => count(x, 'n') >= 2), r);
    const answer = t.kinds.flatMap((k, i) => (k === 'n' ? [i] : []));
    return {
      task, sentence: t, answer, kind: 'n', ask: 'Tap every naming word, then press Done.',
      why: `The naming words are ${answer.map((i) => `"${t.words[i].toLowerCase()}"`).join(' and ')}.`,
    };
  }
  const kind = TASK_KIND[task];
  const t = pickOf(TAGGED.filter((x) => count(x, kind) === 1), r);
  const at = t.kinds.indexOf(kind);
  return {
    task, sentence: t, answer: [at], kind, ask: `Tap the ${KIND_NAME[kind]}.`,
    why: `"${t.words[at]}" is the ${KIND_NAME[kind]}: it ${KIND_WHY[kind]}.`,
  };
}

/* ── Opposites and Same ───────────────────────────────────────────── */

const pairs = (list: string[]): [string, string][] => list.map((l) => l.split(' ') as [string, string]);
export const OPPOSITE_PAIRS = pairs(OPPOSITES);
export const SAME_PAIRS = pairs(SAME_MEANING);
export const COMPOUNDS = pairs(COMPOUND_WORDS).map(([a, b]) => ({ a, b, word: a + b }));

const partners = (list: [string, string][], w: string): string[] =>
  list.flatMap(([a, b]) => (a === w ? [b] : b === w ? [a] : []));
export const oppositesOf = (w: string): string[] => partners(OPPOSITE_PAIRS, w);
export const sameAs = (w: string): string[] => partners(SAME_PAIRS, w);
/** everything that could also count as right, or confuse: the word, its opposites, its same-meanings, and theirs */
function related(w: string): Set<string> {
  const out = new Set([w, ...oppositesOf(w), ...sameAs(w)]);
  for (const x of [...out]) for (const y of [...oppositesOf(x), ...sameAs(x)]) out.add(y);
  return out;
}
const ALL_WORDS = [...new Set([...OPPOSITE_PAIRS, ...SAME_PAIRS].flat())];

export type WordsTask = 'opposite' | 'same' | 'which' | 'join' | 'split';
export interface WordsStep extends Step { task: WordsTask }
export const WORDS_STEPS: WordsStep[] = [
  { name: 'Opposites', task: 'opposite' },
  { name: 'Means the same', task: 'same' },
  { name: 'Opposite or same?', task: 'which' },
  { name: 'Two words make one', task: 'join' },
  { name: 'Which two words?', task: 'split' },
];

export interface WordsQuestion { task: WordsTask; ask: string; shown?: string; options: string[]; answer: string; why: string }

/** two wrong choices that are nothing to do with the word or the answer */
function wrongs(word: string, answer: string, r: Rand): string[] {
  const avoid = new Set([...related(word), ...related(answer)]);
  return shuffle(ALL_WORDS.filter((w) => !avoid.has(w)), r).slice(0, 2);
}

export function wordsQuestion(task: WordsTask, r: Rand = Math.random): WordsQuestion {
  if (task === 'opposite' || task === 'same') {
    const list = task === 'opposite' ? OPPOSITE_PAIRS : SAME_PAIRS;
    const pair = pickOf(list, r);
    const [word, answer] = r() < 0.5 ? pair : [pair[1], pair[0]];
    return {
      task, ask: task === 'opposite' ? `What is the opposite of "${word}"?` : `Which word means the same as "${word}"?`,
      shown: word, options: shuffle([answer, ...wrongs(word, answer, r)], r), answer,
      why: task === 'opposite' ? `${cap(word)} and ${answer} are opposites.` : `${cap(word)} and ${answer} mean the same.`,
    };
  }
  if (task === 'which') {
    const same = r() < 0.5;
    const [a, b] = pickOf(same ? SAME_PAIRS : OPPOSITE_PAIRS, r);
    return {
      task, ask: `"${a}" and "${b}": are they opposites, or do they mean the same?`, shown: `${a}   ${b}`,
      options: ['opposite', 'same'], answer: same ? 'same' : 'opposite',
      why: same ? `${cap(a)} and ${b} mean the same.` : `${cap(a)} and ${b} are opposites.`,
    };
  }
  const c = pickOf(COMPOUNDS, r);
  if (task === 'join') {
    /* other endings that do not make a word with this front */
    const ends = COMPOUNDS.map((x) => x.b).filter((b) => b !== c.b && !COMPOUNDS.some((x) => x.a === c.a && x.b === b));
    const options = shuffle([c.b, ...shuffle([...new Set(ends)], r).slice(0, 2)], r);
    return {
      task, ask: `Which word goes with "${c.a}" to make a new word?`, shown: `${c.a} + ?`, options, answer: c.b,
      why: `${cap(c.a)} and ${c.b} make ${c.word}.`,
    };
  }
  const others = shuffle(COMPOUNDS.filter((x) => x.a !== c.a && x.b !== c.b), r);
  const wrongOne = `${c.a} + ${others[0].b}`;
  const wrongTwo = `${others[1].a} + ${c.b}`;
  return {
    task, ask: `Which two words make "${c.word}"?`, shown: c.word,
    options: shuffle([`${c.a} + ${c.b}`, wrongOne, wrongTwo], r), answer: `${c.a} + ${c.b}`,
    why: `${cap(c.word)} is ${c.a} and ${c.b}.`,
  };
}

/* ── Story Order ──────────────────────────────────────────────────── */

export interface Picture { emoji: string; name: string }
export const PICTURE_SETS: Picture[][] = PICTURE_ORDERS.map((line) => line.split(', ').map((p) => {
  const [emoji, ...name] = p.split(' ');
  return { emoji, name: name.join(' ') };
}));
export const SENTENCE_SETS: string[][] = STORY_ORDERS.map((line) => line.split(' | '));

export interface StoryAsk { title: string; text: string; question: string; answer: string; options: string[] }
export const STORY_ASKS: StoryAsk[] = STORY_QUESTIONS.map((line) => {
  const [title, question, answer, ...wrong] = line.split(' | ');
  const story = ALL_STORIES.find((s) => s.title === title);
  if (!story) throw new Error(`Story Order: no story called "${title}"`);
  return { title, text: story.text, question, answer, options: [answer, ...wrong] };
});

export type StoryTask = 'next' | 'pictures' | 'three' | 'four' | 'who';
export interface StoryStep extends Step { task: StoryTask }
export const STORY_STEPS: StoryStep[] = [
  { name: 'What comes next?', task: 'next' },
  { name: 'Pictures in order', task: 'pictures' },
  { name: 'Three sentences in order', task: 'three' },
  { name: 'Four sentences in order', task: 'four' },
  { name: 'Who and where?', task: 'who' },
];

export interface StoryQuestion {
  task: StoryTask;
  ask: string;
  /** what to put in order, in the right order (the game jumbles it) */
  order?: string[];
  /** pictures: the sequence; for "next", the first two are shown */
  pictures?: Picture[];
  options?: string[];
  answer?: string;
  story?: StoryAsk;
  why: string;
}

export function storyQuestion(task: StoryTask, r: Rand = Math.random): StoryQuestion {
  if (task === 'next') {
    const set = pickOf(PICTURE_SETS, r);
    const last = set[set.length - 1];
    const others = shuffle(PICTURE_SETS.filter((s) => s !== set).map((s) => s[s.length - 1]), r).slice(0, 2);
    return {
      task, ask: 'What comes next?', pictures: set, options: shuffle([last, ...others].map((p) => p.emoji), r), answer: last.emoji,
      why: `${cap(set.map((p) => p.name).join(', then '))}.`,
    };
  }
  if (task === 'pictures') {
    const set = pickOf(PICTURE_SETS, r);
    return { task, ask: 'Tap the pictures in order: first, next, last.', pictures: set, order: set.map((p) => p.emoji), why: `${cap(set.map((p) => p.name).join(', then '))}.` };
  }
  if (task === 'three' || task === 'four') {
    const set = pickOf(SENTENCE_SETS.filter((s) => s.length === (task === 'three' ? 3 : 4)), r);
    return { task, ask: 'Tap the sentences in order: what happened first?', order: set, why: set.join(' ') };
  }
  const s = pickOf(STORY_ASKS, r);
  return { task, ask: s.question, story: s, options: shuffle(s.options, r), answer: s.answer, why: `${s.answer}.` };
}

export const CHEERS = { positions: 'Good word sorting!', words: 'Good word work!', story: 'Good story reading!' };

/** the lines that are always the same, for the recordings */
export function englishLines(): string[] {
  const out: string[] = [...Object.values(CHEERS), 'Tap every naming word, then press Done.', 'What comes next?',
    'Tap the pictures in order: first, next, last.', 'Tap the sentences in order: what happened first?'];
  for (const k of ['n', 'v', 'd'] as Kind[]) out.push(`Tap the ${KIND_NAME[k]}.`);
  for (const [a, b] of OPPOSITE_PAIRS) out.push(`What is the opposite of "${a}"?`, `What is the opposite of "${b}"?`, `${cap(a)} and ${b} are opposites.`, `${cap(b)} and ${a} are opposites.`);
  for (const [a, b] of SAME_PAIRS) out.push(`Which word means the same as "${a}"?`, `Which word means the same as "${b}"?`, `${cap(a)} and ${b} mean the same.`, `${cap(b)} and ${a} mean the same.`);
  for (const c of COMPOUNDS) out.push(`Which word goes with "${c.a}" to make a new word?`, `${cap(c.a)} and ${c.b} make ${c.word}.`, `Which two words make "${c.word}"?`, `${cap(c.word)} is ${c.a} and ${c.b}.`);
  for (const s of SENTENCE_SETS) out.push(...s);
  for (const s of STORY_ASKS) out.push(s.question, `${s.answer}.`);
  return [...new Set(out)];
}
