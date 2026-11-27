/* Measure the Pitch: every question's answer worked out again from what is
 * drawn.
 *
 *   npm run test:unit */

import { describe, expect, it } from 'vitest';
import { MEASURE_STEPS, SIZED, measureLines, measureQuestion } from '../../src/content/measure';

function seeded(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) % 2 ** 31; return s / 2 ** 31; };
}
const many = (task: string, n = 400) => {
  const r = seeded(task.length * 7 + 1);
  return Array.from({ length: n }, () => measureQuestion(task as never, r));
};

describe('Measure the Pitch', () => {
  it('always has the answer among different choices', () => {
    for (const step of MEASURE_STEPS) {
      for (const q of many(step.task)) {
        expect(q.options, q.ask).toContain(q.answer);
        expect(new Set(q.options).size, q.ask).toBe(q.options.length);
        for (const o of q.options) if (q.labels) expect(q.labels[o], o).toBeTruthy();
        if (/^\d+$/.test(q.answer)) for (const o of q.options) expect(Number(o)).toBeGreaterThan(0);
      }
    }
  });

  it('compares from one start line, the longer or shorter as asked', () => {
    for (const q of many('compare')) {
      const [a, b] = q.bars!;
      expect(a.from).toBe(0);
      expect(b.from).toBe(0);
      expect(a.length).not.toBe(b.length);
      const longer = a.length > b.length ? a.kit : b.kit;
      expect(q.answer).toBe(q.ask.includes('longer') ? longer : (longer === a.kit ? b.kit : a.kit));
    }
  });

  it('lays the boots end to end over the whole thing, one per unit', () => {
    for (const q of many('boots')) {
      const at = q.rows![0].at;
      expect(at).toEqual(at.map((_, i) => i));
      expect(at.length).toBe(q.bars![0].length);
      expect(Number(q.answer)).toBe(at.length);
    }
  });

  it('has one team measuring end to end and the other with gaps or overlaps', () => {
    for (const q of many('gaps')) {
      const right = q.rows!.find((r) => r.name === q.answer)!;
      const wrong = q.rows!.find((r) => r.name !== q.answer)!;
      expect(right.at).toEqual(right.at.map((_, i) => i));
      expect(right.at.length).toBe(q.bars![0].length);
      expect(wrong.at.length).not.toBe(right.at.length);
      /* both rows cover the same stretch, start to end */
      expect(wrong.at[0]).toBe(0);
      expect(wrong.at.at(-1)).toBeCloseTo(right.at.at(-1)!);
    }
  });

  it('reads a ruler as end take start, on the ruler', () => {
    for (const task of ['ruler', 'offset']) {
      for (const q of many(task)) {
        const b = q.bars![0];
        expect(Number(q.answer)).toBe(b.length);
        expect(b.from + b.length).toBeLessThanOrEqual(q.ruler!);
        if (task === 'ruler') expect(b.from).toBe(0);
        else {
          expect(b.from).toBeGreaterThan(0);
          /* the end reading is offered: the mistake of reading the end mark */
          expect(q.options).toContain(String(b.from + b.length));
        }
      }
    }
  });

  it('counts the squares a shape covers, and the cups a bottle holds', () => {
    for (const q of many('area')) {
      expect(Number(q.answer)).toBe(q.cells!.length);
      expect(new Set(q.cells!.map((c) => c.join())).size).toBe(q.cells!.length);
    }
    for (const q of many('capacity')) expect(Number(q.answer)).toBe(q.cups);
  });

  it('measures the big things in metres and the small in centimetres', () => {
    for (const s of SIZED) expect(s.unit, s.name).toBe(s.unit === 'm' ? (s.size >= 7 ? 'm' : 'cm') : 'cm');
    const q = many('units').find((x) => x.ask.startsWith('About how'))!;
    expect(q.labels![q.answer]).toMatch(/^\d+ (metres|centimetres)$/);
  });

  it('has its fixed lines as sentences, for the recordings', () => {
    for (const l of measureLines()) expect(l, l).toMatch(/^[A-Z].*[.!?]$/);
  });
});
