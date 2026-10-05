/* Kit and Ball Shapes — flat shapes, solid objects and symmetry.
 *
 * Football is full of shapes: the ball is a sphere, a training cone is a
 * cone, the boot box a rectangular prism, the pitch markings rectangles and
 * circles. Kindergarten names the flat shapes; Year 1 counts their sides and
 * corners, finds the shape with so many sides, and names the solid objects.
 *
 * Year 2 adds the pentagon and hexagon (the patches on a ball), and symmetry
 * with a kit: is this shirt the same on both sides of the line? Real kits
 * often are not — the badge sits on one side — which makes it a good
 * question rather than a trick. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { pick } from '../lib/random';
import { SHAPE_STEPS, shapeQuestion, sidesOf, type ShapeQuestion, type ShapeStep } from '../content/maths';
import { mountMaths, type Kit } from './maths-kit';
import { strong } from './teams';
import { svg } from '../ui/writing';

export function mount(root: HTMLElement): () => void {
  return mountMaths<ShapeStep>({
    id: 'kit-shapes',
    title: 'Kit and Ball',
    swash: 'Shapes',
    tagline: 'Circles, cones and hexagons: the shapes of football.',
    steps: SHAPE_STEPS,
    face: '🔷',
    build,
  }, root);
}

/** where a regular shape's corners are, around a centre */
function corners(n: number, r: number, turn: number): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = turn + (i * 2 * Math.PI) / n - Math.PI / 2;
    return [100 + r * Math.cos(a), 100 + r * Math.sin(a)] as [number, number];
  });
}

/** a flat shape, turned a little so it is not always sitting the same way */
function flat(name: string): { node: SVGSVGElement; points: [number, number][] } {
  const g = svg('svg', { class: 'ks-shape', viewBox: '0 0 200 200', role: 'img', 'aria-label': 'a shape' });
  let points: [number, number][] = [];
  const turn = pick([0, 0, Math.PI / 12, -Math.PI / 12]);
  if (name === 'circle') g.append(svg('circle', { cx: 100, cy: 100, r: 78, class: 'ks-fill' }));
  else {
    if (name === 'rectangle') points = pick([[[20, 55], [180, 55], [180, 145], [20, 145]], [[55, 20], [145, 20], [145, 180], [55, 180]]] as [number, number][][]);
    else if (name === 'square') points = corners(4, 84, Math.PI / 4 + (turn ? 0 : 0));
    else points = corners(sidesOf(name), 84, turn);
    g.append(svg('polygon', { points: points.map((p) => p.join(',')).join(' '), class: 'ks-fill' }));
  }
  return { node: g, points };
}

let balls = 0;

/** a solid object, drawn the way it looks on the training ground */
function solid(name: string): SVGSVGElement {
  const g = svg('svg', { class: 'ks-shape', viewBox: '0 0 200 200', role: 'img', 'aria-label': 'an object' });
  const p = (d: string, cls: string): SVGElement => svg('path', { d, class: cls });
  if (name === 'sphere') {
    /* a football: a pentagon patch in the middle, seams out to five more
       patches cut off by the edge, and shading so it reads as round */
    const id = `ks-ball-${balls += 1}`;
    const patch = corners(5, 22, 0);
    const outer = corners(5, 70, Math.PI / 5);
    g.append(
      svg('defs', {},
        svg('radialGradient', { id: `${id}-shade`, cx: '38%', cy: '32%', r: '72%' },
          svg('stop', { offset: '55%', 'stop-color': '#FFFFFF' }), svg('stop', { offset: '100%', 'stop-color': '#B8B0A2' })),
        svg('clipPath', { id: `${id}-clip` }, svg('circle', { cx: 100, cy: 100, r: 76 }))),
      svg('circle', { cx: 100, cy: 100, r: 76, fill: `url(#${id}-shade)` }),
      svg('g', { 'clip-path': `url(#${id}-clip)` },
        ...patch.map(([x, y], i) => svg('line', { x1: x, y1: y, x2: outer[i === 0 ? 4 : i - 1][0], y2: outer[i === 0 ? 4 : i - 1][1], class: 'ks-seam' })),
        ...outer.map(([x, y]) => svg('polygon', { points: corners(5, 20, Math.PI / 5).map(([px, py]) => `${px - 100 + x},${py - 100 + y}`).join(' '), class: 'ks-patch' }))),
      svg('polygon', { points: patch.map((p) => p.join(',')).join(' '), class: 'ks-patch' }),
      svg('circle', { cx: 100, cy: 100, r: 76, class: 'ks-ball-edge' }));
  } else if (name === 'cube') {
    g.append(p('M100 30 L165 62 L100 94 L35 62 Z', 'ks-top'), p('M35 62 L100 94 L100 170 L35 138 Z', 'ks-left'), p('M165 62 L100 94 L100 170 L165 138 Z', 'ks-right'));
  } else if (name === 'rectangular prism') {
    g.append(p('M60 50 L180 50 L150 80 L30 80 Z', 'ks-top'), p('M30 80 L150 80 L150 160 L30 160 Z', 'ks-left'), p('M150 80 L180 50 L180 130 L150 160 Z', 'ks-right'));
  } else if (name === 'cylinder') {
    g.append(p('M55 50 L55 150 A45 16 0 0 0 145 150 L145 50 Z', 'ks-left'), svg('ellipse', { cx: 100, cy: 50, rx: 45, ry: 16, class: 'ks-top' }));
  } else {
    /* a training cone, stripe and all */
    g.append(svg('ellipse', { cx: 100, cy: 165, rx: 62, ry: 16, class: 'ks-base' }),
      p('M100 22 L160 165 A60 16 0 0 1 40 165 Z', 'ks-cone'), p('M77 95 L123 95 L131 115 L69 115 Z', 'ks-stripe'));
  }
  return g;
}

/** a shirt with a line down the middle, its design the same both sides or not */
function shirt(same: boolean, main: string, other: string): { node: SVGSVGElement; why: string } {
  const g = svg('svg', { class: 'ks-shape shirt', viewBox: '0 0 200 200', role: 'img', 'aria-label': 'a football shirt' });
  const body = 'M70 25 L130 25 L180 55 L160 90 L145 80 L145 180 L55 180 L55 80 L40 90 L20 55 Z';
  g.append(svg('path', { d: body, fill: main, class: 'ks-shirt' }));
  const designs = same
    ? [
      { why: 'a stripe down the middle', parts: [svg('rect', { x: 88, y: 25, width: 24, height: 155, fill: other })] },
      { why: 'both sleeves the same', parts: [svg('path', { d: 'M20 55 L40 90 L55 80 L55 45 Z', fill: other }), svg('path', { d: 'M180 55 L160 90 L145 80 L145 45 Z', fill: other })] },
      { why: 'a band across', parts: [svg('rect', { x: 55, y: 95, width: 90, height: 22, fill: other })] },
      { why: 'a star in the middle', parts: [svg('path', { d: 'M100 70 L108 92 L131 92 L113 106 L120 128 L100 115 L80 128 L87 106 L69 92 L92 92 Z', fill: other })] },
    ]
    : [
      { why: 'the badge is only on one side', parts: [svg('circle', { cx: 122, cy: 70, r: 11, fill: other })] },
      { why: 'one sleeve is a different colour', parts: [svg('path', { d: 'M180 55 L160 90 L145 80 L145 45 Z', fill: other })] },
      { why: 'the sash goes across one way', parts: [svg('path', { d: 'M55 80 L55 108 L145 170 L145 142 Z', fill: other })] },
      { why: 'the stripe is only on one side', parts: [svg('rect', { x: 66, y: 25, width: 18, height: 155, fill: other })] },
    ];
  const design = pick(designs);
  g.append(...design.parts, svg('path', { d: body, class: 'ks-outline' }),
    svg('line', { x1: 100, y1: 8, x2: 100, y2: 192, class: 'ks-mirror' }));
  return { node: g, why: design.why };
}

const article = (name: string): string => (/^[aeiou]/.test(name) ? `an ${name}` : `a ${name}`);

const LIKE: Record<string, string> = {
  sphere: 'like a ball', cube: 'like a dice', cylinder: 'like a drink can', cone: 'like a training cone', 'rectangular prism': 'like a boot box',
};

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const board = el('div', { class: 'ks-board' });
  const node = el('div', { class: 'mx-stage' }, ask, board);
  let last: ShapeQuestion | undefined;

  async function finish(ok: boolean, how: string): Promise<boolean> {
    if (ok) {
      sfx.cheer();
      kit.note(`Yes! ${how}`, true);
      say(`Yes! ${how}`);
      await kit.wait(2400);
      return true;
    }
    sfx.wrong();
    kit.note(how);
    say(how);
    await kit.wait(3600);
    return false;
  }

  return {
    node,
    ask: async (step: ShapeStep): Promise<boolean> => {
      const q = shapeQuestion(step, last);
      last = q;
      board.dataset.answer = q.answer;
      let how: string;
      if (step.task === 'name' || step.task === 'sides') {
        const { node: drawn, points } = flat(q.shape);
        board.replaceChildren(drawn);
        const n = sidesOf(q.shape);
        if (step.task === 'name') {
          ask.textContent = 'What shape is this?';
          how = n ? `It's ${article(q.shape)}: ${n} sides.` : `It's a circle: round, with no corners.`;
        } else {
          ask.textContent = `How many ${q.corners ? 'corners' : 'sides'} has this ${q.shape}?`;
          how = `${article(q.shape)[0].toUpperCase()}${article(q.shape).slice(1)} has ${n} sides and ${n} corners.`;
          /* the corners, ready to light up on a miss */
          for (const [x, y] of points) drawn.append(svg('circle', { cx: x, cy: y, r: 9, class: 'ks-corner' }));
        }
      } else if (step.task === 'which') {
        const n = sidesOf(q.shape);
        board.replaceChildren(el('div', { class: 'ks-row' }, ...q.options.map((s) => {
          const f = flat(s).node;
          f.classList.add('small');
          return el('div', { class: 'ks-pick' }, f, el('span', { text: s }));
        })));
        ask.textContent = `Which shape has ${n} sides?`;
        how = `${article(q.shape)[0].toUpperCase()}${article(q.shape).slice(1)} has ${n} sides.`;
      } else if (step.task === 'solid') {
        board.replaceChildren(solid(q.shape));
        ask.textContent = 'What is this solid shape called?';
        how = `It's ${article(q.shape)}, ${LIKE[q.shape]}.`;
      } else {
        const us = kit.us();
        /* his team's kit: the colour that shows on cream, the other for the design */
        const main = strong(us);
        const drawn = shirt(q.same, main, us.colours.find((c) => c !== main) ?? '#FFFFFF');
        board.replaceChildren(drawn.node);
        ask.textContent = 'Is this shirt the same on both sides of the line?';
        how = q.same ? `Yes: ${drawn.why}, so both halves match, like a mirror.` : `No: ${drawn.why}.`;
      }
      say(ask.textContent);
      const picked = await kit.choices.askWords(q.options);
      kit.choices.revealWord(q.answer, picked);
      if (picked !== q.answer) board.classList.add('explain');
      const ok = await finish(picked === q.answer, how);
      board.classList.remove('explain');
      return ok;
    },
  };
}
