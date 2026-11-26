/* Football Ref's rules: every picture the game draws has the answer the
 * Laws of the Game give, worked out here again from where everyone stands.
 *
 *   npm run test:unit */

import { describe, expect, it } from 'vitest';
import {
  ASK, CALLS, CARD_CASES, FOOTBALL_STEPS, GOAL_WIDTH, HALFWAY, PITCH, SIGNALS, footballLines, footballQuestion, inRightBox,
  type FootballQuestion, type Scene,
} from '../../src/content/football-rules';

const many = (task: string, n = 2000): FootballQuestion[] => {
  const step = FOOTBALL_STEPS.find((s) => s.task === task)!;
  return Array.from({ length: n }, () => footballQuestion(step));
};

/** offside, from the picture alone: in their half, past the last outfield
    defender and past the ball when it is played, and not from a throw-in */
function offside(s: Scene): boolean {
  const runner = s.players.find((p) => p.mark === 'runner')!;
  const defenders = s.players.filter((p) => p.side === 'them' && !p.keeper).map((p) => p.at[0]);
  const last = Math.max(...defenders);
  const [x] = runner.at;
  if (s.throwIn) return false;
  return x > HALFWAY && x > last && x > s.ball[0];
}

describe('Football Ref', () => {
  it('goes from the ball going out to offside, offside last', () => {
    expect(FOOTBALL_STEPS.map((s) => s.task)).toEqual(['restart', 'foul', 'signal', 'card', 'offside', 'tricky']);
  });

  it('gives a throw-in over the side line, and over the goal line a goal kick or a corner by who touched it last', () => {
    for (const q of many('restart')) {
      const [x, y] = q.scene!.ball;
      const touched = q.scene!.players.find((p) => p.mark === 'passer')!.side;
      if (y < 0 || y > PITCH.h) expect(q.answer).toBe('throw-in');
      else {
        expect(x).toBeGreaterThan(PITCH.w);
        /* wide of the goal, not in it */
        expect(Math.abs(y - PITCH.h / 2)).toBeGreaterThan(GOAL_WIDTH / 2);
        /* his team attacks this goal: his touch is the attacker's */
        expect(q.answer).toBe(touched === 'us' ? 'goal-kick' : 'corner');
      }
      expect(q.options).toContain(q.answer);
    }
  });

  it('gives a penalty only for a defender\'s foul inside his box; an attacker\'s foul is a free kick anywhere', () => {
    const kinds = new Set<string>();
    for (const q of many('foul')) {
      const fouler = q.scene!.players.find((p) => p.mark === 'fouler')!;
      const fouled = q.scene!.players.find((p) => p.mark === 'fouled')!;
      /* his team attacks the right-hand goal: the other team are the defenders */
      const byDefender = fouler.side === 'them';
      expect(fouled.side).not.toBe(fouler.side);
      expect(q.answer, `${q.kind} ${q.scene!.foul}`).toBe(byDefender && inRightBox(q.scene!.foul!) ? 'penalty' : 'free-kick');
      /* the question says who fouled */
      expect(q.ask).toBe(byDefender ? ASK.foul : ASK.attackerFoul);
      kinds.add(q.kind);
    }
    expect(kinds).toEqual(new Set(['in-box', 'out-box', 'attacker-in-box']));
  });

  it('calls offside exactly when the Laws do, from where everyone stands', () => {
    for (const task of ['offside', 'tricky']) {
      for (const q of many(task)) expect(q.answer, `${q.kind}`).toBe(offside(q.scene!) ? 'offside' : 'onside');
    }
  });

  it('mixes the tricky ones, so "not offside" is not always the answer, and has every case', () => {
    const qs = many('tricky');
    const offsides = qs.filter((q) => q.answer === 'offside').length;
    expect(offsides / qs.length).toBeGreaterThan(0.2);
    expect(offsides / qs.length).toBeLessThan(0.5);
    expect(new Set(qs.map((q) => q.kind))).toEqual(new Set(['level', 'own-half', 'behind-ball', 'throw-in', 'just-past']));
    /* the clear ones: past by a good stride, or short of him by one */
    for (const q of many('offside')) {
      const runner = q.scene!.players.find((p) => p.mark === 'runner')!.at[0];
      const last = q.scene!.players.find((p) => p.mark === 'last')!.at[0];
      expect(Math.abs(runner - last)).toBeGreaterThan(5);
    }
  });

  it('draws the line that decides it: the last defender, or halfway in his own half', () => {
    for (const q of [...many('offside', 300), ...many('tricky', 300)]) {
      const last = q.scene!.players.find((p) => p.mark === 'last')!.at[0];
      expect(q.scene!.line!.x).toBe(q.kind === 'own-half' ? HALFWAY : last);
    }
  });

  it('has a card for each story, each kind of card, and a reason', () => {
    expect(new Set(CARD_CASES.map((c) => c.card))).toEqual(new Set(['no-card', 'yellow', 'red']));
    for (const q of many('card', 200)) {
      expect(q.what).toBeTruthy();
      expect(q.options).toEqual(['no-card', 'yellow', 'red']);
    }
  });

  it('asks about a signal from three different calls, the right one among them', () => {
    for (const q of many('signal', 300)) {
      expect(new Set(q.options).size).toBe(3);
      expect(q.options).toContain(q.answer);
      expect(SIGNALS[q.signal!].call).toBe(q.answer);
    }
  });

  it('says everything in English and Portuguese, each a sentence, for the recordings', () => {
    for (const c of Object.values(CALLS)) expect(c.pt && c.en).toBeTruthy();
    for (const lang of ['en', 'pt'] as const) {
      const lines = footballLines(lang);
      expect(lines.length).toBeGreaterThan(30);
      for (const l of lines) expect(l, l).toMatch(/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ].*[.!?]$/);
    }
    expect(footballLines('pt')).toContain('Em lateral não tem impedimento.'.replace('Em', 'A bola veio de um lateral. Em'));
  });
});
