/* Map Jigsaw: the continents, and Australia's states, as pieces to put back.
 *
 * A round is one puzzle of seven pieces, a piece a turn: the seven
 * continents on the world map, or Australia's six states and the Northern
 * Territory, with the ACT in New South Wales (it is a speck a finger could
 * never pick up, and puzzles for children join them). The easier steps draw
 * each piece's outline where it goes; then only the coast, or only the sea.
 * The last two hold back the piece's name, so the shape is all he has to go
 * on. Once a piece is in, he hears its fact, the one World Map and Capital
 * Cities tell (src/content/world.ts, src/content/capitals.ts).
 *
 * The pieces are cut from the maps the other games draw, unchanged: the
 * world from src/content/world-shapes.ts, a continent's countries together,
 * and Australia from src/content/australia-shapes.ts. A continent's piece is
 * its mainland and the islands near it, found by hopping from island to
 * island no further than a short gap: New Zealand and Fiji come with
 * Australia and Greenland with North America, but Hawaii, half an ocean
 * away, is left for the map, as is the corner of Russia that the map draws
 * at its far left edge. */

import type { Step } from './maths';
import { COUNTRY_SHAPES } from './world-shapes';
import { STATE_SHAPES } from './australia-shapes';
import { PLACES, continentOf as continentIn, factIn, place, placesIn, type ContinentId, type Continents } from './world';
import { STATES, type StateId } from './capitals';
import { MAP_H, MAP_W } from './projection';
import { AUS_H, AUS_W } from './australia-projection';
import { the, type Both, type Lang } from './pt';

export interface Box { x0: number; y0: number; x1: number; y1: number }

/** the outlines of a path in the shapes' format (M x y, then l dx dy, z),
    each with the box round it */
export function rings(d: string): { d: string; box: Box }[] {
  return d.split(/(?=M)/).filter((s) => s.trim()).map((ring) => {
    const nums = (ring.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    let [x, y] = [nums[0], nums[1]];
    const box = { x0: x, y0: y, x1: x, y1: y };
    for (let i = 2; i + 1 < nums.length; i += 2) {
      x += nums[i];
      y += nums[i + 1];
      box.x0 = Math.min(box.x0, x); box.x1 = Math.max(box.x1, x);
      box.y0 = Math.min(box.y0, y); box.y1 = Math.max(box.y1, y);
    }
    return { d: ring, box };
  });
}

const area = (b: Box): number => (b.x1 - b.x0) * (b.y1 - b.y0);
/** the gap between two boxes, 0 where they touch or overlap */
const gap = (a: Box, b: Box): number => Math.hypot(
  Math.max(0, a.x0 - b.x1, b.x0 - a.x1), Math.max(0, a.y0 - b.y1, b.y0 - a.y1));
const around = (boxes: Box[]): Box => ({
  x0: Math.min(...boxes.map((b) => b.x0)), y0: Math.min(...boxes.map((b) => b.y0)),
  x1: Math.max(...boxes.map((b) => b.x1)), y1: Math.max(...boxes.map((b) => b.y1)),
});

/** how far an island can be from the rest and still come with the piece, in map units */
export const HOP = 50;

/** the mainland and every island within a hop of the piece so far */
export function mainland(all: { d: string; box: Box }[]): { d: string; box: Box }[] {
  const left = [...all].sort((a, b) => area(b.box) - area(a.box));
  const kept = [left.shift()!];
  for (let grew = true; grew;) {
    grew = false;
    for (let i = 0; i < left.length; i += 1) {
      if (kept.some((k) => gap(k.box, left[i].box) <= HOP)) {
        kept.push(...left.splice(i, 1));
        i -= 1;
        grew = true;
      }
    }
  }
  return kept;
}

export interface Piece {
  /** a continent, or a state or territory */
  id: string;
  /** the outline, in the map's own units */
  d: string;
  box: Box;
  /** where its middle goes */
  cx: number;
  cy: number;
  /** its name, both ways */
  name: Both;
  /** what is said once it is in: its fact, and for New South Wales the
      ACT's after it, each a line of its own so each is a recording */
  facts: Both[];
  /** "Put Africa on the map." */
  ask: Both;
}

const withBox = (id: string, parts: { d: string; box: Box }[], name: Both, facts: Both[], ask: Both): Piece => {
  const box = around(parts.map((p) => p.box));
  return { id, d: parts.map((p) => p.d).join(''), box, cx: (box.x0 + box.x1) / 2, cy: (box.y0 + box.y1) / 2, name, facts, ask };
};

const CONTINENTS = PLACES.filter((p) => p.kind === 'continent');

/** the continents as pieces, counting seven (English) or eight (Portuguese,
    Central America a piece of its own, out of North America) */
const continentPieces = (n: Continents): Piece[] => placesIn(n).filter((p) => p.kind === 'continent').map((p) => {
  const parts = mainland(COUNTRY_SHAPES.filter((c) => continentIn(c.id, c.continent, n) === p.id).flatMap((c) => rings(c.d)));
  const name = { en: p.name, pt: p.pt.name };
  return withBox(p.id, parts, name, [{ en: factIn(p, 'en'), pt: factIn(p, 'pt') }],
    { en: `Put ${p.name} on the map.`, pt: `Coloque ${the(p.pt)} no mapa.` });
});
export const CONTINENT_PIECES: Piece[] = continentPieces(7);
export const CONTINENT_PIECES_EIGHT: Piece[] = continentPieces(8);

const state = (id: StateId) => STATES.find((s) => s.id === id)!;

/* The ACT goes in with New South Wales, which is all round it */
export const STATE_PIECES: Piece[] = STATE_SHAPES.filter((s) => s.id !== 'ACT').map((shape) => {
  const s = state(shape.id as StateId);
  const act = shape.id === 'NSW' ? STATE_SHAPES.find((x) => x.id === 'ACT')! : null;
  const parts = rings(act ? shape.d + act.d : shape.d);
  const capitalTerritory = state('ACT');
  const facts = [{ en: s.fact, pt: s.factPt }, ...(act ? [{ en: capitalTerritory.fact, pt: capitalTerritory.factPt }] : [])];
  return withBox(s.id, parts, { en: s.name, pt: s.pt.name }, facts,
    { en: `Put ${s.called} on the map.`, pt: `Coloque ${the(s.pt)} no mapa.` });
});

/** the size of each map, in its own units */
export const BOARDS = {
  world: { w: MAP_W, h: MAP_H },
  australia: { w: AUS_W, h: AUS_H },
} as const;

/* ── the steps ───────────────────────────────────────────────────────── */

export interface JigsawStep extends Step {
  map: 'world' | 'australia';
  /** what is drawn where the pieces go: each piece's outline, the coast
      only (Australia), or nothing but the sea */
  guide: 'outlines' | 'coast' | 'none';
  /** the piece's name is said and written */
  named: boolean;
}

export const JIGSAW_STEPS: JigsawStep[] = [
  { name: 'Continents, with their outlines', map: 'world', guide: 'outlines', named: true },
  { name: 'Continents, on the sea', map: 'world', guide: 'none', named: true },
  { name: "Australia's states, with their outlines", map: 'australia', guide: 'outlines', named: true },
  { name: "Australia's states, inside the coast", map: 'australia', guide: 'coast', named: true },
  /* Year 2 and on: no name, the shape alone */
  { name: 'Which continent is this?', map: 'world', guide: 'none', named: false },
  { name: 'Which state is this?', map: 'australia', guide: 'coast', named: false },
];

export const piecesFor = (step: JigsawStep, n: Continents = 7): Piece[] =>
  (step.map === 'australia' ? STATE_PIECES : n === 8 ? CONTINENT_PIECES_EIGHT : CONTINENT_PIECES);

/** how near its place a piece must be let go, in map units, to go in */
export const SNAP = 55;

/** is a piece let go with its middle here close enough to go in? */
export const fits = (p: Piece, cx: number, cy: number): boolean => Math.hypot(cx - p.cx, cy - p.cy) <= SNAP;

export const SAYS = {
  which: { en: 'Where does this piece go?', pt: 'Onde vai esta peça?' } as Both,
  tryAgain: { en: 'Not there. Try again.', pt: 'Aí não. Tente de novo.' } as Both,
  here: { en: 'It goes here.', pt: 'Ela vai aqui.' } as Both,
};

/** what is asked for a piece at a step */
export const askFor = (p: Piece, step: JigsawStep): Both => (step.named ? p.ask : SAYS.which);

/**
 * Where the step goes once a puzzle of `size` pieces is done, by how many
 * went in first time: up with all but one or all of them, down with two or
 * fewer. It stays put until the last piece, so a puzzle never changes under
 * him.
 */
export function jigsawClimb(c: { step: number; right: number; wrong: number }, ok: boolean, steps: number, size = PIECES_A_PUZZLE) {
  const right = c.right + (ok ? 1 : 0);
  const wrong = c.wrong + (ok ? 0 : 1);
  if (right + wrong < size) return { step: c.step, right, wrong };
  if (right >= size - 1 && c.step < steps - 1) return { step: c.step + 1, right: 0, wrong: 0 };
  if (right <= 2 && c.step > 0) return { step: c.step - 1, right: 0, wrong: 0 };
  return { step: c.step, right: 0, wrong: 0 };
}

export const PIECES_A_PUZZLE = 7;

/** every line the game says that no other game does, for the recordings
    (the facts are World Map's and Capital Cities') */
export function jigsawLines(lang: Lang = 'en'): string[] {
  return [
    ...[...CONTINENT_PIECES_EIGHT, ...STATE_PIECES].map((p) => p.ask[lang]),
    SAYS.which[lang], SAYS.tryAgain[lang], SAYS.here[lang],
  ];
}

/** the continent a piece is, for the World Map facts */
export const continentOf = (id: string): ContinentId | null => (CONTINENTS.some((p) => p.id === id) ? id as ContinentId : null);
export { place };
