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

export type Lang = 'en' | 'pt';

/** one thing said both ways */
export interface Both { en: string; pt: string }

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
   */
  task: 'total' | 'ahead' | 'missing' | 'tiebreak';
  /** how many moves Blue makes (least, most) */
  moves: [number, number];
  /** write the points on the moves, or he remembers them */
  shown: boolean;
  /** White scores too, and the question can be about either */
  both?: boolean;
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
];

export type Side = 'Blue' | 'White';

export interface MatchQuestion {
  blue: Move[];
  white: Move[];
  /** for total in a whole match: whose points are asked */
  side: Side;
  advantages: { Blue: number; White: number };
  penalties: { Blue: number; White: number };
  /** a number, or for tiebreak the winner */
  answer: number | Side;
  options: (number | string)[];
}

export const pointsOf = (moves: Move[]): number => moves.reduce((s, m) => s + m.points, 0);
const moves = (n: number): Move[] => Array.from({ length: n }, () => pick(MOVES));

export function matchQuestion(step: MatchStep, last?: MatchQuestion): MatchQuestion {
  for (;;) {
    const blue = moves(rand(step.moves[0], step.moves[1]));
    let white: Move[] = [];
    let side: Side = 'Blue';
    const advantages = { Blue: 0, White: 0 };
    const penalties = { Blue: 0, White: 0 };
    let answer: number | Side;
    let options: (number | string)[];
    if (step.task === 'total') {
      if (step.both) { white = moves(rand(1, 2)); side = pick(['Blue', 'White'] as Side[]); }
      answer = pointsOf(side === 'Blue' ? blue : white);
      options = choices(answer, 1, 20);
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
