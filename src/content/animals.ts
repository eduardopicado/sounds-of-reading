/* Animals of the World: where each animal lives, and the questions.
 *
 * He puts each animal on the continent it lives on, says which animal lives
 * on a glowing continent, says what kind of place it lives in (the desert,
 * the ice, the rainforest), reads an animal's name with no picture to help,
 * and last finds every continent an animal lives on.
 *
 * Every animal's homes are all the continents it lives on in the wild, not
 * just the one in picture books: penguins live in Antarctica and on the
 * coasts of Australia, Africa and South America, and a few lions live in
 * India. A tap on any of them is right, and its fact says where they all
 * are. The easiest steps ask only about animals with one home, so the first
 * thing he learns is never half true. Sea animals have no continent and are
 * only asked about where they live: the ocean.
 *
 * The names and pictures are in words.ts (WORLD_ANIMALS); the Portuguese
 * names are here, with the facts. */

import { WORLD_ANIMALS } from './words';
import type { Step } from './maths';
import type { ContinentId } from './world';
import { place } from './world';
import { pt, type Both, type Lang, type PtName } from './pt';

export type HabitatId = 'ice' | 'desert' | 'rainforest' | 'grassland' | 'ocean' | 'forest' | 'mountains' | 'river';

export interface Habitat {
  id: HabitatId;
  picture: string;
  /** the button: "Desert", "Deserto" */
  name: Both;
  /** after "live": "in the desert", "no deserto" */
  in: Both;
}

export const HABITATS: Habitat[] = [
  { id: 'ice', picture: '🧊', name: { en: 'Ice', pt: 'Gelo' }, in: { en: 'on the ice', pt: 'no gelo' } },
  { id: 'desert', picture: '🏜️', name: { en: 'Desert', pt: 'Deserto' }, in: { en: 'in the desert', pt: 'no deserto' } },
  { id: 'rainforest', picture: '🌴', name: { en: 'Rainforest', pt: 'Floresta tropical' }, in: { en: 'in the rainforest', pt: 'na floresta tropical' } },
  { id: 'grassland', picture: '🌾', name: { en: 'Grassland', pt: 'Campo' }, in: { en: 'on the grassland', pt: 'no campo' } },
  { id: 'ocean', picture: '🌊', name: { en: 'Ocean', pt: 'Oceano' }, in: { en: 'in the ocean', pt: 'no oceano' } },
  { id: 'forest', picture: '🌲', name: { en: 'Forest', pt: 'Floresta' }, in: { en: 'in the forest', pt: 'na floresta' } },
  { id: 'mountains', picture: '🏔️', name: { en: 'Mountains', pt: 'Montanhas' }, in: { en: 'in the mountains', pt: 'nas montanhas' } },
  { id: 'river', picture: '🏞️', name: { en: 'River', pt: 'Rio' }, in: { en: 'in rivers', pt: 'nos rios' } },
];

export const habitat = (id: HabitatId): Habitat => HABITATS.find((h) => h.id === id)!;

interface AnimalFacts {
  /** "kangaroos" */
  plural: string;
  /** "canguru", masculine; and "cangurus" */
  pt: PtName;
  ptPlural: string;
  /** every continent it lives on in the wild; none for a sea animal */
  homes: ContinentId[];
  /** the kind of place it lives in, the usual one first; any other listed
      is never offered as a wrong answer. None: too many to ask about */
  habitats: HabitatId[];
  fact: Both;
}

/* Checked against field guides for where each lives in the wild, not where
   zoos and farms have taken them. Sea animals list the ice as well, since
   there are whales, dolphins (orcas), sharks and octopuses in the polar seas,
   and the ice is then never offered as a wrong answer for them. Central America is part of North America,
   so the sloth lives on both of the Americas. */
const FACTS: Record<string, AnimalFacts> = {
  kangaroo: { plural: 'kangaroos', pt: pt('canguru', 'm'), ptPlural: 'cangurus', homes: ['australia'], habitats: ['grassland', 'desert', 'forest'],
    fact: { en: 'Kangaroos live only in Australia, and carry their babies, called joeys, in a pouch.', pt: 'Os cangurus só vivem na Austrália, e carregam os filhotes numa bolsa.' } },
  koala: { plural: 'koalas', pt: pt('coala', 'm'), ptPlural: 'coalas', homes: ['australia'], habitats: ['forest'],
    fact: { en: "Koalas live in Australia's gum trees, and eat their leaves.", pt: 'Os coalas vivem nos eucaliptos da Austrália, e comem as folhas deles.' } },
  panda: { plural: 'pandas', pt: pt('panda', 'm'), ptPlural: 'pandas', homes: ['asia'], habitats: ['forest', 'mountains'],
    fact: { en: 'Pandas live in the mountain forests of China, in Asia, and eat bamboo nearly all day.', pt: 'Os pandas vivem nas florestas das montanhas da China, na Ásia, e comem bambu quase o dia todo.' } },
  tiger: { plural: 'tigers', pt: pt('tigre', 'm'), ptPlural: 'tigres', homes: ['asia'], habitats: ['forest', 'rainforest', 'grassland'],
    fact: { en: 'Tigers live in Asia, and they are the biggest cats in the world.', pt: 'Os tigres vivem na Ásia, e são os maiores felinos do mundo.' } },
  orangutan: { plural: 'orangutans', pt: pt('orangotango', 'm'), ptPlural: 'orangotangos', homes: ['asia'], habitats: ['rainforest'],
    fact: { en: 'Orangutans live in the rainforests of two islands in Asia, Borneo and Sumatra.', pt: 'Os orangotangos vivem nas florestas tropicais de duas ilhas da Ásia, Bornéu e Sumatra.' } },
  zebra: { plural: 'zebras', pt: pt('zebra', 'f'), ptPlural: 'zebras', homes: ['africa'], habitats: ['grassland'],
    fact: { en: 'Zebras live in Africa, and every zebra has its own pattern of stripes.', pt: 'As zebras vivem na África, e cada zebra tem listras só dela.' } },
  giraffe: { plural: 'giraffes', pt: pt('girafa', 'f'), ptPlural: 'girafas', homes: ['africa'], habitats: ['grassland'],
    fact: { en: 'Giraffes live in Africa, and they are the tallest animals in the world.', pt: 'As girafas vivem na África, e são os animais mais altos do mundo.' } },
  hippo: { plural: 'hippos', pt: pt('hipopótamo', 'm'), ptPlural: 'hipopótamos', homes: ['africa'], habitats: ['river', 'grassland'],
    fact: { en: 'Hippos live in Africa, and spend their days in rivers and lakes.', pt: 'Os hipopótamos vivem na África, e passam o dia nos rios e lagos.' } },
  gorilla: { plural: 'gorillas', pt: pt('gorila', 'm'), ptPlural: 'gorilas', homes: ['africa'], habitats: ['rainforest', 'mountains'],
    fact: { en: 'Gorillas live in the rainforests of Africa, and they are the biggest apes.', pt: 'Os gorilas vivem nas florestas tropicais da África, e são os maiores primatas.' } },
  lion: { plural: 'lions', pt: pt('leão', 'm'), ptPlural: 'leões', homes: ['africa', 'asia'], habitats: ['grassland', 'desert', 'forest'],
    fact: { en: 'Most lions live in Africa, and a few live in a forest in India, in Asia.', pt: 'A maioria dos leões vive na África, e alguns vivem numa floresta da Índia, na Ásia.' } },
  camel: { plural: 'camels', pt: pt('camelo', 'm'), ptPlural: 'camelos', homes: ['africa', 'asia'], habitats: ['desert'],
    fact: { en: 'Camels live in the deserts of Africa and Asia, and can go for days without water.', pt: 'Os camelos vivem nos desertos da África e da Ásia, e passam dias sem beber água.' } },
  elephant: { plural: 'elephants', pt: pt('elefante', 'm'), ptPlural: 'elefantes', homes: ['africa', 'asia'], habitats: [],
    fact: { en: 'Elephants live in Africa and Asia, and African elephants have the bigger ears.', pt: 'Os elefantes vivem na África e na Ásia, e os elefantes africanos têm as orelhas maiores.' } },
  llama: { plural: 'llamas', pt: pt('lhama', 'f'), ptPlural: 'lhamas', homes: ['south-america'], habitats: ['mountains', 'grassland'],
    fact: { en: 'Llamas come from the Andes mountains, in South America.', pt: 'As lhamas vêm da Cordilheira dos Andes, na América do Sul.' } },
  sloth: { plural: 'sloths', pt: pt('bicho-preguiça', 'm'), ptPlural: 'bichos-preguiça', homes: ['south-america', 'north-america'], habitats: ['rainforest'],
    fact: { en: 'Sloths live in the rainforests of South America and the south of North America, and move very slowly.', pt: 'Os bichos-preguiça vivem nas florestas tropicais da América do Sul e no sul da América do Norte, e se mexem bem devagar.' } },
  raccoon: { plural: 'raccoons', pt: pt('guaxinim', 'm'), ptPlural: 'guaxinins', homes: ['north-america'], habitats: ['forest', 'river'],
    fact: { en: 'Raccoons come from North America, and wash their food with their front paws.', pt: 'Os guaxinins vêm da América do Norte, e lavam a comida com as patas da frente.' } },
  bison: { plural: 'bison', pt: pt('bisão', 'm'), ptPlural: 'bisões', homes: ['north-america', 'europe'], habitats: ['grassland', 'forest'],
    fact: { en: 'Bison live in North America, and a smaller kind lives in the forests of Europe.', pt: 'Os bisões vivem na América do Norte, e um tipo menor vive nas florestas da Europa.' } },
  'polar bear': { plural: 'polar bears', pt: pt('urso-polar', 'm'), ptPlural: 'ursos-polares', homes: ['north-america', 'europe', 'asia'], habitats: ['ice', 'ocean'],
    fact: { en: 'Polar bears live on the Arctic ice, in the far north of North America, Europe and Asia.', pt: 'Os ursos-polares vivem no gelo do Ártico, no extremo norte da América do Norte, da Europa e da Ásia.' } },
  penguin: { plural: 'penguins', pt: pt('pinguim', 'm'), ptPlural: 'pinguins', homes: ['antarctica', 'australia', 'africa', 'south-america'], habitats: [],
    fact: { en: 'Penguins live in the south: in Antarctica, and on the coasts of Australia, Africa and South America.', pt: 'Os pinguins vivem no sul: na Antártida, e nas costas da Austrália, da África e da América do Sul.' } },
  hedgehog: { plural: 'hedgehogs', pt: pt('ouriço', 'm'), ptPlural: 'ouriços', homes: ['europe', 'asia', 'africa'], habitats: [],
    fact: { en: 'Hedgehogs live in Europe, Asia and Africa, and roll into a prickly ball to stay safe.', pt: 'Os ouriços vivem na Europa, na Ásia e na África, e viram uma bola de espinhos para se proteger.' } },
  crocodile: { plural: 'crocodiles', pt: pt('crocodilo', 'm'), ptPlural: 'crocodilos', homes: ['africa', 'asia', 'australia', 'north-america', 'south-america'], habitats: ['river', 'ocean'],
    fact: { en: 'Crocodiles live in rivers and swamps in Africa, Asia, Australia and the Americas.', pt: 'Os crocodilos vivem em rios e pântanos da África, da Ásia, da Austrália e das Américas.' } },
  whale: { plural: 'whales', pt: pt('baleia', 'f'), ptPlural: 'baleias', homes: [], habitats: ['ocean', 'ice'],
    fact: { en: 'Whales live in every ocean, and the blue whale is the biggest animal there has ever been.', pt: 'As baleias vivem em todos os oceanos, e a baleia-azul é o maior animal que já existiu.' } },
  dolphin: { plural: 'dolphins', pt: pt('golfinho', 'm'), ptPlural: 'golfinhos', homes: [], habitats: ['ocean', 'river', 'ice'],
    fact: { en: 'Dolphins live in the ocean, and breathe air through a hole on top of their heads.', pt: 'Os golfinhos vivem no oceano, e respiram por um buraco no alto da cabeça.' } },
  shark: { plural: 'sharks', pt: pt('tubarão', 'm'), ptPlural: 'tubarões', homes: [], habitats: ['ocean', 'ice'],
    fact: { en: 'Sharks live in every ocean, and there were sharks before there were dinosaurs.', pt: 'Os tubarões vivem em todos os oceanos, e já existiam antes dos dinossauros.' } },
  octopus: { plural: 'octopuses', pt: pt('polvo', 'm'), ptPlural: 'polvos', homes: [], habitats: ['ocean', 'ice'],
    fact: { en: 'Octopuses live in the ocean, and have eight arms.', pt: 'Os polvos vivem no oceano, e têm oito braços.' } },
};

export interface Animal extends AnimalFacts { name: string; picture: string }

export const ANIMALS: Animal[] = WORLD_ANIMALS.split('|').map((entry) => {
  const m = entry.trim().match(/^(.+?)\s+(\S+)$/);
  if (!m) throw new Error(`Animals of the World: "${entry}" needs a name and a picture`);
  const facts = FACTS[m[1]];
  if (!facts) throw new Error(`Animals of the World: "${m[1]}" has no homes or fact`);
  return { name: m[1], picture: m[2], ...facts };
});

export const animal = (name: string): Animal => ANIMALS.find((a) => a.name === name)!;

/** its name, in either language */
export const animalName = (a: Animal, lang: Lang): string => (lang === 'pt' ? a.pt.name : a.name);

/* ── what is said ────────────────────────────────────────────────────── */

const the = (n: PtName): string => `${n.g === 'f' ? 'a' : 'o'} ${n.name}`;
const these = (a: Animal): string => `${a.pt.g === 'f' ? 'As' : 'Os'} ${a.ptPlural}`;
const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);
/** "na Ásia", "na América do Sul": every continent's name is feminine */
const onContinent = (id: ContinentId): string => `na ${place(id).pt.name}`;

export const SAYS = {
  whereLives: (a: Animal): Both => ({ en: `Where does the ${a.name} live?`, pt: `Onde vive ${the(a.pt)}?` }),
  whoLives: (id: ContinentId): Both => ({ en: `Which animal lives in ${place(id).name}?`, pt: `Qual animal vive ${onContinent(id)}?` }),
  whatPlace: (a: Animal): Both => ({ en: `What kind of place does the ${a.name} live in?`, pt: `Em que tipo de lugar vive ${the(a.pt)}?` }),
  readIt: { en: 'Read the name. Where does this animal live?', pt: 'Leia o nome. Onde vive esse animal?' } as Both,
  everyHome: (a: Animal): Both => ({ en: `Tap every continent where ${a.plural} live.`, pt: `Toque em todos os continentes onde vivem ${these(a).toLowerCase()}.` }),
  livesIn: (a: Animal, h: HabitatId): Both => ({ en: `${cap(a.plural)} live ${habitat(h).in.en}.`, pt: `${these(a)} vivem ${habitat(h).in.pt}.` }),
  moreToFind: { en: 'Yes! Find another one.', pt: 'Isso! Ache outro.' } as Both,
  yes: { en: 'Yes!', pt: 'Isso!' } as Both,
};

/* ── the steps ───────────────────────────────────────────────────────── */

export interface AnimalStep extends Step {
  /**
   * home: tap the continent it lives on (with the continents' names, then
   * without); who: a continent glows, which animal lives there; habitat:
   * what kind of place; read: its name with no picture, tap where it lives;
   * all: every continent it lives on
   */
  task: 'home' | 'who' | 'habitat' | 'read' | 'all';
  /** the continents' names written on the map */
  names: boolean;
  /** only animals with one home */
  oneHome: boolean;
}

export const ANIMAL_STEPS: AnimalStep[] = [
  { name: 'Where does it live? With names', task: 'home', names: true, oneHome: true },
  { name: 'Where does it live?', task: 'home', names: false, oneHome: false },
  { name: 'Which animal lives here?', task: 'who', names: true, oneHome: false },
  { name: 'Ice, desert or rainforest?', task: 'habitat', names: false, oneHome: false },
  /* Year 2: reading the name, and every continent it lives on */
  { name: 'Read the name', task: 'read', names: true, oneHome: true },
  { name: 'Every continent it lives on', task: 'all', names: true, oneHome: false },
];

export interface AnimalQuestion {
  task: AnimalStep['task'];
  animal: Animal;
  ask: Both;
  /** for "who": the continent that glows */
  continent?: ContinentId;
  /** the buttons: animals' names for "who", habitats for "habitat" */
  options?: string[];
  /** the right button */
  pick?: string;
}

const shuffled = <T>(list: T[]): T[] => [...list].sort(() => Math.random() - 0.5);
const pickOf = <T>(list: T[], avoid: (x: T) => boolean): T => {
  const fresh = list.filter((x) => !avoid(x));
  const from = fresh.length ? fresh : list;
  return from[Math.floor(Math.random() * from.length)];
};

/** one question at this step, avoiding the animals in `recent` */
export function animalQuestion(step: AnimalStep, recent: string[] = []): AnimalQuestion {
  const seen = (a: Animal): boolean => recent.includes(a.name);
  if (step.task === 'habitat') {
    const a = pickOf(ANIMALS.filter((x) => x.habitats.length), seen);
    /* two wrong places, never one it could be said to live in too */
    const wrong = shuffled(HABITATS.filter((h) => !a.habitats.includes(h.id))).slice(0, 2);
    const options = shuffled([a.habitats[0], ...wrong.map((h) => h.id)]);
    return { task: 'habitat', animal: a, ask: SAYS.whatPlace(a), options, pick: a.habitats[0] };
  }
  if (step.task === 'who') {
    /* a continent, the animal that lives there, and two that do not */
    const a = pickOf(ANIMALS.filter((x) => x.homes.length), seen);
    const continent = a.homes[Math.floor(Math.random() * a.homes.length)];
    const others = shuffled(ANIMALS.filter((x) => x.homes.length && !x.homes.includes(continent))).slice(0, 2);
    const options = shuffled([a, ...others]).map((x) => x.name);
    return { task: 'who', animal: a, ask: SAYS.whoLives(continent), continent, options, pick: a.name };
  }
  const pool = ANIMALS.filter((x) => x.homes.length && (step.task === 'all' ? x.homes.length > 1 : !step.oneHome || x.homes.length === 1));
  const a = pickOf(pool, seen);
  if (step.task === 'all') return { task: 'all', animal: a, ask: SAYS.everyHome(a) };
  if (step.task === 'read') return { task: 'read', animal: a, ask: SAYS.readIt };
  return { task: 'home', animal: a, ask: SAYS.whereLives(a) };
}

/** what is said after an answer: its fact, or for the habitat, where it lives */
export const animalSays = (q: AnimalQuestion): Both =>
  (q.task === 'habitat' ? SAYS.livesIn(q.animal, q.pick as HabitatId) : q.animal.fact);

/** every line the game can say in one language, for the recordings */
export function animalLines(lang: Lang = 'en'): string[] {
  const out = new Set<string>([SAYS.readIt[lang], SAYS.moreToFind[lang], SAYS.yes[lang]]);
  const continents: ContinentId[] = ['africa', 'antarctica', 'asia', 'australia', 'europe', 'north-america', 'south-america'];
  for (const id of continents) out.add(SAYS.whoLives(id)[lang]);
  for (const a of ANIMALS) {
    out.add(a.fact[lang]);
    if (a.homes.length) out.add(SAYS.whereLives(a)[lang]);
    if (a.homes.length > 1) out.add(SAYS.everyHome(a)[lang]);
    if (a.habitats.length) { out.add(SAYS.whatPlace(a)[lang]); out.add(SAYS.livesIn(a, a.habitats[0])[lang]); }
  }
  return [...out];
}
