/* Jiu-jitsu: the scoring moves, their points, and the questions the two BJJ
 * games ask (Ref's Call and Match Maths).
 *
 * The points are the IBJJF's, the rules his competitions use, kids included:
 *
 *   takedown 2, sweep 2, knee on belly 2, guard pass 3, mount 4, back control 4
 *
 * A position scores once it is held for three seconds; a near miss is an
 * advantage; a penalty is given for things like stalling. When the points are
 * level the advantages decide, and when those are level too, fewer penalties
 * wins. A submission ends the match whatever the score.
 *
 * Both games are bilingual, switched with a big pair of flags on the game
 * itself: jiu-jitsu is Brazilian, the moves have Portuguese names on the mat,
 * and Portuguese is his family's language. Everything he reads or hears in
 * these games has an English and a Portuguese side, kept together here. */

import { pick, shuffle } from '../lib/random';
import { choices, type Step } from './maths';
import type { Both, Lang } from './pt';

export type { Lang, Both } from './pt';

export interface Move {
  id: 'takedown' | 'sweep' | 'knee-on-belly' | 'guard-pass' | 'mount' | 'back';
  /** the name, to read: "guard pass", "passagem de guarda" */
  name: Both;
  /** "uma montada", "um joelho na barriga" */
  um: 'um' | 'uma';
  points: 2 | 3 | 4;
}

export const MOVES: Move[] = [
  { id: 'takedown', name: { en: 'takedown', pt: 'queda' }, um: 'uma', points: 2 },
  { id: 'sweep', name: { en: 'sweep', pt: 'raspagem' }, um: 'uma', points: 2 },
  { id: 'knee-on-belly', name: { en: 'knee on belly', pt: 'joelho na barriga' }, um: 'um', points: 2 },
  { id: 'guard-pass', name: { en: 'guard pass', pt: 'passagem de guarda' }, um: 'uma', points: 3 },
  { id: 'mount', name: { en: 'mount', pt: 'montada' }, um: 'uma', points: 4 },
  { id: 'back', name: { en: 'back control', pt: 'pegada nas costas' }, um: 'uma', points: 4 },
];

export const moveById = (id: Move['id']): Move => MOVES.find((m) => m.id === id)!;

/** "2 points", "dois pontos" — Portuguese says the number as a word */
export const pointsWords = (n: number, lang: Lang): string => {
  if (lang === 'en') return `${n} ${n === 1 ? 'point' : 'points'}`;
  const word = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'][n] ?? String(n);
  return `${word} ${n === 1 ? 'ponto' : 'pontos'}`;
};

/** the referee's call: "Mount! 4 points!", "Montada! Quatro pontos!" */
export function refCall(move: Move, lang: Lang): string {
  const name = move.name[lang];
  const pts = pointsWords(move.points, lang);
  return `${name[0].toUpperCase()}${name.slice(1)}! ${pts[0].toUpperCase()}${pts.slice(1)}!`;
}

/** the two fighters: Blue is him */
export const SIDE_NAME: Record<'Blue' | 'White', Both> = { Blue: { en: 'Blue', pt: 'Azul' }, White: { en: 'White', pt: 'Branco' } };

/* ── Ref's Call: how many points is it? ──────────────────────────────── */

export interface RefStep extends Step {
  /**
   * points: here is a move, how many points;
   * which: which move is worth this many;
   * call: here is what happened, is it points, an advantage or a penalty?
   */
  task: 'points' | 'which' | 'call';
  /** show the picture with the name, or only the name to read */
  picture: boolean;
}

export const REF_STEPS: RefStep[] = [
  { name: 'Picture and name', task: 'points', picture: true },
  { name: 'Read the move', task: 'points', picture: false },
  { name: 'Which move?', task: 'which', picture: true },
  /* Year 2: what the referee gives, and why */
  { name: 'Points, advantage or penalty?', task: 'call', picture: false },
];

export type Call = 'points' | 'advantage' | 'penalty';
export const CALL_NAME: Record<Call, Both> = {
  points: { en: 'Points', pt: 'Pontos' },
  advantage: { en: 'Advantage', pt: 'Vantagem' },
  penalty: { en: 'Penalty', pt: 'Punição' },
};

/** what happened on the mat, and what the referee gives for it */
export interface Moment { text: Both; call: Call; move?: Move['id']; why: Both }

export const MOMENTS: Moment[] = [
  { text: { en: 'Blue passes the guard and holds it for 3 seconds.', pt: 'O Azul passa a guarda e segura por 3 segundos.' },
    call: 'points', move: 'guard-pass', why: { en: 'A guard pass held for 3 seconds is 3 points.', pt: 'Passagem de guarda segurada por 3 segundos vale três pontos.' } },
  { text: { en: 'Blue gets the mount and stays there for 3 seconds.', pt: 'O Azul pega a montada e fica lá por 3 segundos.' },
    call: 'points', move: 'mount', why: { en: 'A mount held for 3 seconds is 4 points.', pt: 'Montada segurada por 3 segundos vale quatro pontos.' } },
  { text: { en: 'Blue sweeps and ends up on top for 3 seconds.', pt: 'O Azul raspa e fica por cima por 3 segundos.' },
    call: 'points', move: 'sweep', why: { en: 'A sweep that ends on top is 2 points.', pt: 'Raspagem que termina por cima vale dois pontos.' } },
  { text: { en: 'Blue takes White down and stays on top for 3 seconds.', pt: 'O Azul derruba o Branco e fica por cima por 3 segundos.' },
    call: 'points', move: 'takedown', why: { en: 'A takedown is 2 points.', pt: 'Queda vale dois pontos.' } },
  { text: { en: 'Blue nearly passes the guard, but White gets the guard back in time.', pt: 'O Azul quase passa a guarda, mas o Branco recupera a guarda a tempo.' },
    call: 'advantage', why: { en: 'Nearly scoring, but not holding it, is an advantage.', pt: 'Quase pontuar, sem segurar, é vantagem.' } },
  { text: { en: 'Blue gets the mount, but only for 1 second.', pt: 'O Azul pega a montada, mas só por 1 segundo.' },
    call: 'advantage', why: { en: 'It has to be held for 3 seconds. Nearly is an advantage.', pt: 'Tem que segurar por 3 segundos. Quase é vantagem.' } },
  { text: { en: 'Blue nearly sweeps, but White stops it before Blue is on top.', pt: 'O Azul quase raspa, mas o Branco segura antes de o Azul ficar por cima.' },
    call: 'advantage', why: { en: 'A sweep nearly done is an advantage.', pt: 'Raspagem quase feita é vantagem.' } },
  { text: { en: 'White will not try to fight, and keeps stalling.', pt: 'O Branco não tenta lutar e fica amarrando a luta.' },
    call: 'penalty', why: { en: 'Stalling, not trying to fight, is a penalty.', pt: 'Amarrar a luta, sem tentar lutar, é punição.' } },
  { text: { en: 'White grabs inside Blue\'s sleeve with fingers.', pt: 'O Branco põe os dedos dentro da manga do Azul.' },
    call: 'penalty', why: { en: 'Fingers inside the sleeve are not allowed. That is a penalty.', pt: 'Dedos dentro da manga não pode. É punição.' } },
  { text: { en: 'White runs off the mat to stop Blue scoring.', pt: 'O Branco sai do tatame para fugir da luta.' },
    call: 'penalty', why: { en: 'Running off the mat to escape is a penalty.', pt: 'Sair do tatame para fugir é punição.' } },
];

export interface RefQuestion {
  move: Move;
  /** for which: the moves to choose from, one of them worth the points asked */
  options: Move[];
  moment?: Moment;
}

export function refQuestion(step: RefStep, last?: RefQuestion): RefQuestion {
  for (;;) {
    const move = pick(MOVES);
    const q: RefQuestion = { move, options: [] };
    if (step.task === 'which') {
      /* only one of the four is worth that many: no "takedown or sweep" */
      q.options = shuffle([move, ...shuffle(MOVES.filter((m) => m.points !== move.points)).slice(0, 3)]);
    }
    if (step.task === 'call') q.moment = pick(MOMENTS);
    if (last && (step.task === 'call' ? last.moment === q.moment : last.move === move)) continue;
    return q;
  }
}

const rand = (lo: number, hi: number): number => lo + Math.floor(Math.random() * (hi - lo + 1));

/* ── Match Maths: adding up a match ──────────────────────────────────── */

export interface MatchStep extends Step {
  /**
   * total: how many points did Blue score;
   * ahead: who is ahead, by how many;
   * missing: Blue had so many, now has so many, which move was it;
   * tiebreak: the points are level, who wins on advantages and penalties?
   * behind: Blue is behind after a whole match, by how many (Years 3–4);
   * need: near the end, the least Blue needs to win: an advantage, or a
   *   move worth 2, 3 or 4
   */
  task: 'total' | 'ahead' | 'missing' | 'tiebreak' | 'behind' | 'need';
  /** how many moves Blue makes (least, most) */
  moves: [number, number];
  /** write the points on the moves, or he remembers them */
  shown: boolean;
  /** White scores too, and the question can be about either */
  both?: boolean;
  /** how many moves White makes, when not one or two */
  white?: [number, number];
}

export const MATCH_STEPS: MatchStep[] = [
  { name: 'Add the points', task: 'total', moves: [2, 2], shown: true },
  { name: 'Remember the points', task: 'total', moves: [2, 2], shown: false },
  { name: 'Three moves', task: 'total', moves: [3, 3], shown: false },
  { name: 'How far ahead?', task: 'ahead', moves: [1, 2], shown: false },
  { name: 'Which move was it?', task: 'missing', moves: [2, 2], shown: false },
  /* Year 2: a whole match, and the tie-breakers */
  { name: 'A whole match', task: 'total', moves: [3, 4], shown: false, both: true },
  { name: 'Advantages and penalties', task: 'tiebreak', moves: [1, 2], shown: false },
  /* Years 3–4: longer matches, how far behind, and what it takes to win */
  { name: 'A long match', task: 'total', moves: [5, 6], shown: false, both: true, white: [2, 3] },
  { name: 'How far behind?', task: 'behind', moves: [4, 5], shown: false, white: [5, 7] },
  { name: 'What does Blue need?', task: 'need', moves: [1, 3], shown: false },
];

/** what can still be scored near the end: an advantage, or a move worth 2, 3 or 4 */
export type Score = 'advantage' | 2 | 3 | 4;
export const SCORES: Score[] = ['advantage', 2, 3, 4];
/** the move each score stands for when it is offered */
export const SCORE_MOVE: Record<2 | 3 | 4, Move['id']> = { 2: 'takedown', 3: 'guard-pass', 4: 'mount' };

export type Side = 'Blue' | 'White';

export interface MatchQuestion {
  blue: Move[];
  white: Move[];
  /** for total in a whole match: whose points are asked */
  side: Side;
  advantages: { Blue: number; White: number };
  penalties: { Blue: number; White: number };
  /** a number, for tiebreak the winner, and for need the least that wins */
  answer: number | Side | Score;
  options: (number | string)[];
}

export const pointsOf = (moves: Move[]): number => moves.reduce((s, m) => s + m.points, 0);
const moves = (n: number): Move[] => Array.from({ length: n }, () => pick(MOVES));

/** who wins as it stands, the IBJJF way: the points, then the advantages,
    then fewer penalties; nobody when all three are level (the referee decides) */
export function winnerOf(points: Record<Side, number>, advantages: Record<Side, number>, penalties: Record<Side, number>): Side | null {
  if (points.Blue !== points.White) return points.Blue > points.White ? 'Blue' : 'White';
  if (advantages.Blue !== advantages.White) return advantages.Blue > advantages.White ? 'Blue' : 'White';
  if (penalties.Blue !== penalties.White) return penalties.Blue < penalties.White ? 'Blue' : 'White';
  return null;
}

/** the least Blue can score to win: an advantage first, then 2, 3 and 4 points */
export function leastToWin(q: Pick<MatchQuestion, 'blue' | 'white' | 'advantages' | 'penalties'>): Score | null {
  for (const s of SCORES) {
    const points = { Blue: pointsOf(q.blue) + (s === 'advantage' ? 0 : s), White: pointsOf(q.white) };
    const advantages = { ...q.advantages, Blue: q.advantages.Blue + (s === 'advantage' ? 1 : 0) };
    if (winnerOf(points, advantages, q.penalties) === 'Blue') return s;
  }
  return null;
}

/** a long match added up by putting the same points together, the times
    tables at work: "3 × 2 = 6, 2 × 4 = 8, and a 3. 6 + 8 + 3 = 17". Null
    when no two moves score the same, so there is nothing to group. */
export function groupedSum(moves: Move[]): Both | null {
  const counts = ([2, 3, 4] as const).map((p) => ({ p, n: moves.filter((m) => m.points === p).length })).filter((c) => c.n);
  const groups = counts.filter((c) => c.n > 1);
  const singles = counts.filter((c) => c.n === 1);
  if (!groups.length) return null;
  const totals = [...groups.map((c) => c.n * c.p), ...singles.map((c) => c.p)];
  /* one group on its own is already the total */
  const sum = totals.length > 1 ? ` ${totals.join(' + ')} = ${pointsOf(moves)}.` : '';
  const facts = groups.map((c) => `${c.n} × ${c.p} = ${c.n * c.p}`).join(', ');
  return {
    en: `Group the same points: ${facts}${singles.length ? `, and ${singles.map((c) => `a ${c.p}`).join(' and ')}` : ''}.${sum}`,
    pt: `Junte os pontos iguais: ${facts}${singles.length ? `, e ${singles.map((c) => `um ${c.p}`).join(' e ')}` : ''}.${sum}`,
  };
}

/** how far behind, counting up from Blue's points through the next ten */
export function behindWhy(blue: number, white: number): Both {
  const d = white - blue;
  const ten = Math.ceil(blue / 10) * 10;
  if (ten === blue || ten >= white) {
    return {
      en: `${white} take away ${blue} is ${d}: Blue is ${d} points behind.`,
      pt: `${white} menos ${blue} são ${d}: o Azul está ${d} pontos atrás.`,
    };
  }
  return {
    en: `From ${blue}, ${ten - blue} more is ${ten}, and ${white - ten} more is ${white}: Blue is ${d} points behind.`,
    pt: `Do ${blue}, mais ${ten - blue} dá ${ten}, e mais ${white - ten} dá ${white}: o Azul está ${d} pontos atrás.`,
  };
}

/** a score as it is offered: "An advantage", "Takedown: 2" */
export function scoreLabel(s: Score, lang: Lang): string {
  if (s === 'advantage') return lang === 'pt' ? 'Uma vantagem' : 'An advantage';
  const name = moveById(SCORE_MOVE[s]).name[lang];
  return `${name[0].toUpperCase()}${name.slice(1)}: ${s}`;
}

/** why that is the least Blue needs, and why anything less is not enough */
export function needWhy(q: Pick<MatchQuestion, 'blue' | 'white' | 'advantages' | 'penalties' | 'answer'>): Both {
  const [b, w] = [pointsOf(q.blue), pointsOf(q.white)];
  const d = w - b;
  const a = q.advantages;
  const p = q.penalties;
  const least = q.answer as Score;
  const move = (s: 2 | 3 | 4) => moveById(SCORE_MOVE[s]);
  /* "a takedown", "uma queda" */
  const aMove = (s: 2 | 3 | 4, lang: Lang): string => (lang === 'en' ? `a ${move(s).name.en}` : `${move(s).um} ${move(s).name.pt}`);
  const cap = (t: string): string => t[0].toUpperCase() + t.slice(1);
  if (least === 'advantage') {
    return a.Blue + 1 > a.White
      ? {
        en: `The points are level, ${b} each. An advantage makes it ${a.Blue + 1} advantages to ${a.White}: Blue wins on advantages.`,
        pt: `Os pontos estão iguais, ${b} a ${b}. Uma vantagem deixa ${a.Blue + 1} vantagens a ${a.White}: o Azul ganha nas vantagens.`,
      }
      : {
        en: `The points are level, ${b} each. An advantage makes the advantages level too, ${a.White} each, and Blue has fewer penalties, ${p.Blue} to ${p.White}: Blue wins.`,
        pt: `Os pontos estão iguais, ${b} a ${b}. Uma vantagem empata as vantagens também, ${a.White} a ${a.White}, e o Azul tem menos punições, ${p.Blue} a ${p.White}: o Azul ganha.`,
      };
  }
  if (d === 0) {
    /* an advantage is not enough, so the least is 2 points */
    const not: Both = a.Blue + 1 < a.White
      ? { en: `an advantage would still leave White ahead on advantages, ${a.White} to ${a.Blue + 1}`,
          pt: `com uma vantagem o Branco ainda teria mais vantagens, ${a.White} a ${a.Blue + 1}` }
      : p.Blue > p.White
        ? { en: `an advantage would only make the advantages level, and Blue has more penalties, ${p.Blue} to ${p.White}`,
            pt: `uma vantagem só empataria as vantagens, e o Azul tem mais punições, ${p.Blue} a ${p.White}` }
        : { en: 'an advantage would make everything level, and then the referee decides',
            pt: 'uma vantagem deixaria tudo igual, e aí o árbitro decide' };
    return {
      en: `The points are level, ${b} each, but ${not.en}. 2 points put Blue ahead: ${aMove(2, 'en')} wins it.`,
      pt: `Os pontos estão iguais, ${b} a ${b}, mas ${not.pt}. Com 2 pontos o Azul passa na frente: ${aMove(2, 'pt')} ganha a luta.`,
    };
  }
  const level = d as 2 | 3;
  if (least === level) {
    /* drawing level is enough: the tie-breakers are Blue's */
    const why: Both = a.Blue > a.White
      ? { en: `Blue has more advantages, ${a.Blue} to ${a.White}`, pt: `o Azul tem mais vantagens, ${a.Blue} a ${a.White}` }
      : { en: `the advantages are level, ${a.Blue} each, and Blue has fewer penalties, ${p.Blue} to ${p.White}`,
          pt: `as vantagens estão iguais, ${a.Blue} a ${a.Blue}, e o Azul tem menos punições, ${p.Blue} a ${p.White}` };
    return {
      en: `Blue is ${d} behind. ${cap(aMove(level, 'en'))} makes it ${w} each, and ${why.en}: ${aMove(level, 'en')} wins it.`,
      pt: `O Azul está ${d} pontos atrás. ${cap(aMove(level, 'pt'))} empata em ${w} a ${w}, e ${why.pt}: ${aMove(level, 'pt')} ganha a luta.`,
    };
  }
  /* drawing level is not enough: one more point is */
  const not: Both = a.White > a.Blue
    ? { en: `White has more advantages, ${a.White} to ${a.Blue}`, pt: `o Branco tem mais vantagens, ${a.White} a ${a.Blue}` }
    : p.Blue > p.White
      ? { en: `the advantages are level and Blue has more penalties, ${p.Blue} to ${p.White}`,
          pt: `as vantagens estão iguais e o Azul tem mais punições, ${p.Blue} a ${p.White}` }
      : { en: 'the advantages and penalties are level too, so the referee would decide',
          pt: 'as vantagens e as punições também estão iguais, então o árbitro decidiria' };
  const more = (level + 1) as 3 | 4;
  return {
    en: `Blue is ${d} behind. ${cap(aMove(level, 'en'))} only makes it ${w} each, and ${not.en}. ${more} points put Blue ahead: ${aMove(more, 'en')} wins it.`,
    pt: `O Azul está ${d} pontos atrás. ${cap(aMove(level, 'pt'))} só empata em ${w} a ${w}, e ${not.pt}. Com ${more} pontos o Azul passa na frente: ${aMove(more, 'pt')} ganha a luta.`,
  };
}

export function matchQuestion(step: MatchStep, last?: MatchQuestion): MatchQuestion {
  for (;;) {
    const blue = moves(rand(step.moves[0], step.moves[1]));
    let white: Move[] = [];
    let side: Side = 'Blue';
    const advantages = { Blue: 0, White: 0 };
    const penalties = { Blue: 0, White: 0 };
    let answer: number | Side | Score;
    let options: (number | string)[];
    const whites = (): Move[] => moves(rand(...(step.white ?? [1, 2])));
    if (step.task === 'total') {
      if (step.both) { white = whites(); side = pick(['Blue', 'White'] as Side[]); }
      answer = pointsOf(side === 'Blue' ? blue : white);
      options = choices(answer, 1, Math.max(20, answer + 10));
    } else if (step.task === 'behind') {
      /* a whole match, and Blue is behind */
      white = whites();
      answer = pointsOf(white) - pointsOf(blue);
      if (answer <= 0) continue;
      options = choices(answer, 1, 20);
    } else if (step.task === 'need') {
      /* near the end: level on points, or 2 or 3 behind, with the tie-breakers
         deciding whether drawing level is enough */
      white = whites();
      if (![0, 2, 3].includes(pointsOf(white) - pointsOf(blue))) continue;
      advantages.Blue = rand(0, 2);
      advantages.White = rand(0, 2);
      penalties.Blue = rand(0, 1);
      penalties.White = rand(0, 1);
      const least = leastToWin({ blue, white, advantages, penalties });
      if (!least) continue;
      answer = least;
      options = SCORES;
    } else if (step.task === 'ahead') {
      white = moves(rand(1, 2));
      answer = Math.abs(pointsOf(blue) - pointsOf(white));
      if (!answer) continue;
      options = choices(answer, 1, 12);
    } else if (step.task === 'missing') {
      /* the second move is the one he works out; one move of each value to choose from */
      answer = blue[1].points;
      options = [];
    } else {
      /* level on points, and the tie-breakers decide */
      white = moves(blue.length);
      if (pointsOf(white) !== pointsOf(blue)) continue;
      advantages.Blue = rand(0, 3);
      advantages.White = rand(0, 3);
      penalties.Blue = rand(0, 2);
      penalties.White = rand(0, 2);
      if (advantages.Blue === advantages.White && penalties.Blue === penalties.White) continue;
      answer = advantages.Blue !== advantages.White
        ? (advantages.Blue > advantages.White ? 'Blue' : 'White')
        : (penalties.Blue < penalties.White ? 'Blue' : 'White');
      options = ['Blue', 'White'];
    }
    const q: MatchQuestion = { blue, white, side, advantages, penalties, answer, options };
    if (last && last.blue.map((m) => m.id).join() === blue.map((m) => m.id).join()) continue;
    return q;
  }
}

/** for "which move was it": the answer and one move of each other value */
export function missingOptions(answer: Move): Move[] {
  const others = [2, 3, 4].filter((p) => p !== answer.points).map((p) => pick(MOVES.filter((m) => m.points === p)));
  return shuffle([answer, ...others]);
}

/* ── Weigh-In: heavier and lighter, then kilograms and grams ─────────── */

/* Before a competition every fighter is weighed, and fights others in the
 * same weight class. Kindergarten and Year 1 compare on a balance: the side
 * that goes down is heavier. Then they measure with blocks, the informal unit
 * the syllabus starts with. Year 2 reads kilograms off the scale, finds his
 * weight class, and adds or takes away the gi, since he is weighed in it.
 *
 * Years 3 and 4 weigh small things in grams on a kitchen scale, use
 * 1 kilogram = 1000 grams, read scales whose marks are not all numbered (a
 * space can be worth 2, 20, 25, 50 or 100), and compare two bags written in
 * kilograms and grams: which is heavier, and by how much.
 *
 * The classes have their Portuguese names in English too, as on the mat at a
 * competition: Galo (rooster) for the lightest, up through Pluma, Pena, Leve
 * and Médio. The kilogram limits are a made-up tournament's, in the range of
 * a young child's; real tables change with age, and this is about reading
 * them, not about any one competition. */

export interface WeighThing {
  id: string;
  picture: string;
  name: Both;
  /** heavier things have bigger numbers. Only the order matters, and it is
      the real one: the gi (2 kg here) is heavier than the trophy and the
      ball, as the kitchen scale's grams say */
  heft: number;
}

export const WEIGH_THINGS: WeighThing[] = [
  { id: 'feather', picture: '🪶', name: { en: 'feather', pt: 'pena' }, heft: 1 },
  { id: 'medal', picture: '🥇', name: { en: 'medal', pt: 'medalha' }, heft: 2 },
  { id: 'banana', picture: '🍌', name: { en: 'banana', pt: 'banana' }, heft: 3 },
  { id: 'shoe', picture: '👟', name: { en: 'shoe', pt: 'tênis' }, heft: 4 },
  { id: 'ball', picture: '⚽', name: { en: 'ball', pt: 'bola' }, heft: 5 },
  { id: 'trophy', picture: '🏆', name: { en: 'trophy', pt: 'troféu' }, heft: 6 },
  { id: 'gi', picture: '🥋', name: { en: 'gi', pt: 'quimono' }, heft: 7 },
  { id: 'backpack', picture: '🎒', name: { en: 'backpack', pt: 'mochila' }, heft: 8 },
  { id: 'watermelon', picture: '🍉', name: { en: 'watermelon', pt: 'melancia' }, heft: 9 },
  { id: 'rock', picture: '🪨', name: { en: 'rock', pt: 'pedra' }, heft: 10 },
];

/** a small thing for the kitchen scale, with about what it really weighs:
    the lightest and the heaviest it is shown at, in grams. Those on the
    balance as well come in the balance's order. */
export interface GramThing {
  id: string;
  picture: string;
  name: Both;
  grams: [number, number];
}

export const GRAM_THINGS: GramThing[] = [
  { id: 'medal', picture: '🥇', name: { en: 'medal', pt: 'medalha' }, grams: [50, 100] },
  { id: 'apple', picture: '🍎', name: { en: 'apple', pt: 'maçã' }, grams: [100, 200] },
  { id: 'banana', picture: '🍌', name: { en: 'banana', pt: 'banana' }, grams: [150, 200] },
  { id: 'juice', picture: '🧃', name: { en: 'juice box', pt: 'caixinha de suco' }, grams: [200, 300] },
  { id: 'shoe', picture: '👟', name: { en: 'shoe', pt: 'tênis' }, grams: [250, 300] },
  { id: 'ball', picture: '⚽', name: { en: 'ball', pt: 'bola' }, grams: [350, 450] },
  { id: 'trophy', picture: '🏆', name: { en: 'trophy', pt: 'troféu' }, grams: [500, 900] },
  { id: 'pineapple', picture: '🍍', name: { en: 'pineapple', pt: 'abacaxi' }, grams: [900, 1000] },
];

/** "the ball", "a bola": Portuguese needs the article, so each word's gender */
const PT_FEMININE = new Set(['pena', 'medalha', 'banana', 'bola', 'mochila', 'melancia', 'pedra', 'maçã', 'caixinha de suco']);
export const feminine = (t: { name: Both }): boolean => PT_FEMININE.has(t.name.pt);
export const theThing = (t: { name: Both }, lang: Lang): string =>
  lang === 'en' ? `the ${t.name.en}` : `${feminine(t) ? 'a' : 'o'} ${t.name.pt}`;

export interface WeightClass { name: string; upTo: number }

/** the classes of a made-up kids' tournament, lightest first; each goes up to
    and including its limit */
export const WEIGHT_CLASSES: WeightClass[] = [
  { name: 'Galo', upTo: 20 },
  { name: 'Pluma', upTo: 23 },
  { name: 'Pena', upTo: 26 },
  { name: 'Leve', upTo: 29 },
  { name: 'Médio', upTo: 32 },
];

export const classFor = (kg: number): WeightClass | undefined => WEIGHT_CLASSES.find((c) => kg <= c.upTo);

/** what the gi weighs, in kilograms, at every weigh-in here */
export const GI_KG = 2;

/** a scale, drawn as a straight strip from lo to hi */
export interface Dial {
  lo: number;
  hi: number;
  /** a mark every this many */
  mark: number;
  /** and a number written every this many */
  number: number;
  unit: 'g' | 'kg';
}

/** the fighters' scale in Year 2: a mark for every kilogram, a number every 5 */
export const FIGHTER_DIAL: Dial = { lo: 15, hi: 35, mark: 1, number: 5, unit: 'kg' };
/** the kitchen scale: a number every 100 grams and a mark halfway between,
    up to 1000 grams, which is 1 kilogram */
export const KITCHEN_DIAL: Dial = { lo: 0, hi: 1000, mark: 50, number: 100, unit: 'g' };
/** Year 4: scales whose marks are not all numbered, a space worth 50, 100,
    20 or 25 grams, or 2 kilograms. Never more than 25 spaces, so the marks
    stay far enough apart to count on a phone. */
export const MARK_DIALS: Dial[] = [
  { lo: 0, hi: 1000, mark: 50, number: 200, unit: 'g' },
  { lo: 0, hi: 1000, mark: 100, number: 500, unit: 'g' },
  { lo: 0, hi: 500, mark: 20, number: 100, unit: 'g' },
  { lo: 0, hi: 500, mark: 25, number: 100, unit: 'g' },
  { lo: 0, hi: 40, mark: 2, number: 10, unit: 'kg' },
];

/** what Blue weighs on the Year 4 scale: on a mark of its own, never a number */
const BLUE_KG = [18, 22, 24, 26, 28, 32, 34];

/** grams written the way a bag's tag writes them: "900 g", "3 kg", "3 kg 200 g" */
export function kgAndG(grams: number): string {
  const kg = Math.floor(grams / 1000);
  const g = grams % 1000;
  if (!kg) return `${g} g`;
  return g ? `${kg} kg ${g} g` : `${kg} kg`;
}

/** the units in words, to be said: "3 kg 200 g" is said "3 kilograms 200 grams" */
export function unitsSaid(text: string, lang: Lang): string {
  return text.replace(/(\d+) (kg|g)\b/g, (_, n: string, unit: string) => {
    const word = unit === 'kg' ? (lang === 'pt' ? 'quilo' : 'kilogram') : (lang === 'pt' ? 'grama' : 'gram');
    return `${n} ${word}${n === '1' ? '' : 's'}`;
  });
}

export interface WeighStep extends Step {
  /**
   * heavier / lighter: which side of the balance;
   * mixed: either, so the question word has to be read;
   * blocks: how many blocks balance it;
   * scale: read the kilograms off the scale;
   * class: which weight class;
   * gi: on the scale with the gi, or without it;
   * grams: read the grams off the kitchen scale (Years 3–4);
   * kilo: how many more grams make 1 kilogram;
   * marks: read a scale whose marks are not all numbered;
   * bags: which bag is heavier, and by how much
   */
  task: 'heavier' | 'mixed' | 'blocks' | 'scale' | 'class' | 'gi' | 'grams' | 'kilo' | 'marks' | 'bags';
}

export const WEIGH_STEPS: WeighStep[] = [
  { name: 'Which is heavier?', task: 'heavier' },
  { name: 'Heavier or lighter?', task: 'mixed' },
  { name: 'How many blocks?', task: 'blocks' },
  /* Year 2: kilograms */
  { name: 'Read the scale', task: 'scale' },
  { name: 'Which weight class?', task: 'class' },
  { name: 'With the gi on', task: 'gi' },
  /* Years 3–4: grams, and scales with marks that have no number */
  { name: 'Grams', task: 'grams' },
  { name: '1 kilogram is 1000 grams', task: 'kilo' },
  { name: 'Between the numbers', task: 'marks' },
  { name: 'Which bag, and by how much?', task: 'bags' },
];

export interface WeighQuestion {
  task: WeighStep['task'];
  /** the two on the balance, left then right */
  left?: WeighThing;
  right?: WeighThing;
  /** for heavier and lighter: which is asked for */
  ask?: 'heavier' | 'lighter';
  /** for blocks: what is weighed */
  thing?: WeighThing;
  /** Blue's weight without his gi */
  kg?: number;
  /** for gi: does the scale show it with the gi on, and he works out without, or the other way */
  giOn?: boolean;
  /** for grams, kilo and marks: what is on the scale (none when it is Blue),
      the scale, and the number its pointer is on */
  small?: GramThing;
  dial?: Dial;
  shows?: number;
  /** for bags: what each weighs in grams, how much heavier the heavier one
      is, and the amounts offered for that */
  bags?: Record<Side, number>;
  by?: number;
  byOptions?: number[];
  /** a thing's id, a number, a class name, or for bags the heavier side */
  answer: string | number;
  options: (string | number)[];
}

/** every number from lo to hi, a step apart */
const every = (lo: number, hi: number, by: number): number[] =>
  Array.from({ length: Math.floor((hi - lo) / by) + 1 }, (_, i) => lo + i * by);

/** on one of the scale's marks, but not one with a number */
export const unnumbered = (v: number, d: Dial): boolean =>
  v > d.lo && v < d.hi && (v - d.lo) % d.mark === 0 && (v - d.lo) % d.number !== 0;

/** the number written on the scale just before the pointer */
const numberBefore = (v: number, d: Dial): number => d.lo + Math.floor((v - d.lo) / d.number) * d.number;

/**
 * The answer and three wrong ones, for a scale whose marks are not all
 * numbered: the slip of counting each space as 10 (or as 1, when a space is
 * worth 2), then a mark either side.
 */
export function markChoices(shows: number, d: Dial): number[] {
  const before = numberBefore(shows, d);
  const spaces = (shows - before) / d.mark;
  const slip = before + spaces * (d.mark > 10 ? 10 : 1);
  const out = [shows];
  for (const x of [slip, shows - d.mark, shows + d.mark, shows + 2 * d.mark, shows - 2 * d.mark]) {
    if (out.length >= 4) break;
    if (x > d.lo && x <= d.hi && !out.includes(x)) out.push(x);
  }
  return out.sort((a, b) => a - b);
}

/** two bags, one heavier by less than a kilogram; half the time it has the
    smaller number of grams on its tag, a kilogram more beside it */
function bagsQuestion(): WeighQuestion {
  let heavy: number;
  let light: number;
  if (pick([true, false])) {
    const kg = rand(2, 4);
    const [a, b] = shuffle(every(100, 900, 100)).slice(0, 2);
    heavy = kg * 1000 + Math.max(a, b);
    light = kg * 1000 + Math.min(a, b);
  } else {
    /* 3 kg 200 g is heavier than 2 kg 800 g */
    const kg = rand(2, 3);
    const lightG = rand(2, 9) * 100;
    light = kg * 1000 + lightG;
    heavy = (kg + 1) * 1000 + rand(0, lightG / 100 - 1) * 100;
  }
  const side = pick(['Blue', 'White'] as Side[]);
  const by = heavy - light;
  /* the slip: the grams taken from the grams, and the kilograms left out */
  const slip = Math.abs((heavy % 1000) - (light % 1000));
  const byOptions = [by];
  for (const x of [slip, by - 100, by + 100, by + 200, by - 200, by + 300]) {
    if (byOptions.length >= 4) break;
    if (x >= 100 && x <= 900 && !byOptions.includes(x)) byOptions.push(x);
  }
  return {
    task: 'bags', bags: side === 'Blue' ? { Blue: heavy, White: light } : { Blue: light, White: heavy },
    by, byOptions: byOptions.sort((x, y) => x - y), answer: side, options: ['Blue', 'White'],
  };
}

export function weighQuestion(step: WeighStep, last?: WeighQuestion): WeighQuestion {
  for (;;) {
    let q: WeighQuestion;
    if (step.task === 'heavier' || step.task === 'mixed') {
      const [left, right] = shuffle(WEIGH_THINGS).slice(0, 2);
      const ask = step.task === 'heavier' ? 'heavier' : pick(['heavier', 'lighter'] as const);
      const heavy = left.heft > right.heft ? left : right;
      const light = heavy === left ? right : left;
      q = { task: step.task, left, right, ask, answer: (ask === 'heavier' ? heavy : light).id, options: [left.id, right.id] };
    } else if (step.task === 'blocks') {
      const thing = pick(WEIGH_THINGS.filter((t) => t.heft >= 2));
      /* one block for each step of heft, so heavier things take more */
      q = { task: 'blocks', thing, answer: thing.heft, options: choices(thing.heft, 1, 12) };
    } else if (step.task === 'scale') {
      const kg = rand(16, 34);
      q = { task: 'scale', kg, answer: kg, options: choices(kg, 15, 35) };
    } else if (step.task === 'class') {
      const kg = rand(17, 32);
      q = { task: 'class', kg, answer: classFor(kg)!.name, options: WEIGHT_CLASSES.map((c) => c.name) };
    } else if (step.task === 'gi') {
      const kg = rand(17, 30);
      const giOn = pick([true, false]);
      /* with the gi on the scale shows more; he works out the other one */
      const answer = giOn ? kg : kg + GI_KG;
      q = { task: 'gi', kg, giOn, answer, options: choices(answer, 15, 35) };
    } else if (step.task === 'grams') {
      const small = pick(GRAM_THINGS);
      const shows = pick(every(small.grams[0], small.grams[1], KITCHEN_DIAL.mark));
      q = { task: 'grams', small, dial: KITCHEN_DIAL, shows, answer: shows, options: choices(shows, 50, 1000, 4, 50) };
    } else if (step.task === 'kilo') {
      /* bananas for the team, short of a kilogram */
      const shows = rand(2, 18) * 50;
      q = { task: 'kilo', small: GRAM_THINGS.find((t) => t.id === 'banana'), dial: KITCHEN_DIAL, shows,
        answer: 1000 - shows, options: choices(1000 - shows, 50, 950, 4, 50) };
    } else if (step.task === 'marks') {
      const dial = pick(MARK_DIALS);
      /* a thing that can be on a mark without a number: Blue on the
         kilogram scale, or something light enough on the gram ones */
      const fits: [GramThing | undefined, number][] = dial.unit === 'kg'
        ? BLUE_KG.filter((v) => unnumbered(v, dial)).map((v) => [undefined, v])
        : GRAM_THINGS.flatMap((t) => every(t.grams[0], t.grams[1], 5).filter((v) => unnumbered(v, dial)).map((v): [GramThing, number] => [t, v]));
      const [small, shows] = pick(fits);
      q = { task: 'marks', small, dial, shows, answer: shows, options: markChoices(shows, dial) };
    } else {
      q = bagsQuestion();
    }
    /* not the same again straight away: for the bags, the same side and amount */
    const same = q.task === 'bags' ? last?.answer === q.answer && last?.by === q.by : last?.answer === q.answer;
    if (last && same && last.left === q.left) continue;
    return q;
  }
}

/* What Weigh-In says, both ways. The questions without a number or a
   weight in them are on the list to record (weighLines); the explanations
   have the numbers of each question, so they stay with the device voice. */

export const WEIGH_SAYS = {
  heavier: { en: 'Which is heavier?', pt: 'Qual é mais pesado?' },
  lighter: { en: 'Which is lighter?', pt: 'Qual é mais leve?' },
  blocks: (t: WeighThing): Both => ({
    en: `The balance is level. How many blocks does ${theThing(t, 'en')} weigh?`,
    pt: `A balança está equilibrada. Quantos blocos pesa ${theThing(t, 'pt')}?`,
  }),
  scale: { en: 'Blue is on the scale. How many kilograms?', pt: 'O Azul está na balança. Quantos quilos?' },
  class: { en: 'Which weight class does Blue fight in?', pt: 'Em qual categoria o Azul luta?' },
  grams: (t: GramThing): Both => ({
    en: `How many grams does ${theThing(t, 'en')} weigh?`,
    pt: `Quantos gramas pesa ${theThing(t, 'pt')}?`,
  }),
  kilo: {
    en: 'The coach wants 1 kilogram of bananas for the team. How many more grams make 1 kilogram?',
    pt: 'O professor quer 1 quilo de bananas para a equipe. Quantos gramas faltam para 1 quilo?',
  },
  bags: { en: 'Which bag is heavier?', pt: 'Qual mochila é mais pesada?' },
  bag: (side: Side): Both => ({ en: `${side}'s bag`, pt: `Mochila do ${SIDE_NAME[side].pt}` }),
  by: (side: Side): Both => ({
    en: `How much heavier is ${side}'s bag?`,
    pt: `Quanto a mochila do ${SIDE_NAME[side].pt} pesa a mais?`,
  }),
};

/** the kitchen scale read: on a number, or halfway to the next */
export function gramsWhy(t: GramThing, g: number): Both {
  const before = Math.floor(g / 100) * 100;
  const kilo = g === 1000;
  return g % 100 === 0
    ? {
      en: `The pointer is on ${g}: ${theThing(t, 'en')} weighs ${g} grams.${kilo ? ' 1000 grams is 1 kilogram.' : ''}`,
      pt: `O ponteiro está no ${g}: ${theThing(t, 'pt')} pesa ${g} gramas.${kilo ? ' 1000 gramas são 1 quilo.' : ''}`,
    }
    : {
      en: `The pointer is halfway between ${before} and ${before + 100}: ${theThing(t, 'en')} weighs ${g} grams.`,
      pt: `O ponteiro está no meio, entre ${before} e ${before + 100}: ${theThing(t, 'pt')} pesa ${g} gramas.`,
    };
}

/** how many more grams make a kilogram: to the next hundred first, then on to 1000 */
export function kiloWhy(g: number): Both {
  const more = 1000 - g;
  const next = Math.ceil(g / 100) * 100;
  const simple = g % 100 === 0 || next === 1000;
  return {
    en: `The scale shows ${g} grams. 1 kilogram is 1000 grams: ${simple
      ? `${g} and ${more} make 1000`
      : `${g} and ${next - g} make ${next}, and ${1000 - next} more make 1000`}. ${more} grams more.`,
    pt: `A balança mostra ${g} gramas. 1 quilo é 1000 gramas: ${simple
      ? `${g} e ${more} fazem 1000`
      : `${g} e ${next - g} fazem ${next}, e mais ${1000 - next} fazem 1000`}. Faltam ${more} gramas.`,
  };
}

/** a scale read between its numbers: what each space is worth, then counting on */
export function marksWhy(d: Dial, shows: number, who: Both): Both {
  const before = numberBefore(shows, d);
  const counted = every(before + d.mark, shows, d.mark).join(', ');
  const unit = d.unit === 'g' ? { en: 'grams', pt: 'gramas' } : { en: 'kilograms', pt: 'quilos' };
  return {
    en: `There are ${d.number / d.mark} spaces from ${before} to ${before + d.number}, so each space is ${d.mark} ${unit.en}. `
      + `Count on from ${before}: ${counted}. ${cap(who.en)} weighs ${shows} ${unit.en}.`,
    pt: `São ${d.number / d.mark} espaços do ${before} ao ${before + d.number}, então cada espaço vale ${d.mark} ${unit.pt}. `
      + `Conte a partir do ${before}: ${counted}. ${cap(who.pt)} pesa ${shows} ${unit.pt}.`,
  };
}

/**
 * Which bag is heavier, and by how much: with the same kilograms, the grams
 * taken away; with a kilogram between them, counting up from the lighter to
 * the kilogram and on, the way Jump Line goes to the next ten first. With
 * `side` the heavier side was missed too, so it says first why it is heavier.
 */
export function bagsWhy(bags: Record<Side, number>, side = false): Both {
  const heavier: Side = bags.Blue > bags.White ? 'Blue' : 'White';
  const h = bags[heavier];
  const l = bags[heavier === 'Blue' ? 'White' : 'Blue'];
  const [hk, lk] = [Math.floor(h / 1000), Math.floor(l / 1000)];
  const by = h - l;
  const pt = SIDE_NAME[heavier].pt;
  let how: Both;
  if (hk === lk) {
    how = {
      en: `Both bags have ${hk} kg, and ${h % 1000} g take away ${l % 1000} g is ${by} g`,
      pt: `As duas mochilas têm ${hk} kg, e ${h % 1000} g menos ${l % 1000} g é ${by} g`,
    };
  } else {
    const up = hk * 1000 - l;
    how = {
      en: `${kgAndG(l)} and ${up} g make ${hk} kg${h % 1000 ? `, and ${h % 1000} g more is ${kgAndG(h)}` : ''}`,
      pt: `${kgAndG(l)} e ${up} g fazem ${hk} kg${h % 1000 ? `, e mais ${h % 1000} g dá ${kgAndG(h)}` : ''}`,
    };
  }
  const first: Both = side && hk !== lk
    ? { en: `${hk} kg is more than ${lk} kg, so ${heavier}'s bag is heavier. `, pt: `${hk} kg é mais que ${lk} kg, então a mochila do ${pt} é mais pesada. ` }
    : { en: '', pt: '' };
  return {
    en: `${first.en}${how.en}: ${heavier}'s bag is ${by} g heavier.`,
    pt: `${first.pt}${how.pt}: a mochila do ${pt} é ${by} g mais pesada.`,
  };
}

/** every line Weigh-In says with no number or weight in it, for the recordings */
export function weighLines(): Both[] {
  return [
    WEIGH_SAYS.heavier, WEIGH_SAYS.lighter, WEIGH_SAYS.scale, WEIGH_SAYS.class, WEIGH_SAYS.kilo, WEIGH_SAYS.bags,
    ...WEIGH_THINGS.filter((t) => t.heft >= 2).map(WEIGH_SAYS.blocks),
    ...GRAM_THINGS.map(WEIGH_SAYS.grams),
    ...(['Blue', 'White'] as Side[]).map(WEIGH_SAYS.by),
  ];
}

/* ── Ref's Signals: what the referee's hands say ─────────────────────── */

/* The referee scores with gestures, as the IBJJF rules book sets them out:
 *
 *   points      a hand raised, with as many fingers as points (2, 3 or 4)
 *   advantage   the arm out level with the mat, hand open, palm down
 *   penalty     a touch on the athlete's shoulder, then a clenched fist
 *               raised to shoulder height
 *   stop        PAROU, arms open and raised at shoulder height
 *   disqualified  arms over the head, forearms crossed, fists clenched
 *
 * and calls in Portuguese wherever the competition is: COMBATE to start, or
 * start again; PAROU to stop; LUTE, pointing at a fighter who is stalling,
 * for "fight!". Kindergarten and Year 1 read the fingers and tell the three
 * scoring signals apart; Year 2 plays referee — here is what happened, which
 * signal? — and learns the calls. */

export type Signal = 'points-2' | 'points-3' | 'points-4' | 'advantage' | 'penalty' | 'parou' | 'dq';

export const SIGNAL_MEANING: Record<Signal, Both> = {
  'points-2': { en: '2 points', pt: 'Dois pontos' },
  'points-3': { en: '3 points', pt: 'Três pontos' },
  'points-4': { en: '4 points', pt: 'Quatro pontos' },
  advantage: { en: 'Advantage', pt: 'Vantagem' },
  penalty: { en: 'Penalty', pt: 'Punição' },
  parou: { en: 'Stop', pt: 'Parou' },
  dq: { en: 'Disqualified', pt: 'Desclassificado' },
};

export type Command = 'combate' | 'parou' | 'lute';

/** each call as it is shouted, and what it means */
export const COMMANDS: Record<Command, { said: string; means: Both }> = {
  combate: { said: 'Combate!', means: { en: 'Start the fight', pt: 'Começar a luta' } },
  parou: { said: 'Parou!', means: { en: 'Stop', pt: 'Parar' } },
  lute: { said: 'Lute!', means: { en: 'Fight, do not stall', pt: 'Lutar, sem amarrar' } },
};

export interface SignalStep extends Step {
  /**
   * fingers: how many points is that hand;
   * kind: points, advantage or penalty;
   * move: which move scores what the hand shows;
   * referee: here is what happened, which signal (Year 2);
   * calls: what a call or a stop or disqualified signal means (Year 2)
   */
  task: 'fingers' | 'kind' | 'move' | 'referee' | 'calls';
}

export const SIGNAL_STEPS: SignalStep[] = [
  { name: 'How many points?', task: 'fingers' },
  { name: 'Points, advantage or penalty?', task: 'kind' },
  { name: 'Which move was it?', task: 'move' },
  /* Year 2 */
  { name: 'You are the referee', task: 'referee' },
  { name: 'The calls', task: 'calls' },
];

export interface SignalQuestion {
  task: SignalStep['task'];
  /** the signal shown, if any */
  signal?: Signal;
  /** for calls: a shouted call instead of a signal */
  command?: Command;
  /** for referee: what happened */
  moment?: Moment;
  /** for move: the moves to choose from */
  moves: Move[];
  answer: string | number;
  options: (string | number)[];
}

const pointsSignal = (n: number): Signal => `points-${n}` as Signal;

/** the signal for what happened on the mat */
export const signalFor = (m: Moment): Signal =>
  m.call === 'points' ? pointsSignal(moveById(m.move!).points) : m.call;

export function signalQuestion(step: SignalStep, last?: SignalQuestion): SignalQuestion {
  for (;;) {
    let q: SignalQuestion;
    if (step.task === 'fingers') {
      const n = pick([2, 3, 4]);
      q = { task: 'fingers', signal: pointsSignal(n), moves: [], answer: n, options: [2, 3, 4] };
    } else if (step.task === 'kind') {
      const kind = pick(['points', 'advantage', 'penalty'] as const);
      const signal: Signal = kind === 'points' ? pointsSignal(pick([2, 3, 4])) : kind;
      q = { task: 'kind', signal, moves: [], answer: kind, options: ['points', 'advantage', 'penalty'] };
    } else if (step.task === 'move') {
      const move = pick(MOVES);
      /* one move worth that many among them, so there is one right answer */
      const moves = shuffle([move, ...[2, 3, 4].filter((p) => p !== move.points).map((p) => pick(MOVES.filter((m) => m.points === p)))]);
      q = { task: 'move', signal: pointsSignal(move.points), moves, answer: move.id, options: moves.map((m) => m.id) };
    } else if (step.task === 'referee') {
      const moment = pick(MOMENTS);
      const right = signalFor(moment);
      const others = shuffle((['points-2', 'points-3', 'points-4', 'advantage', 'penalty'] as Signal[]).filter((s) => s !== right)).slice(0, 2);
      q = { task: 'referee', moment, moves: [], answer: right, options: shuffle([right, ...others]) };
    } else {
      /* a call shouted, or the stop or disqualified signal */
      if (Math.random() < 0.6) {
        const command = pick(['combate', 'parou', 'lute'] as Command[]);
        q = { task: 'calls', command, moves: [], answer: command, options: ['combate', 'parou', 'lute'] };
      } else {
        const signal = pick(['parou', 'dq'] as Signal[]);
        q = { task: 'calls', signal, moves: [], answer: signal, options: shuffle(['parou', 'dq', 'advantage']) };
      }
    }
    if (last && last.answer === q.answer && last.signal === q.signal && last.moment === q.moment) continue;
    return q;
  }
}

/* ── what the referee games say ──────────────────────────────────────────
 *
 * Every line Ref's Call and Ref's Signals say aloud, each way. Built here
 * rather than in the games so that tools/make-audio.ts can record each one
 * exactly as it is said: a line that differs by a word from its recording
 * plays in the device voice. */

const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);

/** how each signal is made, said after a miss so he learns it */
export const SIGNAL_HOW: Record<Signal, Both> = {
  'points-2': { en: 'Two fingers up is 2 points.', pt: 'Dois dedos para cima são dois pontos.' },
  'points-3': { en: 'Three fingers up is 3 points.', pt: 'Três dedos para cima são três pontos.' },
  'points-4': { en: 'Four fingers up is 4 points.', pt: 'Quatro dedos para cima são quatro pontos.' },
  advantage: { en: 'An open hand out flat is an advantage.', pt: 'A mão aberta, esticada e reta, é vantagem.' },
  penalty: { en: 'A fist at the shoulder is a penalty.', pt: 'O punho fechado no ombro é punição.' },
  parou: { en: 'Both arms out means stop: Parou!', pt: 'Os dois braços abertos: Parou!' },
  dq: { en: 'Arms crossed over the head means disqualified.', pt: 'Braços cruzados sobre a cabeça: desclassificado.' },
};

/** Ref's Call */
export const REF_SAYS = {
  /** "Mount. How many points?" */
  points: (m: Move): Both => ({ en: `${cap(m.name.en)}. How many points?`, pt: `${cap(m.name.pt)}. Quantos pontos?` }),
  /** "Which move is worth 4 points?" */
  which: (n: number): Both => ({ en: `Which move is worth ${pointsWords(n, 'en')}?`, pt: `Qual vale ${pointsWords(n, 'pt')}?` }),
  /** what happened on the mat, then the question */
  moment: (m: Moment): Both => ({ en: `${m.text.en} What does the referee give?`, pt: `${m.text.pt} O que o árbitro dá?` }),
  /** "A mount is 4 points." */
  worth: (m: Move): Both => ({ en: `A ${m.name.en} is ${pointsWords(m.points, 'en')}.`, pt: `${cap(m.name.pt)} vale ${pointsWords(m.points, 'pt')}.` }),
  /** the referee's call where a move scored ("Mount! 4 points!"), then why */
  answer: (how: Both, move?: Move): Both =>
    (move ? { en: `${refCall(move, 'en')} ${how.en}`, pt: `${refCall(move, 'pt')} ${how.pt}` } : how),
};

/** Ref's Signals */
export const SIGNAL_SAYS = {
  fingers: { en: 'How many points is the referee giving?', pt: 'Quantos pontos o árbitro está dando?' } as Both,
  kind: { en: 'What is the referee giving?', pt: 'O que o árbitro está dando?' } as Both,
  move: { en: 'Which move did Blue score?', pt: 'Qual golpe o Azul fez?' } as Both,
  referee: { en: 'You are the referee. Which signal?', pt: 'Você é o árbitro. Qual é o sinal?' } as Both,
  meaning: { en: 'What does this signal mean?', pt: 'O que este sinal quer dizer?' } as Both,
  /** "3 fingers is 3 points: guard pass." */
  scored: (m: Move): Both => ({
    en: `${m.points} fingers is ${pointsWords(m.points, 'en')}: ${m.name.en}.`,
    pt: `${m.points} dedos são ${pointsWords(m.points, 'pt')}: ${m.name.pt}.`,
  }),
  /** what happened on the mat, then "You are the referee. Which signal?" */
  moment: (m: Moment): Both => ({ en: `${m.text.en} ${SIGNAL_SAYS.referee.en}`, pt: `${m.text.pt} ${SIGNAL_SAYS.referee.pt}` }),
  /** why that call, then how its signal is made */
  answer: (m: Moment): Both => {
    const how = SIGNAL_HOW[signalFor(m)];
    return { en: `${m.why.en} ${how.en}`, pt: `${m.why.pt} ${how.pt}` };
  },
  /** "Parou! What does it mean?" */
  call: (c: Command): Both => ({ en: `${COMMANDS[c].said} What does it mean?`, pt: `${COMMANDS[c].said} O que quer dizer?` }),
  /** "Parou! means: Stop." */
  means: (c: Command): Both => ({
    en: `${COMMANDS[c].said} means: ${COMMANDS[c].means.en}.`,
    pt: `${COMMANDS[c].said} quer dizer: ${COMMANDS[c].means.pt}.`,
  }),
};

/** every line the two referee games can say, for the recordings */
export function refereeLines(): Both[] {
  const commands = Object.keys(COMMANDS) as Command[];
  return [
    ...MOVES.flatMap((m) => [REF_SAYS.points(m), REF_SAYS.answer(REF_SAYS.worth(m), m), SIGNAL_SAYS.scored(m)]),
    ...[2, 3, 4].map((n) => REF_SAYS.which(n)),
    ...MOMENTS.flatMap((m) => [
      REF_SAYS.moment(m), REF_SAYS.answer(m.why, m.move ? moveById(m.move) : undefined),
      SIGNAL_SAYS.moment(m), SIGNAL_SAYS.answer(m),
    ]),
    SIGNAL_SAYS.fingers, SIGNAL_SAYS.kind, SIGNAL_SAYS.move, SIGNAL_SAYS.meaning,
    ...Object.values(SIGNAL_HOW),
    ...commands.flatMap((c) => [SIGNAL_SAYS.call(c), SIGNAL_SAYS.means(c)]),
  ];
}
