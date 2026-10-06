/* The jiu-jitsu pictures: two people on a mat, one picture per scoring move.
 *
 * Each person is drawn the same simple way — a head, a thick torso and four
 * limbs of two segments each, a dark outline under the gi colour, and the belt
 * as a band at the hips — and a pose is only where the joints are. Blue is
 * him, in his own belt colour; White is the training partner. Kept as plain
 * coordinates so a pose can be nudged without touching anything else.
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
}

export interface Gi { gi: string; belt: string }

export const BELTS: Record<string, string> = {
  white: '#F4F1EA', grey: '#8C9096', yellow: '#F2C230', orange: '#EE8A2B', green: '#3A9A4E',
};

const INK = '#1E2B2A';

function line(points: P[], colour: string, width: number): SVGElement {
  return svg('polyline', {
    points: points.map((p) => p.join(',')).join(' '),
    fill: 'none', stroke: colour, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  });
}

/** one person: far limbs first, then the body, then the near limbs */
function person(pose: Pose, look: Gi, only?: 'limbs'): SVGElement {
  const g = svg('g', {});
  const limb = (from: P, [mid, end]: [P, P], w: number): SVGElement[] =>
    [line([from, mid, end], INK, w + 4), line([from, mid, end], look.gi, w)];
  const [nearArm, farArm] = pose.arms;
  const [nearLeg, farLeg] = pose.legs;
  if (!only) g.append(...limb(pose.neck, farArm, 8), ...limb(pose.hip, farLeg, 10));
  if (!only) {
    g.append(line([pose.neck, pose.hip], INK, 22), line([pose.neck, pose.hip], look.gi, 18));
    /* the belt: a band across the body just above the hips */
    const t = 0.16;
    const a: P = [pose.hip[0] + (pose.neck[0] - pose.hip[0]) * t, pose.hip[1] + (pose.neck[1] - pose.hip[1]) * t];
    const b: P = [pose.hip[0] + (pose.neck[0] - pose.hip[0]) * (t + 0.12), pose.hip[1] + (pose.neck[1] - pose.hip[1]) * (t + 0.12)];
    g.append(line([a, b], INK, 22), line([a, b], look.belt, 18));
    g.append(svg('circle', { cx: pose.head[0], cy: pose.head[1], r: 12, fill: '#F2C7A5', stroke: INK, 'stroke-width': 3 }));
  }
  if (only) g.append(...limb(pose.neck, farArm, 8), ...limb(pose.hip, farLeg, 10));
  g.append(...limb(pose.hip, nearLeg, 10), ...limb(pose.neck, nearArm, 8));
  return g;
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
const lying = (legs: [P, P][], arms: [P, P][]): Pose => ({ head: [200, 128], neck: [184, 128], hip: [132, 130], arms, legs });

const POSES: Record<Move['id'], (blue: Gi, white: Gi) => SVGElement[]> = {
  /* White thrown onto the mat, Blue standing over and holding on */
  takedown: (blue, white) => [
    person(lying([[[112, 108], [96, 122]], [[114, 120], [90, 134]]], [[[176, 108], [166, 96]], [[190, 110], [196, 96]]]), white),
    person({ head: [104, 54], neck: [96, 68], hip: [72, 96], arms: [[[112, 88], [128, 110]], [[104, 92], [118, 118]]], legs: [[[84, 120], [70, 146]], [[60, 120], [48, 146]]] }, blue),
    ...arrow('M 150 40 Q 200 46 214 96', [214, 98], 80),
  ],
  /* Blue on the back, feet in White's hips, lifting White up and over */
  sweep: (blue, white) => [
    person({ head: [186, 92], neck: [170, 86], hip: [128, 76], arms: [[[184, 110], [192, 134]], [[176, 112], [182, 136]]], legs: [[[104, 66], [86, 82]], [[108, 72], [92, 94]]] }, white),
    person({ head: [44, 128], neck: [60, 126], hip: [104, 126], arms: [[[80, 104], [100, 92]], [[72, 108], [90, 98]]], legs: [[[118, 98], [132, 82]], [[110, 100], [122, 78]]] }, blue),
    ...arrow('M 100 34 Q 190 22 214 82', [215, 84], 75),
  ],
  /* White flat, Blue up on one knee across the belly, the other leg posted */
  'knee-on-belly': (blue, white) => [
    person(lying([[[100, 132], [68, 134]], [[102, 126], [70, 124]]], [[[172, 110], [162, 98]], [[190, 112], [196, 98]]]), white),
    person({ head: [146, 32], neck: [144, 48], hip: [138, 86], arms: [[[160, 80], [172, 112]], [[122, 64], [108, 50]]], legs: [[[150, 116], [122, 112]], [[112, 108], [100, 146]]] }, blue),
  ],
  /* White's knees up in guard; Blue has gone round them to the side, chest to chest */
  'guard-pass': (blue, white) => [
    person(lying([[[118, 94], [104, 108]], [[124, 98], [112, 104]]], [[[176, 112], [168, 100]], [[190, 114], [194, 102]]]), white),
    person({ head: [190, 92], neck: [178, 100], hip: [152, 110], arms: [[[186, 118], [200, 112]], [[170, 120], [160, 128]]], legs: [[[140, 138], [118, 141]], [[152, 136], [130, 141]]] }, blue),
    ...arrow('M 66 104 Q 104 40 148 82', [150, 84], 40),
  ],
  /* Blue sitting up on White's belly, knees on the mat either side */
  mount: (blue, white) => [
    person(lying([[[96, 132], [64, 134]], [[98, 126], [66, 124]]], [[[172, 106], [164, 92]], [[186, 108], [192, 94]]]), white),
    person({ head: [152, 52], neck: [150, 68], hip: [146, 110], arms: [[[164, 90], [176, 110]], [[158, 92], [168, 114]]], legs: [[[170, 134], [136, 140]], [[166, 130], [132, 134]]] }, blue),
  ],
  /* both sitting, Blue behind with hooks in and an arm across the chest */
  back: (blue, white) => {
    const behind: Pose = { head: [114, 62], neck: [112, 80], hip: [104, 128], arms: [[[146, 84], [166, 104]], [[134, 114], [162, 112]]], legs: [[[146, 116], [166, 130]], [[140, 122], [160, 138]]] };
    return [
      person(behind, blue),
      person({ head: [158, 76], neck: [152, 92], hip: [140, 132], arms: [[[176, 110], [168, 96]], [[170, 114], [162, 102]]], legs: [[[178, 114], [206, 142]], [[172, 120], [200, 144]]] }, white),
      person(behind, blue, 'limbs'),
    ];
  },
};

/** the picture for a move, Blue in his belt */
export function movePicture(move: Move, blue: Gi, white: Gi = { gi: '#FBFAF6', belt: BELTS.white }): SVGSVGElement {
  const pic = svg('svg', { class: 'bj-pic', viewBox: '0 0 240 160', role: 'img', 'aria-label': move.name.en },
    svg('rect', { x: 0, y: 146, width: 240, height: 14, fill: '#4F7FB8', rx: 4 }));
  pic.append(...POSES[move.id](blue, white));
  return pic;
}
