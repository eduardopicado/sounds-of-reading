/* The Solar System: the planets' facts, every Mystery Planet solvable
 * whatever he asks, and what the game says in both languages.
 *
 *   npm run test:unit */

import { describe, expect, it } from 'vitest';
import {
  CLUES, IN_ORDER, PLANETS, SAYS, SPACE_STEPS, answerSays, cluesFor, fits, isDay, planet, spaceClimb, spaceLines,
  type ClueId, type PlanetId,
} from '../../src/content/space';

describe('the planets', () => {
  it('are the eight, in order out from the Sun', () => {
    expect(IN_ORDER.map((p) => p.id)).toEqual(['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']);
  });

  it('have the sizes the facts say: Jupiter biggest, Mercury smallest', () => {
    const by = [...PLANETS].sort((a, b) => b.width - a.width).map((p) => p.id);
    expect(by[0]).toBe('jupiter');
    expect(by.at(-1)).toBe('mercury');
    expect(planet('venus').width).toBeLessThan(planet('earth').width);
  });

  it('answer the broad questions by their sizes, order and moons', () => {
    const yes = (id: ClueId): PlanetId[] => CLUES.find((c) => c.id === id)!.yes;
    expect(yes('bigger').sort()).toEqual(PLANETS.filter((p) => p.width > planet('earth').width).map((p) => p.id).sort());
    expect(yes('nearer').sort()).toEqual(PLANETS.filter((p) => p.order < planet('earth').order).map((p) => p.id).sort());
    expect(yes('moon').sort()).toEqual(PLANETS.filter((p) => p.moons > 0).map((p) => p.id).sort());
    expect(yes('rock').sort()).toEqual(IN_ORDER.slice(0, 4).map((p) => p.id).sort());
  });
});

describe('Mystery Planet', () => {
  it('has, for each planet, a question only it says yes to', () => {
    for (const p of PLANETS) expect(CLUES.some((c) => c.yes.length === 1 && c.yes[0] === p.id), p.id).toBe(true);
  });

  it('can be solved whatever he asks: every path ends with one planet, never with no card to ask', () => {
    let paths = 0;
    const walk = (secret: PlanetId, left: PlanetId[], asked: ClueId[]): void => {
      if (left.length === 1) {
        expect(left[0]).toBe(secret);
        paths += 1;
        return;
      }
      const cards = cluesFor(left, asked);
      expect(cards.length, `${secret}: ${left.join(' ')}`).toBeGreaterThan(0);
      expect(cards.length).toBeLessThanOrEqual(4);
      for (const c of cards) {
        const answer = c.yes.includes(secret);
        const next = left.filter((p) => fits(c, p, answer));
        /* every card offered rules something out */
        expect(next.length).toBeLessThan(left.length);
        expect(next).toContain(secret);
        walk(secret, next, [...asked, c.id]);
      }
    };
    for (const p of PLANETS) walk(p.id, PLANETS.map((x) => x.id), []);
    expect(paths).toBeGreaterThan(100);
  });

  it('starts with the broad questions only, and offers the ones that pick out a planet once few are left', () => {
    expect(cluesFor(PLANETS.map((p) => p.id), []).every((c) => c.broad)).toBe(true);
    expect(cluesFor(['jupiter', 'saturn', 'uranus', 'neptune'], ['rock']).map((c) => c.id)).toEqual(['rings', 'side', 'biggest', 'farthest']);
  });

  it('says the answer to each question both ways', () => {
    const rock = CLUES.find((c) => c.id === 'rock')!;
    expect(answerSays(rock, true)).toEqual({ en: 'Is it made of rock? Yes!', pt: 'É feito de rocha? Sim!' });
    expect(answerSays(rock, false).pt).toBe('É feito de rocha? Não.');
  });
});

describe('day and night', () => {
  it('is day on the side facing the Sun, night on the other', () => {
    expect(isDay(0)).toBe(true);
    expect(isDay(60)).toBe(true);
    expect(isDay(-60)).toBe(true);
    expect(isDay(120)).toBe(false);
    expect(isDay(180)).toBe(false);
    expect(isDay(-150)).toBe(false);
  });
});

describe('the ladder and what is said', () => {
  it('moves on from putting them in order only once all eight are out', () => {
    const order = SPACE_STEPS.findIndex((s) => s.task === 'order');
    let c = { step: order, right: 0, wrong: 0 };
    for (let i = 0; i < 7; i += 1) c = spaceClimb(c, true, SPACE_STEPS.length);
    expect(c.step).toBe(order);
    c = spaceClimb(c, true, SPACE_STEPS.length);
    expect(c.step).toBe(order + 1);
    /* elsewhere, three right in a row climb a step, two wrong go down */
    let d = { step: 0, right: 0, wrong: 0 };
    for (let i = 0; i < 3; i += 1) d = spaceClimb(d, true, SPACE_STEPS.length);
    expect(d.step).toBe(1);
    d = spaceClimb(spaceClimb(d, false, SPACE_STEPS.length), false, SPACE_STEPS.length);
    expect(d.step).toBe(0);
  });

  it('says Earth with its article in Portuguese, and the rest without', () => {
    expect(SAYS.where(planet('earth')).pt).toBe('Onde está a Terra?');
    expect(SAYS.where(planet('mars')).pt).toBe('Onde está Marte?');
    expect(SAYS.that(planet('earth')).pt).toBe('Essa é a Terra.');
    expect(SAYS.that(planet('saturn')).pt).toBe('Esse é Saturno.');
    expect(SAYS.next(planet('earth')).pt).toBe('Qual planeta vem depois da Terra?');
    expect(SAYS.isBigger(planet('earth'), planet('mars')).pt).toBe('A Terra é maior que Marte.');
  });

  it('has every line in both languages, each a sentence, for the recordings', () => {
    for (const lang of ['en', 'pt'] as const) {
      const lines = spaceLines(lang);
      expect(lines.length).toBeGreaterThan(100);
      for (const l of lines) expect(l, l).toMatch(/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ].*[.!?]$/);
    }
    for (const p of PLANETS) expect(spaceLines('pt')).toContain(p.fact.pt);
  });
});
