/* Map Jigsaw — the continents and Australia's states, put back in place.
 *
 * A round is one puzzle, a piece a turn: the piece waits under the map, he
 * drags it up to where it goes and lets go, and near enough it drops in.
 * Too far, and it goes back to try again; after two goes the place it goes
 * glows. A piece that goes in first time counts as right. Each piece, once
 * in, says what it is and one true thing about it. The steps, and why there
 * are seven pieces both times, are in src/content/jigsaw.ts.
 *
 * Dragging is by pointer events, so a finger on the iPad and a mouse work
 * the same, and the page does not scroll under the finger. In English or
 * Portuguese, switched with the flags, as the other geography games are. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { svg } from '../ui/writing';
import { OUTLINE } from '../content/world-shapes';
import { STATE_SHAPES } from '../content/australia-shapes';
import { findSays, place } from '../content/world';
import { STATES, stateSays, type StateId } from '../content/capitals';
import type { Both } from '../content/pt';
import {
  BOARDS, JIGSAW_STEPS, PIECES_A_PUZZLE, SAYS, askFor, continentOf, fits, jigsawClimb, piecesFor,
  type JigsawStep, type Piece,
} from '../content/jigsaw';
import { mountMaths, type Kit } from './maths-kit';
import { GEO_LANG, langSwitch, speak } from './lang-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<JigsawStep>({
    id: 'map-jigsaw',
    title: 'Map',
    swash: 'Jigsaw',
    tagline: 'Put the pieces back on the map.',
    steps: JIGSAW_STEPS,
    face: '🧩',
    cheer: 'Good map reading!',
    unit: 'Piece',
    lengths: [PIECES_A_PUZZLE],
    counts: 'In first time',
    climb: jigsawClimb,
    build,
  }, root);
}

const shuffled = <T>(list: T[]): T[] => [...list].sort(() => Math.random() - 0.5);

/** "That is Africa.", "That is New South Wales." */
const thatIs = (p: Piece): Both => {
  const continent = continentOf(p.id);
  if (continent) return { en: findSays(place(continent)).that, pt: findSays(place(continent), 'pt').that };
  const s = STATES.find((x) => x.id === p.id as StateId)!;
  return { en: stateSays(s).that, pt: stateSays(s, 'pt').that };
};

function build(kit: Kit) {
  const langs = langSwitch(GEO_LANG);
  const lang = () => langs.lang();
  const ask = el('p', { class: 'mx-ask' });
  const board = svg('svg', { class: 'jg-board', role: 'img' });
  const node = el('div', { class: 'mx-stage jg-stage' }, langs.node, ask, board);
  /** redraws the words on screen in the chosen language */
  let retext: () => void = () => undefined;
  langs.onChange(() => retext());

  /* the puzzle being done: its step, the pieces in order, how many are in */
  let puzzle: { step: JigsawStep; order: Piece[]; done: number } | null = null;
  let tray = { x: 0, y: 0, w: 0, h: 0 };

  /** a shape with only its outside edge drawn: the edge thick underneath,
      the fill over it, so the borders inside a continent do not show */
  const shape = (p: Piece, cls: string): SVGGElement => {
    const g = svg('g', { class: cls, 'data-piece': p.id }) as SVGGElement;
    g.append(svg('path', { class: 'edge', d: p.d }), svg('path', { class: 'fill', d: p.d }));
    return g;
  };
  /** a piece's place, drawn where it goes */
  const outline = (p: Piece, cls: string): SVGGElement => shape(p, cls);

  /** the map for a step, with the outlines it gives, and room under it for the piece */
  function drawBoard(step: JigsawStep): void {
    const { w, h } = BOARDS[step.map];
    const trayH = Math.round(h * (step.map === 'world' ? 0.5 : 0.36));
    tray = { x: w * 0.1, y: h + trayH * 0.08, w: w * 0.8, h: trayH * 0.84 };
    board.setAttribute('viewBox', `0 0 ${w} ${h + trayH}`);
    board.setAttribute('aria-label', step.map === 'world' ? 'A map of the world, to put the continents on' : 'A map of Australia, to put the states on');
    board.dataset.map = step.map;
    const layers: Element[] = [];
    if (step.map === 'world') layers.push(svg('path', { class: 'jg-sea', d: OUTLINE }));
    else layers.push(svg('rect', { class: 'jg-sea', x: 0, y: 0, width: w, height: h, rx: 24 }));
    if (step.map === 'australia' && step.guide === 'coast') {
      /* the coast with no lines inside: every state drawn with a thick edge,
         then filled over again with none, so only the outside edge is left */
      const all = STATE_SHAPES.map((s) => s.d).join('');
      layers.push(svg('path', { class: 'jg-coast-edge', d: all }), svg('path', { class: 'jg-coast', d: all }));
    }
    if (step.guide === 'outlines') for (const p of piecesFor(step)) layers.push(outline(p, 'jg-hole'));
    layers.push(svg('rect', { class: 'jg-tray', x: tray.x, y: tray.y, width: tray.w, height: tray.h, rx: 28 }));
    board.replaceChildren(...layers);
  }

  /** the transform that puts a piece's middle at (x, y), at a size */
  const at = (g: SVGGElement, p: Piece, x: number, y: number, scale: number): void => {
    g.setAttribute('transform', `translate(${x - scale * p.cx} ${y - scale * p.cy}) scale(${scale})`);
  };

  /** a point on the screen, in the board's own units */
  const toBoard = (e: PointerEvent): { x: number; y: number } => {
    const m = board.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  };

  /**
   * Put one piece in the tray and wait until it is in its place; true if it
   * went in first time.
   */
  function placePiece(p: Piece, step: JigsawStep): Promise<boolean> {
    const g = shape(p, 'jg-piece');
    /* the whole box round it picks it up, not just the land: a finger on
       the sea between New Zealand and Australia, or on Europe's inlets,
       still gets the piece */
    g.prepend(svg('rect', {
      class: 'grab', x: p.box.x0 - 6, y: p.box.y0 - 6, width: p.box.x1 - p.box.x0 + 12, height: p.box.y1 - p.box.y0 + 12,
    }));
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', step.named ? p.name.en : 'A piece of the map');
    board.append(g);
    const w = p.box.x1 - p.box.x0;
    const h = p.box.y1 - p.box.y0;
    const small = Math.min(1, (tray.w * 0.9) / w, (tray.h * 0.85) / h);
    const home = (): void => at(g, p, tray.x + tray.w / 2, tray.y + tray.h / 2, small);
    home();
    /* what the tests look for: where the piece goes, in the board's units */
    board.dataset.piece = p.id;
    board.dataset.goes = `${p.cx.toFixed(1)} ${p.cy.toFixed(1)}`;

    let misses = 0;
    return new Promise((resolve) => {
      let grab: { dx: number; dy: number } | null = null;
      g.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { g.setPointerCapture(e.pointerId); } catch { /* a pointer that cannot be held still drags */ }
        const pt = toBoard(e);
        const [mx, my] = transformMiddle(g, p);
        /* full size as it is picked up, the finger on the same spot of it */
        grab = { dx: (mx - pt.x) / small, dy: (my - pt.y) / small };
        g.classList.add('held');
        at(g, p, pt.x + grab.dx, pt.y + grab.dy, 1);
        sfx.tap();
      });
      g.addEventListener('pointermove', (e) => {
        if (!grab) return;
        const pt = toBoard(e);
        at(g, p, pt.x + grab.dx, pt.y + grab.dy, 1);
      });
      const letGo = (e: PointerEvent): void => {
        if (!grab) return;
        const pt = toBoard(e);
        const [x, y] = [pt.x + grab.dx, pt.y + grab.dy];
        grab = null;
        g.classList.remove('held');
        if (fits(p, x, y)) {
          g.removeAttribute('transform');
          g.classList.add('in');
          g.removeAttribute('role');
          board.querySelector(`.jg-hole[data-piece="${p.id}"]`)?.classList.add('filled');
          board.querySelector('.jg-hint')?.remove();
          resolve(misses === 0);
          return;
        }
        misses += 1;
        sfx.wrong();
        home();
        g.classList.remove('back');
        void g.getBoundingClientRect();
        g.classList.add('back');
        const now = lang();
        if (misses >= 2 && !board.querySelector('.jg-hint')) {
          /* where it goes, glowing, under the piece */
          board.insertBefore(outline(p, 'jg-hint'), board.querySelector('.jg-tray'));
          retext = () => kit.note(SAYS.here[lang()]);
          retext();
          speak(SAYS.here, now);
        } else {
          retext = () => kit.note(SAYS.tryAgain[lang()]);
          retext();
          speak(SAYS.tryAgain, now);
        }
      };
      g.addEventListener('pointerup', letGo);
      g.addEventListener('pointercancel', letGo);
    });
  }

  /** where a piece's middle is now, from its transform */
  const transformMiddle = (g: SVGGElement, p: Piece): [number, number] => {
    const m = /translate\(([-\d.e]+) ([-\d.e]+)\) scale\(([-\d.e]+)\)/.exec(g.getAttribute('transform') ?? '');
    if (!m) return [p.cx, p.cy];
    const [tx, ty, s] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return [tx + s * p.cx, ty + s * p.cy];
  };

  return {
    node,
    begin: () => { puzzle = null; },
    ask: async (step: JigsawStep): Promise<boolean> => {
      if (!puzzle || puzzle.step !== step || puzzle.done >= puzzle.order.length) {
        puzzle = { step, order: shuffled(piecesFor(step)), done: 0 };
        drawBoard(step);
      }
      const p = puzzle.order[puzzle.done];
      const question = askFor(p, step);
      retext = () => { ask.textContent = question[lang()]; };
      retext();
      speak(question, lang());
      kit.choices.clear();

      const ok = await placePiece(p, step);
      puzzle.done += 1;
      delete board.dataset.piece;
      const said: Both[] = [thatIs(p), ...p.facts];
      sfx.cheer();
      retext = () => {
        ask.textContent = question[lang()];
        kit.note(said.map((b) => b[lang()]).join(' '), true);
      };
      retext();
      const now = lang();
      /* one line after another, each its own recording */
      const sayFrom = (i: number): void => { if (said[i]) speak(said[i], now, () => sayFrom(i + 1)); };
      sayFrom(0);
      await kit.wait(3200 + 1600 * (said.length - 2));
      return ok;
    },
  };
}
