/* Flags: every country is on the map, every question has one right answer,
 * and every line is on the list to record.
 *
 *   npm run test:unit */

import { describe, expect, it } from 'vitest';
import {
  COUNTRIES, FLAG_STEPS, LOOKALIKES, MARK_WORDS, country, flagLines, flagQuestion, poolOf, type Mark,
} from '../../src/content/flags';
import { COUNTRY_SHAPES } from '../../src/content/world-shapes';
import { wanted } from '../../tools/make-audio';
import { speakable } from '../../src/lib/clip-id';

describe('the countries', () => {
  it('are each on the map, once, with a flag', () => {
    const onMap = new Set(COUNTRY_SHAPES.map((c) => c.id));
    for (const c of COUNTRIES) {
      expect(onMap.has(c.id), c.name).toBe(true);
      /* a flag emoji is two regional letters */
      expect([...c.flag].length, c.name).toBe(2);
      expect(c.looks.length, c.name).toBeGreaterThan(20);
    }
    expect(new Set(COUNTRIES.map((c) => c.id)).size).toBe(COUNTRIES.length);
    expect(new Set(COUNTRIES.map((c) => c.flag)).size).toBe(COUNTRIES.length);
  });

  it('has look-alikes that are all countries here', () => {
    for (const l of LOOKALIKES) for (const id of l.ids) expect(country(id), id).toBeTruthy();
  });

  it('has each mark on at least one flag', () => {
    for (const mark of Object.keys(MARK_WORDS) as Mark[]) {
      expect(COUNTRIES.some((c) => c.marks.includes(mark)), mark).toBe(true);
    }
  });
});

describe('the questions', () => {
  it('offer three different flags or names, the answer among them, from the same group', () => {
    for (const step of FLAG_STEPS.filter((s) => s.task === 'which' || s.task === 'whose')) {
      const pool = new Set(poolOf(step.pool).map((c) => c.id));
      for (let i = 0; i < 200; i += 1) {
        const q = flagQuestion(step);
        expect(q.options).toContain(q.answer);
        expect(new Set(q.options).size).toBe(3);
        for (const o of q.options) expect(pool.has(o), `${step.name}: ${o}`).toBe(true);
      }
    }
  });

  it('asks which flag has a mark with only one flag offered that has it', () => {
    const step = FLAG_STEPS.find((s) => s.task === 'mark')!;
    for (let i = 0; i < 400; i += 1) {
      const q = flagQuestion(step);
      const mark = (Object.keys(MARK_WORDS) as Mark[]).find((m) => q.ask === `Which flag has ${MARK_WORDS[m]}?`)!;
      expect(mark, q.ask).toBeTruthy();
      const having = q.options.filter((id) => country(id).marks.includes(mark));
      expect(having, q.ask).toEqual([q.answer]);
      expect(new Set(q.options).size).toBe(3);
    }
    /* and the near misses are never the wrong answers: half of South Korea's circle is red */
    for (let i = 0; i < 400; i += 1) {
      const q = flagQuestion(step);
      if (q.ask === 'Which flag has a red circle?') expect(q.options).not.toContain('KOR');
      if (q.ask === 'Which flag has a bird of paradise?') expect(q.options.filter((o) => o === 'MEX' || o === 'EGY')).toEqual([]);
    }
  });

  it('looks closely at flags that are easy to mix up, all of them offered', () => {
    const step = FLAG_STEPS.find((s) => s.task === 'alike')!;
    for (let i = 0; i < 100; i += 1) {
      const q = flagQuestion(step);
      const group = LOOKALIKES.find((l) => l.ids.includes(q.answer))!;
      expect([...q.options].sort()).toEqual([...group.ids].sort());
      expect(q.why).toBe(group.tell);
    }
  });

  it('never asks for an island too small to tap on the map', () => {
    for (const step of FLAG_STEPS.filter((s) => s.task === 'map')) {
      for (let i = 0; i < 200; i += 1) expect(country(flagQuestion(step).answer).tiny, step.name).toBeFalsy();
    }
  });

  it('does not ask for the same country again straight away', () => {
    for (const step of FLAG_STEPS) {
      let recent: string[] = [];
      for (let i = 0; i < 60; i += 1) {
        const q = flagQuestion(step, recent);
        if (step.task !== 'alike') expect(recent[0], step.name).not.toBe(q.answer);
        recent = [q.answer, ...recent].slice(0, 4);
      }
    }
  });

  it('has every line it says on the list to record', () => {
    const list = new Set(wanted());
    expect(flagLines().filter((line) => !list.has(speakable(line)))).toEqual([]);
  });
});
