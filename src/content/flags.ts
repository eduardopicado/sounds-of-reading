/* Flags, for the Flags game: the countries, their flags, what is on each
 * one, and the questions.
 *
 * The countries are the ones a six-year-old in Australia meets first: the
 * World Cup winners he plays as in the football games, Australia's
 * neighbours, and the big countries on the World Map. A flag is its emoji,
 * which the iPad draws as the flag itself.
 *
 * What is on a flag is said in words a child can check against the picture
 * ("a red maple leaf"), and a question about it ("Which flag has a maple
 * leaf?") only ever offers one flag that has it: Argentina and Uruguay both
 * have a sun with a face, and are never offered together for it. */

import type { Step } from './maths';
import { of, pt, thatIs, thatIsNot, whereIs, isHere, type Lang, type PtName } from './pt';

export type Mark =
  | 'southern-cross' | 'union-jack' | 'maple-leaf' | 'red-circle' | 'sun-face' | 'eagle'
  | 'wheel' | 'spears' | 'diamond' | 'fifty-stars' | 'five-stars' | 'y-shape' | 'bird';

export interface Country {
  /** its code on the World Map (Natural Earth's ADM0_A3), or none for a
      flag he knows from football that is not a country on the map */
  id: string;
  name: string;
  flag: string;
  /** what the flag looks like, said when he gets it wrong */
  looks: string;
  /** its name in Portuguese, and what its flag looks like */
  pt: PtName;
  looksPt: string;
  marks: Mark[];
  /** big enough to find on the map with a finger, on a phone too */
  big?: boolean;
  /** one of Australia's neighbours */
  near?: boolean;
  /** too small to tap on the map: islands a few pixels wide on a phone */
  tiny?: boolean;
}

export const COUNTRIES: Country[] = [
  { id: 'AUS', name: 'Australia', flag: '🇦🇺', big: true, near: true, marks: ['southern-cross', 'union-jack'],
    looks: "Australia's flag is blue, with the Union Jack in the corner, a big star under it, and the five stars of the Southern Cross.",
    pt: pt('Austrália', 'f'), looksPt: 'A bandeira da Austrália é azul, com a Union Jack no canto, uma estrela grande embaixo dela e as cinco estrelas do Cruzeiro do Sul.' },
  { id: 'NZL', name: 'New Zealand', flag: '🇳🇿', near: true, marks: ['southern-cross', 'union-jack'],
    looks: "New Zealand's flag is blue, with the Union Jack in the corner and four red stars of the Southern Cross.",
    pt: pt('Nova Zelândia', 'f'), looksPt: 'A bandeira da Nova Zelândia é azul, com a Union Jack no canto e quatro estrelas vermelhas do Cruzeiro do Sul.' },
  { id: 'PNG', name: 'Papua New Guinea', flag: '🇵🇬', near: true, marks: ['southern-cross', 'bird'],
    looks: "Papua New Guinea's flag is red and black, cut from corner to corner, with a yellow bird of paradise and the Southern Cross.",
    pt: pt('Papua-Nova Guiné', 'f', false), looksPt: 'A bandeira de Papua-Nova Guiné é vermelha e preta, cortada de um canto ao outro, com uma ave-do-paraíso amarela e o Cruzeiro do Sul.' },
  { id: 'IDN', name: 'Indonesia', flag: '🇮🇩', big: true, near: true, marks: [],
    looks: "Indonesia's flag is red on top and white underneath.",
    pt: pt('Indonésia', 'f'), looksPt: 'A bandeira da Indonésia é vermelha em cima e branca embaixo.' },
  { id: 'FJI', name: 'Fiji', flag: '🇫🇯', near: true, tiny: true, marks: ['union-jack'],
    looks: "Fiji's flag is light blue, with the Union Jack in the corner and a shield.",
    pt: pt('Fiji', 'm', false), looksPt: 'A bandeira de Fiji é azul-clara, com a Union Jack no canto e um escudo.' },
  { id: 'BRA', name: 'Brazil', flag: '🇧🇷', big: true, marks: ['diamond', 'southern-cross'],
    looks: "Brazil's flag is green, with a yellow diamond and a blue globe of stars in the middle.",
    pt: pt('Brasil', 'm'), looksPt: 'A bandeira do Brasil é verde, com um losango amarelo e um globo azul cheio de estrelas no meio.' },
  { id: 'ARG', name: 'Argentina', flag: '🇦🇷', big: true, marks: ['sun-face'],
    looks: "Argentina's flag is light blue, white and light blue, with a golden sun in the middle.",
    pt: pt('Argentina', 'f'), looksPt: 'A bandeira da Argentina é azul-clara, branca e azul-clara, com um sol dourado no meio.' },
  { id: 'URY', name: 'Uruguay', flag: '🇺🇾', marks: ['sun-face'],
    looks: "Uruguay's flag has white and blue stripes, with a golden sun in the corner.",
    pt: pt('Uruguai', 'm'), looksPt: 'A bandeira do Uruguai tem listras brancas e azuis, com um sol dourado no canto.' },
  { id: 'FRA', name: 'France', flag: '🇫🇷', marks: [],
    looks: "France's flag is blue, white and red, side by side.",
    pt: pt('França', 'f'), looksPt: 'A bandeira da França é azul, branca e vermelha, lado a lado.' },
  { id: 'DEU', name: 'Germany', flag: '🇩🇪', marks: [],
    looks: "Germany's flag is black, red and gold, from top to bottom.",
    pt: pt('Alemanha', 'f'), looksPt: 'A bandeira da Alemanha é preta, vermelha e dourada, de cima para baixo.' },
  { id: 'ITA', name: 'Italy', flag: '🇮🇹', marks: [],
    looks: "Italy's flag is green, white and red, side by side.",
    pt: pt('Itália', 'f'), looksPt: 'A bandeira da Itália é verde, branca e vermelha, lado a lado.' },
  { id: 'ESP', name: 'Spain', flag: '🇪🇸', marks: [],
    looks: "Spain's flag is red, yellow and red, with the yellow stripe twice as wide and a coat of arms.",
    pt: pt('Espanha', 'f'), looksPt: 'A bandeira da Espanha é vermelha, amarela e vermelha, com a faixa amarela duas vezes mais larga e um brasão.' },
  { id: 'PRT', name: 'Portugal', flag: '🇵🇹', marks: [],
    looks: "Portugal's flag is green and red, with a shield on a golden globe.",
    pt: pt('Portugal', 'm', false), looksPt: 'A bandeira de Portugal é verde e vermelha, com um escudo sobre um globo dourado.' },
  { id: 'USA', name: 'the United States', flag: '🇺🇸', big: true, marks: ['fifty-stars'],
    looks: "The United States flag has red and white stripes, and fifty white stars on blue.",
    pt: pt('Estados Unidos', 'm', true, true), looksPt: 'A bandeira dos Estados Unidos tem listras vermelhas e brancas, e cinquenta estrelas brancas no azul.' },
  { id: 'CAN', name: 'Canada', flag: '🇨🇦', big: true, marks: ['maple-leaf'],
    looks: "Canada's flag is a red maple leaf on white, with red at each side.",
    pt: pt('Canadá', 'm'), looksPt: 'A bandeira do Canadá é uma folha de bordo vermelha no branco, com vermelho dos dois lados.' },
  { id: 'MEX', name: 'Mexico', flag: '🇲🇽', big: true, marks: ['eagle'],
    looks: "Mexico's flag is green, white and red, with an eagle on a cactus in the middle.",
    pt: pt('México', 'm'), looksPt: 'A bandeira do México é verde, branca e vermelha, com uma águia em cima de um cacto no meio.' },
  { id: 'CHN', name: 'China', flag: '🇨🇳', big: true, marks: ['five-stars'],
    looks: "China's flag is red, with five yellow stars in the corner.",
    pt: pt('China', 'f'), looksPt: 'A bandeira da China é vermelha, com cinco estrelas amarelas no canto.' },
  { id: 'JPN', name: 'Japan', flag: '🇯🇵', marks: ['red-circle'],
    looks: "Japan's flag is white, with a red circle in the middle: the sun.",
    pt: pt('Japão', 'm'), looksPt: 'A bandeira do Japão é branca, com um círculo vermelho no meio: o sol.' },
  { id: 'IND', name: 'India', flag: '🇮🇳', big: true, marks: ['wheel'],
    looks: "India's flag is orange, white and green, with a blue wheel in the middle.",
    pt: pt('Índia', 'f'), looksPt: 'A bandeira da Índia é laranja, branca e verde, com uma roda azul no meio.' },
  { id: 'KOR', name: 'South Korea', flag: '🇰🇷', marks: [],
    looks: "South Korea's flag is white, with a red and blue circle and four black patterns.",
    pt: pt('Coreia do Sul', 'f'), looksPt: 'A bandeira da Coreia do Sul é branca, com um círculo vermelho e azul e quatro desenhos pretos.' },
  { id: 'ZAF', name: 'South Africa', flag: '🇿🇦', big: true, marks: ['y-shape'],
    looks: "South Africa's flag has a green Y lying on its side, with red, blue, black, gold and white.",
    pt: pt('África do Sul', 'f'), looksPt: 'A bandeira da África do Sul tem um Y verde deitado, com vermelho, azul, preto, dourado e branco.' },
  { id: 'EGY', name: 'Egypt', flag: '🇪🇬', big: true, marks: ['eagle'],
    looks: "Egypt's flag is red, white and black, with a golden eagle in the middle.",
    pt: pt('Egito', 'm'), looksPt: 'A bandeira do Egito é vermelha, branca e preta, com uma águia dourada no meio.' },
  { id: 'KEN', name: 'Kenya', flag: '🇰🇪', marks: ['spears'],
    looks: "Kenya's flag is black, red and green, with a shield and two spears.",
    pt: pt('Quênia', 'm'), looksPt: 'A bandeira do Quênia é preta, vermelha e verde, com um escudo e duas lanças.' },
  /* the look-alikes, here for "look closely" */
  { id: 'POL', name: 'Poland', flag: '🇵🇱', marks: [],
    looks: "Poland's flag is white on top and red underneath.",
    pt: pt('Polônia', 'f'), looksPt: 'A bandeira da Polônia é branca em cima e vermelha embaixo.' },
  { id: 'NLD', name: 'the Netherlands', flag: '🇳🇱', marks: [],
    looks: "The Netherlands flag is red, white and blue, from top to bottom.",
    pt: pt('Holanda', 'f'), looksPt: 'A bandeira da Holanda é vermelha, branca e azul, de cima para baixo.' },
  { id: 'IRL', name: 'Ireland', flag: '🇮🇪', marks: [],
    looks: "Ireland's flag is green, white and orange, side by side.",
    pt: pt('Irlanda', 'f'), looksPt: 'A bandeira da Irlanda é verde, branca e laranja, lado a lado.' },
  { id: 'BEL', name: 'Belgium', flag: '🇧🇪', marks: [],
    looks: "Belgium's flag is black, yellow and red, side by side.",
    pt: pt('Bélgica', 'f'), looksPt: 'A bandeira da Bélgica é preta, amarela e vermelha, lado a lado.' },
];

export const country = (id: string): Country => COUNTRIES.find((c) => c.id === id)!;

/** the name at the start of a sentence: "The United States" */
export const Named = (c: Country): string => c.name[0].toUpperCase() + c.name.slice(1);
/** the name on a button, in either language: "The United States", "Estados Unidos" */
export const namedIn = (c: Country, lang: Lang): string => (lang === 'pt' ? c.pt.name : Named(c));
/** what the flag looks like, in either language */
export const looksIn = (c: Country, lang: Lang): string => (lang === 'pt' ? c.looksPt : c.looks);
/** the flags most children know first: the football ones, and the biggest */
const KNOWN = ['AUS', 'BRA', 'ARG', 'FRA', 'DEU', 'ITA', 'ESP', 'PRT', 'USA', 'CAN', 'CHN', 'JPN', 'IND'];

/** flags that are easy to mix up, and how to tell them apart */
export const LOOKALIKES: { ids: string[]; tell: string; tellPt: string }[] = [
  { ids: ['AUS', 'NZL'], tell: "Australia's stars are white, and there are six. New Zealand has four red stars.",
    tellPt: 'As estrelas da Austrália são brancas, e são seis. A Nova Zelândia tem quatro estrelas vermelhas.' },
  { ids: ['IDN', 'POL'], tell: 'Indonesia is red on top. Poland is white on top.',
    tellPt: 'A Indonésia é vermelha em cima. A Polônia é branca em cima.' },
  { ids: ['FRA', 'NLD'], tell: 'France has its colours side by side. The Netherlands has them from top to bottom.',
    tellPt: 'A França tem as cores lado a lado. A Holanda tem as cores de cima para baixo.' },
  { ids: ['ITA', 'MEX', 'IRL'], tell: 'Italy is green, white and red. Mexico has an eagle in the middle. Ireland is orange on the right.',
    tellPt: 'A Itália é verde, branca e vermelha. O México tem uma águia no meio. A Irlanda é laranja do lado direito.' },
  { ids: ['ARG', 'URY'], tell: "Argentina has three stripes and the sun in the middle. Uruguay has nine stripes and the sun in the corner.",
    tellPt: 'A Argentina tem três listras e o sol no meio. O Uruguai tem nove listras e o sol no canto.' },
  { ids: ['DEU', 'BEL'], tell: 'Germany has black, red and gold from top to bottom. Belgium has black, yellow and red side by side.',
    tellPt: 'A Alemanha tem preto, vermelho e dourado de cima para baixo. A Bélgica tem preto, amarelo e vermelho lado a lado.' },
];

/* Flags that a child could fairly say have a mark, though it is not quite
   the one asked about, so they are never offered as the wrong answers for
   it: South Korea's circle is half red, Mexico's and Egypt's eagles are
   birds, and Australia and Papua New Guinea have five stars of their own. */
const NEARLY: Partial<Record<Mark, string[]>> = {
  'red-circle': ['KOR'],
  bird: ['MEX', 'EGY'],
  'five-stars': ['AUS', 'PNG', 'NZL', 'BRA'],
  'fifty-stars': ['BRA'],
};

/** a mark, as asked about: "Which flag has a maple leaf?" */
export const MARK_WORDS: Record<Mark, string> = {
  'southern-cross': 'the stars of the Southern Cross',
  'union-jack': 'the Union Jack',
  'maple-leaf': 'a maple leaf',
  'red-circle': 'a red circle',
  'sun-face': 'a sun with a face',
  eagle: 'an eagle',
  wheel: 'a wheel',
  spears: 'two spears',
  diamond: 'a yellow diamond',
  'fifty-stars': 'fifty stars',
  'five-stars': 'five yellow stars',
  'y-shape': 'a Y on its side',
  bird: 'a bird of paradise',
};

export const MARK_WORDS_PT: Record<Mark, string> = {
  'southern-cross': 'as estrelas do Cruzeiro do Sul',
  'union-jack': 'a Union Jack',
  'maple-leaf': 'uma folha de bordo',
  'red-circle': 'um círculo vermelho',
  'sun-face': 'um sol com rosto',
  eagle: 'uma águia',
  wheel: 'uma roda',
  spears: 'duas lanças',
  diamond: 'um losango amarelo',
  'fifty-stars': 'cinquenta estrelas',
  'five-stars': 'cinco estrelas amarelas',
  'y-shape': 'um Y deitado',
  bird: 'uma ave-do-paraíso',
};

/** "Which flag has a maple leaf?", in either language */
export const markAsk = (m: Mark, lang: Lang = 'en'): string =>
  (lang === 'pt' ? `Qual bandeira tem ${MARK_WORDS_PT[m]}?` : `Which flag has ${MARK_WORDS[m]}?`);

export interface FlagStep extends Step {
  /**
   * which: the name, choose the flag; whose: the flag, choose the name;
   * map: the flag and the name, find the country on the map;
   * alike: two (or three) flags that look alike, choose the one asked for;
   * mark: which flag has the thing asked about
   */
  task: 'which' | 'whose' | 'map' | 'alike' | 'mark';
  /** the countries it asks about */
  pool: 'known' | 'near' | 'big' | 'any';
}

export const FLAG_STEPS: FlagStep[] = [
  { name: 'Which flag?', task: 'which', pool: 'known' },
  { name: 'Whose flag?', task: 'whose', pool: 'known' },
  { name: "Australia's neighbours", task: 'which', pool: 'near' },
  { name: 'Find it on the map', task: 'map', pool: 'big' },
  { name: 'Look closely', task: 'alike', pool: 'any' },
  { name: "What's on the flag?", task: 'mark', pool: 'any' },
  { name: 'Find the neighbours on the map', task: 'map', pool: 'near' },
  { name: 'Find any of them on the map', task: 'map', pool: 'any' },
];

export interface FlagQuestion {
  task: FlagStep['task'];
  /** the country asked about, and the right answer */
  answer: string;
  /** the flags, or names, to choose from; none for the map */
  options: string[];
  /** the question, as written and said */
  ask: string;
  /** said once it is answered: what the flag looks like, or how to tell */
  why: string;
  /** the same two in Portuguese */
  pt: { ask: string; why: string };
}

const shuffle = <T>(xs: T[]): T[] => xs.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
const pickOf = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

/** the countries a step asks about; every one has a shape on the map */
export function poolOf(pool: FlagStep['pool']): Country[] {
  if (pool === 'known') return KNOWN.map(country);
  if (pool === 'near') return COUNTRIES.filter((c) => c.near);
  if (pool === 'big') return COUNTRIES.filter((c) => c.big);
  return COUNTRIES;
}

/** what is said for each kind of question */
export const flagSays = (c: Country, lang: Lang = 'en') => (lang === 'pt' ? {
  which: `Qual é a bandeira ${of(c.pt)}?`,
  whose: 'De que país é esta bandeira?',
  where: whereIs(c.pt),
  that: `Essa é a bandeira ${of(c.pt)}.`,
  this: `Esta é a bandeira ${of(c.pt)}.`,
  there: thatIs(c.pt),
  not: thatIsNot(c.pt),
  here: isHere(c.pt),
} : {
  which: `Which is the flag of ${c.name}?`,
  whose: 'Whose flag is this?',
  where: `Where is ${c.name}?`,
  that: `That is the flag of ${c.name}.`,
  this: `This is the flag of ${c.name}.`,
  there: `That is ${c.name}.`,
  /* a country on the map that is not one of his */
  not: `That is not ${c.name}.`,
  here: `${Named(c)} is here.`,
});

/**
 * One question at this step, avoiding the countries in `recent`.
 */
export function flagQuestion(step: FlagStep, recent: string[] = []): FlagQuestion {
  if (step.task === 'alike') {
    const fresh = LOOKALIKES.filter((l) => !l.ids.some((id) => recent.includes(id)));
    const pair = pickOf(fresh.length ? fresh : LOOKALIKES);
    const c = country(pickOf(pair.ids));
    return {
      task: 'alike', answer: c.id, options: shuffle(pair.ids), ask: flagSays(c).which, why: pair.tell,
      pt: { ask: flagSays(c, 'pt').which, why: pair.tellPt },
    };
  }
  if (step.task === 'mark') {
    /* a mark, one flag that has it, and two that have none of it */
    const marked = shuffle(COUNTRIES.filter((c) => c.marks.length && !recent.includes(c.id)));
    const c = marked[0] ?? pickOf(COUNTRIES.filter((x) => x.marks.length && x.id !== recent[0]));
    const mark = pickOf(c.marks);
    const others = shuffle(COUNTRIES.filter((x) => !x.marks.includes(mark) && !NEARLY[mark]?.includes(x.id))).slice(0, 2);
    return {
      task: 'mark', answer: c.id, options: shuffle([c.id, ...others.map((x) => x.id)]),
      ask: markAsk(mark), why: c.looks, pt: { ask: markAsk(mark, 'pt'), why: c.looksPt },
    };
  }
  /* a map question never asks for an island too small to tap */
  const pool = poolOf(step.pool).filter((c) => step.task !== 'map' || !c.tiny);
  /* with fewer countries than he has just seen, at least not the last one */
  const fresh = pool.filter((c) => !recent.includes(c.id));
  const c = pickOf(fresh.length ? fresh : pool.filter((x) => x.id !== recent[0]));
  if (step.task === 'map') {
    return { task: 'map', answer: c.id, options: [], ask: flagSays(c).where, why: c.looks, pt: { ask: flagSays(c, 'pt').where, why: c.looksPt } };
  }
  /* the other two from the same pool, so a neighbour is told from neighbours */
  const others = shuffle(pool.filter((x) => x.id !== c.id)).slice(0, 2);
  const options = shuffle([c.id, ...others.map((x) => x.id)]);
  const ask = (lang: Lang): string => (step.task === 'which' ? flagSays(c, lang).which : flagSays(c, lang).whose);
  return { task: step.task, answer: c.id, options, ask: ask('en'), why: c.looks, pt: { ask: ask('pt'), why: c.looksPt } };
}

/** every line the game can say in one language, for the recordings */
export function flagLines(lang: Lang = 'en'): string[] {
  return [
    ...COUNTRIES.flatMap((c) => [looksIn(c, lang), ...Object.values(flagSays(c, lang))]),
    ...LOOKALIKES.map((l) => (lang === 'pt' ? l.tellPt : l.tell)),
    ...(Object.keys(MARK_WORDS) as Mark[]).map((m) => markAsk(m, lang)),
  ];
}
