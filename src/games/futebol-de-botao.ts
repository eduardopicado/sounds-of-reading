/* Futebol de Botão — pull back a button, let go, and score in three touches.
 *
 * The Brazilian table game. The players are buttons in his team's colours,
 * with the flag on for a country; the other side's are in the rival's, and
 * their goleiro is a block in front of the goal.
 *
 * He puts a finger on one of his buttons and pulls back, as the palheta
 * presses on its edge: an arrow shows which way it will go and how hard. He
 * lets go and it slides. The ball goes off along the line through the middle
 * of the button and the middle of the ball, so to send it at the goal he
 * hits it on its far side from the goal. That is the lesson of the first
 * steps, where the ball's way shows while he aims. Then it shows only a
 * little way, then not at all; there is a wall to play it off, a pass to
 * make first, and a whole team in the way.
 *
 * Three touches, as in the regra carioca, and before the third the ball has
 * to go to another of his buttons. A goal is shouted by the commentator. If
 * the touches run out, or he asks, the table is set back and a way to score
 * is played for him, with the spot his button has to hit drawn on it. All
 * the physics is in src/content/botao.ts. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { svg } from '../ui/writing';
import {
  BALL, BOTAO_STEPS, HOW, KEEPER_W, KEEPER_Y, L, MOUTH, NET, POST, R, TOUCHES, VIEW, W,
  botaoQuestion, flickFor, keeperFor, mayFlick, simulate,
  type BotaoStep, type Flick, type Point, type Shot, type Table,
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

/** a button: the rim in a team's second colour, the face in its first, the flag on top */
function button(team: Team, cls: string): SVGGElement {
  const g = svg('g', { class: `bt-btn ${cls}` },
    svg('circle', { r: R, fill: team.colours[1], class: 'bt-rim' }),
    svg('circle', { r: R * 0.72, fill: team.colours[0] }));
  if (team.flag) {
    const flag = svg('text', { class: 'bt-flag', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 4.6 });
    flag.textContent = team.flag;
    g.append(flag);
  }
  return g;
}

function pitch(): SVGGElement {
  const line = (attrs: Record<string, string | number>): SVGElement => svg('rect', { ...attrs, class: 'bt-line' });
  const net = svg('g', { class: 'bt-net' },
    svg('rect', { x: MOUTH[0], y: -NET, width: MOUTH[1] - MOUTH[0], height: NET }));
  for (let x = MOUTH[0] + 2; x < MOUTH[1]; x += 2) net.append(svg('line', { x1: x, y1: -NET, x2: x, y2: 0 }));
  for (let y = -NET + 1.5; y < 0; y += 1.5) net.append(svg('line', { x1: MOUTH[0], y1: y, x2: MOUTH[1], y2: y }));
  return svg('g', {},
    svg('rect', { x: VIEW.x, y: VIEW.y, width: VIEW.w, height: VIEW.h, rx: 3, class: 'bt-wood' }),
    svg('rect', { x: 0, y: 0, width: W, height: L, class: 'bt-felt' }),
    net,
    line({ x: 0.6, y: 0.6, width: W - 1.2, height: L - 1.2 }),
    line({ x: 13, y: 0.6, width: W - 26, height: 15 }),
    line({ x: 23, y: 0.6, width: W - 46, height: 6 }),
    line({ x: 13, y: L - 15.6, width: W - 26, height: 15 }),
    svg('line', { x1: 0.6, y1: L / 2, x2: W - 0.6, y2: L / 2, class: 'bt-line' }),
    svg('circle', { cx: W / 2, cy: L / 2, r: 8, class: 'bt-line' }),
    svg('circle', { cx: W / 2, cy: 11, r: 0.6, class: 'bt-spot' }),
    svg('circle', { cx: W / 2, cy: L / 2, r: 0.6, class: 'bt-spot' }),
    ...MOUTH.map((x) => svg('circle', { cx: x, cy: 0, r: POST, class: 'bt-post' })),
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
  /* drawn round x = 0 and moved by a transform, so it can slide across */
  const keeperEl = svg('rect', { class: 'bt-keeper', x: -KEEPER_W / 2, y: KEEPER_Y[0], width: KEEPER_W, height: KEEPER_Y[1] - KEEPER_Y[0], rx: 0.8 });
  const ballEl = svg('g', { class: 'bt-ball' }, svg('circle', { r: BALL }));
  const discs = svg('g', {});
  board.append(pitch(), trail, path, ghost, keeperEl, discs, ballEl, band, arrow);
  const showMe = el('button', { class: 'btn ghost small', type: 'button', text: '👀 Show me a way' }) as HTMLButtonElement;
  const node = el('div', { class: 'mx-stage bt-stage' }, tell, touchesEl, el('div', { class: 'bt-wrap' }, board), showMe);

  let ours: SVGGElement[] = [];
  let theirs: SVGGElement[] = [];

  function setUp(t: Table): void {
    ours = t.us.map((_, i) => button(kit.us(), `us b${i}`));
    theirs = t.them.map(() => button(kit.rival(), 'them'));
    discs.replaceChildren(...theirs, ...ours);
    keeperEl.setAttribute('fill', kit.rival().colours[0]);
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
      const tick = (): void => {
        const i = Math.min(shot.frames.length - 1, Math.floor((performance.now() - start) / (1000 / 60)));
        frame(t, shot.frames[i]);
        for (; heard < shot.bumps.length && shot.bumps[heard].frame <= i; heard += 1) {
          const what = shot.bumps[heard].what;
          if (what === 'touch') sfx.kick();
          else if (what === 'post') sfx.crack();
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
    board.classList.remove('aiming');
  };

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

  /** where the ball would go: all the way, or only the start of it */
  function drawGuide(t: Table, f: Flick, guide: BotaoStep['guide']): void {
    if (guide === 'none') { path.setAttribute('points', ''); trail.setAttribute('points', ''); return; }
    const shot = simulate(t, f);
    const ballWay: Point[] = [];
    let gone = 0;
    for (const fr of shot.frames) {
      const last = ballWay.at(-1);
      if (last) gone += Math.sqrt((fr[0].x - last.x) ** 2 + (fr[0].y - last.y) ** 2);
      if (guide === 'short' && gone > 16) break;
      if (!last || last.x !== fr[0].x || last.y !== fr[0].y) ballWay.push(fr[0]);
    }
    path.setAttribute('points', ballWay.length > 1 ? line(ballWay) : '');
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

  /* the finger: the button it came down on, and where it is now */
  let drag: { button: number; pointer: number } | null = null;
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
        setPips(0, null);
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
          t = { ...shot.end, keeper: keeperFor(step.keeper, shot.end.ball) };
          draw(t);
          if (shot.goal) node.dataset.goal = 'shown';
          await kit.wait(500);
        }
        kit.note(HOW[q.plan.kind]);
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
        table = { ...shot.end, keeper: keeperFor(step.keeper, shot.end.ball) };
        if (shot.goal) {
          node.dataset.goal = 'scored';
          sfx.cheer();
          kit.note(`GOL! ${touches.length === 1 ? 'In one touch!' : `In ${touches.length} touches.`}`, true);
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
        kit.note(`${what} ${left} ${left === 1 ? 'touch' : 'touches'} left.${tired === null ? '' : ' The last one has to be another button: pass!'}`);
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
        drag = { button: best, pointer: e.pointerId };
        try { board.setPointerCapture(e.pointerId); } catch { /* the drag still works inside the table */ }
        board.classList.add('aiming');
      };
      onMove = (e) => {
        if (!drag || e.pointerId !== drag.pointer) return;
        const p = toTable(e);
        const from = table.us[drag.button];
        const f = flickFor(drag.button, p.x - from.x, p.y - from.y);
        band.setAttribute('x1', from.x.toFixed(2)); band.setAttribute('y1', from.y.toFixed(2));
        band.setAttribute('x2', p.x.toFixed(2)); band.setAttribute('y2', p.y.toFixed(2));
        if (Math.sqrt((p.x - from.x) ** 2 + (p.y - from.y) ** 2) < 1.5) { arrow.setAttribute('points', ''); path.setAttribute('points', ''); trail.setAttribute('points', ''); return; }
        drawArrow(from, f);
        drawGuide(table, f, step.guide);
      };
      onUp = (e) => {
        if (!drag || e.pointerId !== drag.pointer) return;
        const p = toTable(e);
        const from = table.us[drag.button];
        const which = drag.button;
        drag = null;
        clearAim();
        /* a tap, or a pull too small to see, is not a flick */
        if (Math.sqrt((p.x - from.x) ** 2 + (p.y - from.y) ** 2) < 1.5) return;
        void flick(flickFor(which, p.x - from.x, p.y - from.y));
      };
    }),
  };
}
