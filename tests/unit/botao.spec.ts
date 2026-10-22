/* Futebol de Botão: the flick, the bounces, the rules, and the set pieces. */

import { describe, expect, it } from 'vitest';
import {
  BALL, BOTAO_STEPS, KEEPER_W, L, MARKS, MAX_SPEED, MOUTH, POST, PULL, R, W,
  angles, botaoQuestion, bounceWords, flickFor, keeperFor, mayFlick, oneTouch, robust, simulate, slant,
  type Point, type Table,
} from '../../src/content/botao';

/* the same set pieces on every run */
function seeded(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

const table = (ball: Point, us: Point[], extra: Partial<Table> = {}): Table => ({ ball, us, them: [], keeper: null, ...extra });
const MID = (MOUTH[0] + MOUTH[1]) / 2;
const dist = (a: Point, b: Point): number => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

describe('a flick', () => {
  it('sends the ball straight on through its middle, faster than the button', () => {
    const t = table({ x: MID, y: 40 }, [{ x: MID, y: 52 }]);
    const shot = simulate(t, { button: 0, vx: 0, vy: -70 });
    expect(shot.touched).toBe(true);
    expect(shot.goal).toBe(true);
    expect(shot.bumps[0]).toMatchObject({ what: 'touch', who: 0 });
    /* a frame after the touch, the ball has gone further than the button */
    const f = shot.bumps[0].frame;
    const [before, after] = [shot.frames[f], shot.frames[f + 3]];
    expect(dist(before[0], after[0])).toBeGreaterThan(dist(before[1], after[1]));
    expect(Math.abs(shot.end.ball.x - MID)).toBeLessThan(0.01);
  });

  it('does the same every time, and stops', () => {
    const t = table({ x: 20, y: 50 }, [{ x: 28, y: 60 }, { x: 50, y: 70 }], { them: [{ x: 30, y: 30 }], keeper: 30 });
    const f = { button: 0, vx: -60, vy: -80 };
    expect(simulate(t, f)).toEqual(simulate(t, f));
    const end = simulate(t, f).end;
    const again = simulate(end, { button: 1, vx: 0, vy: 0 });
    expect(again.frames).toHaveLength(2);
  });

  it('goes no faster than the fastest flick', () => {
    const t = table({ x: 10, y: 10 }, [{ x: MID, y: 80 }]);
    expect(simulate(t, { button: 0, vx: 0, vy: -1000 }).end).toEqual(simulate(t, { button: 0, vx: 0, vy: -MAX_SPEED }).end);
  });

  it('comes from pulling back: the other way, harder the further, up to the fastest', () => {
    expect(flickFor(0, 0, 10)).toEqual({ button: 0, vx: -0, vy: -10 * PULL });
    const far = flickFor(1, 300, 400);
    expect(Math.sqrt(far.vx ** 2 + far.vy ** 2)).toBeCloseTo(MAX_SPEED);
    expect(far.vx).toBeLessThan(0);
    expect(far.vy).toBeLessThan(0);
  });
});

describe('the table', () => {
  it('bounces the ball off a wall at exactly the angle it went in', () => {
    /* pushed up and to the left at 45°, into the left wall */
    const ball = { x: 14, y: 70 };
    const t = table(ball, [{ x: ball.x + 7, y: ball.y + 7 }]);
    const shot = simulate(t, { button: 0, vx: -70, vy: -70 });
    expect(shot.bumps.some((b) => b.what === 'wall')).toBe(true);
    const [b] = shot.bounces;
    expect(b.normal).toEqual({ x: 1, y: 0 });
    expect(b.at.x).toBeCloseTo(BALL);
    const [into, out] = angles(b);
    expect(into).toBe(out);
    expect(into).toBeGreaterThan(35);
    expect(into).toBeLessThan(55);
    /* and the frames agree: it really went off that way */
    /* the angle to the wall, which runs up and down the table */
    const way = (a: Point, c: Point): number => Math.atan2(Math.abs(c.x - a.x), Math.abs(c.y - a.y)) * 180 / Math.PI;
    expect(way(shot.frames[b.frame - 3][0], shot.frames[b.frame - 1][0])).toBeCloseTo(into, -0.5);
    expect(way(shot.frames[b.frame + 1][0], shot.frames[b.frame + 3][0])).toBeCloseTo(out, -0.5);
  });

  it('says how steeply the ball met the wall: 90° straight at it, small when it only grazes it', () => {
    const left = { x: 1, y: 0 };
    expect(slant({ x: -10, y: 0 }, left)).toBe(90);
    expect(slant({ x: -10, y: -10 }, left)).toBe(45);
    expect(slant({ x: -1, y: -10 }, left)).toBe(6);
    /* the same on every wall, whichever way along it the ball goes */
    expect(slant({ x: 3, y: 4 }, { x: 0, y: -1 })).toBe(53);
    expect(slant({ x: -3, y: 4 }, { x: 0, y: -1 })).toBe(53);
    expect(slant({ x: 4, y: -3 }, { x: -1, y: 0 })).toBe(53);
  });

  it('comes straight back from a shot straight at the wall, a right angle', () => {
    const ball = { x: 20, y: 60 };
    const shot = simulate(table(ball, [{ x: ball.x + 10, y: ball.y }]), { button: 0, vx: -80, vy: 0 });
    const [b] = shot.bounces;
    expect(angles(b)).toEqual([90, 90]);
    expect(bounceWords(b)).toBe('It went straight at the wall, at a right angle, 90°, and came straight back.');
  });

  it('tells him the angle in and the angle out', () => {
    const b = { frame: 1, at: { x: BALL, y: 40 }, normal: { x: 1, y: 0 }, into: { x: -30, y: -40 }, out: { x: 30, y: -40 } };
    expect(bounceWords(b)).toBe('It went into the wall at 37° and came off at 37°: the same angle.');
    expect(bounceWords({ ...b, out: { x: 20, y: -40 } })).toBe('It went into the wall at 37° and came off at 27°.');
  });

  it('counts no bounce for a goal: the net is not a wall', () => {
    const t = table({ x: MID, y: 40 }, [{ x: MID, y: 52 }]);
    const shot = simulate(t, { button: 0, vx: 0, vy: -100 });
    expect(shot.goal).toBe(true);
    expect(shot.bounces).toEqual([]);
  });

  it('is shaped like a real table: half as long again as it is wide, the goal narrower than the small area', () => {
    expect(L / W).toBeGreaterThan(1.45);
    expect(L / W).toBeLessThan(1.6);
    const [boxW, boxD] = MARKS.box;
    const [penW, penD] = MARKS.penalty;
    expect(MOUTH[1] - MOUTH[0]).toBeLessThan(boxW);
    expect(boxW).toBeLessThan(penW);
    expect(boxD).toBeLessThan(MARKS.spot);
    expect(MARKS.spot).toBeLessThan(penD);
    /* the arc round the spot reaches past the penalty area's edge */
    expect(MARKS.spot + MARKS.arc).toBeGreaterThan(penD);
    /* and the goleiro leaves a gap each side the ball fits through */
    expect((MOUTH[1] - MOUTH[0] - KEEPER_W) / 2).toBeGreaterThan(2 * BALL + 2 * POST);
  });

  it('lets the goleiro stop a shot hit straight at him', () => {
    const t = table({ x: 30, y: 30 }, [{ x: 30, y: 42 }], { keeper: 30 });
    const shot = simulate(t, { button: 0, vx: 0, vy: -100 });
    expect(shot.goal).toBe(false);
    expect(shot.bumps.map((b) => b.what)).toContain('keeper');
  });

  it('has posts: a shot at one bounces off', () => {
    const t = table({ x: MOUTH[0], y: 30 }, [{ x: MOUTH[0], y: 42 }]);
    const shot = simulate(t, { button: 0, vx: 0, vy: -90 });
    expect(shot.bumps.map((b) => b.what)).toContain('post');
    expect(shot.goal).toBe(false);
  });

  it('keeps a button out of the goal and on the table', () => {
    const t = table({ x: 5, y: 85 }, [{ x: MID, y: 20 }]);
    const end = simulate(t, { button: 0, vx: 0, vy: -MAX_SPEED }).end;
    expect(end.us[0].y).toBeGreaterThanOrEqual(R - 0.01);
  });
});

describe('the rules', () => {
  it('three touches, and before the third the ball goes to another button', () => {
    expect(mayFlick([], 0)).toBe(true);
    expect(mayFlick([0], 0)).toBe(true);
    expect(mayFlick([0, 0], 0)).toBe(false);
    expect(mayFlick([0, 0], 1)).toBe(true);
    expect(mayFlick([0, 1], 0)).toBe(true);
    expect(mayFlick([1, 0], 0)).toBe(true);
  });

  it('puts the goleiro on the near post, or in the middle of the way to goal', () => {
    expect(keeperFor('none', { x: 10, y: 30 })).toBeNull();
    expect(keeperFor('side', { x: 10, y: 30 })!).toBeLessThan(MID);
    expect(keeperFor('side', { x: 54, y: 30 })!).toBeGreaterThan(MID);
    for (const x of [2, 20, 32, 44, 62]) {
      const k = keeperFor('middle', { x, y: 25 })!;
      expect(k - KEEPER_W / 2).toBeGreaterThan(MOUTH[0]);
      expect(k + KEEPER_W / 2).toBeLessThan(MOUTH[1]);
    }
  });
});

describe('the set pieces', () => {
  it('give less help further up: the ball\'s way all shown, then a little, then none', () => {
    const order = { full: 0, short: 1, none: 2 };
    const help = BOTAO_STEPS.map((s) => order[s.guide]);
    expect(help).toEqual([...help].sort((a, b) => a - b));
    expect(BOTAO_STEPS.at(-1)!.guide).toBe('none');
  });

  for (const [i, step] of BOTAO_STEPS.entries()) {
    it(`${step.name}: everything on the table, and the way shown scores, and still scores a little off`, () => {
      const rand = seeded(1000 + i);
      for (let n = 0; n < 12; n += 1) {
        const q = botaoQuestion(step, rand);
        const t = q.table;
        const all = [{ ...t.ball, r: BALL }, ...[...t.us, ...t.them].map((p) => ({ ...p, r: R }))];
        for (const [j, a] of all.entries()) {
          expect(a.x - a.r).toBeGreaterThan(0);
          expect(a.x + a.r).toBeLessThan(W);
          expect(a.y + a.r).toBeLessThan(L);
          for (const b of all.slice(j + 1)) expect(dist(a, b)).toBeGreaterThan(a.r + b.r);
        }
        expect(t.keeper).toBe(keeperFor(step.keeper, t.ball));
        /* played as shown, the last flick scores */
        let now = t;
        for (const [k, f] of q.plan.flicks.entries()) {
          const shot = simulate(now, f);
          expect(shot.touched).toBe(true);
          expect(shot.goal).toBe(k === q.plan.flicks.length - 1);
          if (k === q.plan.flicks.length - 1) expect(robust(now, f)).toBe(true);
          now = { ...shot.end, keeper: keeperFor(step.keeper, shot.end.ball) };
        }
        /* and it is the shot the step is about */
        if (step.play === 'front') expect(q.plan.kind).toBe('straight');
        if (step.play === 'angle') expect(['cut', 'wall']).toContain(q.plan.kind);
        if (step.play === 'angle' && step.keeper !== 'middle') expect(q.plan.kind).toBe('cut');
        if (step.play === 'wall') {
          expect(q.plan.kind).toBe('wall');
          expect(oneTouch(t, [0], false)).toBeNull();
        }
        if (step.play === 'pass') {
          expect(q.plan.kind).toBe('pass');
          expect(q.plan.flicks.map((f) => f.button)).toEqual([0, 1]);
        }
        if (step.keeper !== 'none') expect(t.keeper).not.toBeNull();
      }
    }, 30_000);
  }
});
