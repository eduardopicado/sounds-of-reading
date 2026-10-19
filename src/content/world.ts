/* The world, for the World Map game: the seven continents and the five
 * oceans, where their names go on the map, a true thing about each, and the
 * questions the game asks.
 *
 * Continents and oceans are what Australian schools teach for the world in
 * Years 1 and 2 (the Australian Curriculum's "the location of the major
 * geographical divisions of the world: continents and oceans", and NSW's
 * "Features of places"), with Australia's place among them. The seven
 * continents are the ones he learns, with the continent called Australia;
 * the map follows the many atlases that colour New Zealand and the islands
 * of the Pacific with it, as Oceania, and its fact says so. The Southern
 * Ocean is south of Australia, from its coast, the way Australian maps draw
 * it (src/content/seas.ts has the lines between the oceans).
 *
 * Every question here has one answer that a map can show: "which ocean is
 * west of Australia?" is the Indian, and nothing else is. A direction that
 * a second place would also fit is left out rather than argued over: Asia
 * and Australia both lie between the Pacific and the Indian, and Africa as
 * well as Europe is west of Asia, from Arabia. */

import type { Step } from './maths';
import { The, of, pt, the, thatIs, thisIs, whereIs, isHere, type Both, type Lang, type PtName } from './pt';

export type ContinentId = 'africa' | 'antarctica' | 'asia' | 'australia' | 'europe' | 'north-america' | 'south-america';
export type OceanId = 'pacific' | 'atlantic' | 'indian' | 'southern' | 'arctic';
export type PlaceId = ContinentId | OceanId;

export interface Place {
  id: PlaceId;
  kind: 'continent' | 'ocean';
  /** its name: "Africa", "Pacific Ocean" */
  name: string;
  /** where its name goes, as longitude and latitude; the Pacific, at both
      edges of the map, has its name on each side */
  labels: [number, number][];
  /** one true thing about it, said when he finds it */
  fact: string;
  /** its name in Portuguese, and the fact */
  pt: PtName;
  factPt: string;
}

export const PLACES: Place[] = [
  { id: 'africa', kind: 'continent', name: 'Africa', labels: [[20, 4]],
    fact: 'Africa has more countries than any other continent.',
    pt: pt('África', 'f'), factPt: 'A África tem mais países do que qualquer outro continente.' },
  { id: 'antarctica', kind: 'continent', name: 'Antarctica', labels: [[20, -75]],
    fact: 'Antarctica is the coldest place on Earth, and nearly all of it is covered in ice.',
    pt: pt('Antártida', 'f'), factPt: 'A Antártida é o lugar mais frio da Terra, e quase toda ela é coberta de gelo.' },
  { id: 'asia', kind: 'continent', name: 'Asia', labels: [[95, 48]],
    fact: 'Asia is the biggest continent, and more people live there than anywhere else.',
    pt: pt('Ásia', 'f'), factPt: 'A Ásia é o maior continente, e é onde mora mais gente.' },
  { id: 'australia', kind: 'continent', name: 'Australia', labels: [[134, -25]],
    fact: 'Australia is the smallest continent. With New Zealand and the Pacific islands, some maps call it Oceania.',
    pt: pt('Austrália', 'f'), factPt: 'A Austrália é o menor continente. Com a Nova Zelândia e as ilhas do Pacífico, alguns mapas a chamam de Oceania.' },
  { id: 'europe', kind: 'continent', name: 'Europe', labels: [[16, 51]],
    fact: 'Europe is the second smallest continent, and it has lots of countries close together.',
    pt: pt('Europa', 'f'), factPt: 'A Europa é o segundo menor continente, e tem muitos países pertinho uns dos outros.' },
  { id: 'north-america', kind: 'continent', name: 'North America', labels: [[-102, 47]],
    fact: 'North America has Canada, the United States and Mexico in it.',
    pt: pt('América do Norte', 'f'), factPt: 'Na América do Norte ficam o Canadá, os Estados Unidos e o México.' },
  { id: 'south-america', kind: 'continent', name: 'South America', labels: [[-60, -12]],
    fact: 'Brazil is the biggest country in South America.',
    pt: pt('América do Sul', 'f'), factPt: 'O Brasil é o maior país da América do Sul.' },
  { id: 'pacific', kind: 'ocean', name: 'Pacific Ocean', labels: [[-138, -2], [160, 18]],
    fact: 'The Pacific is the biggest and the deepest ocean.',
    pt: pt('Oceano Pacífico', 'm'), factPt: 'O Pacífico é o maior e o mais fundo de todos os oceanos.' },
  { id: 'atlantic', kind: 'ocean', name: 'Atlantic Ocean', labels: [[-37, 24]],
    fact: 'The Atlantic Ocean is between the Americas, and Europe and Africa.',
    pt: pt('Oceano Atlântico', 'm'), factPt: 'O Oceano Atlântico fica entre as Américas, e a Europa e a África.' },
  { id: 'indian', kind: 'ocean', name: 'Indian Ocean', labels: [[75, -20]],
    fact: 'The Indian Ocean is the warmest ocean.',
    pt: pt('Oceano Índico', 'm'), factPt: 'O Oceano Índico é o oceano mais quente.' },
  { id: 'southern', kind: 'ocean', name: 'Southern Ocean', labels: [[130, -48]],
    fact: 'The Southern Ocean goes all the way around Antarctica.',
    pt: pt('Oceano Austral', 'm'), factPt: 'O Oceano Austral dá a volta inteira na Antártida.' },
  { id: 'arctic', kind: 'ocean', name: 'Arctic Ocean', labels: [[170, 76]],
    fact: 'The Arctic is the smallest ocean, and a lot of it is frozen.',
    pt: pt('Oceano Ártico', 'm'), factPt: 'O Ártico é o menor oceano, e boa parte dele é congelada.' },
];

export const place = (id: PlaceId): Place => PLACES.find((p) => p.id === id)!;

/** how a place is said in a sentence: "Africa", "the Pacific Ocean" */
export const called = (p: Place): string => (p.kind === 'ocean' ? `the ${p.name}` : p.name);
/** the same at the start of a sentence */
export const Called = (p: Place): string => (p.kind === 'ocean' ? `The ${p.name}` : p.name);
/** its name on the map and on a button, in either language */
export const nameIn = (p: Place, lang: Lang): string => (lang === 'pt' ? p.pt.name : p.name);

/* ── the questions ───────────────────────────────────────────────────── */

export type Compass = 'north' | 'south' | 'east' | 'west';

/** "Which continent is north of Australia?": Asia */
export interface Direction { of: PlaceId; dir: Compass; answer: PlaceId }

/* Around Australia first, where he lives, then the rest of the world. */
export const AROUND_AUSTRALIA: Direction[] = [
  { of: 'australia', dir: 'north', answer: 'asia' },
  { of: 'australia', dir: 'south', answer: 'antarctica' },
  { of: 'australia', dir: 'south', answer: 'southern' },
  { of: 'australia', dir: 'west', answer: 'indian' },
  { of: 'australia', dir: 'east', answer: 'pacific' },
];

export const DIRECTIONS: Direction[] = [
  { of: 'europe', dir: 'south', answer: 'africa' },
  { of: 'africa', dir: 'north', answer: 'europe' },
  { of: 'europe', dir: 'east', answer: 'asia' },
  { of: 'south-america', dir: 'north', answer: 'north-america' },
  { of: 'north-america', dir: 'south', answer: 'south-america' },
  { of: 'north-america', dir: 'north', answer: 'arctic' },
  { of: 'north-america', dir: 'east', answer: 'atlantic' },
  { of: 'north-america', dir: 'west', answer: 'pacific' },
  { of: 'south-america', dir: 'west', answer: 'pacific' },
  { of: 'africa', dir: 'west', answer: 'atlantic' },
  { of: 'africa', dir: 'east', answer: 'indian' },
  { of: 'asia', dir: 'south', answer: 'indian' },
];

/** "Which ocean is between Africa and Australia?": the Indian */
export interface Between { a: PlaceId; b: PlaceId; answer: PlaceId }

export const BETWEEN: Between[] = [
  { a: 'africa', b: 'australia', answer: 'indian' },
  { a: 'south-america', b: 'africa', answer: 'atlantic' },
  { a: 'north-america', b: 'europe', answer: 'atlantic' },
  { a: 'australia', b: 'south-america', answer: 'pacific' },
  { a: 'asia', b: 'north-america', answer: 'pacific' },
  { a: 'australia', b: 'antarctica', answer: 'southern' },
  { a: 'atlantic', b: 'indian', answer: 'africa' },
];

const kindWord = (id: PlaceId, lang: Lang = 'en'): string =>
  (lang === 'pt' ? { continent: 'continente', ocean: 'oceano' } : { continent: 'continent', ocean: 'ocean' })[place(id).kind];

const DIR_PT: Record<Compass, string> = { north: 'ao norte', south: 'ao sul', east: 'a leste', west: 'a oeste' };

/** the question and the answer, as said */
export const directionSays = (d: Direction, lang: Lang = 'en'): { ask: string; answer: string } => {
  const [of_, answer] = [place(d.of), place(d.answer)];
  if (lang === 'pt') {
    return {
      ask: `Qual ${kindWord(d.answer, 'pt')} fica ${DIR_PT[d.dir]} ${of(of_.pt)}?`,
      answer: `${The(answer.pt)} fica ${DIR_PT[d.dir]} ${of(of_.pt)}.`,
    };
  }
  return {
    ask: `Which ${kindWord(d.answer)} is ${d.dir} of ${called(of_)}?`,
    answer: `${Called(answer)} is ${d.dir} of ${called(of_)}.`,
  };
};

export const betweenSays = (b: Between, lang: Lang = 'en'): { ask: string; answer: string } => {
  const [a, c, answer] = [place(b.a), place(b.b), place(b.answer)];
  if (lang === 'pt') {
    return {
      ask: `Qual ${kindWord(b.answer, 'pt')} fica entre ${the(a.pt)} e ${the(c.pt)}?`,
      answer: `${The(answer.pt)} fica entre ${the(a.pt)} e ${the(c.pt)}.`,
    };
  }
  return {
    ask: `Which ${kindWord(b.answer)} is between ${called(a)} and ${called(c)}?`,
    answer: `${Called(answer)} is between ${called(a)} and ${called(c)}.`,
  };
};

/** finding one place, what is said when he taps another, and naming it */
export const findSays = (p: Place, lang: Lang = 'en'): { ask: string; here: string; that: string; this: string } => (lang === 'pt'
  ? { ask: whereIs(p.pt), here: isHere(p.pt), that: thatIs(p.pt), this: thisIs(p.pt) }
  : {
    ask: `Where is ${called(p)}?`,
    here: `${Called(p)} is here.`,
    that: `That is ${called(p)}.`,
    this: `This is ${called(p)}.`,
  });

/** the fact about a place, in either language */
export const factIn = (p: Place, lang: Lang): string => (lang === 'pt' ? p.factPt : p.fact);

/* The three seas the map draws that are no ocean's: a tap on one is a
   miss, and he is told which sea it was. */
export const SEAS = [
  { id: 'mediterranean', name: 'Mediterranean Sea', pt: pt('Mar Mediterrâneo', 'm') },
  { id: 'black', name: 'Black Sea', pt: pt('Mar Negro', 'm') },
  { id: 'caspian', name: 'Caspian Sea', pt: pt('Mar Cáspio', 'm') },
] as const;
export type SeaId = (typeof SEAS)[number]['id'];

export const seaSays = (id: SeaId, lang: Lang = 'en'): { that: string } => {
  const sea = SEAS.find((x) => x.id === id)!;
  return { that: lang === 'pt' ? thatIs(sea.pt) : `That is the ${sea.name}.` };
};

export const NAME_IT: Both = { en: 'What is it called?', pt: 'Como se chama?' };

/* ── the steps ───────────────────────────────────────────────────────── */

export interface MapStep extends Step {
  /**
   * find: tap the place asked for; name: one place glows, choose its name;
   * around: what is north, south, east or west of Australia;
   * between: which ocean (or continent) is between two places;
   * direction: north, south, east and west across the world
   */
  task: 'find' | 'name' | 'around' | 'between' | 'direction';
  /** which places: the continents, the oceans, or both */
  of: 'continent' | 'ocean' | 'both';
  /** the names written on the map */
  names: boolean;
}

export const MAP_STEPS: MapStep[] = [
  { name: 'Continents, with their names', task: 'find', of: 'continent', names: true },
  { name: 'Oceans, with their names', task: 'find', of: 'ocean', names: true },
  { name: 'Continents', task: 'find', of: 'continent', names: false },
  { name: 'Oceans', task: 'find', of: 'ocean', names: false },
  { name: 'What is it called?', task: 'name', of: 'both', names: false },
  { name: 'Around Australia', task: 'around', of: 'both', names: false },
  { name: 'Which ocean is between?', task: 'between', of: 'both', names: false },
  { name: 'North, south, east and west', task: 'direction', of: 'both', names: false },
];

export interface MapQuestion {
  task: MapStep['task'];
  answer: PlaceId;
  /** the question, as said and written */
  ask: string;
  /** what is said once it is answered: the fact, or the answer in a sentence */
  why: string;
  /** the same two in Portuguese */
  pt: { ask: string; why: string };
  /** for "What is it called?": the names to choose from */
  options?: PlaceId[];
  /** the places the question names, which have their names on the map */
  given?: PlaceId[];
}

const pickOf = <T>(list: T[], avoid: (x: T) => boolean): T => {
  const fresh = list.filter((x) => !avoid(x));
  const from = fresh.length ? fresh : list;
  return from[Math.floor(Math.random() * from.length)];
};

/**
 * One question at this step, avoiding the places in `recent` (the last few
 * answers), so a round does not keep asking for the same continent.
 */
export function mapQuestion(step: MapStep, recent: PlaceId[] = []): MapQuestion {
  const seen = (id: PlaceId): boolean => recent.includes(id);
  if (step.task === 'around' || step.task === 'direction') {
    const d = pickOf(step.task === 'around' ? AROUND_AUSTRALIA : DIRECTIONS, (x) => seen(x.answer));
    const says = directionSays(d);
    const pts = directionSays(d, 'pt');
    return { task: step.task, answer: d.answer, ask: says.ask, why: says.answer, pt: { ask: pts.ask, why: pts.answer }, given: [d.of] };
  }
  if (step.task === 'between') {
    const b = pickOf(BETWEEN, (x) => seen(x.answer));
    const says = betweenSays(b);
    const pts = betweenSays(b, 'pt');
    return { task: 'between', answer: b.answer, ask: says.ask, why: says.answer, pt: { ask: pts.ask, why: pts.answer }, given: [b.a, b.b] };
  }
  const pool = PLACES.filter((p) => step.of === 'both' || p.kind === step.of);
  const p = pickOf(pool, (x) => seen(x.id));
  if (step.task === 'name') {
    /* two other names of the same kind, so "ocean" in the name is no clue */
    const others = PLACES.filter((x) => x.kind === p.kind && x.id !== p.id).sort(() => Math.random() - 0.5).slice(0, 2);
    const options = [p, ...others].map((x) => x.id).sort(() => Math.random() - 0.5);
    return { task: 'name', answer: p.id, ask: NAME_IT.en, why: p.fact, pt: { ask: NAME_IT.pt, why: p.factPt }, options };
  }
  return { task: 'find', answer: p.id, ask: findSays(p).ask, why: p.fact, pt: { ask: findSays(p, 'pt').ask, why: p.factPt } };
}

/** every line the game can say in one language, for the recordings (tools/make-audio.ts) */
export function mapLines(lang: Lang = 'en'): string[] {
  return [
    NAME_IT[lang],
    ...PLACES.flatMap((p) => [factIn(p, lang), ...Object.values(findSays(p, lang))]),
    ...SEAS.map((x) => seaSays(x.id, lang).that),
    ...[...AROUND_AUSTRALIA, ...DIRECTIONS].flatMap((d) => Object.values(directionSays(d, lang))),
    ...BETWEEN.flatMap((b) => Object.values(betweenSays(b, lang))),
  ];
}
