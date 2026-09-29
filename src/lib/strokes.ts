/* The maths of tracing a letter, with no browser needed.
 *
 * A stroke is an SVG path using only M, L, C and Q with absolute
 * coordinates, which is all a letter needs and simple enough to walk here
 * rather than borrow from the DOM — so the content test can check every
 * letter, and the judging can be tested without a screen.
 *
 * Judging a trace is deliberately forgiving about wobble and strict about
 * the three things a teacher checks: where the pencil starts, which way it
 * goes, and that it goes the whole way. A beautiful letter drawn from the
 * wrong end is still a habit to unlearn, so that is the one thing that
 * always fails. */

export interface Point { x: number; y: number }

type Seg =
  | { k: 'L'; a: Point; b: Point }
  | { k: 'C'; a: Point; c1: Point; c2: Point; b: Point }
  | { k: 'Q'; a: Point; c: Point; b: Point };

/** the segments of one path; throws on anything but M L C Q */
export function parsePath(d: string): Seg[] {
  const tokens = d.match(/[MLCQ]|-?\d*\.?\d+/g) ?? [];
  const segs: Seg[] = [];
  let at: Point | null = null;
  let i = 0;
  const num = (): number => {
    const t = tokens[i++];
    if (t === undefined || /[A-Z]/.test(t)) throw new Error(`path "${d}": expected a number`);
    return Number(t);
  };
  const pt = (): Point => ({ x: num(), y: num() });
  let cmd = '';
  while (i < tokens.length) {
    if (/[A-Z]/.test(tokens[i])) cmd = tokens[i++];
    if (cmd === 'M') { at = pt(); continue; }
    if (!at) throw new Error(`path "${d}" must start with M`);
    if (cmd === 'L') { const b = pt(); segs.push({ k: 'L', a: at, b }); at = b; }
    else if (cmd === 'C') { const c1 = pt(); const c2 = pt(); const b = pt(); segs.push({ k: 'C', a: at, c1, c2, b }); at = b; }
    else if (cmd === 'Q') { const c = pt(); const b = pt(); segs.push({ k: 'Q', a: at, c, b }); at = b; }
    else throw new Error(`path "${d}": only M L C Q are allowed, not ${cmd}`);
  }
  return segs;
}

function at(s: Seg, t: number): Point {
  const u = 1 - t;
  if (s.k === 'L') return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t };
  if (s.k === 'Q') {
    return {
      x: u * u * s.a.x + 2 * u * t * s.c.x + t * t * s.b.x,
      y: u * u * s.a.y + 2 * u * t * s.c.y + t * t * s.b.y,
    };
  }
  return {
    x: u * u * u * s.a.x + 3 * u * u * t * s.c1.x + 3 * u * t * t * s.c2.x + t * t * t * s.b.x,
    y: u * u * u * s.a.y + 3 * u * u * t * s.c1.y + 3 * u * t * t * s.c2.y + t * t * t * s.b.y,
  };
}

const dist = (p: Point, q: Point): number => Math.hypot(p.x - q.x, p.y - q.y);

/** points along the path about `step` apart, first to last, in drawing order */
export function samplePath(d: string, step = 3): Point[] {
  const segs = parsePath(d);
  if (!segs.length) {
    /* a dot: a path that is only a move */
    const m = /M\s*(-?\d*\.?\d+)[ ,]+(-?\d*\.?\d+)/.exec(d);
    return m ? [{ x: Number(m[1]), y: Number(m[2]) }] : [];
  }
  const out: Point[] = [at(segs[0], 0)];
  for (const s of segs) {
    /* fine steps, keeping a point whenever we have moved `step` from the last */
    for (let n = 1; n <= 60; n += 1) {
      const p = at(s, n / 60);
      if (dist(p, out[out.length - 1]) >= step) out.push(p);
    }
  }
  const end = at(segs[segs.length - 1], 1);
  if (dist(end, out[out.length - 1]) > 0.5) out.push(end);
  return out;
}

export const startOf = (d: string): Point => samplePath(d)[0];

export interface Verdict {
  ok: boolean;
  /** what to tell him when it is not */
  why?: 'start' | 'direction' | 'short' | 'off';
}

/**
 * Did this trace follow this stroke?
 *
 * `tol` is how far from the line counts as on it, in the letter's own units
 * (a letter body is 50 high, so 12 is generous for a finger, fair for a pen).
 */
export function judge(stroke: Point[], trace: Point[], tol = 12): Verdict {
  if (!stroke.length || !trace.length) return { ok: false, why: 'short' };
  const nearest = (p: Point, pts: Point[]): { i: number; d: number } => {
    let best = { i: 0, d: Infinity };
    pts.forEach((q, i) => { const dd = dist(p, q); if (dd < best.d) best = { i, d: dd }; });
    return best;
  };

  /* a dot is a tap near it */
  if (stroke.length === 1) return { ok: nearest(stroke[0], trace).d <= tol * 1.4, why: 'start' };

  /* 1. start at the start */
  if (dist(trace[0], stroke[0]) > tol * 1.5) return { ok: false, why: 'start' };

  /* 2. the right way round: the first part of the trace belongs to the first
     part of the stroke. This is what catches a c drawn clockwise. */
  const early = trace.slice(0, Math.max(2, Math.ceil(trace.length * 0.25)));
  const earlyIdx = early.map((p) => nearest(p, stroke).i);
  const earlyLate = earlyIdx.filter((i) => i > stroke.length * 0.6).length;
  if (earlyLate > early.length / 2) return { ok: false, why: 'direction' };

  /* 3. all the way: nearly every part of the stroke has been passed over */
  const covered = stroke.filter((s) => nearest(s, trace).d <= tol).length / stroke.length;
  if (covered < 0.85) return { ok: false, why: 'short' };

  /* 4. and not wandering off: nearly all the trace is on the stroke */
  const on = trace.filter((p) => nearest(p, stroke).d <= tol * 1.6).length / trace.length;
  if (on < 0.85) return { ok: false, why: 'off' };

  return { ok: true };
}
