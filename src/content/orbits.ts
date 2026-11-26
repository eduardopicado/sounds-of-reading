/* Orbits: the planets going round the Sun, how far apart they really are,
 * the Earth's year and day, and the Moon going round the Earth and its
 * shapes. In English and Portuguese, like Solar System (space.ts has the
 * planets themselves).
 *
 * Day and night and the seasons are Stage 1 science; the Earth going round
 * the Sun and the Moon's shapes are Years 3 and 4, so they sit at the top of
 * the ladder.
 *
 * The numbers are the real ones, rounded: how far from the Sun in "Earth
 * steps" (astronomers call one an astronomical unit), and how long a planet
 * takes to go round in Earth years. */

import type { Step } from './maths';
import type { Both, Lang } from './pt';
import { IN_ORDER, PLANETS, planet, type Planet, type PlanetId } from './space';

/** how far from the Sun, with the Earth's distance as 1 */
export const DISTANCE: Record<PlanetId, number> = {
  mercury: 0.39, venus: 0.72, earth: 1, mars: 1.52, jupiter: 5.2, saturn: 9.58, uranus: 19.2, neptune: 30.1,
};
/** how long it takes to go round the Sun, in Earth years */
export const YEAR: Record<PlanetId, number> = {
  mercury: 0.24, venus: 0.62, earth: 1, mars: 1.88, jupiter: 11.9, saturn: 29.5, uranus: 84, neptune: 165,
};

export type Task = 'fast' | 'between' | 'scale' | 'year' | 'moon' | 'phases';
export interface OrbitStep extends Step { task: Task }

export const ORBIT_STEPS: OrbitStep[] = [
  { name: 'Fastest and slowest', task: 'fast' },
  { name: 'Next door', task: 'between' },
  { name: 'How far? To scale', task: 'scale' },
  { name: "The Earth's day and year", task: 'year' },
  { name: 'The Moon goes round the Earth', task: 'moon' },
  { name: "The Moon's shapes (Years 3–4)", task: 'phases' },
];

/** where the Moon is, seen from above with the Sun to the left */
export type MoonAt = 'new' | 'first' | 'full' | 'last';
export type Shape = 'full' | 'half' | 'new';
export const SHAPE_OF: Record<MoonAt, Shape> = { new: 'new', first: 'half', full: 'full', last: 'half' };
/** the Moon's angle round the Earth, from the side facing the Sun (left), anticlockwise as seen */
export const MOON_ANGLE: Record<MoonAt, number> = { new: 180, first: 270, full: 0, last: 90 };

export interface OrbitQuestion {
  task: Task;
  ask: Both;
  /** the answer keys on the buttons */
  options: string[];
  answer: string;
  /** what each key says on its button */
  labels: Record<string, Both>;
  why: Both;
  /** which planets the picture names (fast, between), the planet asked about (scale), the Moon's place (phases) */
  planets?: PlanetId[];
  moon?: MoonAt;
}

/* ── the words ──────────────────────────────────────────────────────── */

/** a planet in a Portuguese sentence: "a Terra", "Marte" */
const the = (p: Planet, lang: Lang): string => (lang === 'pt' && p.id === 'earth' ? 'a Terra' : p.name[lang]);
const The = (p: Planet, lang: Lang): string => (lang === 'pt' && p.id === 'earth' ? 'A Terra' : p.name[lang]);
const both = (f: (lang: Lang) => string): Both => ({ en: f('en'), pt: f('pt') });
const names = (ids: string[]): Record<string, Both> =>
  Object.fromEntries(ids.map((id) => [id, planet(id as PlanetId).name]));

export const ASK = {
  fastest: { en: 'Which of these goes round the Sun fastest?', pt: 'Qual destes dá a volta no Sol mais rápido?' },
  slowest: { en: 'Which of these goes round the Sun slowest?', pt: 'Qual destes dá a volta no Sol mais devagar?' },
  between: (a: Planet, c: Planet): Both => both((l) => (l === 'en'
    ? `Which planet is between ${a.name.en} and ${c.name.en}?`
    : `Qual planeta fica entre ${the(a, l)} e ${the(c, l)}?`)),
  scale: (p: Planet): Both => both((l) => (l === 'en'
    ? `The Earth is 1 step from the Sun. About how many steps away is ${p.name.en}?`
    : `A Terra está a 1 passo do Sol. Mais ou menos a quantos passos está ${p.name.pt}?`)),
  phase: { en: 'With the Moon here, what shape do we see from the Earth?', pt: 'Com a Lua aqui, que forma a gente vê da Terra?' },
} as const;

export const WHY = {
  fastest: (p: Planet): Both => both((l) => (l === 'en'
    ? `${p.name.en} goes round fastest. The nearer the Sun, the faster a planet goes round.`
    : `${The(p, l)} dá a volta mais rápido. Quanto mais perto do Sol, mais rápido o planeta dá a volta.`)),
  slowest: (p: Planet): Both => both((l) => (l === 'en'
    ? `${p.name.en} goes round slowest. The further from the Sun, the slower a planet goes round.`
    : `${The(p, l)} dá a volta mais devagar. Quanto mais longe do Sol, mais devagar o planeta dá a volta.`)),
  between: (a: Planet, b: Planet, c: Planet): Both => both((l) => (l === 'en'
    ? `${b.name.en} is between ${a.name.en} and ${c.name.en}.`
    : `${The(b, l)} fica entre ${the(a, l)} e ${the(c, l)}.`)),
  scale: (p: Planet, n: number): Both => ({
    en: `${p.name.en} is about ${n} times as far from the Sun as the Earth.`,
    pt: `${p.name.pt} está mais ou menos ${n} vezes mais longe do Sol que a Terra.`,
  }),
  phase: {
    full: { en: 'The Moon is on the far side of the Earth from the Sun, so we see all of its lit half: a full moon.', pt: 'A Lua está do outro lado da Terra, longe do Sol, então vemos toda a metade iluminada: lua cheia.' },
    new: { en: 'The Moon is between the Earth and the Sun. Its lit half faces away from us, so we cannot see it: a new moon.', pt: 'A Lua está entre a Terra e o Sol. A metade iluminada está virada para longe de nós, então não a vemos: lua nova.' },
    half: { en: 'From the side, we see half of its lit half: a half moon.', pt: 'De lado, vemos metade da parte iluminada: meia-lua.' },
  } satisfies Record<Shape, Both>,
};

const WORDS = {
  day: { en: 'A day', pt: 'Um dia' },
  month: { en: 'A month', pt: 'Um mês' },
  year: { en: 'A year', pt: 'Um ano' },
  yes: { en: 'Yes', pt: 'Sim' },
  no: { en: 'No', pt: 'Não' },
  sun: { en: 'The Sun', pt: 'O Sol' },
  full: { en: '🌕 Full moon', pt: '🌕 Lua cheia' },
  half: { en: '🌓 Half moon', pt: '🌓 Meia-lua' },
  new: { en: '🌑 New moon', pt: '🌑 Lua nova' },
} satisfies Record<string, Both>;
const n = (x: number): Both => ({ en: String(x), pt: String(x) });

/** the facts asked about the Earth and the Moon: always the same, a few of each */
interface Fact { ask: Both; options: string[]; answer: string; labels: Record<string, Both>; why: Both }

export const YEAR_FACTS: Fact[] = [
  {
    ask: { en: 'How long does the Earth take to go round the Sun?', pt: 'Quanto tempo a Terra leva para dar a volta no Sol?' },
    options: ['day', 'month', 'year'], answer: 'year', labels: WORDS,
    why: { en: 'The Earth goes round the Sun once a year: 365 days.', pt: 'A Terra dá a volta no Sol uma vez por ano: 365 dias.' },
  },
  {
    ask: { en: 'How long does the Earth take to spin round once?', pt: 'Quanto tempo a Terra leva para girar uma vez?' },
    options: ['day', 'month', 'year'], answer: 'day', labels: WORDS,
    why: { en: 'The Earth spins round once a day. That makes day and night.', pt: 'A Terra gira uma vez por dia. Isso faz o dia e a noite.' },
  },
  {
    ask: { en: 'How many days does the Earth take to go round the Sun?', pt: 'Quantos dias a Terra leva para dar a volta no Sol?' },
    options: ['7', '30', '365'], answer: '365', labels: { 7: n(7), 30: n(30), 365: n(365) },
    why: { en: 'The Earth goes round the Sun once a year: 365 days.', pt: 'A Terra dá a volta no Sol uma vez por ano: 365 dias.' },
  },
  ...(['mercury', 'venus'] as const).map((id): Fact => ({
    ask: { en: 'Which planet takes less than a year to go round the Sun?', pt: 'Qual planeta leva menos de um ano para dar a volta no Sol?' },
    options: [id, 'mars', 'jupiter'], answer: id, labels: names([id, 'mars', 'jupiter']),
    why: {
      en: `${planet(id).name.en} is nearer the Sun than the Earth, so its year is shorter.`,
      pt: `${planet(id).name.pt} está mais perto do Sol que a Terra, então o ano de ${planet(id).name.pt} é mais curto.`,
    },
  })),
];

export const MOON_FACTS: Fact[] = [
  {
    ask: { en: 'How long does the Moon take to go round the Earth?', pt: 'Quanto tempo a Lua leva para dar a volta na Terra?' },
    options: ['day', 'month', 'year'], answer: 'month', labels: WORDS,
    why: { en: 'The Moon goes round the Earth about once a month.', pt: 'A Lua dá a volta na Terra mais ou menos uma vez por mês.' },
  },
  {
    ask: { en: 'What does the Moon go round?', pt: 'Em volta de quê a Lua gira?' },
    options: ['earth', 'sun', 'mars'], answer: 'earth',
    labels: { earth: { en: 'The Earth', pt: 'A Terra' }, sun: WORDS.sun, mars: planet('mars').name },
    why: { en: 'The Moon goes round the Earth, and the Earth goes round the Sun.', pt: 'A Lua gira em volta da Terra, e a Terra gira em volta do Sol.' },
  },
  {
    ask: { en: 'Does the Moon make its own light?', pt: 'A Lua tem luz própria?' },
    options: ['yes', 'no'], answer: 'no', labels: WORDS,
    why: { en: 'No. The Moon shines because the Sun lights it up.', pt: 'Não. A Lua brilha porque o Sol ilumina ela.' },
  },
  {
    ask: { en: 'How many moons does the Earth have?', pt: 'Quantas luas a Terra tem?' },
    options: ['0', '1', '2'], answer: '1', labels: { 0: n(0), 1: n(1), 2: n(2) },
    why: { en: 'The Earth has one moon: the Moon.', pt: 'A Terra tem uma lua: a Lua.' },
  },
  {
    ask: { en: 'Which planet has the most moons?', pt: 'Qual planeta tem mais luas?' },
    options: ['saturn', 'earth', 'mars'], answer: 'saturn', labels: names(['saturn', 'earth', 'mars']),
    why: { en: 'Saturn has the most moons: 146 that we know of.', pt: 'Saturno tem mais luas: 146 que a gente conhece.' },
  },
];

/* ── making a question ──────────────────────────────────────────────── */

type Rand = () => number;
const int = (r: Rand, k: number): number => Math.floor(r() * k);
const shuffle = <T>(list: readonly T[], r: Rand): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) { const j = int(r, i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};

/** the giants' distances, rounded the way he would say them */
export const STEPS_AWAY: Partial<Record<PlanetId, number>> = { jupiter: 5, saturn: 10, uranus: 20, neptune: 30 };

export function orbitQuestion(task: Task, r: Rand = Math.random): OrbitQuestion {
  switch (task) {
    case 'fast': {
      const three = shuffle(PLANETS, r).slice(0, 3).map((p) => p.id);
      const fastest = r() < 0.6;
      const pick = [...three].sort((a, b) => YEAR[a] - YEAR[b])[fastest ? 0 : 2];
      return {
        task, ask: fastest ? ASK.fastest : ASK.slowest, options: three, answer: pick, labels: names(three),
        why: fastest ? WHY.fastest(planet(pick)) : WHY.slowest(planet(pick)), planets: three,
      };
    }
    case 'between': {
      const i = int(r, IN_ORDER.length - 2);
      const [a, b, c] = IN_ORDER.slice(i, i + 3);
      /* the answer, and two others not a or c */
      const others = shuffle(IN_ORDER.filter((p) => ![a, b, c].includes(p)), r).slice(0, 2).map((p) => p.id);
      const options = shuffle([b.id, ...others], r);
      return { task, ask: ASK.between(a, c), options, answer: b.id, labels: names(options), why: WHY.between(a, b, c), planets: [a.id, c.id] };
    }
    case 'scale': {
      const id = shuffle(Object.keys(STEPS_AWAY) as PlanetId[], r)[0];
      const steps = STEPS_AWAY[id]!;
      const options = shuffle([steps, ...shuffle([2, 5, 10, 20, 30, 100].filter((x) => x !== steps), r).slice(0, 2)], r).map(String);
      return {
        task, ask: ASK.scale(planet(id)), options, answer: String(steps),
        labels: Object.fromEntries(options.map((o) => [o, n(Number(o))])), why: WHY.scale(planet(id), steps), planets: [id],
      };
    }
    case 'year':
    case 'moon': {
      const f = (task === 'year' ? YEAR_FACTS : MOON_FACTS)[int(r, task === 'year' ? YEAR_FACTS.length : MOON_FACTS.length)];
      return { task, ask: f.ask, options: shuffle(f.options, r), answer: f.answer, labels: f.labels, why: f.why };
    }
    default: {
      const moon = (['new', 'first', 'full', 'last'] as MoonAt[])[int(r, 4)];
      const shape = SHAPE_OF[moon];
      return {
        task, ask: ASK.phase, options: ['full', 'half', 'new'], answer: shape, labels: WORDS, why: WHY.phase[shape], moon,
      };
    }
  }
}

export const CHEER = 'Good space exploring!';

/** every line the game says, for the recordings */
export function orbitLines(lang: Lang = 'en'): string[] {
  const out: string[] = [ASK.fastest[lang], ASK.slowest[lang], ASK.phase[lang]];
  for (const p of PLANETS) out.push(WHY.fastest(p)[lang], WHY.slowest(p)[lang]);
  for (let i = 0; i + 2 < IN_ORDER.length; i += 1) {
    const [a, b, c] = IN_ORDER.slice(i, i + 3);
    out.push(ASK.between(a, c)[lang], WHY.between(a, b, c)[lang]);
  }
  for (const [id, steps] of Object.entries(STEPS_AWAY)) out.push(ASK.scale(planet(id as PlanetId))[lang], WHY.scale(planet(id as PlanetId), steps!)[lang]);
  for (const f of [...YEAR_FACTS, ...MOON_FACTS]) out.push(f.ask[lang], f.why[lang]);
  for (const w of Object.values(WHY.phase)) out.push(w[lang]);
  return [...new Set(out)];
}
