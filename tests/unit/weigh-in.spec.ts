/* Weigh-In: the balance, the blocks, the scale and the weight classes, then
   grams, a kilogram, the marks between the numbers, and two bags. */

import { describe, expect, it } from 'vitest';
import {
  GI_KG, GRAM_THINGS, KITCHEN_DIAL, MARK_DIALS, WEIGHT_CLASSES, WEIGH_STEPS, WEIGH_THINGS,
  bagsWhy, classFor, gramsWhy, kgAndG, kiloWhy, markChoices, marksWhy, unitsSaid, unnumbered, weighQuestion,
  type WeighStep,
} from '../../src/content/bjj';

const MANY = 300;
const step = (task: WeighStep['task']): WeighStep => WEIGH_STEPS.find((s) => s.task === task)!;

describe('Weigh-In', () => {
  it('weighs things in a plain order, each with both names and its own picture', () => {
    const hefts = WEIGH_THINGS.map((t) => t.heft);
    expect(new Set(hefts).size).toBe(hefts.length);
    expect(new Set(WEIGH_THINGS.map((t) => t.picture)).size).toBe(WEIGH_THINGS.length);
    for (const t of WEIGH_THINGS) { expect(t.name.en).toBeTruthy(); expect(t.name.pt).toBeTruthy(); }
  });

  it('asks which is heavier or lighter, and the answer is the one the balance shows', () => {
    for (const s of WEIGH_STEPS.filter((x) => x.task === 'heavier' || x.task === 'mixed')) {
      for (let i = 0; i < MANY; i += 1) {
        const q = weighQuestion(s);
        const heavy = q.left!.heft > q.right!.heft ? q.left! : q.right!;
        const light = heavy === q.left ? q.right! : q.left!;
        expect(q.answer).toBe(q.ask === 'heavier' ? heavy.id : light.id);
        expect(q.options).toContain(q.answer);
        if (s.task === 'heavier') expect(q.ask).toBe('heavier');
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
    for (const s of WEIGH_STEPS) {
      for (let i = 0; i < MANY; i += 1) {
        const q = weighQuestion(s);
        expect(q.options, s.name).toContain(q.answer);
        expect(new Set(q.options).size, s.name).toBe(q.options.length);
        if (q.task === 'class') expect(q.answer).toBe(classFor(q.kg!)!.name);
        if (q.task === 'gi') expect(q.answer).toBe(q.giOn ? q.kg : q.kg! + GI_KG);
        if (q.task === 'blocks') expect(q.answer).toBe(q.thing!.heft);
      }
    }
  });

  it('never asks the same again straight away', () => {
    for (const s of WEIGH_STEPS) {
      let last = weighQuestion(s);
      for (let i = 0; i < 100; i += 1) {
        const q = weighQuestion(s, last);
        if (q.task === 'bags') expect(`${q.answer} ${q.by}`, s.name).not.toBe(`${last.answer} ${last.by}`);
        else if (q.task !== 'heavier' && q.task !== 'mixed') expect(q.answer, s.name).not.toBe(last.answer);
        last = q;
      }
    }
  });
});

describe('Weigh-In, Years 3–4: grams', () => {
  it('puts the balance and the kitchen scale in the same order, the gi heavier than both', () => {
    const both = WEIGH_THINGS.filter((t) => GRAM_THINGS.some((g) => g.id === t.id));
    expect(both.length).toBeGreaterThanOrEqual(5);
    for (let i = 1; i < both.length; i += 1) {
      const [a, b] = [GRAM_THINGS.find((g) => g.id === both[i - 1].id)!, GRAM_THINGS.find((g) => g.id === both[i].id)!];
      /* the lighter on the balance is never heavier on the kitchen scale */
      expect(a.grams[1], `${a.id} and ${b.id}`).toBeLessThan(b.grams[0]);
    }
    const gi = WEIGH_THINGS.find((t) => t.id === 'gi')!;
    for (const t of both) {
      expect(t.heft, t.id).toBeLessThan(gi.heft);
      expect(GRAM_THINGS.find((g) => g.id === t.id)!.grams[1], t.id).toBeLessThan(GI_KG * 1000);
    }
  });

  it('weighs each small thing on the kitchen scale, in its own range', () => {
    for (const t of GRAM_THINGS) {
      expect(t.grams[0]).toBeLessThanOrEqual(t.grams[1]);
      expect(t.grams[0]).toBeGreaterThan(0);
      expect(t.grams[1]).toBeLessThanOrEqual(KITCHEN_DIAL.hi);
      expect(t.name.en).toBeTruthy();
      expect(t.name.pt).toBeTruthy();
    }
    for (let i = 0; i < MANY; i += 1) {
      const q = weighQuestion(step('grams'));
      expect(q.answer).toBe(q.shows);
      expect(q.shows! % KITCHEN_DIAL.mark).toBe(0);
      expect(q.shows!).toBeGreaterThanOrEqual(q.small!.grams[0]);
      expect(q.shows!).toBeLessThanOrEqual(q.small!.grams[1]);
      expect(q.options).toHaveLength(4);
      for (const o of q.options as number[]) { expect(o).toBeGreaterThan(0); expect(o).toBeLessThanOrEqual(1000); }
    }
  });

  it('says where the pointer is: on a number, or halfway, and 1000 grams is 1 kilogram', () => {
    const ball = GRAM_THINGS.find((t) => t.id === 'ball')!;
    expect(gramsWhy(ball, 400).en).toBe('The pointer is on 400: the ball weighs 400 grams.');
    expect(gramsWhy(ball, 350).en).toBe('The pointer is halfway between 300 and 400: the ball weighs 350 grams.');
    expect(gramsWhy(ball, 350).pt).toBe('O ponteiro está no meio, entre 300 e 400: a bola pesa 350 gramas.');
    const pineapple = GRAM_THINGS.find((t) => t.id === 'pineapple')!;
    expect(gramsWhy(pineapple, 1000).en).toContain('1000 grams is 1 kilogram.');
    expect(gramsWhy(pineapple, 1000).pt).toContain('o abacaxi pesa 1000 gramas. 1000 gramas são 1 quilo.');
  });

  it('makes a kilogram: the grams on the scale and the answer make 1000', () => {
    for (let i = 0; i < MANY; i += 1) {
      const q = weighQuestion(step('kilo'));
      expect(q.shows! + (q.answer as number)).toBe(1000);
      expect(q.shows!).toBeGreaterThan(0);
      expect(q.answer as number).toBeGreaterThan(0);
    }
    expect(kiloWhy(600).en).toBe('The scale shows 600 grams. 1 kilogram is 1000 grams: 600 and 400 make 1000. 400 grams more.');
    /* not on a hundred: to the next hundred first */
    expect(kiloWhy(650).en).toBe('The scale shows 650 grams. 1 kilogram is 1000 grams: 650 and 50 make 700, and 300 more make 1000. 350 grams more.');
    expect(kiloWhy(950).en).toContain('950 and 50 make 1000. 50 grams more.');
    expect(kiloWhy(650).pt).toBe('A balança mostra 650 gramas. 1 quilo é 1000 gramas: 650 e 50 fazem 700, e mais 300 fazem 1000. Faltam 350 gramas.');
  });
});

describe('Weigh-In, Year 4: between the numbers', () => {
  it('has scales whose numbers fall on marks, with few enough marks to count on a phone', () => {
    for (const d of MARK_DIALS) {
      expect(d.number % d.mark, JSON.stringify(d)).toBe(0);
      expect((d.hi - d.lo) % d.number, JSON.stringify(d)).toBe(0);
      expect((d.hi - d.lo) / d.mark, JSON.stringify(d)).toBeLessThanOrEqual(25);
      /* a space is never just 1: that is Year 2's scale */
      expect(d.mark).toBeGreaterThan(1);
    }
    expect(new Set(MARK_DIALS.map((d) => d.mark))).toEqual(new Set([2, 20, 25, 50, 100]));
  });

  it('puts the pointer on a mark with no number, on something that weighs about that', () => {
    const seen = new Set<string>();
    for (let i = 0; i < MANY * 2; i += 1) {
      const q = weighQuestion(step('marks'));
      expect(unnumbered(q.shows!, q.dial!)).toBe(true);
      expect(q.answer).toBe(q.shows);
      if (q.dial!.unit === 'g') {
        expect(q.shows!).toBeGreaterThanOrEqual(q.small!.grams[0]);
        expect(q.shows!).toBeLessThanOrEqual(q.small!.grams[1]);
      } else expect(q.small).toBeUndefined();
      seen.add(`${q.dial!.mark}${q.dial!.unit}`);
    }
    /* every scale comes up */
    expect(seen.size).toBe(MARK_DIALS.length);
  });

  it('offers the slip of counting each space as 10, and a mark either side', () => {
    const fifties = MARK_DIALS.find((d) => d.mark === 50)!;
    expect(markChoices(350, fifties)).toEqual([230, 300, 350, 400]);
    const twos = MARK_DIALS.find((d) => d.unit === 'kg')!;
    /* 2 marks past 20 is 24, or 22 counting each as 1 */
    expect(markChoices(24, twos)).toEqual([22, 24, 26, 28]);
    for (const d of MARK_DIALS) {
      for (let v = d.lo; v <= d.hi; v += d.mark) {
        if (!unnumbered(v, d)) continue;
        const options = markChoices(v, d);
        expect(options, `${v} on ${JSON.stringify(d)}`).toHaveLength(4);
        expect(options).toContain(v);
        for (const o of options) { expect(o).toBeGreaterThan(d.lo); expect(o).toBeLessThanOrEqual(d.hi); }
      }
    }
  });

  it('works out what a space is worth, then counts on to the pointer', () => {
    const fifties = MARK_DIALS.find((d) => d.mark === 50)!;
    expect(marksWhy(fifties, 350, { en: 'the trophy', pt: 'o troféu' })).toEqual({
      en: 'There are 4 spaces from 200 to 400, so each space is 50 grams. Count on from 200: 250, 300, 350. The trophy weighs 350 grams.',
      pt: 'São 4 espaços do 200 ao 400, então cada espaço vale 50 gramas. Conte a partir do 200: 250, 300, 350. O troféu pesa 350 gramas.',
    });
    const twos = MARK_DIALS.find((d) => d.unit === 'kg')!;
    expect(marksWhy(twos, 24, { en: 'Blue', pt: 'o Azul' }).en)
      .toBe('There are 5 spaces from 20 to 30, so each space is 2 kilograms. Count on from 20: 22, 24. Blue weighs 24 kilograms.');
  });
});

describe('Weigh-In, Years 3–4: two bags', () => {
  it('writes kilograms and grams the way a tag does, and says them in words', () => {
    expect(kgAndG(900)).toBe('900 g');
    expect(kgAndG(3000)).toBe('3 kg');
    expect(kgAndG(3200)).toBe('3 kg 200 g');
    expect(unitsSaid('3 kg 200 g is heavier than 1 kg.', 'en')).toBe('3 kilograms 200 grams is heavier than 1 kilogram.');
    expect(unitsSaid('a mochila do Azul é 400 g mais pesada: 1 kg', 'pt')).toBe('a mochila do Azul é 400 gramas mais pesada: 1 quilo');
    /* the words already there are left alone */
    expect(unitsSaid('400 gramas, 2 kilograms', 'en')).toBe('400 gramas, 2 kilograms');
  });

  it('has one bag heavier by less than a kilogram, often with fewer grams on its tag', () => {
    let trap = 0;
    for (let i = 0; i < MANY; i += 1) {
      const q = weighQuestion(step('bags'));
      const { Blue, White } = q.bags!;
      expect(q.answer).toBe(Blue > White ? 'Blue' : 'White');
      expect(q.by).toBe(Math.abs(Blue - White));
      expect(q.by!).toBeGreaterThanOrEqual(100);
      expect(q.by!).toBeLessThanOrEqual(900);
      expect(q.byOptions).toContain(q.by);
      expect(new Set(q.byOptions).size).toBe(4);
      const heavy = Math.max(Blue, White);
      const light = Math.min(Blue, White);
      if (heavy % 1000 < light % 1000) {
        trap += 1;
        /* and the slip of taking the grams from the grams is offered */
        expect(q.byOptions).toContain(light % 1000 - heavy % 1000);
      }
    }
    expect(trap).toBeGreaterThan(MANY / 4);
  });

  it('takes the grams away, or counts up through the kilogram', () => {
    expect(bagsWhy({ Blue: 3700, White: 3200 }).en)
      .toBe("Both bags have 3 kg, and 700 g take away 200 g is 500 g: Blue's bag is 500 g heavier.");
    expect(bagsWhy({ Blue: 3200, White: 2800 }).en)
      .toBe("2 kg 800 g and 200 g make 3 kg, and 200 g more is 3 kg 200 g: Blue's bag is 400 g heavier.");
    expect(bagsWhy({ Blue: 2600, White: 3000 }).en)
      .toBe("2 kg 600 g and 400 g make 3 kg: White's bag is 400 g heavier.");
    /* the heavier side missed too: the kilograms first */
    expect(bagsWhy({ Blue: 3200, White: 2800 }, true).en)
      .toBe("3 kg is more than 2 kg, so Blue's bag is heavier. 2 kg 800 g and 200 g make 3 kg, and 200 g more is 3 kg 200 g: Blue's bag is 400 g heavier.");
    expect(bagsWhy({ Blue: 2800, White: 3200 }).pt)
      .toBe('2 kg 800 g e 200 g fazem 3 kg, e mais 200 g dá 3 kg 200 g: a mochila do Branco é 400 g mais pesada.');
  });
});
