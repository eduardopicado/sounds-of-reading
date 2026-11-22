/* Treasure Map: reading a map, the way Kindergarten to Year 2 learn it, and on.
 *
 * An island drawn on a grid, letters along the top and numbers down the side,
 * with things on it and a key that says what each picture is. He finds a
 * thing with the key, says what is left, right, above or below another,
 * finds a square by its name (C2) and names the square a thing is in, then
 * follows compass directions: one way, then two ways to the treasure, then
 * which way one thing is from another. Years 3 and 4 go on to the points in
 * between (north-east) and a scale (each square is 10 metres).
 *
 * These are NSW's "Geography: places and maps" for K-2: a key, positional
 * words, grid references and compass directions, and the HASS 3-4 steps
 * after them.
 *
 * Every map is drawn fresh for each question, with each thing on it once, so
 * every question has one answer: "what is to the right of the hut?" is asked
 * only where something is there, and "which way is the crab from the hut?"
 * only of two things in one row or one column.
 *
 * What is said is cut into short phrases ("Start at the boat." "Go 2 squares
 * east," "then 1 square south.") that can each be recorded once for every
 * thing and number, rather than a sentence for every map; treasureLines()
 * lists them all for tools/make-audio.ts. */

import { MAP_THINGS } from './words';
import { REAL_WORDS } from './index';
import type { Step } from './maths';
import { pt, The, the, of, thatIs, type Both, type Lang, type PtName } from './pt';

/* ── the things ──────────────────────────────────────────────────────── */

export interface MapThing { word: string; picture: string; pt: PtName }

/** each thing's name in Portuguese, as he would say it at home */
const PT_THINGS: Record<string, PtName> = {
  hut: pt('cabana', 'f'), tree: pt('árvore', 'f'), rock: pt('pedra', 'f'), hill: pt('morro', 'm'),
  log: pt('tronco', 'm'), flag: pt('bandeira', 'f'), boat: pt('barco', 'm'), ship: pt('navio', 'm'),
  crab: pt('caranguejo', 'm'), shell: pt('concha', 'f'), duck: pt('pato', 'm'), nest: pt('ninho', 'm'),
  bench: pt('banco', 'm'), swing: pt('balanço', 'm'),
};

function lookup(word: string): MapThing {
  const found = REAL_WORDS.filter((w) => w.text === word && w.picture).sort((a, b) => a.level - b.level)[0];
  if (!found) throw new Error(`Treasure Map: "${word}" is not a real word with a picture in the lists`);
  const name = PT_THINGS[word];
  if (!name) throw new Error(`Treasure Map: "${word}" has no Portuguese name`);
  /* a picture that is one character with no emoji selector after it (⛰)
     is drawn as a black text sign on some screens: the selector makes it the
     coloured picture everywhere */
  const picture = [...found.picture!].length === 1 ? `${found.picture!}\uFE0F` : found.picture!;
  return { word, picture, pt: name };
}

export const THINGS: MapThing[] = MAP_THINGS.split('|').map((x) => x.trim()).filter(Boolean).map(lookup);

/* ── the grid ────────────────────────────────────────────────────────── */

export const LETTERS = 'ABCDEF';

/** a square: column and row from 0, the top left being A1 */
export interface Cell { c: number; r: number }

/** its name: "C2" */
export const squareName = ({ c, r }: Cell): string => `${LETTERS[c]}${r + 1}`;

export interface Placed extends Cell { thing: MapThing }

export interface IslandMap {
  cols: number;
  rows: number;
  things: Placed[];
}

export const thingAt = (map: IslandMap, cell: Cell): Placed | undefined =>
  map.things.find((t) => t.c === cell.c && t.r === cell.r);

export const inside = (map: IslandMap, { c, r }: Cell): boolean => c >= 0 && r >= 0 && c < map.cols && r < map.rows;

/* ── directions ──────────────────────────────────────────────────────── */

export type Dir = 'north' | 'south' | 'east' | 'west' | 'north-east' | 'north-west' | 'south-east' | 'south-west';
export const STRAIGHT: Dir[] = ['north', 'south', 'east', 'west'];
export const DIAGONAL: Dir[] = ['north-east', 'north-west', 'south-east', 'south-west'];

/** north is up the map, as on every map he will read */
export const STEP: Record<Dir, Cell> = {
  north: { c: 0, r: -1 }, south: { c: 0, r: 1 }, east: { c: 1, r: 0 }, west: { c: -1, r: 0 },
  'north-east': { c: 1, r: -1 }, 'north-west': { c: -1, r: -1 }, 'south-east': { c: 1, r: 1 }, 'south-west': { c: -1, r: 1 },
};

const DIR_PT: Record<Dir, string> = {
  north: 'norte', south: 'sul', east: 'leste', west: 'oeste',
  'north-east': 'nordeste', 'north-west': 'noroeste', 'south-east': 'sudeste', 'south-west': 'sudoeste',
};

/** the word on the map and on a button: "North", "Norte" */
export const dirName = (d: Dir, lang: Lang): string => {
  const word = lang === 'pt' ? DIR_PT[d] : d;
  return word[0].toUpperCase() + word.slice(1);
};

/** left, right, above and below: the positional words, before the compass */
export type Side = 'left' | 'right' | 'above' | 'below';
export const SIDES: Side[] = ['left', 'right', 'above', 'below'];
const SIDE_STEP: Record<Side, Cell> = { left: { c: -1, r: 0 }, right: { c: 1, r: 0 }, above: { c: 0, r: -1 }, below: { c: 0, r: 1 } };

const go = (from: Cell, by: Cell, times = 1): Cell => ({ c: from.c + by.c * times, r: from.r + by.r * times });

/* ── what is said ────────────────────────────────────────────────────── */

const both = (en: string, ptText: string): Both => ({ en, pt: ptText });
/** "no barco", "na concha": at, on, in, in Portuguese */
const em = (n: PtName): string => `${n.g === 'f' ? 'na' : 'no'} ${n.name}`;
const squares = (n: number, lang: Lang): string => (lang === 'pt' ? `${n} quadrado${n === 1 ? '' : 's'}` : `${n} square${n === 1 ? '' : 's'}`);

export const SAYS = {
  tapThing: (t: MapThing): Both => both(`Tap the ${t.word}.`, `Toque ${em(t.pt)}.`),
  thatIs: (t: MapThing): Both => both(`That is the ${t.word}.`, thatIs(t.pt)),
  isHere: (t: MapThing): Both => both(`The ${t.word} is here.`, `${The(t.pt)} está aqui.`),
  side: (s: Side, t: MapThing): Both => ({
    left: both(`What is to the left of the ${t.word}?`, `O que está à esquerda ${of(t.pt)}?`),
    right: both(`What is to the right of the ${t.word}?`, `O que está à direita ${of(t.pt)}?`),
    above: both(`What is above the ${t.word}?`, `O que está acima ${of(t.pt)}?`),
    below: both(`What is below the ${t.word}?`, `O que está abaixo ${of(t.pt)}?`),
  })[s],
  tapSquare: (sq: string): Both => both(`Tap square ${sq}.`, `Toque no quadrado ${sq}.`),
  squareIs: (sq: string): Both => both(`That is square ${sq}.`, `Esse é o quadrado ${sq}.`),
  squareHere: (sq: string): Both => both(`Square ${sq} is here.`, `O quadrado ${sq} fica aqui.`),
  whichSquare: (t: MapThing): Both => both(`Which square is the ${t.word} in?`, `Em que quadrado está ${the(t.pt)}?`),
  /** the square a thing is in; the map shows which thing */
  inSquare: (sq: string): Both => both(`It is in ${sq}.`, `Está no ${sq}.`),
  start: (t: MapThing): Both => both(`Start at the ${t.word}.`, `Comece ${em(t.pt)}.`),
  /** "Go 2 squares east." or, with a second leg to come, "Go 2 squares east," */
  go: (n: number, d: Dir, more = false): Both =>
    both(`Go ${squares(n, 'en')} ${d}${more ? ',' : '.'}`, `Ande ${squares(n, 'pt')} para o ${DIR_PT[d]}${more ? ',' : '.'}`),
  then: (n: number, d: Dir): Both => both(`then ${squares(n, 'en')} ${d}.`, `depois ${squares(n, 'pt')} para o ${DIR_PT[d]}.`),
  whatThere: both('What is there?', 'O que tem lá?'),
  tapTreasure: both('Tap where the treasure is.', 'Toque onde está o tesouro.'),
  found: both('You found the treasure!', 'Você achou o tesouro!'),
  treasureHere: both('The treasure is here.', 'O tesouro está aqui.'),
  whichWay: (t: MapThing): Both => both(`Which way is the ${t.word}?`, `Para que lado fica ${the(t.pt)}?`),
  itIs: (d: Dir): Both => both(`It is ${d}.`, `Fica para o ${DIR_PT[d]}.`),
  scale: (m: number): Both => both(`Each square is ${m} metres.`, `Cada quadrado tem ${m} metros.`),
  howFar: (t: MapThing): Both => both(`How far is it to the ${t.word}?`, `Qual é a distância até ${the(t.pt)}?`),
  metres: (m: number): Both => both(`It is ${m} metres.`, `São ${m} metros.`),
  yes: both('Yes!', 'Isso!'),
};

/* ── the steps ───────────────────────────────────────────────────────── */

export interface TreasureStep extends Step {
  /**
   * key: find a thing, with the key;
   * side: what is left, right, above or below a thing;
   * square: tap the square named (C2);
   * which: which square a thing is in;
   * compass: from a thing, so many squares north, south, east or west;
   * route: two legs to the treasure;
   * way: which way one thing is from another;
   * diagonal: north-east, north-west, south-east, south-west;
   * scale: how far, when each square is so many metres
   */
  task: 'key' | 'side' | 'square' | 'which' | 'compass' | 'route' | 'way' | 'diagonal' | 'scale';
  /** the map's size: 5 squares by 5, or 6 by 6 */
  size: 5 | 6;
  /** how many things are drawn on it */
  things: number;
}

export const TREASURE_STEPS: TreasureStep[] = [
  { name: 'Use the key', task: 'key', size: 5, things: 6 },
  { name: 'Left, right, above, below', task: 'side', size: 5, things: 8 },
  { name: 'Find the square', task: 'square', size: 5, things: 6 },
  { name: 'Which square?', task: 'which', size: 5, things: 6 },
  /* Year 2: the compass */
  { name: 'North, south, east, west', task: 'compass', size: 5, things: 8 },
  { name: 'Follow the directions', task: 'route', size: 6, things: 8 },
  { name: 'Which way is it?', task: 'way', size: 6, things: 8 },
  /* Years 3–4: the points between, and a scale */
  { name: 'North-east, south-west', task: 'diagonal', size: 6, things: 9 },
  { name: 'Each square is 10 metres', task: 'scale', size: 6, things: 8 },
];

/* ── the questions ───────────────────────────────────────────────────── */

export interface TreasureQuestion {
  task: TreasureStep['task'];
  map: IslandMap;
  /** the question, a phrase at a time, as said; written, they are joined */
  ask: Both[];
  /** what he answers by: a square on the map, or a button */
  by: 'tap' | 'choose';
  /** the square to tap (also where the treasure is) */
  answer: Cell;
  /** the buttons, for "which" (square names), "way" (directions), "scale" (metres) */
  options?: string[];
  /** the right button */
  pick?: string;
  /** a thing to light up as the start */
  from?: Placed;
  /** the squares walked, for the route, so the walk can be shown */
  walk?: Cell[];
  /** the scale: metres a square */
  metres?: number;
}

const rand = (n: number): number => Math.floor(Math.random() * n);
const shuffled = <T>(list: T[]): T[] => [...list].sort(() => Math.random() - 0.5);
const pickOne = <T>(list: T[]): T => list[rand(list.length)];

/** a fresh island: `count` different things on different squares */
export function islandMap(size: number, count: number): IslandMap {
  const cells = shuffled(Array.from({ length: size * size }, (_, i) => ({ c: i % size, r: Math.floor(i / size) })));
  const things = shuffled(THINGS).slice(0, count);
  return { cols: size, rows: size, things: things.map((thing, i) => ({ ...cells[i], thing })) };
}

/** the square names to choose from: the right one, and the slips: one letter or one number out */
function squareChoices(cell: Cell, map: IslandMap): string[] {
  const near = [{ c: 1, r: 0 }, { c: -1, r: 0 }, { c: 0, r: 1 }, { c: 0, r: -1 }]
    .map((d) => go(cell, d)).filter((x) => inside(map, x));
  return shuffled([cell, ...shuffled(near).slice(0, 3)]).map(squareName);
}

/**
 * One question at this step, on a fresh map. `recent` is the last few
 * things asked about, so a round does not keep finding the crab.
 */
export function treasureQuestion(step: TreasureStep, recent: string[] = []): TreasureQuestion {
  for (let tries = 0; ; tries += 1) {
    const q = attempt(step, recent);
    if (q) return q;
    if (tries > 200) throw new Error(`Treasure Map: no question for ${step.name}`);
  }
}

function attempt(step: TreasureStep, recent: string[]): TreasureQuestion | null {
  const map = islandMap(step.size, step.things);
  const fresh = (p: Placed): boolean => !recent.includes(p.thing.word);
  const pool = map.things.filter(fresh).length ? map.things.filter(fresh) : map.things;
  const base = { task: step.task, map };

  if (step.task === 'key') {
    const t = pickOne(pool);
    return { ...base, ask: [SAYS.tapThing(t.thing)], by: 'tap', answer: t };
  }

  if (step.task === 'side') {
    /* a thing with something right beside it, on that side */
    const pairs = pool.flatMap((t) => SIDES.map((s) => ({ t, s, there: thingAt(map, go(t, SIDE_STEP[s])) })))
      .filter((x) => x.there);
    if (!pairs.length) return null;
    const { t, s, there } = pickOne(pairs);
    return { ...base, ask: [SAYS.side(s, t.thing)], by: 'tap', answer: there!, from: t };
  }

  if (step.task === 'square') {
    const cell = { c: rand(map.cols), r: rand(map.rows) };
    return { ...base, ask: [SAYS.tapSquare(squareName(cell))], by: 'tap', answer: cell };
  }

  if (step.task === 'which') {
    const t = pickOne(pool);
    const options = squareChoices(t, map);
    return { ...base, ask: [SAYS.whichSquare(t.thing)], by: 'choose', answer: t, options, pick: squareName(t) };
  }

  if (step.task === 'compass' || step.task === 'diagonal') {
    /* from a thing, so many squares one way, to another thing */
    const dirs = step.task === 'compass' ? STRAIGHT : DIAGONAL;
    const most = step.task === 'compass' ? 3 : 2;
    const moves = pool.flatMap((t) => dirs.flatMap((d) => Array.from({ length: most }, (_, i) => i + 1)
      .map((n) => ({ t, d, n, there: thingAt(map, go(t, STEP[d], n)) }))))
      .filter((x) => x.there && x.there !== x.t);
    if (!moves.length) return null;
    const { t, d, n, there } = pickOne(moves);
    return { ...base, ask: [SAYS.start(t.thing), SAYS.go(n, d), SAYS.whatThere], by: 'tap', answer: there!, from: t };
  }

  if (step.task === 'route') {
    /* two legs at right angles, ending anywhere on the map: the treasure is buried there */
    const t = pickOne(pool);
    const [a, b] = rand(2) ? [pickOne(['north', 'south'] as Dir[]), pickOne(['east', 'west'] as Dir[])]
      : [pickOne(['east', 'west'] as Dir[]), pickOne(['north', 'south'] as Dir[])];
    const [n, m] = [1 + rand(3), 1 + rand(3)];
    const mid = go(t, STEP[a], n);
    const end = go(mid, STEP[b], m);
    if (!inside(map, mid) || !inside(map, end)) return null;
    const walk = [...Array.from({ length: n }, (_, i) => go(t, STEP[a], i + 1)), ...Array.from({ length: m }, (_, i) => go(mid, STEP[b], i + 1))];
    return {
      ...base, ask: [SAYS.start(t.thing), SAYS.go(n, a, true), SAYS.then(m, b), SAYS.tapTreasure],
      by: 'tap', answer: end, from: t, walk,
    };
  }

  if (step.task === 'way') {
    /* two things in one row or one column, so the way is one of the four */
    const pairs = pool.flatMap((t) => map.things.filter((o) => o !== t && (o.c === t.c || o.r === t.r)).map((o) => ({ t, o })));
    if (!pairs.length) return null;
    const { t, o } = pickOne(pairs);
    const d: Dir = o.r < t.r ? 'north' : o.r > t.r ? 'south' : o.c > t.c ? 'east' : 'west';
    return {
      ...base, ask: [SAYS.start(t.thing), SAYS.whichWay(o.thing)], by: 'choose', answer: o, from: t,
      options: STRAIGHT, pick: d,
    };
  }

  /* scale: two things in one row or column, so many squares apart */
  const pairs = pool.flatMap((t) => map.things.filter((o) => o !== t && (o.c === t.c || o.r === t.r)).map((o) => ({ t, o })));
  if (!pairs.length) return null;
  const { t, o } = pickOne(pairs);
  const metres = pickOne([2, 5, 10]);
  const apart = Math.abs(o.c - t.c) + Math.abs(o.r - t.r);
  const right = apart * metres;
  /* the slips: counting the squares and not the metres, counting both ends,
     and one square out either way */
  const slips = [apart, (apart + 1) * metres, (apart - 1) * metres, (apart + 2) * metres].filter((x) => x > 0 && x !== right);
  const options = shuffled([right, ...[...new Set(slips)].slice(0, 3)]).map(String);
  return {
    ...base, ask: [SAYS.scale(metres), SAYS.start(t.thing), SAYS.howFar(o.thing)], by: 'choose', answer: o, from: t,
    options, pick: String(right), metres,
  };
}

/* ── what he is told after ───────────────────────────────────────────── */

/**
 * What is said after an answer, a phrase at a time: on a right answer the
 * answer again ("The crab is in C4."), on a wrong one what he picked and
 * where the right one is.
 */
export function treasureSaid(q: TreasureQuestion, ok: boolean, picked?: Cell | string): Both[] {
  const at = thingAt(q.map, q.answer);
  const sq = squareName(q.answer);
  switch (q.task) {
    case 'route':
      return ok ? [SAYS.found] : [SAYS.treasureHere];
    case 'square': {
      if (ok) return [SAYS.yes, SAYS.squareIs(sq)];
      return [SAYS.squareIs(squareName(picked as Cell)), SAYS.squareHere(sq)];
    }
    case 'which':
      return ok ? [SAYS.yes, SAYS.inSquare(sq)] : [SAYS.inSquare(sq)];
    case 'way':
      return ok ? [SAYS.yes, SAYS.itIs(q.pick as Dir)] : [SAYS.itIs(q.pick as Dir)];
    case 'scale':
      return ok ? [SAYS.yes, SAYS.metres(Number(q.pick))] : [SAYS.metres(Number(q.pick))];
    default: {
      if (ok) return [SAYS.yes, SAYS.thatIs(at!.thing)];
      const other = picked && typeof picked !== 'string' ? thingAt(q.map, picked) : undefined;
      return [...(other ? [SAYS.thatIs(other.thing)] : [SAYS.squareIs(squareName(picked as Cell))]), SAYS.isHere(at!.thing)];
    }
  }
}

/* ── every line, for the recordings ──────────────────────────────────── */

/** every phrase the game can say in one language (tools/make-audio.ts):
    exactly what the steps can ask and answer, and no more, since every line
    here is a recording to make twice */
export function treasureLines(lang: Lang = 'en'): string[] {
  const out = new Set<string>();
  const add = (b: Both): void => { out.add(b[lang]); };
  for (const t of THINGS) {
    for (const f of [SAYS.tapThing, SAYS.thatIs, SAYS.isHere, SAYS.whichSquare, SAYS.start, SAYS.whichWay, SAYS.howFar]) add(f(t));
    for (const s of SIDES) add(SAYS.side(s, t));
  }
  const most = Math.max(...TREASURE_STEPS.map((x) => x.size));
  for (let c = 0; c < most; c += 1) {
    for (let r = 0; r < most; r += 1) {
      const sq = squareName({ c, r });
      /* what he tapped, on any map */
      add(SAYS.squareIs(sq));
      /* asked for, on the maps those steps draw */
      const asked = TREASURE_STEPS.filter((x) => x.task === 'square' || x.task === 'which').some((x) => c < x.size && r < x.size);
      if (asked) for (const f of [SAYS.tapSquare, SAYS.squareHere, SAYS.inSquare]) add(f(sq));
    }
  }
  /* one way: up to 3 squares, or 2 on a slant; the route's two legs, up to 3 each */
  for (const d of STRAIGHT) {
    for (let n = 1; n <= 3; n += 1) { add(SAYS.go(n, d)); add(SAYS.go(n, d, true)); add(SAYS.then(n, d)); }
    add(SAYS.itIs(d));
  }
  for (const d of DIAGONAL) for (let n = 1; n <= 2; n += 1) add(SAYS.go(n, d));
  /* the scale: two things at most a map's width apart */
  for (const m of [2, 5, 10]) {
    add(SAYS.scale(m));
    for (let k = 1; k < most; k += 1) add(SAYS.metres(k * m));
  }
  for (const b of [SAYS.whatThere, SAYS.tapTreasure, SAYS.found, SAYS.treasureHere, SAYS.yes]) add(b);
  return [...out];
}
