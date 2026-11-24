/* Map Jigsaw's content: the pieces, where they go, how near is near
 * enough, and the ladder that waits for the puzzle to be done.
 *
 *   npm run test:unit */

import { describe, expect, it } from 'vitest';
import {
  BOARDS, CONTINENT_PIECES, HOP, JIGSAW_STEPS, PIECES_A_PUZZLE, SAYS, SNAP, STATE_PIECES, askFor, fits, jigsawClimb, jigsawLines, mainland, rings, CONTINENT_PIECES_EIGHT, piecesFor,
} from '../../src/content/jigsaw';
import { STATE_SHAPES } from '../../src/content/australia-shapes';
import { findSays, place } from '../../src/content/world';
import { STATES, stateSays } from '../../src/content/capitals';
import { wanted } from '../../tools/make-audio';
import { speakable } from '../../src/lib/clip-id';

describe('Map Jigsaw', () => {
  it('has seven pieces a puzzle: the continents, and the states with the ACT in New South Wales', () => {
    expect(CONTINENT_PIECES).toHaveLength(PIECES_A_PUZZLE);
    expect(STATE_PIECES).toHaveLength(PIECES_A_PUZZLE);
    expect(STATE_PIECES.map((p) => p.id)).not.toContain('ACT');
    const act = STATE_SHAPES.find((s) => s.id === 'ACT')!.d;
    expect(STATE_PIECES.find((p) => p.id === 'NSW')!.d).toContain(act);
  });

  it('keeps every piece on its map, and leaves out what the map draws half a world away', () => {
    for (const [pieces, board] of [[CONTINENT_PIECES, BOARDS.world], [STATE_PIECES, BOARDS.australia]] as const) {
      for (const p of pieces) {
        expect(p.box.x0, p.id).toBeGreaterThanOrEqual(0);
        expect(p.box.y0, p.id).toBeGreaterThanOrEqual(0);
        expect(p.box.x1, p.id).toBeLessThanOrEqual(board.w);
        expect(p.box.y1, p.id).toBeLessThanOrEqual(board.h);
      }
    }
    const asia = CONTINENT_PIECES.find((p) => p.id === 'asia')!;
    const america = CONTINENT_PIECES.find((p) => p.id === 'north-america')!;
    const oceania = CONTINENT_PIECES.find((p) => p.id === 'australia')!;
    /* the corner of Russia the map draws at its far left is not part of Asia's piece */
    expect(asia.box.x0).toBeGreaterThan(400);
    /* Hawaii is left on the map; Greenland comes with North America */
    expect(america.box.x0).toBeGreaterThan(90);
    expect(america.box.x1).toBeGreaterThan(450);
    /* New Zealand comes with Australia */
    expect(oceania.box.x1).toBeGreaterThan(940);
  });

  it('gathers a mainland and the islands a hop from it, and no further', () => {
    const square = (x: number, y: number, s = 10): string => `M${x} ${y}l${s} 0 0 ${s} -${s} 0z`;
    const kept = mainland(rings(square(0, 0, 100) + square(100 + HOP - 1, 0) + square(100 + HOP - 1 + 10 + HOP - 1, 0) + square(400, 0)));
    /* an island chain a hop apart comes along; one far off does not */
    expect(kept).toHaveLength(3);
  });

  it('drops a piece in when it is let go near enough, and not otherwise', () => {
    const p = CONTINENT_PIECES[0];
    expect(fits(p, p.cx, p.cy)).toBe(true);
    expect(fits(p, p.cx + SNAP - 1, p.cy)).toBe(true);
    expect(fits(p, p.cx + SNAP + 1, p.cy)).toBe(false);
    /* no two continents' places are so close that one goes in the other's */
    for (const a of CONTINENT_PIECES) {
      for (const b of CONTINENT_PIECES) if (a !== b) expect(fits(a, b.cx, b.cy), `${a.id} in ${b.id}`).toBe(false);
    }
    for (const a of STATE_PIECES) {
      for (const b of STATE_PIECES) if (a !== b) expect(fits(a, b.cx, b.cy), `${a.id} in ${b.id}`).toBe(false);
    }
  });

  it('keeps the step until the puzzle is done, then moves by how many went in first time', () => {
    const run = (oks: boolean[], step = 2) => oks.reduce((c, ok) => jigsawClimb(c, ok, JIGSAW_STEPS.length), { step, right: 0, wrong: 0 });
    /* six right mid-puzzle is not a step up */
    expect(run([true, true, true, true, true, true]).step).toBe(2);
    expect(run(Array(7).fill(true)).step).toBe(3);
    expect(run([...Array(6).fill(true), false]).step).toBe(3);
    expect(run([...Array(5).fill(true), false, false]).step).toBe(2);
    expect(run([true, true, ...Array(5).fill(false)]).step).toBe(1);
    /* and it starts counting again for the next puzzle */
    expect(run(Array(7).fill(true))).toMatchObject({ right: 0, wrong: 0 });
  });

  it('asks with the name, or with none at all', () => {
    const p = CONTINENT_PIECES[0];
    expect(askFor(p, JIGSAW_STEPS[0]).en).toBe(`Put ${p.name.en} on the map.`);
    expect(askFor(p, JIGSAW_STEPS[4])).toEqual(SAYS.which);
  });

  it('says only what is recorded or on the list to record: its own lines, and the facts the other games say', () => {
    const lines = new Set(wanted());
    const own = new Set([...jigsawLines('en'), ...jigsawLines('pt')].map(speakable));
    for (const l of own) expect(lines.has(l), l).toBe(true);
    for (const p of CONTINENT_PIECES) {
      const c = place(p.id as Parameters<typeof place>[0]);
      for (const l of [...p.facts.flatMap((f) => [f.en, f.pt]), findSays(c).that, findSays(c, 'pt').that]) expect(lines.has(speakable(l)), l).toBe(true);
    }
    for (const p of STATE_PIECES) {
      const s = STATES.find((x) => x.id === p.id)!;
      for (const l of [...p.facts.flatMap((f) => [f.en, f.pt]), stateSays(s).that, stateSays(s, 'pt').that]) expect(lines.has(speakable(l)), l).toBe(true);
      expect(p.facts[0].en).toBe(s.fact);
    }
  });
});

describe('in Portuguese, eight continents', () => {
  it('has a piece for Central America, out of North America', () => {
    expect(CONTINENT_PIECES_EIGHT.map((p) => p.id).sort()).toEqual([...CONTINENT_PIECES.map((p) => p.id), 'central-america'].sort());
    const central = CONTINENT_PIECES_EIGHT.find((p) => p.id === 'central-america')!;
    expect(central.name.pt).toBe('América Central');
    const north7 = CONTINENT_PIECES.find((p) => p.id === 'north-america')!;
    const north8 = CONTINENT_PIECES_EIGHT.find((p) => p.id === 'north-america')!;
    /* North America gets smaller: its south end is Mexico now, not Panama */
    expect(north8.box.y1).toBeLessThan(north7.box.y1);
    /* Central America is between the two, on the map */
    const south = CONTINENT_PIECES_EIGHT.find((p) => p.id === 'south-america')!;
    expect(central.cy).toBeGreaterThan(north8.cy);
    expect(central.cy).toBeLessThan(south.cy);
  });

  it('makes the world puzzle eight pieces, and moves the step only once all eight are in', () => {
    const world = JIGSAW_STEPS.find((s) => s.map === 'world')!;
    const states = JIGSAW_STEPS.find((s) => s.map === 'australia')!;
    expect(piecesFor(world, 8)).toHaveLength(8);
    expect(piecesFor(world, 7)).toHaveLength(7);
    expect(piecesFor(states, 8)).toHaveLength(7);
    let c = { step: 0, right: 0, wrong: 0 };
    for (let i = 0; i < 7; i += 1) c = jigsawClimb(c, true, JIGSAW_STEPS.length, 8);
    expect(c.step).toBe(0);
    c = jigsawClimb(c, true, JIGSAW_STEPS.length, 8);
    expect(c.step).toBe(1);
  });
});

