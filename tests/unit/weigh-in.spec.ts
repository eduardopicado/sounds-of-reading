/* Weigh-In: the balance, the blocks, the scale and the weight classes. */

import { describe, expect, it } from 'vitest';
import { GI_KG, WEIGHT_CLASSES, WEIGH_STEPS, WEIGH_THINGS, classFor, weighQuestion } from '../../src/content/bjj';

const MANY = 300;

describe('Weigh-In', () => {
  it('weighs things in a plain order, each with both names and its own picture', () => {
    const hefts = WEIGH_THINGS.map((t) => t.heft);
    expect(new Set(hefts).size).toBe(hefts.length);
    expect(new Set(WEIGH_THINGS.map((t) => t.picture)).size).toBe(WEIGH_THINGS.length);
    for (const t of WEIGH_THINGS) { expect(t.name.en).toBeTruthy(); expect(t.name.pt).toBeTruthy(); }
  });

  it('asks which is heavier or lighter, and the answer is the one the balance shows', () => {
    for (const step of WEIGH_STEPS.filter((s) => s.task === 'heavier' || s.task === 'mixed')) {
      for (let i = 0; i < MANY; i += 1) {
        const q = weighQuestion(step);
        const heavy = q.left!.heft > q.right!.heft ? q.left! : q.right!;
        const light = heavy === q.left ? q.right! : q.left!;
        expect(q.answer).toBe(q.ask === 'heavier' ? heavy.id : light.id);
        expect(q.options).toContain(q.answer);
        if (step.task === 'heavier') expect(q.ask).toBe('heavier');
      }
    }
  });

  it('puts each weight in exactly one class, up to and including its limit', () => {
    expect(classFor(20)!.name).toBe('Galo');
    expect(classFor(21)!.name).toBe('Pluma');
    expect(classFor(26)!.name).toBe('Pena');
    expect(classFor(32)!.name).toBe('Médio');
    expect(classFor(33)).toBeUndefined();
    const limits = WEIGHT_CLASSES.map((c) => c.upTo);
    expect([...limits].sort((a, b) => a - b)).toEqual(limits);
  });

  it('offers the right answer among the numbers, and the gi always weighs the same', () => {
    for (const step of WEIGH_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = weighQuestion(step);
        expect(q.options, step.name).toContain(q.answer);
        if (q.task === 'class') expect(q.answer).toBe(classFor(q.kg!)!.name);
        if (q.task === 'gi') expect(q.answer).toBe(q.giOn ? q.kg : q.kg! + GI_KG);
        if (q.task === 'blocks') expect(q.answer).toBe(q.thing!.heft);
      }
    }
  });
});
