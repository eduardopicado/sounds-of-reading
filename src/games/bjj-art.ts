/* The jiu-jitsu pictures: two people on a mat, one picture per scoring move.
 *
 * Each person is drawn the same simple way — a head, a thick torso and four
 * limbs of two segments each, a dark outline under the gi colour, and the belt
 * as a band at the hips — and a pose is only where the joints are. Blue is
 * him, in his own belt colour; White is the training partner. Kept as plain
 * coordinates so a pose can be nudged without touching anything else. The
 * poses follow how the IBJJF describes each move: both knees down in mount,
 * one knee on the belly and the other foot posted, past the legs and chest to
 * chest for the pass, the seatbelt and both hooks in for the back.
 *
 * The box is 240 by 160, the mat along the bottom at y 146. */

import { svg } from '../ui/writing';
import type { Move } from '../content/bjj';

type P = [number, number];

interface Pose {
  head: P;
  neck: P;
  hip: P;
  /** elbow then hand, near arm then far arm */
  arms: [P, P][];
  /** knee then foot, near leg then far leg */
  legs: [P, P][];
  /** which side of the body is the front, where the belt is tied: the
      side to the left of the hip-to-neck line (1, the default), or the
      other (-1), as for someone lying on their back facing up */
  front?: 1 | -1;
}

export interface Gi { gi: string; belt: string }

export const BELTS: Record<string, string> = {
  white: '#F4F1EA', grey: '#8C9096', yellow: '#F2C230', orange: '#EE8A2B', green: '#3A9A4E',
};

const INK = '#1E2B2A';

function line(points: P[], colour: string, width: number, cap: 'round' | 'butt' = 'round'): SVGElement {
  return svg('polyline', {
    points: points.map((p) => p.join(',')).join(' '),
    fill: 'none', stroke: colour, 'stroke-width': width, 'stroke-linecap': cap, 'stroke-linejoin': 'round',
  });
}

/** one segment of a limb, an outline under the gi colour */
function seg(points: P[], look: Gi, w: number): SVGElement[] {
  return [line(points, INK, w + 4), line(points, look.gi, w)];
}

/** a person in layers, so a pose that wraps round the other person (the back,
    hooks in) can put some of them behind the partner and some in front */
function parts(pose: Pose, look: Gi) {
  const [nearArm, farArm] = pose.arms;
  const [nearLeg, farLeg] = pose.legs;
  return {
    farLeg: seg([pose.hip, ...farLeg], look, 10),
    body: [
      line([pose.neck, pose.hip], INK, 22), line([pose.neck, pose.hip], look.gi, 18),
      svg('circle', { cx: pose.head[0], cy: pose.head[1], r: 12, fill: '#F2C7A5', stroke: INK, 'stroke-width': 3 }),
    ],
    nearThigh: seg([pose.hip, nearLeg[0]], look, 10),
    nearShin: seg(nearLeg, look, 10),
    nearLeg: seg([pose.hip, ...nearLeg], look, 10),
    nearArm: seg([pose.neck, ...nearArm], look, 8),
    farArm: seg([pose.neck, ...farArm], look, 8),
    /* the belt last, over the arms and legs, so it is always seen */
    belt: belt(pose, look.belt),
  };
}

/** one person: far limbs first, then the body, then the near limbs, then the belt */
function person(pose: Pose, look: Gi): SVGElement {
  const p = parts(pose, look);
  return svg('g', {}, ...p.farArm, ...p.farLeg, ...p.body, ...p.nearLeg, ...p.nearArm, ...p.belt);
}

/* the belt: a band wider than the gi just above the hips, a knot, and its two tails */
function belt(pose: Pose, colour: string): SVGElement[] {
  const dx = pose.neck[0] - pose.hip[0];
  const dy = pose.neck[1] - pose.hip[1];
  const len = Math.hypot(dx, dy) || 1;
  const u: P = [dx / len, dy / len];
  const n: P = [-u[1], u[0]];
  const at = (t: number): P => [pose.hip[0] + dx * t, pose.hip[1] + dy * t];
  /* a flat band: a short stroke along the body, its width across it */
  const a = at(0.11);
  const b = at(0.27);
  const edge = (p: P, d: number): P => [p[0] - u[0] * d, p[1] - u[1] * d];
  /* tied at the front, the belly side, with the tails hanging from the knot */
  const f = pose.front ?? 1;
  const mid = at(0.19);
  const knot: P = [mid[0] + n[0] * f * 10, mid[1] + n[1] * f * 10];
  const tail = (along: number, out: number): P => [knot[0] - u[0] * along + n[0] * f * out, knot[1] - u[1] * along + n[1] * f * out];
  const tails = [[knot, tail(14, 4)], [knot, tail(12, -1)]] as P[][];
  return [
    line([edge(a, 1.5), edge(b, -1.5)], INK, 27, 'butt'), line([a, b], colour, 23, 'butt'),
    ...tails.map((t) => line(t, INK, 7)), ...tails.map((t) => line(t, colour, 4)),
    svg('circle', { cx: knot[0], cy: knot[1], r: 4.5, fill: colour, stroke: INK, 'stroke-width': 2 }),
  ];
}

/** a belt on its own, for beside his name: band, knot and tails */
export function beltBadge(colour: string): SVGSVGElement {
  return svg('svg', { class: 'bj-belt', viewBox: '0 0 64 28', 'aria-hidden': 'true' },
    svg('rect', { x: 2, y: 4, width: 60, height: 11, rx: 3, fill: colour, stroke: INK, 'stroke-width': 2.5 }),
    svg('path', { d: 'M30 12 L22 26 M34 12 L42 26', stroke: INK, 'stroke-width': 8, 'stroke-linecap': 'round' }),
    svg('path', { d: 'M30 12 L22 26 M34 12 L42 26', stroke: colour, 'stroke-width': 4.5, 'stroke-linecap': 'round' }),
    svg('rect', { x: 26, y: 2, width: 12, height: 15, rx: 3, fill: colour, stroke: INK, 'stroke-width': 2.5 }));
}

/** a curved arrow, for a move that is a movement */
function arrow(d: string, tip: P, angle: number): SVGElement[] {
  return [
    svg('path', { d, fill: 'none', stroke: '#C9452E', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-dasharray': '10 7' }),
    svg('path', { d: 'M -9 -8 L 5 0 L -9 8 Z', fill: '#C9452E', transform: `translate(${tip[0]} ${tip[1]}) rotate(${angle})` }),
  ];
}

/* ── the poses: [the one underneath or behind, the other], in drawing order ── */

/** lying on the back, head to the right */
const lying = (legs: [P, P][], arms: [P, P][]): Pose => ({ head: [200, 128], neck: [184, 128], hip: [132, 130], arms, legs, front: -1 });

const POSES: Record<Move['id'], (blue: Gi, white: Gi) => SVGElement[]> = {
  /* White in the air, legs up, about to land on his back; Blue driving
     through with his arms round White's waist, staying on his feet */
  takedown: (blue, white) => [
    person({ head: [198, 128], neck: [186, 114], hip: [160, 76], arms: [[[206, 118], [218, 138]], [[174, 126], [182, 142]]], legs: [[[152, 46], [172, 22]], [[138, 56], [124, 30]]] }, white),
    person({ head: [102, 56], neck: [94, 72], hip: [66, 108], arms: [[[120, 94], [146, 86]], [[118, 80], [142, 72]]], legs: [[[84, 128], [96, 146]], [[54, 128], [40, 146]]] }, blue),
    ...arrow('M 196 16 Q 236 34 228 100', [228, 102], 95),
  ],
  /* Blue on the back, feet in White's hips, lifting White up and over */
  sweep: (blue, white) => [
    person({ head: [186, 92], neck: [170, 86], hip: [128, 76], arms: [[[184, 110], [192, 134]], [[176, 112], [182, 136]]], legs: [[[104, 66], [86, 82]], [[108, 72], [92, 94]]] }, white),
    person({ head: [44, 128], neck: [60, 126], hip: [104, 126], arms: [[[80, 104], [100, 92]], [[72, 108], [90, 98]]], legs: [[[118, 98], [132, 82]], [[110, 100], [122, 78]]] }, blue),
    ...arrow('M 100 34 Q 190 22 214 82', [215, 84], 75),
  ],
  /* White flat; Blue up tall, one knee on the belly, the other leg out wide
     with the foot on the mat, a hand on the collar and a hand on the belt */
  'knee-on-belly': (blue, white) => [
    person(lying([[[100, 132], [68, 134]], [[102, 126], [70, 124]]], [[[172, 110], [162, 98]], [[190, 112], [196, 98]]]), white),
    person({ head: [146, 30], neck: [144, 46], hip: [138, 86], arms: [[[164, 76], [180, 114]], [[126, 72], [128, 106]]], legs: [[[154, 116], [126, 112]], [[110, 116], [84, 146]]] }, blue),
  ],
  /* White's knees still up, but Blue is past them: lying across White's
     chest, chest to chest, knees on the mat by White's hip, an arm under the head */
  'guard-pass': (blue, white) => [
    person(lying([[[114, 98], [94, 142]], [[120, 100], [102, 140]]], [[[170, 112], [160, 100]], [[188, 112], [194, 100]]]), white),
    person({ head: [212, 100], neck: [194, 108], hip: [152, 110], arms: [[[210, 124], [224, 132]], [[180, 124], [164, 130]]], legs: [[[146, 138], [124, 143]], [[154, 136], [132, 141]]] }, blue),
    ...arrow('M 54 112 Q 96 34 146 84', [148, 86], 45),
  ],
  /* Blue sitting up tall on White's belly, both knees on the mat either side */
  mount: (blue, white) => [
    person(lying([[[96, 132], [64, 134]], [[98, 126], [66, 124]]], [[[172, 106], [164, 92]], [[186, 108], [192, 94]]]), white),
    person({ head: [152, 50], neck: [150, 66], hip: [146, 110], arms: [[[166, 88], [180, 114]], [[160, 92], [174, 116]]], legs: [[[170, 138], [136, 142]], [[166, 134], [132, 138]]] }, blue),
  ],
  /* both sitting, Blue behind: arms round White's chest (one over the
     shoulder, one under the arm — the seatbelt) and both hooks in, his
     legs round White's hips with the feet inside White's thighs */
  back: (blue, white) => {
    const b = parts({ head: [104, 66], neck: [104, 84], hip: [102, 138], arms: [[[118, 110], [148, 104]], [[134, 76], [150, 108]]], legs: [[[136, 110], [152, 132]], [[132, 104], [146, 126]]] }, blue);
    const scene = svg('g', { transform: 'translate(-14 0)' },
      ...b.farLeg, ...b.body, ...b.nearShin, ...b.nearArm,
      person({ head: [140, 62], neck: [136, 80], hip: [126, 134], arms: [[[156, 104], [146, 92]], [[152, 100], [142, 88]]], legs: [[[162, 106], [190, 142]], [[156, 102], [182, 140]]] }, white),
      ...b.nearThigh, ...b.farArm, ...b.belt);
    return [scene];
  },
};

/** the picture for a move, Blue in his belt */
export function movePicture(move: Move, blue: Gi, white: Gi = { gi: '#FBFAF6', belt: BELTS.white }): SVGSVGElement {
  const pic = svg('svg', { class: 'bj-pic', viewBox: '0 0 240 160', role: 'img', 'aria-label': move.name.en },
    svg('rect', { x: 0, y: 146, width: 240, height: 14, fill: '#4F7FB8', rx: 4 }));
  pic.append(...POSES[move.id](blue, white));
  return pic;
}
