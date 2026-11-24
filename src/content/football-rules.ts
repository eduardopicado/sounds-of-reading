/* Football Ref: the rules of the game he plays, the way a referee sees them.
 *
 * What happens when the ball goes out (a throw-in, a corner or a goal kick,
 * by the line it crossed and who touched it last), a foul inside or outside
 * the box (a penalty or a free kick), the referee's signals, yellow and red
 * cards, and offside last, because it is the hardest: first clear ones,
 * then the cases that look like offside and are not (level, in his own
 * half, behind the ball, from a throw-in), mixed with ones just past the
 * line that are.
 *
 * The rules are the Laws of the Game (IFAB), cut down to what a child sees
 * from the sideline. Offside: in the other half, past the second-last
 * defender (the goalkeeper is always in goal here, so that is the last
 * defender he can see) and past the ball, when a team-mate passes; level is
 * not offside, and there is none from a throw-in, a goal kick or a corner.
 *
 * Every word in English and in Portuguese, the way it is said in Brazil:
 * lateral, escanteio, tiro de meta, pênalti, impedimento.
 *
 * The pitch is 105 by 68 metres, x along it and y across it from the top;
 * his team attacks the goal on the right. */

import type { Step } from './maths';
import type { Both, Lang } from './pt';

export const PITCH = { w: 105, h: 68 } as const;
/** the penalty box and the goal area, in from each goal line, and their width */
export const BOX = { depth: 16.5, width: 40.32 } as const;
export const GOAL_AREA = { depth: 5.5, width: 18.32 } as const;
export const GOAL_WIDTH = 7.32;
export const PENALTY_SPOT = 11;
export const HALFWAY = PITCH.w / 2;

export type Pt = [number, number];
export type Side = 'us' | 'them';

export interface Player { at: Pt; side: Side; keeper?: true; mark?: 'passer' | 'runner' | 'fouled' | 'fouler' | 'last' }

/** what is drawn: the players, the ball, and what happened */
export interface Scene {
  players: Player[];
  ball: Pt;
  /** the ball's path: out of play from who touched it, or a pass */
  path?: [Pt, Pt];
  /** where the foul was */
  foul?: Pt;
  /** a throw-in being taken */
  throwIn?: true;
  /** drawn once he has answered: the last defender's line, or halfway */
  line?: { x: number; kind: 'defender' | 'halfway' };
}

/* ── the words ──────────────────────────────────────────────────────── */

export type Call = 'throw-in' | 'corner' | 'goal-kick' | 'free-kick' | 'penalty' | 'offside' | 'onside'
  | 'no-card' | 'yellow' | 'red' | 'advantage';

/** a button: what the referee gives */
export const CALLS: Record<Call, Both> = {
  'throw-in': { en: 'Throw-in', pt: 'Lateral' },
  corner: { en: 'Corner', pt: 'Escanteio' },
  'goal-kick': { en: 'Goal kick', pt: 'Tiro de meta' },
  'free-kick': { en: 'Free kick', pt: 'Falta' },
  penalty: { en: 'Penalty', pt: 'Pênalti' },
  offside: { en: 'Offside', pt: 'Impedimento' },
  onside: { en: 'Not offside', pt: 'Não é impedimento' },
  'no-card': { en: 'No card', pt: 'Sem cartão' },
  yellow: { en: 'Yellow card', pt: 'Cartão amarelo' },
  red: { en: 'Red card', pt: 'Cartão vermelho' },
  advantage: { en: 'Play on', pt: 'Vantagem' },
};

export const ASK = {
  restart: { en: 'The ball went out. What happens now?', pt: 'A bola saiu. E agora?' },
  foul: { en: 'A foul! Free kick or penalty?', pt: 'Foi falta! É falta ou pênalti?' },
  offside: { en: 'The ball is passed now. Is he offside?', pt: 'A bola foi passada agora. Ele está impedido?' },
  card: { en: 'What does the referee do?', pt: 'O que o árbitro faz?' },
  signal: { en: 'What is the referee saying?', pt: 'O que o árbitro está dizendo?' },
} satisfies Record<string, Both>;

export const WHY = {
  side: { en: 'It went over the side line: throw-in.', pt: 'Saiu pela lateral: é lateral.' },
  goalKick: { en: 'It went over the goal line, and an attacker touched it last: goal kick.', pt: 'Saiu pela linha de fundo, e um atacante tocou por último: tiro de meta.' },
  corner: { en: 'It went over the goal line, and a defender touched it last: corner.', pt: 'Saiu pela linha de fundo, e um defensor tocou por último: escanteio.' },
  inBox: { en: 'The foul was inside the box: penalty!', pt: 'A falta foi dentro da área: pênalti!' },
  outBox: { en: 'The foul was outside the box: free kick.', pt: 'A falta foi fora da área: é falta.' },
  past: { en: 'He was past the last defender when the ball was passed: offside!', pt: 'Ele estava na frente do último defensor quando a bola foi passada: impedimento!' },
  notPast: { en: 'He was not past the last defender when the ball was passed: not offside.', pt: 'Ele não estava na frente do último defensor quando a bola foi passada: não é impedimento.' },
  justPast: { en: 'Just a little past the last defender is still offside.', pt: 'Só um pouquinho na frente do último defensor já é impedimento.' },
  level: { en: 'He was level with the last defender. Level is not offside.', pt: 'Ele estava na mesma linha do último defensor. Na mesma linha não é impedimento.' },
  ownHalf: { en: 'He was in his own half. You can never be offside in your own half.', pt: 'Ele estava no campo dele. No próprio campo nunca é impedimento.' },
  behindBall: { en: 'He was behind the ball when it was passed: not offside.', pt: 'Ele estava atrás da bola quando ela foi passada: não é impedimento.' },
  throwIn: { en: 'The ball came from a throw-in. There is no offside from a throw-in.', pt: 'A bola veio de um lateral. Em lateral não tem impedimento.' },
} satisfies Record<string, Both>;

/* ── cards: what happened, and the card ─────────────────────────────── */

export interface CardCase { what: Both; card: 'no-card' | 'yellow' | 'red'; why: Both }

export const CARD_CASES: CardCase[] = [
  { what: { en: 'He tripped a player by accident.', pt: 'Ele derrubou um jogador sem querer.' }, card: 'no-card',
    why: { en: 'An accident is a free kick, with no card.', pt: 'Sem querer é só falta, sem cartão.' } },
  { what: { en: 'The ball hit his hand by accident.', pt: 'A bola bateu na mão dele sem querer.' }, card: 'no-card',
    why: { en: 'A ball that hits a hand by accident is not a foul: no card.', pt: 'Bola na mão sem querer não é falta: sem cartão.' } },
  { what: { en: 'He pulled a shirt to stop a fast attack.', pt: 'Ele puxou a camisa para parar um contra-ataque.' }, card: 'yellow',
    why: { en: 'Stopping an attack on purpose is a yellow card: a warning.', pt: 'Parar um ataque de propósito é cartão amarelo: um aviso.' } },
  { what: { en: 'He argued with the referee.', pt: 'Ele discutiu com o árbitro.' }, card: 'yellow',
    why: { en: 'Arguing with the referee is a yellow card.', pt: 'Discutir com o árbitro é cartão amarelo.' } },
  { what: { en: 'He took his shirt off to celebrate a goal.', pt: 'Ele tirou a camisa para comemorar o gol.' }, card: 'yellow',
    why: { en: 'Taking your shirt off is a yellow card, even after a goal.', pt: 'Tirar a camisa é cartão amarelo, mesmo depois de um gol.' } },
  { what: { en: 'He made a dangerous tackle that could badly hurt someone.', pt: 'Ele deu uma entrada perigosa, que podia machucar feio.' }, card: 'red',
    why: { en: 'A dangerous tackle is a red card: he has to leave the game.', pt: 'Entrada perigosa é cartão vermelho: ele tem que sair do jogo.' } },
  { what: { en: 'He got his second yellow card.', pt: 'Ele levou o segundo cartão amarelo.' }, card: 'red',
    why: { en: 'Two yellow cards make a red card.', pt: 'Dois cartões amarelos viram um vermelho.' } },
  { what: { en: 'He stopped a goal with his hand, on the goal line.', pt: 'Ele tirou com a mão uma bola que ia entrar no gol.' }, card: 'red',
    why: { en: 'Stopping a goal with your hand is a red card, and a penalty.', pt: 'Impedir um gol com a mão é cartão vermelho, e pênalti.' } },
];

/* ── the referee's signals ──────────────────────────────────────────── */

export type Signal = 'offside' | 'penalty' | 'corner' | 'goal-kick' | 'advantage' | 'free-kick';

/** each signal, what it means, and how the referee shows it */
export const SIGNALS: Record<Signal, { call: Call; how: Both }> = {
  offside: { call: 'offside', how: { en: 'The assistant holds the flag straight up: offside.', pt: 'O assistente levanta a bandeira: impedimento.' } },
  penalty: { call: 'penalty', how: { en: 'The referee points at the penalty spot: penalty.', pt: 'O árbitro aponta para a marca do pênalti: pênalti.' } },
  corner: { call: 'corner', how: { en: 'The referee points at the corner flag: corner.', pt: 'O árbitro aponta para a bandeirinha de escanteio: escanteio.' } },
  'goal-kick': { call: 'goal-kick', how: { en: 'The referee points at the goal area: goal kick.', pt: 'O árbitro aponta para a pequena área: tiro de meta.' } },
  advantage: { call: 'advantage', how: { en: 'Both arms forward: play on. The team that was fouled keeps the ball.', pt: 'Os dois braços para a frente: vantagem. O time que sofreu a falta continua com a bola.' } },
  'free-kick': { call: 'free-kick', how: { en: 'One arm out, the way the kick goes: free kick.', pt: 'Um braço esticado, para o lado de quem vai cobrar: falta.' } },
};

/* ── the steps ──────────────────────────────────────────────────────── */

export interface FootballStep extends Step {
  task: 'restart' | 'foul' | 'signal' | 'card' | 'offside' | 'tricky';
}

export const FOOTBALL_STEPS: FootballStep[] = [
  { name: 'Out of play', task: 'restart' },
  { name: 'Free kick or penalty?', task: 'foul' },
  { name: "The referee's signals", task: 'signal' },
  { name: 'Yellow or red?', task: 'card' },
  /* the hardest: offside, clear ones first, then the ones that look like it */
  { name: 'Offside?', task: 'offside' },
  { name: 'Offside: the tricky ones', task: 'tricky' },
];

export interface FootballQuestion {
  task: FootballStep['task'];
  ask: Both;
  /** the pitch, for the questions that show one */
  scene?: Scene;
  /** what happened, for a card */
  what?: Both;
  /** the signal drawn */
  signal?: Signal;
  options: Call[];
  answer: Call;
  why: Both;
  /** which case it is, so a round mixes them (and for the tests) */
  kind: string;
}

/* ── making a question ──────────────────────────────────────────────── */

type Rand = () => number;
const between = (r: Rand, a: number, b: number): number => a + r() * (b - a);
const oneOf = <T>(r: Rand, list: readonly T[]): T => list[Math.floor(r() * list.length)];
const shuffled = <T>(r: Rand, list: readonly T[]): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** whether a point is inside the penalty box at the right-hand goal */
export const inRightBox = ([x, y]: Pt): boolean =>
  x >= PITCH.w - BOX.depth && x <= PITCH.w && Math.abs(y - PITCH.h / 2) <= BOX.width / 2;

/** their goalkeeper, in goal on the right */
const keeper = (r: Rand): Player => ({ at: [PITCH.w - 2, PITCH.h / 2 + between(r, -3, 3)], side: 'them', keeper: true });

function restart(r: Rand): FootballQuestion {
  const options: Call[] = ['throw-in', 'corner', 'goal-kick'];
  const kind = oneOf(r, ['side', 'end-attacker', 'end-defender'] as const);
  if (kind === 'side') {
    const top = r() < 0.5;
    const x = between(r, 20, 85);
    const last: Side = r() < 0.5 ? 'us' : 'them';
    const from: Pt = [x - between(r, -6, 6), top ? 6 : PITCH.h - 6];
    const ball: Pt = [x, top ? -2.5 : PITCH.h + 2.5];
    return {
      task: 'restart', kind, ask: ASK.restart, options, answer: 'throw-in', why: WHY.side,
      scene: { players: [{ at: from, side: last, mark: 'passer' }, { at: [from[0] + between(r, 4, 9), from[1] + (top ? 5 : -5)], side: last === 'us' ? 'them' : 'us' }, keeper(r)], ball, path: [from, ball] },
    };
  }
  /* over their goal line, wide of the goal: his team attacks this way */
  const last: Side = kind === 'end-attacker' ? 'us' : 'them';
  const y = r() < 0.5 ? between(r, 4, 24) : between(r, 44, 64);
  const from: Pt = [PITCH.w - between(r, 8, 14), y + between(r, -4, 4)];
  const ball: Pt = [PITCH.w + 2.5, y];
  const other: Player = { at: [from[0] + between(r, -3, 3), from[1] + (y < 34 ? 4 : -4)], side: last === 'us' ? 'them' : 'us' };
  return {
    task: 'restart', kind, ask: ASK.restart, options,
    answer: kind === 'end-attacker' ? 'goal-kick' : 'corner',
    why: kind === 'end-attacker' ? WHY.goalKick : WHY.corner,
    scene: { players: [{ at: from, side: last, mark: 'passer' }, other, keeper(r)], ball, path: [from, ball] },
  };
}

function foul(r: Rand): FootballQuestion {
  const inside = r() < 0.5;
  const at: Pt = inside
    ? [between(r, PITCH.w - BOX.depth + 2, PITCH.w - 4), PITCH.h / 2 + between(r, -BOX.width / 2 + 3, BOX.width / 2 - 3)]
    /* outside: in front of the box, or beside it, where it is easy to think it is in */
    : r() < 0.5
      ? [between(r, 62, PITCH.w - BOX.depth - 3), PITCH.h / 2 + between(r, -18, 18)]
      : [between(r, PITCH.w - 14, PITCH.w - 4), r() < 0.5 ? between(r, 3, 10) : between(r, PITCH.h - 10, PITCH.h - 3)];
  return {
    task: 'foul', kind: inside ? 'in-box' : 'out-box', ask: ASK.foul, options: ['free-kick', 'penalty'],
    answer: inside ? 'penalty' : 'free-kick', why: inside ? WHY.inBox : WHY.outBox,
    scene: {
      players: [{ at, side: 'us', mark: 'fouled' }, { at: [at[0] + 3, at[1] - 2.4], side: 'them', mark: 'fouler' }, keeper(r)],
      ball: [at[0] - 3.4, at[1] + 2.2], foul: at,
    },
  };
}

/**
 * An offside question. Clear: well past the last defender, or well short of
 * him (and in front of the ball, in their half). Tricky: the cases that look
 * like offside and are not, or one just past the line that is.
 */
function offside(r: Rand, tricky: boolean): FootballQuestion {
  const options: Call[] = ['offside', 'onside'];
  const kinds = tricky
    ? (['level', 'own-half', 'behind-ball', 'throw-in', 'just-past', 'just-past'] as const)
    : (['past', 'not-past'] as const);
  const kind = oneOf(r, kinds);
  const y = (): number => between(r, 10, PITCH.h - 10);
  const base = (lastX: number, runner: Pt, ball: Pt, extra: Player[] = []): Scene => ({
    players: [
      keeper(r),
      { at: [lastX, y()], side: 'them', mark: 'last' },
      { at: [lastX - between(r, 4, 10), y()], side: 'them' },
      { at: ball, side: 'us', mark: 'passer' },
      { at: runner, side: 'us', mark: 'runner' },
      ...extra,
    ],
    ball: [ball[0] + 1.6, ball[1]],
    path: [[ball[0] + 1.6, ball[1]], runner],
    line: { x: lastX, kind: 'defender' },
  });
  const q = (scene: Scene, offsideToo: boolean, why: Both): FootballQuestion =>
    ({ task: tricky ? 'tricky' : 'offside', kind, ask: ASK.offside, options, answer: offsideToo ? 'offside' : 'onside', why, scene });

  if (kind === 'past' || kind === 'not-past' || kind === 'just-past') {
    const lastX = between(r, 72, 86);
    const passer: Pt = [between(r, 38, 55), y()];
    const ahead = kind === 'past' ? between(r, 6, 11) : kind === 'just-past' ? between(r, 1.6, 2.6) : -between(r, 6, 11);
    const runner: Pt = [lastX + ahead, y()];
    return q(base(lastX, runner, passer), kind !== 'not-past', kind === 'past' ? WHY.past : kind === 'just-past' ? WHY.justPast : WHY.notPast);
  }
  if (kind === 'level') {
    const lastX = between(r, 72, 86);
    return q(base(lastX, [lastX, y()], [between(r, 40, 55), y()]), false, WHY.level);
  }
  if (kind === 'own-half') {
    /* their defence has come right up: he is past it, but still in his own half */
    const lastX = between(r, 40, 46);
    const runner: Pt = [between(r, lastX + 3, HALFWAY - 2), y()];
    const scene = base(lastX, runner, [between(r, 22, 32), y()]);
    scene.line = { x: HALFWAY, kind: 'halfway' };
    return q(scene, false, WHY.ownHalf);
  }
  if (kind === 'behind-ball') {
    /* a pass back: he is past the last defender, but behind the ball */
    const lastX = between(r, 74, 82);
    const passer: Pt = [between(r, lastX + 8, PITCH.w - 6), between(r, 12, 20)];
    const runner: Pt = [between(r, lastX + 2, passer[0] - 4), between(r, 30, 44)];
    return q(base(lastX, runner, passer), false, WHY.behindBall);
  }
  /* a throw-in, from the side line, to a player past the last defender */
  const lastX = between(r, 74, 84);
  const top = r() < 0.5;
  const thrower: Pt = [between(r, 66, 76), top ? 0 : PITCH.h];
  const runner: Pt = [lastX + between(r, 4, 8), top ? between(r, 8, 22) : between(r, PITCH.h - 22, PITCH.h - 8)];
  const scene = base(lastX, runner, thrower);
  scene.ball = [thrower[0], thrower[1]];
  scene.path = [scene.ball, runner];
  scene.throwIn = true;
  return q(scene, false, WHY.throwIn);
}

function card(r: Rand): FootballQuestion {
  const c = oneOf(r, CARD_CASES);
  return { task: 'card', kind: c.card, ask: ASK.card, what: c.what, options: ['no-card', 'yellow', 'red'], answer: c.card, why: c.why };
}

function signal(r: Rand): FootballQuestion {
  const all = Object.keys(SIGNALS) as Signal[];
  const s = oneOf(r, all);
  const others = shuffled(r, all.filter((x) => x !== s)).slice(0, 2);
  const options = shuffled(r, [s, ...others]).map((x) => SIGNALS[x].call);
  return { task: 'signal', kind: s, ask: ASK.signal, signal: s, options, answer: SIGNALS[s].call, why: SIGNALS[s].how };
}

/** one question at this step, not the same kind as the last if it can help it */
export function footballQuestion(step: FootballStep, last?: FootballQuestion, r: Rand = Math.random): FootballQuestion {
  const make = (): FootballQuestion => {
    switch (step.task) {
      case 'restart': return restart(r);
      case 'foul': return foul(r);
      case 'signal': return signal(r);
      case 'card': return card(r);
      case 'offside': return offside(r, false);
      default: return offside(r, true);
    }
  };
  let q = make();
  for (let i = 0; i < 4 && last && q.kind === last.kind && (q.what?.en ?? '') === (last.what?.en ?? ''); i += 1) q = make();
  return q;
}

/** said at the end of a round */
export const CHEER = 'Good refereeing!';

/** every line the game says, for the recordings */
export function footballLines(lang: Lang = 'en'): string[] {
  return [...new Set([
    ...(lang === 'en' ? [CHEER] : []),
    ...Object.values(ASK).map((x) => x[lang]),
    ...Object.values(WHY).map((x) => x[lang]),
    ...CARD_CASES.flatMap((c) => [c.what[lang], c.why[lang]]),
    ...Object.values(SIGNALS).map((s) => s.how[lang]),
  ])];
}
