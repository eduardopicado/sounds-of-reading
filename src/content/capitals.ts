/* Capital cities, for the Capital Cities game: Australia's states and
 * territories and their capitals, then the capitals of the countries in
 * Flags of the World.
 *
 * Australia's states, territories and capital cities are what NSW teaches
 * in Years 3 and 4, so those steps sit at the top of the ladder; finding the
 * states, starting with New South Wales, where he lives, comes first.
 *
 * The world capitals are only the countries whose capital is not argued
 * over: Indonesia is moving its capital from Jakarta, and South Africa has
 * three, so neither is asked. Where the capital is not the biggest city
 * (Canberra, Brasília, Washington), the bigger ones are the wrong answers
 * offered, and the answer says so in words that stay true: "São Paulo and
 * Rio de Janeiro are bigger", never which city is the biggest. */

import type { Step } from './maths';
import { The, of, pt, thatIs, whereIs, isHere, type Lang, type PtName } from './pt';

export type StateId = 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';

export interface State {
  id: StateId;
  name: string;
  /** the way it is said in a sentence: "the Northern Territory" */
  called: string;
  /** what it is on a map: a state or a territory */
  kind: 'state' | 'territory';
  capital: string;
  /** where the capital is, as longitude and latitude */
  at: [number, number];
  /** where the name goes on the map */
  label: [number, number];
  fact: string;
  /** its name in Portuguese, and the fact */
  pt: PtName;
  factPt: string;
}

export const STATES: State[] = [
  { id: 'NSW', name: 'New South Wales', called: 'New South Wales', kind: 'state', capital: 'Sydney', at: [151.21, -33.87], label: [146.5, -32],
    fact: 'More people live in New South Wales than in any other state.',
    pt: pt('Nova Gales do Sul', 'f', false), factPt: 'Mais gente mora em Nova Gales do Sul do que em qualquer outro estado.' },
  { id: 'VIC', name: 'Victoria', called: 'Victoria', kind: 'state', capital: 'Melbourne', at: [144.96, -37.81], label: [144, -36.8],
    fact: 'Victoria is the smallest state on the mainland.',
    pt: pt('Vitória', 'f', false), factPt: 'Tirando a Tasmânia, Vitória é o menor estado.' },
  { id: 'QLD', name: 'Queensland', called: 'Queensland', kind: 'state', capital: 'Brisbane', at: [153.03, -27.47], label: [144.5, -22.5],
    fact: 'The Great Barrier Reef is off the coast of Queensland.',
    pt: pt('Queensland', 'm', false), factPt: 'A Grande Barreira de Corais fica no litoral de Queensland.' },
  { id: 'SA', name: 'South Australia', called: 'South Australia', kind: 'state', capital: 'Adelaide', at: [138.6, -34.93], label: [134.5, -30],
    fact: 'South Australia is the driest state.',
    pt: pt('Austrália Meridional', 'f'), factPt: 'A Austrália Meridional é o estado mais seco.' },
  { id: 'WA', name: 'Western Australia', called: 'Western Australia', kind: 'state', capital: 'Perth', at: [115.86, -31.95], label: [121.5, -25.5],
    fact: 'Western Australia is the biggest state.',
    pt: pt('Austrália Ocidental', 'f'), factPt: 'A Austrália Ocidental é o maior estado.' },
  { id: 'TAS', name: 'Tasmania', called: 'Tasmania', kind: 'state', capital: 'Hobart', at: [147.33, -42.88], label: [146.4, -41.9],
    fact: 'Tasmania is an island, across the sea from Victoria.',
    pt: pt('Tasmânia', 'f'), factPt: 'A Tasmânia é uma ilha, separada de Vitória pelo mar.' },
  { id: 'NT', name: 'Northern Territory', called: 'the Northern Territory', kind: 'territory', capital: 'Darwin', at: [130.84, -12.46], label: [133.5, -19.5],
    fact: 'Uluru is in the Northern Territory.',
    pt: pt('Território do Norte', 'm'), factPt: 'O Uluru fica no Território do Norte.' },
  { id: 'ACT', name: 'Australian Capital Territory', called: 'the Australian Capital Territory', kind: 'territory', capital: 'Canberra', at: [149.13, -35.28], label: [149.1, -35.6],
    fact: 'Canberra, the capital of Australia, is in the Australian Capital Territory.',
    pt: pt('Território da Capital Australiana', 'm'), factPt: 'Camberra, a capital da Austrália, fica no Território da Capital Australiana.' },
];

export const state = (id: StateId): State => STATES.find((s) => s.id === id)!;
/** "The Northern Territory" at the start of a sentence */
export const Called = (s: State): string => s.called[0].toUpperCase() + s.called.slice(1);

/** a country's capital, and the bigger cities offered as the wrong answers */
export interface Capital {
  /** the country's code, as in Flags of the World and on the world map */
  country: string;
  capital: string;
  /** cities of the same country that are bigger than its capital */
  bigger?: string[];
}

export const CAPITALS: Capital[] = [
  { country: 'AUS', capital: 'Canberra', bigger: ['Sydney', 'Melbourne'] },
  { country: 'NZL', capital: 'Wellington', bigger: ['Auckland'] },
  { country: 'PNG', capital: 'Port Moresby' },
  { country: 'FJI', capital: 'Suva' },
  { country: 'BRA', capital: 'Brasília', bigger: ['São Paulo', 'Rio de Janeiro'] },
  { country: 'ARG', capital: 'Buenos Aires' },
  { country: 'URY', capital: 'Montevideo' },
  { country: 'FRA', capital: 'Paris' },
  { country: 'DEU', capital: 'Berlin' },
  { country: 'ITA', capital: 'Rome' },
  { country: 'ESP', capital: 'Madrid' },
  { country: 'PRT', capital: 'Lisbon' },
  { country: 'USA', capital: 'Washington, D.C.', bigger: ['New York', 'Los Angeles'] },
  { country: 'CAN', capital: 'Ottawa', bigger: ['Toronto', 'Montreal'] },
  { country: 'MEX', capital: 'Mexico City' },
  { country: 'CHN', capital: 'Beijing', bigger: ['Shanghai'] },
  { country: 'JPN', capital: 'Tokyo' },
  { country: 'IND', capital: 'New Delhi' },
  { country: 'KOR', capital: 'Seoul' },
  { country: 'EGY', capital: 'Cairo' },
  { country: 'KEN', capital: 'Nairobi' },
  { country: 'POL', capital: 'Warsaw' },
  { country: 'NLD', capital: 'Amsterdam' },
  { country: 'IRL', capital: 'Dublin' },
  { country: 'BEL', capital: 'Brussels' },
];

/** the cities whose names are different in Portuguese, or that take an article */
const CITY_PT: Record<string, PtName> = {
  Canberra: pt('Camberra', 'f', false),
  Montevideo: pt('Montevidéu', 'f', false),
  Berlin: pt('Berlim', 'f', false),
  Rome: pt('Roma', 'f', false),
  Madrid: pt('Madri', 'f', false),
  Lisbon: pt('Lisboa', 'f', false),
  'New York': pt('Nova York', 'f', false),
  'Mexico City': pt('Cidade do México', 'f'),
  Beijing: pt('Pequim', 'f', false),
  Shanghai: pt('Xangai', 'f', false),
  Tokyo: pt('Tóquio', 'f', false),
  'New Delhi': pt('Nova Délhi', 'f', false),
  Seoul: pt('Seul', 'f', false),
  Cairo: pt('Cairo', 'm'),
  Nairobi: pt('Nairóbi', 'f', false),
  Warsaw: pt('Varsóvia', 'f', false),
  Amsterdam: pt('Amsterdã', 'f', false),
  Brussels: pt('Bruxelas', 'f', false),
};

/** a city in Portuguese: "Camberra", "o Cairo" */
export const cityPt = (city: string): PtName => CITY_PT[city] ?? pt(city, 'f', false);
/** a city's name on a button or the map, in either language */
export const cityIn = (city: string, lang: Lang): string => (lang === 'pt' ? cityPt(city).name : city);

/* ── the steps ───────────────────────────────────────────────────────── */

export interface CapitalStep extends Step {
  /**
   * state: tap the state or territory on the map;
   * capital: one state glows, choose its capital;
   * city: the capitals are dots on the map, tap the one asked for;
   * world: a country's flag, choose its capital;
   * bigger: a country whose capital is not its biggest city
   */
  task: 'state' | 'capital' | 'city' | 'world' | 'bigger';
  /** the names of the states on the map */
  names?: boolean;
}

export const CAPITAL_STEPS: CapitalStep[] = [
  { name: 'The states, with their names', task: 'state', names: true },
  { name: 'The states', task: 'state' },
  { name: 'Capital cities of the states', task: 'capital' },
  { name: 'Find the capital city', task: 'city' },
  { name: 'Capitals of the world', task: 'world' },
  { name: 'Not always the biggest city', task: 'bigger' },
];

export interface CapitalQuestion {
  task: CapitalStep['task'];
  /** a state's id, a city, or a country's code */
  answer: string;
  /** the state or the country the question is about */
  about: string;
  /** names to choose from, for the questions answered with a name */
  options: string[];
  ask: string;
  /** said once it is answered */
  why: string;
  /** the same two in Portuguese */
  pt: { ask: string; why: string };
}

const shuffle = <T>(xs: T[]): T[] => xs.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
const pickFresh = <T>(xs: T[], seen: (x: T) => boolean): T => {
  const fresh = xs.filter((x) => !seen(x));
  const from = fresh.length ? fresh : xs;
  return from[Math.floor(Math.random() * from.length)];
};

/** what is said for a state and its capital */
export const stateSays = (s: State, lang: Lang = 'en') => (lang === 'pt' ? {
  where: whereIs(s.pt),
  here: isHere(s.pt),
  that: thatIs(s.pt),
  capital: `Qual é a capital ${of(s.pt)}?`,
  is: `${The(cityPt(s.capital))} é a capital ${of(s.pt)}.`,
  find: whereIs(cityPt(s.capital)),
  city: thatIs(cityPt(s.capital)),
} : {
  where: `Where is ${s.called}?`,
  here: `${Called(s)} is here.`,
  that: `That is ${s.called}.`,
  capital: `What is the capital of ${s.called}?`,
  is: `${s.capital} is the capital of ${s.called}.`,
  find: `Where is ${s.capital}?`,
  city: `That is ${s.capital}.`,
});

/** what is said for a country's capital, given the country's name */
export const capitalSays = (c: Capital, name: string) => ({
  ask: `What is the capital of ${name}?`,
  is: `${c.capital} is the capital of ${name}.`,
  bigger: c.bigger ? `${c.capital} is the capital of ${name}. ${c.bigger.join(' and ')} ${c.bigger.length > 1 ? 'are' : 'is'} bigger.` : '',
});

/** the same in Portuguese, given the country's Portuguese name */
export const capitalSaysPt = (c: Capital, name: PtName) => {
  const is = `${The(cityPt(c.capital))} é a capital ${of(name)}.`;
  const bigger = (c.bigger ?? []).map((b) => The(cityPt(b)));
  return {
    ask: `Qual é a capital ${of(name)}?`,
    is,
    bigger: bigger.length ? `${is} ${bigger.join(' e ')} ${bigger.length > 1 ? 'são maiores' : 'é maior'}.` : '',
  };
};

/**
 * One question at this step, avoiding the answers in `recent`. `nameOf`
 * gives a country's name (from Flags of the World), so this file needs
 * nothing of the flags.
 */
export function capitalQuestion(
  step: CapitalStep, nameOf: (code: string) => string, recent: string[] = [], ptOf: (code: string) => PtName = (code) => pt(nameOf(code), 'm', false),
): CapitalQuestion {
  if (step.task === 'world' || step.task === 'bigger') {
    const pool = step.task === 'bigger' ? CAPITALS.filter((c) => c.bigger) : CAPITALS;
    const c = pickFresh(pool, (x) => recent.includes(x.country));
    const name = nameOf(c.country);
    /* the bigger cities first, then other capitals, so three to choose from */
    const others = [...(c.bigger ?? []), ...shuffle(CAPITALS.filter((x) => x !== c).map((x) => x.capital))].slice(0, 2);
    const says = capitalSays(c, name);
    const pts = capitalSaysPt(c, ptOf(c.country));
    return {
      task: step.task, answer: c.capital, about: c.country, options: shuffle([c.capital, ...others]),
      ask: says.ask, why: step.task === 'bigger' ? says.bigger : says.is,
      pt: { ask: pts.ask, why: step.task === 'bigger' ? pts.bigger : pts.is },
    };
  }
  const s = pickFresh(STATES, (x) => recent.includes(x.id));
  const says = stateSays(s);
  const pts = stateSays(s, 'pt');
  if (step.task === 'capital') {
    const others = shuffle(STATES.filter((x) => x !== s).map((x) => x.capital)).slice(0, 2);
    return {
      task: 'capital', answer: s.capital, about: s.id, options: shuffle([s.capital, ...others]),
      ask: says.capital, why: says.is, pt: { ask: pts.capital, why: pts.is },
    };
  }
  if (step.task === 'city') {
    return { task: 'city', answer: s.capital, about: s.id, options: [], ask: says.find, why: says.is, pt: { ask: pts.find, why: pts.is } };
  }
  return { task: 'state', answer: s.id, about: s.id, options: [], ask: says.where, why: s.fact, pt: { ask: pts.where, why: s.factPt } };
}

/** every line the game can say, for the recordings: in English with the
    countries' names, or in Portuguese with their Portuguese names */
export function capitalLines(nameOf: (code: string) => string, ptOf?: (code: string) => PtName): string[] {
  if (ptOf) {
    return [
      ...STATES.flatMap((s) => [s.factPt, ...Object.values(stateSays(s, 'pt'))]),
      ...CAPITALS.flatMap((c) => Object.values(capitalSaysPt(c, ptOf(c.country))).filter(Boolean)),
    ];
  }
  return [
    ...STATES.flatMap((s) => [s.fact, ...Object.values(stateSays(s))]),
    ...CAPITALS.flatMap((c) => Object.values(capitalSays(c, nameOf(c.country))).filter(Boolean)),
  ];
}
