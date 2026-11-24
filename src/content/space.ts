/* The Solar System: the Sun and its eight planets, a true thing about each,
 * and the questions the Solar System game asks.
 *
 * Year 1 and 2 science ("Earth and space": what changes in the sky, the Sun,
 * the Moon, day and night) and the planets a child meets in every space
 * book: their names, their order out from the Sun, which is biggest, which
 * has the bright rings. In English and Portuguese, like the geography games.
 *
 * Mystery Planet is a detective game: a secret planet, and questions with a
 * yes or no answer that rule planets out until one is left. Each planet is
 * the only one with a yes to one question, so every mystery can be solved;
 * the cards offered are only ones that would still rule something out, four
 * at most. */

import type { Step } from './maths';
import type { Both, Lang } from './pt';

export type PlanetId = 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';

export interface Planet {
  id: PlanetId;
  name: Both;
  /** how far from the Sun, 1 nearest */
  order: number;
  /** how wide, in thousands of kilometres (NASA's figures, rounded) */
  width: number;
  /** its moons, known ones */
  moons: number;
  fact: Both;
}

export const PLANETS: Planet[] = [
  { id: 'mercury', name: { en: 'Mercury', pt: 'Mercúrio' }, order: 1, width: 4.9, moons: 0,
    fact: { en: 'Mercury is the smallest planet, and the nearest to the Sun.', pt: 'Mercúrio é o menor planeta, e o mais perto do Sol.' } },
  { id: 'venus', name: { en: 'Venus', pt: 'Vênus' }, order: 2, width: 12.1, moons: 0,
    fact: { en: 'Venus is the hottest planet, even hotter than Mercury.', pt: 'Vênus é o planeta mais quente, mais quente até que Mercúrio.' } },
  { id: 'earth', name: { en: 'Earth', pt: 'Terra' }, order: 3, width: 12.7, moons: 1,
    fact: { en: 'Earth is our home, the only planet we know with living things.', pt: 'A Terra é a nossa casa, o único planeta que conhecemos com seres vivos.' } },
  { id: 'mars', name: { en: 'Mars', pt: 'Marte' }, order: 4, width: 6.8, moons: 2,
    fact: { en: 'Mars is the red planet. Its dust is red with rust.', pt: 'Marte é o planeta vermelho. A poeira dele é vermelha de ferrugem.' } },
  { id: 'jupiter', name: { en: 'Jupiter', pt: 'Júpiter' }, order: 5, width: 139.8, moons: 95,
    fact: { en: 'Jupiter is the biggest planet. All the others could fit inside it.', pt: 'Júpiter é o maior planeta. Todos os outros caberiam dentro dele.' } },
  { id: 'saturn', name: { en: 'Saturn', pt: 'Saturno' }, order: 6, width: 116.5, moons: 146,
    fact: { en: 'Saturn has big, bright rings, made of ice and rock.', pt: 'Saturno tem anéis grandes e brilhantes, feitos de gelo e pedra.' } },
  { id: 'uranus', name: { en: 'Uranus', pt: 'Urano' }, order: 7, width: 50.7, moons: 28,
    fact: { en: 'Uranus spins on its side, like a ball rolling around the Sun.', pt: 'Urano gira deitado, como uma bola rolando em volta do Sol.' } },
  { id: 'neptune', name: { en: 'Neptune', pt: 'Netuno' }, order: 8, width: 49.2, moons: 16,
    fact: { en: 'Neptune is the farthest planet from the Sun, and the windiest.', pt: 'Netuno é o planeta mais longe do Sol, e o que tem mais vento.' } },
];

export const planet = (id: PlanetId): Planet => PLANETS.find((p) => p.id === id)!;

export const SUN: Both = { en: 'The Sun is a star. It gives us light and keeps us warm.', pt: 'O Sol é uma estrela. Ele nos dá luz e calor.' };

/* ── Mystery Planet: the questions ──────────────────────────────────── */

export type ClueId = 'rock' | 'bigger' | 'moon' | 'nearer' | 'rings' | 'red' | 'people' | 'side' | 'biggest' | 'farthest' | 'hottest' | 'smallest';

export interface Clue {
  id: ClueId;
  ask: Both;
  /** the planets it is yes for */
  yes: PlanetId[];
  /** a broad question, splitting the planets into groups; the rest pick out one */
  broad?: true;
}

const ROCKY: PlanetId[] = ['mercury', 'venus', 'earth', 'mars'];
const GIANTS: PlanetId[] = ['jupiter', 'saturn', 'uranus', 'neptune'];

export const CLUES: Clue[] = [
  { id: 'rock', broad: true, ask: { en: 'Is it made of rock?', pt: 'É feito de rocha?' }, yes: ROCKY },
  { id: 'bigger', broad: true, ask: { en: 'Is it bigger than Earth?', pt: 'É maior que a Terra?' }, yes: GIANTS },
  { id: 'moon', broad: true, ask: { en: 'Does it have a moon?', pt: 'Tem lua?' }, yes: PLANETS.filter((p) => p.moons > 0).map((p) => p.id) },
  { id: 'nearer', broad: true, ask: { en: 'Is it nearer the Sun than Earth?', pt: 'Fica mais perto do Sol que a Terra?' }, yes: ['mercury', 'venus'] },
  /* Jupiter, Uranus and Neptune have rings too, faint ones no one sees from Earth */
  { id: 'rings', ask: { en: 'Does it have big, bright rings?', pt: 'Tem anéis grandes e brilhantes?' }, yes: ['saturn'] },
  { id: 'red', ask: { en: 'Is it red?', pt: 'É vermelho?' }, yes: ['mars'] },
  { id: 'people', ask: { en: 'Do people live there?', pt: 'Mora gente lá?' }, yes: ['earth'] },
  { id: 'side', ask: { en: 'Does it spin on its side?', pt: 'Ele gira deitado?' }, yes: ['uranus'] },
  { id: 'biggest', ask: { en: 'Is it the biggest planet?', pt: 'É o maior planeta?' }, yes: ['jupiter'] },
  { id: 'farthest', ask: { en: 'Is it the farthest from the Sun?', pt: 'É o mais longe do Sol?' }, yes: ['neptune'] },
  { id: 'hottest', ask: { en: 'Is it the hottest planet?', pt: 'É o planeta mais quente?' }, yes: ['venus'] },
  { id: 'smallest', ask: { en: 'Is it the smallest planet?', pt: 'É o menor planeta?' }, yes: ['mercury'] },
];

export const clue = (id: ClueId): Clue => CLUES.find((c) => c.id === id)!;
export const fits = (c: Clue, p: PlanetId, answer: boolean): boolean => c.yes.includes(p) === answer;

/**
 * The cards worth asking, with these planets still possible: the broad ones
 * that would split them, and once few are left (four or fewer), the ones that
 * pick out one of them. Never a card already asked, or one whose answer is
 * already known.
 */
export function cluesFor(left: readonly PlanetId[], asked: readonly ClueId[], most = 4): Clue[] {
  const splits = (c: Clue): boolean => left.some((p) => c.yes.includes(p)) && left.some((p) => !c.yes.includes(p));
  /* the broad ones first; no more than four cards at a time, for a six-year-old to read */
  return CLUES.filter((c) => !asked.includes(c.id) && splits(c) && (c.broad || left.length <= 4)).slice(0, most);
}

/** the answer, said: "Is it made of rock? Yes!" */
export const answerSays = (c: Clue, yes: boolean): Both =>
  ({ en: `${c.ask.en} ${yes ? 'Yes!' : 'No.'}`, pt: `${c.ask.pt} ${yes ? 'Sim!' : 'Não.'}` });

/** a planet he turned over that could still be it */
export const stillFits = (p: Planet): Both => ({
  en: `${p.name.en} could still be it. Look at the answer again.`,
  pt: `Ainda pode ser ${p.id === 'earth' ? 'a Terra' : p.name.pt}. Olhe a resposta de novo.`,
});

/* ── day and night ──────────────────────────────────────────────────── */

/** where the house is on the Earth, in degrees round from the side facing
    the Sun; day on that side (within 90 degrees), night on the other */
export const isDay = (angle: number): boolean => Math.cos((angle * Math.PI) / 180) > 0;

/* ── what is said ───────────────────────────────────────────────────── */

const the = (p: Planet, lang: Lang): string => (lang === 'pt' && p.id === 'earth' ? 'a Terra' : p.name[lang]);
const The = (p: Planet, lang: Lang): string => (lang === 'pt' && p.id === 'earth' ? 'A Terra' : p.name[lang]);

export const SAYS = {
  yes: { en: 'Yes!', pt: 'Isso!' } as Both,
  where: (p: Planet): Both => ({ en: `Where is ${p.name.en}?`, pt: `Onde está ${the(p, 'pt')}?` }),
  that: (p: Planet): Both => ({ en: `That is ${p.name.en}.`, pt: `Esse é ${p.id === 'earth' ? 'a Terra' : p.name.pt}.`.replace('Esse é a', 'Essa é a') }),
  here: (p: Planet): Both => ({ en: `${p.name.en} is here.`, pt: `${The(p, 'pt')} está aqui.` }),
  first: { en: 'Which planet is nearest to the Sun?', pt: 'Qual planeta fica mais perto do Sol?' } as Both,
  next: (p: Planet): Both => ({ en: `Which planet comes after ${p.name.en}?`, pt: `Qual planeta vem depois ${p.id === 'earth' ? 'da Terra' : `de ${p.name.pt}`}?` }),
  nextIs: (p: Planet, before: Planet | null): Both => (before
    ? { en: `${p.name.en} comes after ${before.name.en}.`, pt: `${The(p, 'pt')} vem depois ${before.id === 'earth' ? 'da Terra' : `de ${before.name.pt}`}.` }
    : { en: `${p.name.en} is nearest to the Sun.`, pt: `${The(p, 'pt')} é o mais perto do Sol.` }),
  mystery: { en: 'I am thinking of a planet. Ask me questions to find it!', pt: 'Estou pensando num planeta. Faça perguntas para descobrir qual é!' } as Both,
  flip: { en: 'Turn over the planets it cannot be.', pt: 'Vire os planetas que não podem ser.' } as Both,
  found: (p: Planet): Both => ({ en: `Yes! It is ${p.name.en}!`, pt: `Isso! É ${the(p, 'pt')}!` }),
  notIt: (p: Planet): Both => ({ en: `It is not ${p.name.en}.`, pt: `Não é ${the(p, 'pt')}.` }),
  bigger: { en: 'Which planet is bigger?', pt: 'Qual planeta é maior?' } as Both,
  nearer: { en: 'Which planet is nearer to the Sun?', pt: 'Qual planeta fica mais perto do Sol?' } as Both,
  isBigger: (a: Planet, b: Planet): Both => ({ en: `${a.name.en} is bigger than ${b.name.en}.`, pt: `${The(a, 'pt')} é maior que ${the(b, 'pt')}.` }),
  isNearer: (a: Planet, b: Planet): Both => ({ en: `${a.name.en} is nearer to the Sun than ${b.name.en}.`, pt: `${The(a, 'pt')} fica mais perto do Sol que ${the(b, 'pt')}.` }),
  dayOrNight: { en: 'Is it day or night at the house?', pt: 'É dia ou noite na casa?' } as Both,
  day: { en: 'Day', pt: 'Dia' } as Both,
  night: { en: 'Night', pt: 'Noite' } as Both,
  isDay: { en: 'Day! The house is on the side facing the Sun.', pt: 'Dia! A casa está do lado virado para o Sol.' } as Both,
  isNight: { en: 'Night! The house is on the side away from the Sun. The Earth turns, so it will be day there soon.', pt: 'Noite! A casa está do lado de costas para o Sol. A Terra gira, então logo vai ser dia lá.' } as Both,
};

/* ── the steps ──────────────────────────────────────────────────────── */

export interface SpaceStep extends Step {
  /** find: tap the planet asked for; order: out from the Sun, one after
      another; mystery: a secret planet, found with yes or no questions;
      compare: bigger, or nearer the Sun; day: day or night at the house */
  task: 'find' | 'order' | 'mystery' | 'compare' | 'day';
  names?: boolean;
  /** Mystery Planet: he turns over the planets it cannot be, not the game */
  turns?: boolean;
}

export const SPACE_STEPS: SpaceStep[] = [
  { name: 'Find the planet, with names', task: 'find', names: true },
  { name: 'Find the planet', task: 'find', names: false },
  { name: 'Out from the Sun', task: 'order', names: true },
  { name: 'Mystery Planet', task: 'mystery', names: true },
  { name: 'Mystery Planet: you turn them over', task: 'mystery', names: true, turns: true },
  { name: 'Bigger, or nearer the Sun?', task: 'compare', names: true },
  { name: 'Day and night', task: 'day' },
];

/** the planets in a round, out from the Sun */
export const IN_ORDER: Planet[] = [...PLANETS].sort((a, b) => a.order - b.order);

/**
 * Where the step goes. As every ladder (three right in a row up, two wrong
 * down), except that putting the planets in order out from the Sun is one
 * job of eight: it moves only once all eight are out.
 */
export function spaceClimb(c: { step: number; right: number; wrong: number }, ok: boolean, steps: number) {
  const step = SPACE_STEPS[c.step];
  if (step?.task === 'order') {
    const right = c.right + (ok ? 1 : 0);
    const wrong = c.wrong + (ok ? 0 : 1);
    if (right + wrong < IN_ORDER.length) return { step: c.step, right, wrong };
    if (right >= IN_ORDER.length - 1 && c.step < steps - 1) return { step: c.step + 1, right: 0, wrong: 0 };
    if (right <= 3 && c.step > 0) return { step: c.step - 1, right: 0, wrong: 0 };
    return { step: c.step, right: 0, wrong: 0 };
  }
  if (ok) return c.right + 1 >= 3 && c.step < steps - 1 ? { step: c.step + 1, right: 0, wrong: 0 } : { step: c.step, right: c.right + 1, wrong: 0 };
  return c.wrong + 1 >= 2 && c.step > 0 ? { step: c.step - 1, right: 0, wrong: 0 } : { step: c.step, right: 0, wrong: c.wrong + 1 };
}

/** every line the game says, in one language, for the recordings */
export function spaceLines(lang: Lang = 'en'): string[] {
  const out = new Set<string>([...(lang === 'en' ? ['Good space exploring!'] : []), SAYS.yes[lang], SUN[lang], SAYS.first[lang], SAYS.mystery[lang], SAYS.flip[lang], SAYS.bigger[lang], SAYS.nearer[lang],
    SAYS.dayOrNight[lang], SAYS.isDay[lang], SAYS.isNight[lang]]);
  for (const p of PLANETS) {
    for (const line of [p.fact, SAYS.where(p), SAYS.that(p), SAYS.here(p), SAYS.found(p), SAYS.notIt(p), stillFits(p)]) out.add(line[lang]);
    if (p.order < 8) out.add(SAYS.next(p)[lang]);
    out.add(SAYS.nextIs(p, p.order > 1 ? IN_ORDER[p.order - 2] : null)[lang]);
    for (const q of PLANETS) {
      if (q.width < p.width) out.add(SAYS.isBigger(p, q)[lang]);
      if (q.order > p.order) out.add(SAYS.isNearer(p, q)[lang]);
    }
  }
  for (const c of CLUES) for (const yes of [true, false]) out.add(answerSays(c, yes)[lang]);
  return [...out];
}
