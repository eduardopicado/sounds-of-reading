/* Coach Says: what the coach asks, built from the content file.
 *
 * The words come from words.ts (COACH_THINGS, COACH_PLACES, COACH_SAYS); this
 * turns them into questions. A question is the instruction he reads, the
 * pictures on the pitch, and the actions that answer it — a tap on a picture,
 * or a move of a picture into a place — so the game only has to draw them and
 * compare what he does.
 *
 * Every question has exactly one answer. "Tap the big dog" shows a big dog,
 * a small dog and another animal in both sizes; "Tap the dog that is not big"
 * the same pitch, so the size word has to be read as well as the animal. */

import { COACH_PLACES, COACH_SAYS, COACH_THINGS } from './words';
import { REAL_WORDS, type Level } from './index';
import type { Step } from './maths';
import { pick, shuffle } from '../lib/random';

export interface Thing { word: string; picture: string; level: Level }
export interface Place extends Thing { prep: 'in' | 'on' }

/** a word's picture and the level he can read it at, from the word lists */
function lookup(word: string): Thing {
  const found = REAL_WORDS.filter((w) => w.text === word && w.picture).sort((a, b) => a.level - b.level)[0];
  if (!found) throw new Error(`Coach Says: "${word}" is not a real word with a picture in the lists`);
  return { word, picture: found.picture!, level: found.level };
}

const split = (raw: string): string[] => raw.split('|').map((x) => x.trim()).filter(Boolean);

export const THINGS: Thing[] = split(COACH_THINGS).map(lookup);

export const PLACES: Place[] = split(COACH_PLACES).map((entry) => {
  const [prep, word] = entry.split(/\s+/);
  if (prep !== 'in' && prep !== 'on') throw new Error(`Coach Says: "${entry}" should start with in or on`);
  return { ...lookup(word), prep };
});

export type Task = 'tap' | 'both' | 'big' | 'put' | 'then' | 'notBig' | 'putBoth' | 'putThen';

export interface Template { task: Task; text: string; level: Level }

export const TEMPLATES: Record<Task, Template> = Object.fromEntries(Object.entries(COACH_SAYS).map(([task, raw]) => {
  const m = raw.match(/^(.*) @([1-8])$/);
  if (!m) throw new Error(`Coach Says: "${raw}" needs an @level`);
  return [task, { task: task as Task, text: m[1], level: Number(m[2]) as Level }];
})) as Record<Task, Template>;

export interface SaysStep extends Step { task: Task }

/** Kindy and Year 1 up to "this, then that"; the last three are Year 2 */
export const SAYS_STEPS: SaysStep[] = [
  { name: 'Tap it', task: 'tap' },
  { name: 'Tap two', task: 'both' },
  { name: 'Big or small', task: 'big' },
  { name: 'Put it in', task: 'put' },
  { name: 'This, then that', task: 'then' },
  { name: 'Not big', task: 'notBig' },
  { name: 'Two in one place', task: 'putBoth' },
  { name: 'Put, then tap', task: 'putThen' },
];

/** a picture on the pitch: a thing, drawn big or small */
export interface Shown { thing: Thing; big?: boolean }

export type Action = { kind: 'tap'; item: number } | { kind: 'put'; item: number; place: number };

export interface SaysQuestion {
  task: Task;
  text: string;
  shown: Shown[];
  places: Place[];
  /** what answers it */
  answer: Action[];
  /** whether the actions must come in that order; two taps or two moves
      joined by "and" may come either way round */
  ordered: boolean;
}

/** the things and places he can read: up to his top level, or the easiest
    few if that leaves too few to play with */
export function readable<T extends Thing>(list: T[], maxLevel: number, atLeast: number): T[] {
  const ok = list.filter((t) => t.level <= maxLevel);
  if (ok.length >= atLeast) return ok;
  return [...list].sort((a, b) => a.level - b.level).slice(0, atLeast);
}

const fill = (text: string, words: Record<string, string>): string =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => words[k] ?? '');

/** a question for this step, with words he can read at maxLevel; `avoid`
    keeps the last question's answer from coming straight back */
export function saysQuestion(step: SaysStep, maxLevel: number, avoid: string[] = []): SaysQuestion {
  const template = TEMPLATES[step.task];
  const things = readable(THINGS, maxLevel, 6);
  const fresh = things.filter((t) => !avoid.includes(t.word));
  const pool = fresh.length >= 4 ? fresh : things;
  const places = readable(PLACES, maxLevel, 3);

  if (step.task === 'big' || step.task === 'notBig') {
    const [a, b] = shuffle(pool).slice(0, 2);
    const shown = shuffle<Shown>([{ thing: a, big: true }, { thing: a, big: false }, { thing: b, big: true }, { thing: b, big: false }]);
    const want = shown.findIndex((s) => s.thing === a && s.big === (step.task === 'big'));
    return { task: step.task, text: fill(template.text, { a: a.word }), shown, places: [], answer: [{ kind: 'tap', item: want }], ordered: true };
  }

  const shown: Shown[] = shuffle(pool).slice(0, 4).map((thing) => ({ thing }));
  const [a, b, c] = shown.map((s) => s.thing);
  const ix = (t: Thing): number => shown.findIndex((s) => s.thing === t);
  if (step.task === 'tap') {
    const t = pick(shown).thing;
    return { task: 'tap', text: fill(template.text, { a: t.word }), shown, places: [], answer: [{ kind: 'tap', item: ix(t) }], ordered: true };
  }
  if (step.task === 'both' || step.task === 'then') {
    const text = fill(template.text, { a: a.word, b: b.word });
    return withAnswer({ task: step.task, text, shown, places: [], answer: [], ordered: step.task === 'then' }, [a, b]);
  }

  const at = shuffle(places).slice(0, 3);
  const into = pick(at);
  const words = { a: a.word, b: step.task === 'putBoth' ? b.word : into.word, c: step.task === 'putBoth' ? into.word : c.word, in: into.prep };
  const text = fill(template.text, words);
  const p = at.indexOf(into);
  const answer: Action[] = step.task === 'putBoth'
    ? [{ kind: 'put', item: ix(a), place: p }, { kind: 'put', item: ix(b), place: p }]
    : [{ kind: 'put', item: ix(a), place: p }, ...(step.task === 'putThen' ? [{ kind: 'tap', item: ix(c) } as Action] : [])];
  return { task: step.task, text, shown, places: at, answer, ordered: step.task !== 'putBoth' };
}

/** taps on these things, in this order */
function withAnswer(q: SaysQuestion, taps: Thing[]): SaysQuestion {
  return { ...q, answer: taps.map((t) => ({ kind: 'tap', item: q.shown.findIndex((s) => s.thing === t) })) };
}

/** does this action answer the question, given what has already been done? */
export function fits(q: SaysQuestion, done: Action[], action: Action): boolean {
  const same = (x: Action, y: Action): boolean =>
    x.kind === y.kind && x.item === y.item && (x.kind === 'tap' || (y.kind === 'put' && x.place === y.place));
  if (q.ordered) return !!q.answer[done.length] && same(q.answer[done.length], action);
  const left = q.answer.filter((x) => !done.some((d) => same(d, x)));
  return left.some((x) => same(x, action));
}

/** what kind of action comes next: a tap, or a move into a place (the
    actions of an unordered question are all of one kind) */
export const nextKind = (q: SaysQuestion, done: Action[]): Action['kind'] | null =>
  done.length >= q.answer.length ? null : q.answer[done.length].kind;
