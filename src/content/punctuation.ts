/* Punctuation Ref: the sentences from words.ts with one mistake each, and
 * the call he makes (NSW English K–10, Stage 1, creating written texts:
 * punctuation "including question marks and exclamation marks", commas "to
 * separate ideas, lists", apostrophes for "simple contractions" and
 * "possessive apostrophes"; capital letters and full stops from
 * Kindergarten, kept as the first step).
 *
 * The sentences are written correctly in words.ts. Each question takes one
 * thing out (a capital, the end mark, the comma) so there is one right
 * answer, and says the whole sentence back, right, after his call. */

import type { Step } from './maths';
import {
  ANIMAL_OWNERS, CONTRACTIONS, LIST_SENTENCES, POSSESSIONS, PUNCTUATION_NAMES, PUNCTUATION_SENTENCES,
} from './words';

export type Task = 'capitals' | 'stop-or-ask' | 'ends' | 'commas' | 'short' | 'whose' | 'check';
export interface PunctuationStep extends Step { task: Task }

export const PUNCTUATION_STEPS: PunctuationStep[] = [
  { name: 'Capital letters', task: 'capitals' },
  { name: 'Full stop or question mark?', task: 'stop-or-ask' },
  { name: 'Full stop, question mark or exclamation mark?', task: 'ends' },
  { name: 'Commas in a list', task: 'commas' },
  { name: "Short words: don't, can't", task: 'short' },
  { name: "Whose is it? Sam's hat", task: 'whose' },
  { name: 'Which one is right?', task: 'check' },
];

export type Mark = '.' | '?' | '!';
export const MARK_NAME: Record<Mark, string> = { '.': 'Full stop', '?': 'Question mark', '!': 'Exclamation mark' };

export interface Sentence { text: string; mark: Mark }
export const SENTENCES: Sentence[] = PUNCTUATION_SENTENCES.map((text) => ({ text, mark: text.at(-1) as Mark }));
export const NAMES = new Set(PUNCTUATION_NAMES);

/** the words of a sentence, with what comes after each (a space, a comma, the end mark) */
export const wordsOf = (text: string): string[] => text.replace(/[.?!]$/, '').split(' ');
const bare = (word: string): string => word.replace(/[,]/g, '');

/** the words that must start with a capital: the first, I, the names, the days */
export function needsCapital(text: string): number[] {
  return wordsOf(text).flatMap((w, i) => (i === 0 || bare(w) === 'I' || NAMES.has(bare(w)) || bare(w) === 'Monday' ? [i] : []));
}

export interface PunctuationQuestion {
  task: Task;
  /** what he is asked to do */
  ask: string;
  /** the sentence as shown, with the mistake in it */
  shown: string;
  /** the right sentence, said back after */
  right: string;
  /** tap a word (capitals) or a gap (commas), or pick from options */
  tap?: 'word' | 'gap';
  /** the right answer: a word's place, a gap's place (after that word), or the option */
  answer: string;
  options: string[];
  /** said after: the rule */
  why: string;
}

type Rand = () => number;
const int = (r: Rand, n: number): number => Math.floor(r() * n);
const pickOf = <T>(list: readonly T[], r: Rand): T => list[int(r, list.length)];
const shuffle = <T>(list: T[], r: Rand): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) { const j = int(r, i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};
const lower = (w: string): string => w[0].toLowerCase() + w.slice(1);

export function capitalsQuestion(r: Rand = Math.random): PunctuationQuestion {
  /* a sentence with a capital that is not only the first word, half the time */
  const pool = r() < 0.5 ? SENTENCES.filter((s) => needsCapital(s.text).length > 1) : SENTENCES;
  const s = pickOf(pool, r);
  const at = pickOf(needsCapital(s.text), r);
  const words = wordsOf(s.text);
  const word = bare(words[at]);
  words[at] = lower(words[at]);
  const why = at === 0 ? 'A sentence starts with a capital letter.'
    : word === 'I' ? 'I is always a capital letter.'
      : word === 'Monday' ? 'The days of the week start with a capital letter.'
        : 'Names start with a capital letter.';
  return {
    task: 'capitals', ask: 'Which word needs a capital letter? Tap it.', shown: `${words.join(' ')}${s.mark}`, right: s.text,
    tap: 'word', answer: String(at), options: [], why,
  };
}

const END_WHY: Record<Mark, string> = {
  '.': 'It tells you something, so it ends with a full stop.',
  '?': 'It asks something, so it ends with a question mark.',
  '!': 'It is a shout or a surprise, so it ends with an exclamation mark.',
};

export function endsQuestion(withShouts: boolean, r: Rand = Math.random): PunctuationQuestion {
  const s = pickOf(SENTENCES.filter((x) => withShouts || x.mark !== '!'), r);
  const marks: Mark[] = withShouts ? ['.', '?', '!'] : ['.', '?'];
  return {
    task: withShouts ? 'ends' : 'stop-or-ask', ask: 'What goes at the end?', shown: s.text.slice(0, -1), right: s.text,
    answer: s.mark, options: marks, why: END_WHY[s.mark],
  };
}

export function commasQuestion(r: Rand = Math.random): PunctuationQuestion {
  const text = pickOf(LIST_SENTENCES, r);
  const words = wordsOf(text);
  const at = words.findIndex((w) => w.endsWith(','));
  return {
    task: 'commas', ask: 'Where does the comma go? Tap the gap.', shown: text.replace(',', ''), right: text,
    tap: 'gap', answer: String(at), options: [],
    why: 'A comma goes between the things in a list. Before the last one, "and" does the job.',
  };
}

export interface Contraction { long: string; short: string }
export const SHORT_WORDS: Contraction[] = CONTRACTIONS.map((line) => {
  const [long, short] = line.split(' = ');
  return { long, short };
});

/** the short word, with the apostrophe one place wrong, and with none */
export function wrongShort(short: string): string[] {
  const at = short.indexOf("'");
  const plain = short.replace("'", '');
  const moved = at > 1 ? `${plain.slice(0, at - 1)}'${plain.slice(at - 1)}` : `${plain.slice(0, at + 1)}'${plain.slice(at + 1)}`;
  return [moved, plain];
}

export function shortQuestion(r: Rand = Math.random): PunctuationQuestion {
  const c = pickOf(SHORT_WORDS, r);
  return {
    task: 'short', ask: `What is the short way to write "${c.long}"?`, shown: '', right: `${c.long} is ${c.short}.`,
    answer: c.short, options: shuffle([c.short, ...wrongShort(c.short)], r),
    why: `The apostrophe goes where the letters were taken out: ${c.long}, ${c.short}.`,
  };
}

export function whoseQuestion(r: Rand = Math.random): PunctuationQuestion {
  let owner: string;
  let thing: string;
  if (r() < 0.6) {
    owner = pickOf(PUNCTUATION_NAMES, r);
    thing = pickOf(POSSESSIONS, r);
  } else {
    const [animal, its] = pickOf(ANIMAL_OWNERS, r).split(':');
    owner = `the ${animal}`;
    thing = its;
  }
  const last = owner.split(' ').at(-1)!;
  const before = owner.includes(' ') ? `${owner.split(' ')[0]} ` : '';
  const Owner = owner[0].toUpperCase() + owner.slice(1);
  const right = `${last}'s`;
  return {
    task: 'whose', ask: `${Owner} has a ${thing}. Whose ${thing} is it?`, shown: `It is ${before}___ ${thing}.`,
    right: `It is ${before}${right} ${thing}.`, answer: right, options: shuffle([right, `${last}s`, `${last}s'`], r),
    why: `It belongs to ${owner}, so it is ${owner}'s ${thing}: an apostrophe and s.`,
  };
}

/** three of one sentence: right, without a capital, and with the wrong mark at
    the end (telling and asking only: "What a shot." is not wrong enough) */
export function checkQuestion(r: Rand = Math.random): PunctuationQuestion {
  const s = pickOf(SENTENCES.filter((x) => x.mark !== '!' && x.text.split(' ').length >= 3), r);
  const noCap = lower(s.text);
  const other: Mark = s.mark === '.' ? '?' : '.';
  const wrongEnd = `${s.text.slice(0, -1)}${other}`;
  return {
    task: 'check', ask: 'The ref checks the sentences. Which one is right?', shown: '', right: s.text,
    answer: s.text, options: shuffle([s.text, noCap, wrongEnd], r),
    why: `It starts with a capital letter. ${END_WHY[s.mark]}`,
  };
}

export function punctuationQuestion(task: Task, r: Rand = Math.random): PunctuationQuestion {
  switch (task) {
    case 'capitals': return capitalsQuestion(r);
    case 'stop-or-ask': return endsQuestion(false, r);
    case 'ends': return endsQuestion(true, r);
    case 'commas': return commasQuestion(r);
    case 'short': return shortQuestion(r);
    case 'whose': return whoseQuestion(r);
    default: return checkQuestion(r);
  }
}

export const CHEER = 'Good refereeing!';

/** the lines that are always the same, for the recordings */
export function punctuationLines(): string[] {
  return [
    CHEER, 'Which word needs a capital letter? Tap it.', 'What goes at the end?', 'Where does the comma go? Tap the gap.',
    'The ref checks the sentences. Which one is right?',
    'A sentence starts with a capital letter.', 'I is always a capital letter.', 'The days of the week start with a capital letter.',
    'Names start with a capital letter.', ...Object.values(END_WHY),
    'A comma goes between the things in a list. Before the last one, "and" does the job.',
    ...PUNCTUATION_SENTENCES, ...LIST_SENTENCES,
    ...SHORT_WORDS.flatMap((c) => [`What is the short way to write "${c.long}"?`, `The apostrophe goes where the letters were taken out: ${c.long}, ${c.short}.`]),
  ];
}
