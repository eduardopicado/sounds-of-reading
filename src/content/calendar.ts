/* Fixture Calendar: the days of the week, the months in order, the seasons,
 * how many days each month has, reading a calendar, and how long until the
 * match (NSW Mathematics K–10, Stage 1, non-spatial measure: "name and order
 * the months of the year", "recall the number of days in each month",
 * "identify a day and date using a Gregorian calendar", "use a calendar to
 * calculate the number of months, weeks or days until an upcoming event").
 *
 * The calendars are real ones, the year he is in. Weeks start on Monday, as
 * school calendars here do. Seasons are Australia's, which are Brazil's too:
 * summer is December, January and February. */

import type { Step } from './maths';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
export type Day = typeof DAYS[number];
export type Month = typeof MONTHS[number];
export type Season = 'summer' | 'autumn' | 'winter' | 'spring';
export const SEASONS: Season[] = ['summer', 'autumn', 'winter', 'spring'];

export type Task = 'days' | 'months' | 'seasons' | 'length' | 'read' | 'until' | 'weeks';
export interface CalendarStep extends Step { task: Task }

export const CALENDAR_STEPS: CalendarStep[] = [
  { name: 'Days of the week', task: 'days' },
  { name: 'Months in order', task: 'months' },
  { name: 'Seasons', task: 'seasons' },
  { name: 'Days in a month', task: 'length' },
  { name: 'Read the calendar', task: 'read' },
  { name: 'How many days until the match?', task: 'until' },
  { name: 'Weeks and months', task: 'weeks' },
];

/* ── the calendar itself ───────────────────────────────────────────── */

export const leap = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
/** days in a month (0 is January) */
export const daysIn = (month: number, year: number): number => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
/** the day of the week of a date, Monday 0 to Sunday 6 */
export const weekday = (year: number, month: number, date: number): number => (new Date(Date.UTC(year, month, date)).getUTCDay() + 6) % 7;

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st, 22nd, 23rd, 31st */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
}

/** the season in Australia (and Brazil): summer is December to February */
export const seasonOf = (month: number): Season => SEASONS[Math.floor(((month + 1) % 12) / 3)];
export const SEASON_NAME: Record<Season, string> = { summer: 'Summer', autumn: 'Autumn', winter: 'Winter', spring: 'Spring' };

/* ── the questions ─────────────────────────────────────────────────── */

export interface CalendarQuestion {
  /** what is asked, said and shown */
  ask: string;
  /** the answer, as the choice it is on */
  answer: string;
  /** the choices to tap; empty when he taps a date on the calendar */
  options: string[];
  /** said after: why it is that */
  why: string;
  /** a month to show: its year and month, with today and the match marked */
  calendar?: { year: number; month: number; today?: number; match?: number };
}

type Rand = () => number;
const int = (r: Rand, n: number): number => Math.floor(r() * n);
const shuffle = <T>(list: T[], r: Rand): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) { const j = int(r, i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};
/** the answer and others from the list, three or four in all, in a jumble */
function options<T extends string>(answer: T, all: readonly T[], r: Rand, n = 3): string[] {
  return shuffle([answer, ...shuffle(all.filter((x) => x !== answer), r).slice(0, n - 1)], r);
}
const numbers = (answer: number, r: Rand, spread = 3): string[] => {
  const set = new Set([answer]);
  while (set.size < 3) {
    const d = 1 + int(r, spread);
    const n = r() < 0.5 ? answer - d : answer + d;
    if (n > 0) set.add(n);
  }
  return shuffle([...set].map(String), r);
};

/** a day after or before, round the week (after Sunday comes Monday) */
export function daysQuestion(r: Rand = Math.random): CalendarQuestion {
  const i = int(r, 7);
  const after = r() < 0.6;
  const answer = DAYS[(i + (after ? 1 : 6)) % 7];
  return {
    ask: `What day comes ${after ? 'after' : 'before'} ${DAYS[i]}?`,
    answer,
    options: options(answer, DAYS, r),
    why: after ? `${answer} comes after ${DAYS[i]}.` : `${answer} comes before ${DAYS[i]}.`,
  };
}

/** a month after or before, round the year (after December comes January) */
export function monthsQuestion(r: Rand = Math.random): CalendarQuestion {
  const i = int(r, 12);
  const after = r() < 0.6;
  const answer = MONTHS[(i + (after ? 1 : 11)) % 12];
  return {
    ask: `What month comes ${after ? 'after' : 'before'} ${MONTHS[i]}?`,
    answer,
    options: options(answer, MONTHS, r),
    why: after ? `${answer} comes after ${MONTHS[i]}.` : `${answer} comes before ${MONTHS[i]}.`,
  };
}

export function seasonsQuestion(r: Rand = Math.random): CalendarQuestion {
  const m = int(r, 12);
  const s = seasonOf(m);
  const three = MONTHS.filter((_, k) => seasonOf(k) === s);
  return {
    ask: `What season is ${MONTHS[m]} in?`,
    answer: s,
    options: [...SEASONS],
    why: `${SEASON_NAME[s]} is ${three[0]}, ${three[1]} and ${three[2]}.`,
  };
}

export function lengthQuestion(year: number, r: Rand = Math.random): CalendarQuestion {
  const m = int(r, 12);
  const n = daysIn(m, year);
  const why = m === 1
    ? `February has 28 days, or 29 in a leap year. This year it has ${n}.`
    : `${MONTHS[m]} has ${n} days.`;
  return { ask: `How many days are in ${MONTHS[m]}?`, answer: String(n), options: m === 1 ? ['28', '29', '30', '31'].filter((x) => x !== (n === 28 ? '29' : '28')) : ['28', '30', '31'], why };
}

/** reading a month's calendar: what day a date is, or tap the date */
export function readQuestion(year: number, r: Rand = Math.random): CalendarQuestion {
  const month = int(r, 12);
  const date = 1 + int(r, daysIn(month, year));
  const day = DAYS[weekday(year, month, date)];
  const calendar = { year, month, match: date };
  if (r() < 0.5) {
    return { ask: `The match is on the ${ordinal(date)} of ${MONTHS[month]}. What day is that?`, answer: day, options: options(day, DAYS, r, 4), why: `The ${ordinal(date)} is a ${day}.`, calendar };
  }
  /* tap the date: no ball on the calendar, and a day name that pins one date */
  const nth = Math.ceil(date / 7);
  const word = ['first', 'second', 'third', 'fourth', 'fifth'][nth - 1];
  return {
    ask: `The match is on the ${word} ${day} in ${MONTHS[month]}. Tap the date.`,
    answer: String(date),
    options: [],
    why: `The ${word} ${day} is the ${ordinal(date)}.`,
    calendar: { year, month },
  };
}

/** today and the match on one month's calendar: count the days between */
export function untilQuestion(year: number, r: Rand = Math.random): CalendarQuestion {
  for (;;) {
    const month = int(r, 12);
    const today = 1 + int(r, daysIn(month, year));
    const gap = 2 + int(r, 12);
    const match = today + gap;
    if (match > daysIn(month, year)) continue;
    const t = DAYS[weekday(year, month, today)];
    const m = DAYS[weekday(year, month, match)];
    return {
      ask: `Today is ${t} the ${ordinal(today)}. The match is on ${m} the ${ordinal(match)}. How many days until the match?`,
      answer: String(gap),
      options: numbers(gap, r),
      why: `Count on from the ${ordinal(today)} to the ${ordinal(match)}: ${gap} days.`,
      calendar: { year, month, today, match },
    };
  }
}

/** weeks into days, or months until a date the same day of a later month */
export function weeksQuestion(r: Rand = Math.random): CalendarQuestion {
  if (r() < 0.5) {
    const weeks = 1 + int(r, 4);
    return {
      ask: `The match is in ${weeks} ${weeks === 1 ? 'week' : 'weeks'}. How many days is that?`,
      answer: String(weeks * 7),
      options: shuffle([...new Set([weeks * 7, weeks * 7 + 7, Math.max(7, weeks * 7 - 7), weeks + 7])].slice(0, 3).map(String), r),
      why: `A week is 7 days, so ${weeks} ${weeks === 1 ? 'week is' : 'weeks is'} ${weeks * 7} days.`,
    };
  }
  const from = int(r, 12);
  const months = 2 + int(r, 4);
  const to = (from + months) % 12;
  const date = 1 + int(r, 28);
  const between = Array.from({ length: months }, (_, k) => MONTHS[(from + 1 + k) % 12]);
  return {
    ask: `Today is the ${ordinal(date)} of ${MONTHS[from]}. The grand final is on the ${ordinal(date)} of ${MONTHS[to]}. How many months until then?`,
    answer: String(months),
    options: numbers(months, r, 2),
    why: `Count the months: ${between.join(', ')}. That is ${months} months.`,
  };
}

export function calendarQuestion(task: Task, year: number, r: Rand = Math.random): CalendarQuestion {
  switch (task) {
    case 'days': return daysQuestion(r);
    case 'months': return monthsQuestion(r);
    case 'seasons': return seasonsQuestion(r);
    case 'length': return lengthQuestion(year, r);
    case 'read': return readQuestion(year, r);
    case 'until': return untilQuestion(year, r);
    default: return weeksQuestion(r);
  }
}

export const CHEER = 'Good calendar reading!';

/** the lines that are always the same, for the recordings: the days and
    months round the week and year, the seasons, the months' lengths */
export function calendarLines(): string[] {
  const out: string[] = [CHEER];
  for (let i = 0; i < 7; i += 1) {
    const next = DAYS[(i + 1) % 7];
    out.push(`What day comes after ${DAYS[i]}?`, `What day comes before ${next}?`, `${next} comes after ${DAYS[i]}.`, `${DAYS[i]} comes before ${next}.`);
  }
  for (let i = 0; i < 12; i += 1) {
    const next = MONTHS[(i + 1) % 12];
    out.push(`What month comes after ${MONTHS[i]}?`, `What month comes before ${next}?`, `${next} comes after ${MONTHS[i]}.`, `${MONTHS[i]} comes before ${next}.`,
      `What season is ${MONTHS[i]} in?`, `How many days are in ${MONTHS[i]}?`);
    if (i !== 1) out.push(`${MONTHS[i]} has ${daysIn(i, 2025)} days.`);
  }
  for (const s of SEASONS) {
    const three = MONTHS.filter((_, k) => seasonOf(k) === s);
    out.push(`${SEASON_NAME[s]} is ${three[0]}, ${three[1]} and ${three[2]}.`);
  }
  out.push('February has 28 days, or 29 in a leap year. This year it has 28.', 'February has 28 days, or 29 in a leap year. This year it has 29.');
  return out;
}
