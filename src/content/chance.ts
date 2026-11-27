/* Pick a Bib: chance, with training bibs in a bag (NSW Mathematics K–10,
 * Stage 1, Chance A and B: "recognises and describes the element of chance
 * in everyday events": possible outcomes, "likely" and "unlikely", "more"
 * or "less" likely, "possible"). Certain and impossible go with them.
 *
 * The bag is see-through: he sees what is in it, and says what could
 * happen when one bib is pulled out without looking. Then a spinner, and
 * last, ten picks made in front of him and what came up most, which is not
 * always the colour there was most of. */

import type { Step } from './maths';

export type Colour = 'yellow' | 'blue' | 'red' | 'green';
export const COLOURS: Colour[] = ['yellow', 'blue', 'red', 'green'];
export const COLOUR_NAME: Record<Colour, string> = { yellow: 'yellow', blue: 'blue', red: 'red', green: 'green' };
export const SHIRT: Record<Colour, string> = { yellow: '#F3C623', blue: '#3B7DD8', red: '#E4572E', green: '#2E9B57' };

export type Task = 'could' | 'will' | 'likely' | 'more' | 'spinner' | 'picks';
export interface ChanceStep extends Step { task: Task }

export const CHANCE_STEPS: ChanceStep[] = [
  { name: 'Could it happen?', task: 'could' },
  { name: 'Certain, possible or impossible?', task: 'will' },
  { name: 'Likely or unlikely?', task: 'likely' },
  { name: 'Which is more likely?', task: 'more' },
  { name: 'Spin the spinner', task: 'spinner' },
  { name: 'Ten picks', task: 'picks' },
];

export type Call = 'certain' | 'possible' | 'impossible' | 'likely' | 'unlikely';
export const CALL_WORDS: Record<Call, string> = {
  certain: 'Certain', possible: 'Possible', impossible: 'Impossible', likely: 'Likely', unlikely: 'Unlikely',
};

export interface ChanceQuestion {
  task: Task;
  ask: string;
  options: string[];
  labels: Record<string, string>;
  answer: string;
  why: string;
  /** what is in the bag, colour by colour */
  bag?: Partial<Record<Colour, number>>;
  /** the spinner's equal parts, in order round it */
  spinner?: Colour[];
  /** the ten bibs picked, in order */
  picks?: Colour[];
}

type Rand = () => number;
const int = (r: Rand, n: number): number => Math.floor(r() * n);
const between = (r: Rand, a: number, b: number): number => a + int(r, b - a + 1);
const shuffle = <T>(list: readonly T[], r: Rand): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) { const j = int(r, i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};
const callLabels = (calls: Call[]): Record<string, string> => Object.fromEntries(calls.map((c) => [c, CALL_WORDS[c]]));
const colourLabels = (cs: Colour[]): Record<string, string> => Object.fromEntries(cs.map((c) => [c, c[0].toUpperCase() + c.slice(1)]));
const bibs = (n: number, c: Colour): string => `${n} ${c} ${n === 1 ? 'bib' : 'bibs'}`;
export const total = (bag: Partial<Record<Colour, number>>): number => Object.values(bag).reduce((a, b) => a + (b ?? 0), 0);

/** a bag of two or three colours */
function someBag(r: Rand, colours: number): Partial<Record<Colour, number>> {
  const cs = shuffle(COLOURS, r).slice(0, colours);
  return Object.fromEntries(cs.map((c) => [c, between(r, 1, 6)]));
}

function could(r: Rand): ChanceQuestion {
  const bag = someBag(r, between(r, 1, 3));
  const inBag = Object.keys(bag) as Colour[];
  const out = COLOURS.filter((c) => !inBag.includes(c));
  const yes = r() < 0.5 || !out.length;
  const c = yes ? inBag[int(r, inBag.length)] : out[int(r, out.length)];
  return {
    task: 'could', ask: `You pick one bib without looking. Could it be ${c}?`, options: ['possible', 'impossible'],
    labels: { possible: 'Yes, it could', impossible: 'No, impossible' }, answer: yes ? 'possible' : 'impossible', bag,
    why: yes ? `There ${bag[c] === 1 ? 'is' : 'are'} ${bibs(bag[c]!, c)} in the bag, so it could happen: possible.` : `There are no ${c} bibs in the bag, so it cannot happen: impossible.`,
  };
}

function will(r: Rand): ChanceQuestion {
  const kind = (['certain', 'possible', 'impossible'] as Call[])[int(r, 3)];
  const c = COLOURS[int(r, 4)];
  let bag: Partial<Record<Colour, number>>;
  if (kind === 'certain') bag = { [c]: between(r, 3, 8) };
  else if (kind === 'possible') bag = { [c]: between(r, 1, 4), [COLOURS.find((x) => x !== c)!]: between(r, 1, 4) };
  else bag = { [COLOURS.find((x) => x !== c)!]: between(r, 2, 5), [COLOURS.filter((x) => x !== c)[1]]: between(r, 1, 4) };
  const why = kind === 'certain' ? `Every bib in the bag is ${c}, so you will pick ${c} for sure: certain.`
    : kind === 'possible' ? `There are ${c} bibs and other colours too, so ${c} could happen, or not: possible.`
      : `There are no ${c} bibs in the bag: impossible.`;
  return {
    task: 'will', ask: `You pick one bib without looking. Will it be ${c}?`, options: ['certain', 'possible', 'impossible'],
    labels: callLabels(['certain', 'possible', 'impossible']), answer: kind, bag, why,
  };
}

/** one colour at least twice as many as the other, so the answer is clear */
function likely(r: Rand): ChanceQuestion {
  const [a, b] = shuffle(COLOURS, r);
  const few = between(r, 1, 2);
  const many = between(r, few * 3, 9);
  const bag = { [a]: many, [b]: few } as Partial<Record<Colour, number>>;
  const askMany = r() < 0.5;
  const c = askMany ? a : b;
  return {
    task: 'likely', ask: `You pick one bib without looking. Is ${c} likely or unlikely?`, options: ['likely', 'unlikely'],
    labels: callLabels(['likely', 'unlikely']), answer: askMany ? 'likely' : 'unlikely', bag,
    why: askMany ? `There are ${many} ${c} and only ${few} ${b}: ${c} is likely.` : `There ${few === 1 ? 'is' : 'are'} only ${bibs(few, c)}, and ${many} ${a}: ${c} is unlikely.`,
  };
}

/** two or three colours, one clearly the most (or the fewest) */
function more(r: Rand): ChanceQuestion {
  const cs = shuffle(COLOURS, r).slice(0, between(r, 2, 3));
  const counts = shuffle([between(r, 6, 9), between(r, 2, 4), 1].slice(0, cs.length), r);
  const bag = Object.fromEntries(cs.map((c, i) => [c, counts[i]])) as Partial<Record<Colour, number>>;
  const most = r() < 0.65;
  const sorted = [...cs].sort((x, y) => bag[y]! - bag[x]!);
  const pick = most ? sorted[0] : sorted[sorted.length - 1];
  return {
    task: 'more', ask: `Which colour are you ${most ? 'most' : 'least'} likely to pick?`, options: cs, labels: colourLabels(cs),
    answer: pick, bag,
    why: most ? `There are more ${pick} bibs than any other colour: ${bag[pick]}. That makes ${pick} the most likely.` : `There are fewest ${pick} bibs: only ${bag[pick]}. That makes ${pick} the least likely.`,
  };
}

/** a spinner in eight equal parts, one colour on most of them */
function spinner(r: Rand): ChanceQuestion {
  const [a, b, c] = shuffle(COLOURS, r);
  const na = between(r, 4, 6);
  const nb = between(r, 1, 8 - na - 1);
  const nc = 8 - na - nb;
  const parts = shuffle([...Array<Colour>(na).fill(a), ...Array<Colour>(nb).fill(b), ...Array<Colour>(nc).fill(c)], r);
  const counts: Record<string, number> = { [a]: na, [b]: nb, [c]: nc };
  const most = nb !== nc && r() < 0.4 ? false : true;
  const least = nb < nc ? b : c;
  const pick = most ? a : least;
  const cs = [a, b, c];
  return {
    task: 'spinner', ask: `Where is the spinner ${most ? 'most' : 'least'} likely to stop?`, options: shuffle(cs, r), labels: colourLabels(cs),
    answer: pick, spinner: parts,
    why: `${pick[0].toUpperCase() + pick.slice(1)} has ${counts[pick]} of the 8 parts, ${most ? 'more than any other colour' : 'fewer than any other colour'}: it is the ${most ? 'most' : 'least'} likely.`,
  };
}

/** ten picks, a bib put back each time; which came up most (never a tie) */
function picks(r: Rand): ChanceQuestion {
  for (;;) {
    const [a, b] = shuffle(COLOURS, r);
    const bag = { [a]: between(r, 5, 7), [b]: between(r, 2, 3) } as Partial<Record<Colour, number>>;
    const pool: Colour[] = [...Array<Colour>(bag[a]!).fill(a), ...Array<Colour>(bag[b]!).fill(b)];
    const out = Array.from({ length: 10 }, () => pool[int(r, pool.length)]);
    const na = out.filter((x) => x === a).length;
    const nb = 10 - na;
    if (na === nb) continue;
    const top = na > nb ? a : b;
    const cs = [a, b];
    return {
      task: 'picks', ask: 'Ten bibs were picked, each put back before the next. Which colour came up most?', options: cs, labels: colourLabels(cs),
      answer: top, bag, picks: out,
      why: top === a
        ? `${a[0].toUpperCase() + a.slice(1)} came up ${Math.max(na, nb)} times. There were more ${a} bibs, so that was likely.`
        : `${b[0].toUpperCase() + b.slice(1)} came up ${Math.max(na, nb)} times, even though there were fewer ${b} bibs. Unlikely things can still happen!`,
    };
  }
}

export function chanceQuestion(task: Task, r: Rand = Math.random): ChanceQuestion {
  switch (task) {
    case 'could': return could(r);
    case 'will': return will(r);
    case 'likely': return likely(r);
    case 'more': return more(r);
    case 'spinner': return spinner(r);
    default: return picks(r);
  }
}

export const CHEER = 'Good guessing!';

/** the lines that are always the same, for the recordings */
export function chanceLines(): string[] {
  const out: string[] = [CHEER, 'Which colour are you most likely to pick?', 'Which colour are you least likely to pick?',
    'Where is the spinner most likely to stop?', 'Where is the spinner least likely to stop?',
    'Ten bibs were picked, each put back before the next. Which colour came up most?'];
  for (const c of COLOURS) {
    out.push(`You pick one bib without looking. Could it be ${c}?`, `You pick one bib without looking. Will it be ${c}?`,
      `You pick one bib without looking. Is ${c} likely or unlikely?`, `There are no ${c} bibs in the bag, so it cannot happen: impossible.`,
      `Every bib in the bag is ${c}, so you will pick ${c} for sure: certain.`, `There are ${c} bibs and other colours too, so ${c} could happen, or not: possible.`,
      `There are no ${c} bibs in the bag: impossible.`);
  }
  return out;
}
