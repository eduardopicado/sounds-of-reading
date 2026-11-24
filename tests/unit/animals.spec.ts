/* Animals of the World's content: every animal's homes are honest and its
 * fact says them all, every question has one answer, and everything said is
 * on the list of recordings.
 *
 *   npm run test:unit */

import { describe, expect, it } from 'vitest';
import { ANIMALS, ANIMAL_STEPS, HABITATS, SAYS, animal, animalLines, animalQuestion, animalSays, homesIn } from '../../src/content/animals';
import { place } from '../../src/content/world';
import { WORLD_ANIMALS } from '../../src/content/words';

const many = (step: number, n = 300) => Array.from({ length: n }, () => animalQuestion(ANIMAL_STEPS[step]));

describe('Animals of the World', () => {
  it('has every animal in the word lists, with a picture, its homes and a fact both ways', () => {
    expect(ANIMALS.map((a) => a.name)).toEqual(WORLD_ANIMALS.split('|').map((x) => x.trim().replace(/\s+\S+$/, '')));
    expect(new Set(ANIMALS.map((a) => a.picture)).size).toBe(ANIMALS.length);
    for (const a of ANIMALS) {
      expect(a.homes.length + a.habitats.length, a.name).toBeGreaterThan(0);
      expect(a.fact.en, a.name).toMatch(/\.$/);
      expect(a.fact.pt, a.name).toMatch(/\.$/);
    }
  });

  it("says every continent an animal lives on in its fact, so the fact never contradicts a right tap", () => {
    /* the English fact for seven continents, the Portuguese for eight, Central America its own */
    const americas = (home: string): boolean => home.endsWith('-america');
    for (const a of ANIMALS) {
      for (const home of homesIn(a, 7)) {
        const p = place(home);
        expect(a.fact.en.includes(p.name) || (americas(home) && a.fact.en.includes('Americas')), `${a.name}: ${p.name}`).toBe(true);
      }
      for (const home of homesIn(a, 8)) {
        const p = place(home);
        expect(a.fact.pt.includes(p.pt.name) || (americas(home) && a.fact.pt.includes('Américas')), `${a.name}: ${p.pt.name}`).toBe(true);
      }
    }
  });

  it('counting eight continents, the sloth lives in Central and South America, and the raccoon in North and Central', () => {
    expect(homesIn(animal('sloth'), 7)).toEqual(['south-america', 'north-america']);
    expect(homesIn(animal('sloth'), 8).sort()).toEqual(['central-america', 'south-america']);
    expect(homesIn(animal('raccoon'), 8).sort()).toEqual(['central-america', 'north-america']);
    expect(homesIn(animal('crocodile'), 8)).toContain('central-america');
    expect(homesIn(animal('bison'), 8)).toEqual(homesIn(animal('bison'), 7));
    /* a question counting eight carries those homes */
    const home = ANIMAL_STEPS.findIndex((s) => s.task === 'home' && !s.oneHome);
    for (let i = 0; i < 300; i += 1) {
      const q = animalQuestion(ANIMAL_STEPS[home], [], 8);
      expect(q.homes, q.animal.name).toEqual(homesIn(q.animal, 8));
    }
  });

  it('keeps sea animals off the continents, and asks only where they live', () => {
    for (const name of ['whale', 'dolphin', 'shark', 'octopus']) {
      expect(animal(name).homes).toEqual([]);
      expect(animal(name).habitats[0]).toBe('ocean');
    }
    for (let s = 0; s < ANIMAL_STEPS.length; s += 1) {
      if (ANIMAL_STEPS[s].task === 'habitat') continue;
      for (const q of many(s, 100)) expect(q.animal.homes.length, q.animal.name).toBeGreaterThan(0);
    }
  });

  it('starts with animals that live on one continent, and ends with those on several', () => {
    for (const q of many(0)) expect(q.animal.homes).toHaveLength(1);
    for (const q of many(4)) expect(q.animal.homes).toHaveLength(1);
    for (const q of many(5)) expect(q.animal.homes.length).toBeGreaterThan(1);
  });

  it('offers one animal that lives on the glowing continent, and two that do not', () => {
    for (const q of many(2)) {
      const living = q.options!.filter((n) => animal(n).homes.includes(q.continent!));
      expect(living).toEqual([q.pick]);
      expect(q.options).toHaveLength(3);
    }
  });

  it('never offers a place an animal could be said to live in as a wrong answer', () => {
    for (const q of many(3)) {
      expect(q.options).toContain(q.pick);
      expect(new Set(q.options).size).toBe(3);
      for (const o of q.options!) if (o !== q.pick) expect(q.animal.habitats, `${q.animal.name}: ${o}`).not.toContain(o);
      expect(HABITATS.map((h) => h.id)).toContain(q.pick);
    }
  });

  it('says nothing that is not on the list of recordings, in either language', () => {
    for (const lang of ['en', 'pt'] as const) {
      const lines = new Set(animalLines(lang));
      const missing = new Set<string>();
      for (let s = 0; s < ANIMAL_STEPS.length; s += 1) {
        for (const q of many(s, 200)) for (const b of [q.ask, animalSays(q)]) if (!lines.has(b[lang])) missing.add(b[lang]);
      }
      for (const b of [SAYS.moreToFind, SAYS.yes]) if (!lines.has(b[lang])) missing.add(b[lang]);
      expect([...missing]).toEqual([]);
    }
  });
});
