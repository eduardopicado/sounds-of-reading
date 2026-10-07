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

/* ── Weigh-In: heavier and lighter, then kilograms ────────────────────── */

/* Before a competition every fighter is weighed, and fights others in the
 * same weight class. Kindergarten and Year 1 compare on a balance: the side
 * that goes down is heavier. Then they measure with blocks, the informal unit
 * the syllabus starts with. Year 2 reads kilograms off the scale, finds his
 * weight class, and adds or takes away the gi, since he is weighed in it.
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
  /** heavier things have bigger numbers; only the order matters */
  heft: number;
}

export const WEIGH_THINGS: WeighThing[] = [
  { id: 'feather', picture: '🪶', name: { en: 'feather', pt: 'pena' }, heft: 1 },
  { id: 'medal', picture: '🥇', name: { en: 'medal', pt: 'medalha' }, heft: 2 },
  { id: 'banana', picture: '🍌', name: { en: 'banana', pt: 'banana' }, heft: 3 },
  { id: 'shoe', picture: '👟', name: { en: 'shoe', pt: 'tênis' }, heft: 4 },
  { id: 'gi', picture: '🥋', name: { en: 'gi', pt: 'quimono' }, heft: 5 },
  { id: 'ball', picture: '⚽', name: { en: 'ball', pt: 'bola' }, heft: 6 },
  { id: 'trophy', picture: '🏆', name: { en: 'trophy', pt: 'troféu' }, heft: 7 },
  { id: 'backpack', picture: '🎒', name: { en: 'backpack', pt: 'mochila' }, heft: 8 },
  { id: 'watermelon', picture: '🍉', name: { en: 'watermelon', pt: 'melancia' }, heft: 9 },
  { id: 'rock', picture: '🪨', name: { en: 'rock', pt: 'pedra' }, heft: 10 },
];

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

export interface WeighStep extends Step {
  /**
   * heavier / lighter: which side of the balance;
   * mixed: either, so the question word has to be read;
   * blocks: how many blocks balance it;
   * scale: read the kilograms off the scale;
   * class: which weight class;
   * gi: on the scale with the gi, or without it
   */
  task: 'heavier' | 'mixed' | 'blocks' | 'scale' | 'class' | 'gi';
}

export const WEIGH_STEPS: WeighStep[] = [
  { name: 'Which is heavier?', task: 'heavier' },
  { name: 'Heavier or lighter?', task: 'mixed' },
  { name: 'How many blocks?', task: 'blocks' },
  /* Year 2: kilograms */
  { name: 'Read the scale', task: 'scale' },
  { name: 'Which weight class?', task: 'class' },
  { name: 'With the gi on', task: 'gi' },
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
  /** a thing's id, a number, or a class name */
  answer: string | number;
  options: (string | number)[];
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
    } else {
      const kg = rand(17, 30);
      const giOn = pick([true, false]);
      /* with the gi on the scale shows more; he works out the other one */
      const answer = giOn ? kg : kg + GI_KG;
      q = { task: 'gi', kg, giOn, answer, options: choices(answer, 15, 35) };
    }
    if (last && last.answer === q.answer && last.left === q.left) continue;
    return q;
  }
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
