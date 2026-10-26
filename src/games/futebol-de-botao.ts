/* Futebol de Botão — pull back a button, let go, and score in three touches.
 *
 * The Brazilian table game. The players are buttons in his team's colours,
 * with the flag on for a country; the other side's are in the rival's, and
 * their goleiro is a block in front of the goal.
 *
 * He puts a finger on one of his buttons and pulls back, as the palheta
 * presses on its edge: an arrow shows which way it will go and how hard. He
 * lets go and it slides. The pull counts from where his finger came down,
 * so a finger resting on a button, anywhere on it, sends nothing anywhere.
 * The ball goes off along the line through the middle of the button and the
 * middle of the ball, so to send it at the goal he hits it on its far side
 * from the goal. That is the lesson of the first steps, where the ball's way
 * shows while he aims. Then it shows only a little way, then not at all;
 * there is a wall to play it off, a pass to make first, and a whole team in
 * the way.
 *
 * While he aims, on the steps with a guide, the angles are drawn where his
 * button would send the ball off the side of the table, in degrees: the
 * angle between its way and the wall going in, and the same angle coming
 * off. Sent straight at the wall, it comes straight back, and that right
 * angle gets the square mark for 90°. Only that first bounce, and only when
 * nothing else touches the ball on its way there (shownBounce, botao.ts).
 * After his shot its angles are said in the sentence above the table, and
 * nothing is left drawn on it: a line and angles there with no button in
 * his hand would look like the guide come on by itself. Show me a way draws
 * them, before each flick and after it.
 *
 * Three touches, as in the regra carioca, and before the third the ball has
 * to go to another of his buttons. A goal is shouted by the commentator. If
 * the touches run out, or he asks, the table is set back and a way to score
 * is played for him, with the spot his button has to hit drawn on it. All
 * the physics is in src/content/botao.ts. */

import tray from '../assets/botao/tray.webp';
import { crestOf } from '../lib/crests';
import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { svg } from '../ui/writing';
import {
  BALL, BOTAO_STEPS, HOW, KEEPER_W, KEEPER_Y, L, MARKS, MOUTH, NET, POST, R, TOUCHES, VIEW, W,
  angles, botaoQuestion, bounceWords, flickFor, keeperFor, mayFlick, shownBounce, simulate,
  type Bounce, type BotaoStep, type Flick, type Point, type Shot, type Table,
} from '../content/botao';
import { mountMaths, type Kit } from './maths-kit';
import { narrate } from './narration';
import type { Team } from './teams';

export function mount(root: HTMLElement): () => void {
  return mountMaths<BotaoStep>({
    id: 'futebol-de-botao',
    title: 'Futebol de',
    swash: 'Botão',
    tagline: 'Pull back one of your buttons and let go. Three touches to score!',
    steps: BOTAO_STEPS,
    face: '🔘',
    football: true,
    cheer: 'Good game!',
    counts: 'Goals',
    unit: 'Attack',
    build,
  }, root);
}

/* ── drawing the table ─────────────────────────────────────────────────── */

const at = (g: SVGGraphicsElement, p: Point): void => g.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);

/* The light comes from the top left, so things shine up there and throw
   their shadows down and to the right. Nothing here is more than shapes and
   gradients: no filters, so sixty frames a second stay cheap on an iPad. */
const SHADOW = { x: 0.55, y: 0.85 } as const;
/** how high the crossbar stands, as it looks from in front and above */
const LIFT = 1.9;
/** how much narrower the back of the net looks each side, being further away */
const GOAL_BACK = 1.2;
/** how far a button's side shows below its top */
const DEPTH = 0.7;

/** the shading laid over the table, the buttons, the ball and the goal: a
    highlight and a shade on top of any colour, so one set serves every team */
function shading(): SVGDefsElement {
  type Stop = [offset: number, colour: string, opacity: number];
  const stops = (...s: Stop[]): SVGElement[] => s.map(([o, c, a]) => svg('stop', { offset: `${o}%`, 'stop-color': c, 'stop-opacity': a }));
  const radial = (id: string, ...s: Stop[]): SVGElement => svg('radialGradient', { id, cx: '35%', cy: '30%', r: '75%' }, ...stops(...s));
  const linear = (id: string, to: [number, number], ...s: Stop[]): SVGElement =>
    svg('linearGradient', { id, x1: 0, y1: 0, x2: to[0], y2: to[1] }, ...stops(...s));
  return svg('defs', {},
    /* a button's face: a shine on the top left, darker towards the edge */
    radial('bt-shine', [0, '#fff', 0.6], [30, '#fff', 0.14], [65, '#fff', 0], [100, '#000', 0.3]),
    /* its rim: lit on the top left, in its own shade on the bottom right */
    linear('bt-bevel', [1, 1], [0, '#fff', 0.55], [42, '#fff', 0], [58, '#000', 0], [100, '#000', 0.5]),
    radial('bt-ballshade', [0, '#fff', 1], [50, '#f2f2f2', 1], [100, '#8c8c8c', 1]),
    /* the felt, lit in the middle and darker towards the rim */
    svg('radialGradient', { id: 'bt-feltlight', cx: '50%', cy: '42%', r: '72%' }, ...stops([0, '#fff', 0.12], [55, '#fff', 0], [100, '#000', 0.12])),
    /* the rim's shadow on the felt, along the top and down the left */
    linear('bt-rimdown', [0, 1], [0, '#000', 0.4], [100, '#000', 0]),
    linear('bt-rimright', [1, 0], [0, '#000', 0.4], [100, '#000', 0]),
    /* inside the net, darker towards the back */
    linear('bt-netdepth', [0, 1], [0, '#000', 0.5], [100, '#000', 0.12]),
    /* the goleiro's block, lit on top */
    linear('bt-blockshade', [0, 1], [0, '#fff', 0.45], [45, '#fff', 0], [100, '#000', 0.4]),
    /* a crest, cut to the button's face */
    svg('clipPath', { id: 'bt-crest-clip' }, svg('circle', { r: R * 0.72 })),
  );
}

/** a button's face, inside its rim */
const FACE = R * 0.72;

/** a button, raised off the felt: its shadow, its side showing below it,
    the rim in a team's second colour with a bevel, the face in its first
    with a shine, and on top the crest a grown-up added for the team
    (src/lib/crests.ts), or its flag. Its top is where the physics has it */
function button(team: Team, cls: string): SVGGElement {
  const crest = crestOf(team.id);
  const g = svg('g', { class: `bt-btn ${cls}` },
    svg('circle', { r: R, cx: SHADOW.x, cy: SHADOW.y + DEPTH, class: 'bt-shadow' }),
    svg('circle', { r: R, cy: DEPTH, fill: team.colours[1], class: 'bt-side' }),
    svg('circle', { r: R, cy: DEPTH, class: 'bt-side-shade' }),
    svg('circle', { r: R, fill: team.colours[1], class: 'bt-rim' }),
    svg('circle', { r: R - 0.2, class: 'bt-bevel' }),
    svg('circle', { r: FACE, fill: team.colours[0], class: 'bt-face' }),
    /* the crest like the sticker on a real botão: cut to a circle, under the shine */
    crest ? svg('image', { href: crest, x: -FACE, y: -FACE, width: 2 * FACE, height: 2 * FACE, preserveAspectRatio: 'xMidYMid slice', 'clip-path': 'url(#bt-crest-clip)', class: 'bt-crest' }) : null,
    svg('circle', { r: FACE, class: 'bt-shine' }));
  if (!crest && team.flag) {
    const flag = svg('text', { class: 'bt-flag', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 4.6 });
    flag.textContent = team.flag;
    g.append(flag);
  }
  return g;
}

/** the table and the inside of the goal: everything the ball rolls over */
/** the inside of a goal, as a box seen from in front, drawn at the top: its
    back is further away, so a little narrower, and its sides show as slivers */
function goalNet(): SVGGElement {
  const [left, right] = MOUTH;
  const [backL, backR] = [left + GOAL_BACK, right - GOAL_BACK];
  /* x across the box at depth y, from the front (0) to the back (−NET), k from 0 to 1 across */
  const across = (k: number, y: number): number => {
    const d = -y / NET;
    return left + (backL - left) * d + ((right - left) - (2 * GOAL_BACK) * d) * k;
  };
  const net = svg('g', { class: 'bt-net' },
    svg('rect', { x: left, y: -NET, width: right - left, height: NET, class: 'bt-net-turf' }),
    svg('rect', { x: left, y: -NET, width: right - left, height: NET, class: 'bt-net-floor' }),
    svg('path', { class: 'bt-net-side', d: `M${left} 0 L${left} ${-NET} L${backL} ${-NET} Z M${right} 0 L${right} ${-NET} L${backR} ${-NET} Z` }));
  const cells = 11;
  for (let i = 1; i < cells; i += 1) {
    const k = i / cells;
    net.append(svg('line', { x1: across(k, 0), y1: 0, x2: across(k, -NET), y2: -NET }));
  }
  for (let y = -NET + 1.25; y < 0; y += 1.25) net.append(svg('line', { x1: across(0, y), y1: y, x2: across(1, y), y2: y }));
  net.append(
    svg('path', { class: 'bt-net-edge', d: `M${left} 0 L${backL} ${-NET} L${backR} ${-NET} L${right} 0` }),
    svg('line', { class: 'bt-backbar', x1: backL, y1: -NET, x2: backR, y2: -NET }));
  return net;
}

function pitch(): SVGGElement {
  const line = (attrs: Record<string, string | number>): SVGElement => svg('rect', { ...attrs, class: 'bt-line' });
  const [left, right] = MOUTH;
  const net = goalNet();
  net.classList.add('ours');
  /* his own goal at the bottom, the top one turned round: he always attacks
     the top, but this one is open too, and a ball that goes in is an own goal */
  const theirs = svg('g', { class: 'bt-goal-far', transform: FAR }, goalNet());
  /* mown stripes across the felt and down it, so it is mown in squares */
  const stripes = [
    ...Array.from({ length: 5 }, (_, i) => svg('rect', { x: 0, y: (2 * i + 1) * (L / 10), width: W, height: L / 10, class: 'bt-stripe' })),
    ...Array.from({ length: 3 }, (_, i) => svg('rect', { x: (2 * i + 1) * (W / 6), y: 0, width: W / 6, height: L, class: 'bt-stripe down' })),
  ];
  return svg('g', {},
    /* the wooden tray, the handoff's picture of it, its felt under ours (VIEW, botao.ts) */
    svg('image', { href: tray, x: VIEW.x, y: VIEW.y, width: VIEW.w, height: VIEW.h, preserveAspectRatio: 'none', class: 'bt-tray' }),
    svg('rect', { x: 0, y: 0, width: W, height: L, class: 'bt-felt' }),
    ...stripes,
    svg('rect', { x: 0, y: 0, width: W, height: L, fill: 'url(#bt-feltlight)' }),
    svg('rect', { x: 0, y: 0, width: W, height: 2.4, fill: 'url(#bt-rimdown)' }),
    svg('rect', { x: 0, y: 0, width: 2.4, height: L, fill: 'url(#bt-rimright)' }),
    net,
    theirs,
    line({ x: 0.6, y: 0.6, width: W - 1.2, height: L - 1.2 }),
    ...ends(),
    svg('line', { x1: 0.6, y1: L / 2, x2: W - 0.6, y2: L / 2, class: 'bt-line' }),
    svg('circle', { cx: W / 2, cy: L / 2, r: 8, class: 'bt-line' }),
    svg('circle', { cx: W / 2, cy: L / 2, r: 0.6, class: 'bt-spot' }),
    /* the frame's shadow on the felt in front of the goal */
    svg('path', { class: 'bt-goal-shadow', d: `M${left + SHADOW.x} ${SHADOW.y} L${right + SHADOW.x} ${SHADOW.y}` }),
  );
}

/** the markings at each end: the penalty area with the arc on its edge, the
    small area, the spot, and the quarter circles in the corners */
function ends(): SVGElement[] {
  const edge = 0.6;
  const [boxW, boxD] = MARKS.box;
  const [penW, penD] = MARKS.penalty;
  const { spot, arc } = MARKS;
  /* where the arc round the spot meets the penalty area's edge */
  const half = Math.sqrt(arc * arc - (penD - spot) ** 2);
  const corner = 1.6;
  return [0, 1].flatMap((end) => {
    /* the top end as drawn, and the bottom one turned round */
    const y = (d: number): number => (end === 0 ? edge + d : L - edge - d);
    const sweep = end === 0 ? 0 : 1;
    return [
      svg('rect', { class: 'bt-line', x: (W - penW) / 2, y: Math.min(y(0), y(penD)), width: penW, height: penD }),
      svg('rect', { class: 'bt-line', x: (W - boxW) / 2, y: Math.min(y(0), y(boxD)), width: boxW, height: boxD }),
      svg('circle', { class: 'bt-spot', cx: W / 2, cy: y(spot), r: 0.6 }),
      svg('path', { class: 'bt-line', d: `M${W / 2 - half} ${y(penD)} A${arc} ${arc} 0 0 ${sweep} ${W / 2 + half} ${y(penD)}` }),
      svg('path', { class: 'bt-line', d: `M${edge + corner} ${y(0)} A${corner} ${corner} 0 0 ${1 - sweep} ${edge} ${y(corner)}` }),
      svg('path', { class: 'bt-line', d: `M${W - edge - corner} ${y(0)} A${corner} ${corner} 0 0 ${sweep} ${W - edge} ${y(corner)}` }),
    ];
  });
}

/** the far end, drawn as the top one turned round */
const FAR = `translate(0 ${L}) scale(1 -1)`;

/** the goal's frame: the uprights standing on the line, their round feet
    where the ball hits a post, and the crossbar across their tops. Drawn
    over the ball, so a ball in the net is behind the crossbar */
function goalFrame(): SVGGElement {
  const [left, right] = MOUTH;
  return svg('g', { class: 'bt-goal' },
    ...MOUTH.map((x) => svg('line', { x1: x, y1: 0, x2: x, y2: -LIFT, class: 'bt-upright', 'stroke-width': 2 * POST })),
    svg('line', { x1: left, y1: -LIFT, x2: right, y2: -LIFT, class: 'bt-crossbar' }),
    svg('line', { x1: left, y1: -LIFT - 0.25, x2: right, y2: -LIFT - 0.25, class: 'bt-crossbar-shine' }),
  );
}

/* ── the game ──────────────────────────────────────────────────────────── */

function build(kit: Kit) {
  const tell = el('p', { class: 'mx-ask bt-tell' });
  const pips = el('span', { class: 'bt-pips', role: 'img' });
  const touchesEl = el('p', { class: 'bt-touches' }, el('span', { text: 'Touches' }), pips);
  const board = svg('svg', {
    class: 'bt-table', viewBox: `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`, role: 'img',
    'aria-label': 'The table: your buttons, the ball, and the goal at the top',
  });
  const path = svg('polyline', { class: 'bt-path' });
  const trail = svg('polyline', { class: 'bt-trail' });
  const band = svg('line', { class: 'bt-band' });
  const arrow = svg('polygon', { class: 'bt-arrow' });
  const ghost = svg('circle', { r: R, class: 'bt-ghost' });
  /* drawn round x = 0 and moved by a transform, so it can slide across: a
     block with its shadow, lit on top */
  const block = { x: -KEEPER_W / 2, y: KEEPER_Y[0], width: KEEPER_W, height: KEEPER_Y[1] - KEEPER_Y[0], rx: 0.8 };
  const keeperBlock = svg('rect', { ...block, class: 'bt-keeper-block' });
  const keeperEl = svg('g', { class: 'bt-keeper' },
    svg('rect', { ...block, x: block.x + SHADOW.x, y: block.y + SHADOW.y, class: 'bt-shadow' }),
    keeperBlock,
    svg('rect', { ...block, class: 'bt-keeper-shine' }));
  const ballEl = svg('g', { class: 'bt-ball' },
    svg('circle', { r: BALL, cx: SHADOW.x * 0.6, cy: SHADOW.y * 0.6, class: 'bt-shadow' }),
    svg('circle', { r: BALL, class: 'bt-ball-face' }));
  const discs = svg('g', {});
  /* the angles the ball comes off the rim at */
  const marks = svg('g', { class: 'bt-marks' });
  const field = pitch();
  board.append(shading(), field, trail, path, ghost, keeperEl, discs, ballEl,
    goalFrame(), svg('g', { class: 'bt-goal-far', transform: FAR }, goalFrame()), marks, band, arrow);
  /* a net shakes when the ball goes in */
  const bulge = (net: Element): void => {
    net.classList.remove('bulge');
    void net.getBoundingClientRect();
    net.classList.add('bulge');
    kit.life.later(() => net.classList.remove('bulge'), 900);
  };
  const ourNet = field.querySelector('.bt-net.ours')!;
  const ownNet = field.querySelector('.bt-goal-far .bt-net')!;
  const showMe = el('button', { class: 'btn ghost small', type: 'button', text: '👀 Show me a way' }) as HTMLButtonElement;
  /* the table's shape, for its size on the screen (games.css) */
  const wrap = el('div', { class: 'bt-wrap', vars: { '--bt-shape': String(VIEW.w / VIEW.h) } }, board);
  const node = el('div', { class: 'mx-stage bt-stage' }, tell, touchesEl, wrap, showMe);

  let ours: SVGGElement[] = [];
  let theirs: SVGGElement[] = [];

  function setUp(t: Table): void {
    ours = t.us.map((_, i) => button(kit.us(), `us b${i}`));
    theirs = t.them.map(() => button(kit.rival(), 'them'));
    discs.replaceChildren(...theirs, ...ours);
    keeperBlock.setAttribute('fill', kit.rival().colours[0]);
  }

  /** everything where it is now */
  function draw(t: Table): void {
    at(ballEl, t.ball);
    t.us.forEach((p, i) => { at(ours[i], p); ours[i].dataset.x = p.x.toFixed(3); ours[i].dataset.y = p.y.toFixed(3); });
    t.them.forEach((p, i) => at(theirs[i], p));
    keeperEl.toggleAttribute('hidden', t.keeper === null);
    if (t.keeper !== null) keeperEl.style.transform = `translateX(${t.keeper.toFixed(2)}px)`;
    keeperEl.dataset.x = t.keeper === null ? '' : t.keeper.toFixed(2);
  }

  /** one frame of a shot */
  function frame(t: Table, f: Point[]): void {
    draw({ ...t, ball: f[0], us: f.slice(1, 1 + t.us.length), them: f.slice(1 + t.us.length) });
  }

  /** the shot, played out sixty times a second; noises when the ball is hit */
  function play(t: Table, shot: Shot): Promise<void> {
    return new Promise((done) => {
      const start = performance.now();
      let heard = 0;
      let netted = false;
      const tick = (): void => {
        const i = Math.min(shot.frames.length - 1, Math.floor((performance.now() - start) / (1000 / 60)));
        frame(t, shot.frames[i]);
        if (shot.goal && !netted && shot.frames[i][0].y + BALL < 0) { netted = true; bulge(ourNet); }
        if (shot.own && !netted && shot.frames[i][0].y - BALL > L) { netted = true; bulge(ownNet); }
        for (; heard < shot.bumps.length && shot.bumps[heard].frame <= i; heard += 1) {
          const what = shot.bumps[heard].what;
          if (what === 'touch') sfx.clack();
          else if (what === 'post') sfx.post();
          else sfx.tap();
        }
        if (i >= shot.frames.length - 1) { done(); return; }
        kit.life.later(tick, 16);
      };
      tick();
    });
  }

  const line = (pts: Point[]): string => pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const clearAim = (): void => {
    for (const n of [path, trail, arrow]) n.setAttribute('points', '');
    for (const k of ['x1', 'y1', 'x2', 'y2']) band.setAttribute(k, '0');
    marks.replaceChildren();
    board.classList.remove('aiming');
  };

  /**
   * Where the ball came off the rim: the wall, and on each side the angle
   * between the ball's way and the wall, as a wedge with its degrees. Only
   * a ball sent straight at the wall makes a right angle with it, and that
   * one gets the square mark for 90° instead of a wedge.
   */
  function drawBounces(bounces: readonly Bounce[]): void {
    const unit = (v: Point): Point => { const l = Math.sqrt(v.x * v.x + v.y * v.y) || 1; return { x: v.x / l, y: v.y / l }; };
    marks.replaceChildren(...bounces.flatMap((b) => {
      const { at: p, normal: n } = b;
      const pt = (...parts: [Point, number][]): string => {
        const q = parts.reduce((s, [v, k]) => ({ x: s.x + v.x * k, y: s.y + v.y * k }), p);
        return `${q.x.toFixed(2)} ${q.y.toFixed(2)}`;
      };
      const label = (where: Point, text: string): SVGElement => {
        const t = svg('text', { class: 'bt-deg', x: where.x.toFixed(2), y: where.y.toFixed(2), 'font-size': 3.6, 'text-anchor': 'middle', 'dominant-baseline': 'central' });
        t.textContent = text;
        return t;
      };
      /* along the wall, and the side of it each of the ball's ways is on */
      const wall = { x: n.y, y: -n.x };
      const rays = [unit({ x: -b.into.x, y: -b.into.y }), unit(b.out)];
      const sideOf = (r: Point): Point => (r.x * wall.x + r.y * wall.y < 0 ? { x: -wall.x, y: -wall.y } : wall);
      const [into, out] = angles(b);
      const wallMark = svg('path', { class: 'bt-wall-mark', d: `M${pt([wall, -10])} L${pt([wall, 10])}` });
      if (into === 90 && out === 90) {
        /* the ball's own way is the line square to the wall */
        const S = 2.6;
        const by = unit({ x: wall.x + n.x, y: wall.y + n.y });
        return [wallMark,
          svg('path', { class: 'bt-right', d: `M${pt()} L${pt([wall, S])} L${pt([wall, S], [n, S])} L${pt([n, S])} Z` }),
          label({ x: p.x + by.x * 6.4, y: p.y + by.y * 6.4 }, '90°')];
      }
      const RHO = 7;
      const wedges: SVGElement[] = [];
      const labels: SVGElement[] = [];
      for (const [i, r] of rays.entries()) {
        const side = sideOf(r);
        const sweep = side.x * r.y - side.y * r.x > 0 ? 1 : 0;
        wedges.push(svg('path', { class: 'bt-arc', d: `M${pt()} L${pt([side, RHO])} A${RHO} ${RHO} 0 0 ${sweep} ${pt([r, RHO])} Z` }));
        const by = unit({ x: side.x + r.x, y: side.y + r.y });
        labels.push(label({ x: p.x + by.x * (RHO + 3.6), y: p.y + by.y * (RHO + 3.6) }, `${i === 0 ? into : out}°`));
      }
      return [wallMark, ...wedges, ...labels];
    }));
  }

  /** the way the ball went in a shot, up to a frame */
  const wayOf = (shot: Shot, upTo = shot.frames.length - 1): Point[] => {
    const way: Point[] = [];
    for (const fr of shot.frames.slice(0, upTo + 1)) {
      const last = way.at(-1);
      if (!last || last.x !== fr[0].x || last.y !== fr[0].y) way.push(fr[0]);
    }
    return way;
  };

  /** after a flick in Show me a way that sent the ball off the rim: where
      the ball went, and the angles it came off at (shownBounce, botao.ts,
      says which bounce that is) */
  function showBounces(shot: Shot, button: number): Bounce | null {
    const bounce = shownBounce(shot, button);
    if (!bounce) return null;
    path.setAttribute('points', line(wayOf(shot)));
    drawBounces([bounce]);
    return bounce;
  }

  /** the arrow from a button: which way, and how hard */
  function drawArrow(from: Point, f: Flick): void {
    const s = Math.sqrt(f.vx * f.vx + f.vy * f.vy) || 1;
    const [ux, uy] = [f.vx / s, f.vy / s];
    const long = R + 2 + (s / 130) * 16;
    const tip = { x: from.x + ux * long, y: from.y + uy * long };
    const back = { x: tip.x - ux * 3.2, y: tip.y - uy * 3.2 };
    const side = { x: -uy * 2, y: ux * 2 };
    arrow.setAttribute('points', line([
      { x: from.x + ux * R - side.x * 0.35, y: from.y + uy * R - side.y * 0.35 },
      { x: back.x - side.x * 0.35, y: back.y - side.y * 0.35 },
      { x: back.x - side.x, y: back.y - side.y }, tip, { x: back.x + side.x, y: back.y + side.y },
      { x: back.x + side.x * 0.35, y: back.y + side.y * 0.35 },
      { x: from.x + ux * R + side.x * 0.35, y: from.y + uy * R + side.y * 0.35 },
    ]));
  }

  /** where the ball would go: all the way, or only the start of it, with the
      angles it would come off the rim at. The short way still goes as far
      as the wall when his button would send the ball straight there, so
      those angles are on show while he aims, and change as he does; it
      never runs on past another button, a post or the goleiro */
  function drawGuide(t: Table, f: Flick, guide: BotaoStep['guide']): void {
    if (guide === 'none') { path.setAttribute('points', ''); trail.setAttribute('points', ''); marks.replaceChildren(); return; }
    const shot = simulate(t, f);
    const wall = shownBounce(shot, f.button);
    let shown = shot.frames.length - 1;
    if (guide === 'short') {
      let gone = 0;
      for (const [i, fr] of shot.frames.entries()) {
        const prev = shot.frames[i - 1]?.[0];
        if (prev) gone += Math.sqrt((fr[0].x - prev.x) ** 2 + (fr[0].y - prev.y) ** 2);
        if (gone > 16) { shown = i - 1; break; }
      }
      if (wall) shown = Math.max(shown, wall.frame);
    }
    const ballWay = wayOf(shot, shown);
    path.setAttribute('points', ballWay.length > 1 ? line(ballWay) : '');
    drawBounces(wall && wall.frame <= shown ? [wall] : []);
    /* his button's own way, faint, until it reaches the ball */
    const mine = shot.frames.map((fr) => fr[1 + f.button]);
    const hit = shot.bumps.find((b) => b.what === 'touch');
    trail.setAttribute('points', line(mine.slice(0, hit ? hit.frame + 1 : mine.length)));
  }

  function setPips(used: number, tired: number | null): void {
    pips.replaceChildren(...Array.from({ length: TOUCHES }, (_, i) => el('span', { class: `bt-pip${i < used ? ' used' : ''}` })));
    pips.setAttribute('aria-label', `${used} of ${TOUCHES} touches used`);
    node.dataset.touches = String(used);
    ours.forEach((g, i) => g.classList.toggle('tired', i === tired));
  }

  /* the finger: the button it came down on, and where it came down. The
     pull is how far it has moved since, not how far it is from the middle
     of the button: a finger resting anywhere on the button is no pull,
     and lifting it is no flick */
  let drag: { button: number; pointer: number; from: Point } | null = null;
  const pullOf = (e: PointerEvent, from: Point): Point => { const p = toTable(e); return { x: p.x - from.x, y: p.y - from.y }; };
  /** a pull too small to see is no pull */
  const tiny = (pull: Point): boolean => Math.sqrt(pull.x * pull.x + pull.y * pull.y) < 1.5;
  const toTable = (e: PointerEvent): Point => {
    const box = board.getBoundingClientRect();
    return { x: VIEW.x + ((e.clientX - box.left) / box.width) * VIEW.w, y: VIEW.y + ((e.clientY - box.top) / box.height) * VIEW.h };
  };
  /* set for each attack */
  let onDown: (e: PointerEvent) => void = () => undefined;
  let onMove: (e: PointerEvent) => void = () => undefined;
  let onUp: (e: PointerEvent) => void = () => undefined;
  board.addEventListener('pointerdown', (e) => onDown(e));
  board.addEventListener('pointermove', (e) => onMove(e));
  board.addEventListener('pointerup', (e) => onUp(e));
  board.addEventListener('pointercancel', () => { drag = null; clearAim(); });

  return {
    node,
    ask: (step: BotaoStep): Promise<boolean> => new Promise((resolve) => {
      const q = botaoQuestion(step);
      let table: Table = { ...q.table, us: [...q.table.us], them: [...q.table.them] };
      const touches: number[] = [];
      let busy = false;
      let finished = false;
      setUp(table);
      draw(table);
      clearAim();
      ghost.setAttribute('hidden', '');
      setPips(0, null);
      tell.textContent = step.tell;
      node.dataset.plan = JSON.stringify(q.plan.flicks);
      node.dataset.kind = q.plan.kind;
      node.dataset.guide = step.guide;
      delete node.dataset.goal;
      showMe.disabled = false;
      say(step.tell);

      const end = async (ok: boolean): Promise<void> => {
        finished = true;
        showMe.disabled = true;
        await kit.wait(ok ? 2600 : 1200);
        resolve(ok);
      };

      /** the way to score, played from the start */
      const demo = async (why: string): Promise<void> => {
        busy = true;
        showMe.disabled = true;
        kit.note(`${why} Watch: here is one way.`);
        say(`${why} Watch.`);
        await kit.wait(1400);
        let t: Table = q.table;
        draw(t);
        clearAim();
        setPips(0, null);
        /* the bounce whose angles are on the table at the end, if the last
           flick made one: the words say what the picture shows */
        let last: Bounce | null = null;
        for (const f of q.plan.flicks) {
          /* the spot his button meets the ball */
          const shot = simulate(t, f);
          const meet = shot.bumps.find((b) => b.what === 'touch' && b.who === f.button);
          const spot = meet ? shot.frames[meet.frame][1 + f.button] : t.us[f.button];
          ghost.setAttribute('cx', spot.x.toFixed(2));
          ghost.setAttribute('cy', spot.y.toFixed(2));
          ghost.removeAttribute('hidden');
          drawArrow(t.us[f.button], f);
          drawGuide(t, f, 'full');
          await kit.wait(1600);
          clearAim();
          ghost.setAttribute('hidden', '');
          await play(t, shot);
          last = showBounces(shot, f.button);
          t = { ...shot.end, keeper: keeperFor(step.keeper, shot.end.ball) };
          draw(t);
          if (shot.goal) node.dataset.goal = 'shown';
          await kit.wait(500);
        }
        /* the angles are on the screen only: a sentence with a number in it
           is not one of the recordings */
        kit.note(last ? `${HOW[q.plan.kind]} ${bounceWords(last)}` : HOW[q.plan.kind]);
        say(HOW[q.plan.kind]);
        await kit.wait(3200);
        void end(false);
      };
      showMe.onclick = () => { if (!busy && !finished) void demo('Stuck?'); };

      const flick = async (f: Flick): Promise<void> => {
        busy = true;
        showMe.disabled = true;
        const shot = simulate(table, f);
        touches.push(f.button);
        setPips(touches.length, null);
        await play(table, shot);
        /* its angles in words only: drawn, they would stay on the table
           with nothing in his hand, and look like the guide */
        const bounce = shownBounce(shot, f.button);
        const off = bounce ? ` ${bounceWords(bounce)}` : '';
        table = { ...shot.end, keeper: keeperFor(step.keeper, shot.end.ball) };
        if (shot.own) { void demo('Own goal! That one went into your own net.'); return; }
        if (shot.goal) {
          node.dataset.goal = 'scored';
          sfx.cheer();
          kit.note(`GOL! ${touches.length === 1 ? 'In one touch!' : `In ${touches.length} touches.`}${off}`, true);
          narrate('goal', kit.us(), () => undefined, kit.life.later);
          void end(true);
          return;
        }
        const bumped = shot.bumps.map((b) => b.what);
        const what = !shot.touched ? 'You missed the ball.'
          : bumped.includes('keeper') ? 'The goleiro saved it!'
            : bumped.includes('post') ? 'Off the post!'
              : bumped.includes('block') ? 'A defender blocked it.' : 'Good touch.';
        if (bumped.includes('keeper')) narrate('save', kit.rival(), () => undefined, kit.life.later);
        if (touches.length >= TOUCHES) { void demo(`${what} No touches left.`); return; }
        /* the goleiro gets ready for where the ball is now */
        keeperEl.classList.add('moving');
        draw(table);
        kit.life.later(() => keeperEl.classList.remove('moving'), 400);
        const tired = touches.length === 2 && touches[0] === touches[1] ? touches[0] : null;
        setPips(touches.length, tired);
        const left = TOUCHES - touches.length;
        kit.note(`${what}${off} ${left} ${left === 1 ? 'touch' : 'touches'} left.${tired === null ? '' : ' The last one has to be another button: pass!'}`);
        busy = false;
        showMe.disabled = false;
      };

      onDown = (e) => {
        if (busy || finished || drag) return;
        const p = toTable(e);
        /* the nearest of his buttons, with some room round it for a small finger */
        let best = -1;
        let near = R + 3;
        table.us.forEach((b, i) => {
          const d = Math.sqrt((b.x - p.x) ** 2 + (b.y - p.y) ** 2);
          if (d < near) { near = d; best = i; }
        });
        if (best < 0) return;
        e.preventDefault();
        if (!mayFlick(touches, best)) {
          sfx.wrong();
          kit.note('That button has had two touches. Use another one!');
          return;
        }
        drag = { button: best, pointer: e.pointerId, from: p };
        try { board.setPointerCapture(e.pointerId); } catch { /* the drag still works inside the table */ }
        /* the guide starts afresh with each aim */
        clearAim();
        board.classList.add('aiming');
      };
      onMove = (e) => {
        if (!drag || e.pointerId !== drag.pointer) return;
        const pull = pullOf(e, drag.from);
        const at = table.us[drag.button];
        /* the band from the button, as far back as he has pulled */
        band.setAttribute('x1', at.x.toFixed(2)); band.setAttribute('y1', at.y.toFixed(2));
        band.setAttribute('x2', (at.x + pull.x).toFixed(2)); band.setAttribute('y2', (at.y + pull.y).toFixed(2));
        if (tiny(pull)) { arrow.setAttribute('points', ''); path.setAttribute('points', ''); trail.setAttribute('points', ''); marks.replaceChildren(); return; }
        const f = flickFor(drag.button, pull.x, pull.y);
        drawArrow(at, f);
        drawGuide(table, f, step.guide);
      };
      onUp = (e) => {
        if (!drag || e.pointerId !== drag.pointer) return;
        const pull = pullOf(e, drag.from);
        const which = drag.button;
        drag = null;
        clearAim();
        /* a tap, or a pull too small to see, is not a flick */
        if (tiny(pull)) return;
        void flick(flickFor(which, pull.x, pull.y));
      };
    }),
  };
}
