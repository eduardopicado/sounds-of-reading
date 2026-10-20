/* Weigh-In — heavier, lighter, kilograms and grams, at a jiu-jitsu competition.
 *
 * Every fighter is weighed before a competition. Kindergarten and Year 1 use
 * a balance: the side that goes down is heavier. Then they measure a thing
 * in blocks, the informal unit measuring starts with. Year 2 reads the
 * kilograms off the scale, finds which weight class that is (Galo, Pluma,
 * Pena...), and adds on or takes off the gi, since he is weighed wearing it.
 * Years 3 and 4 weigh the small things in grams on a kitchen scale, make up
 * a kilogram of bananas for the team, read scales whose marks are not all
 * numbered, and say which of two bags is heavier, and by how much.
 *
 * Bilingual like the other jiu-jitsu games: the flags switch everything
 * between English and Portuguese, mid-question too. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import {
  FIGHTER_DIAL, GI_KG, SIDE_NAME, WEIGHT_CLASSES, WEIGH_SAYS, WEIGH_STEPS, WEIGH_THINGS,
  bagsWhy, feminine, gramsWhy, kgAndG, kiloWhy, marksWhy, theThing, unitsSaid, weighQuestion,
  type Both, type Dial, type Side, type WeighQuestion, type WeighStep, type WeighThing,
} from '../content/bjj';
import { mountMaths, type Kit } from './maths-kit';
import { BLUE_GI, langSwitch, speak } from './bjj-kit';
import { svg } from '../ui/writing';

export function mount(root: HTMLElement): () => void {
  return mountMaths<WeighStep>({
    id: 'weigh-in',
    title: 'Weigh',
    swash: 'In',
    tagline: 'Heavier or lighter? Then kilograms, his weight class, and grams.',
    steps: WEIGH_STEPS,
    face: '⚖️',
    build,
  }, root);
}

const thingById = (id: string): WeighThing => WEIGH_THINGS.find((t) => t.id === id)!;
const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);
/** a number and its unit kept on one line: "200 g", never "200" then "g" */
const glued = (s: string): string => s.replace(/(\d) (kg|g)\b/g, '$1\u00a0$2');

/* ── the pictures ────────────────────────────────────────────────────── */

const INK = '#1E2B2A';

/** a balance: the beam tips down on the heavier side; tilt 0 is level */
function balance(left: SVGElement[], right: SVGElement[], tilt: number): SVGSVGElement {
  const pic = svg('svg', { class: 'wi-pic', viewBox: '0 0 300 200', role: 'img', 'aria-label': tilt === 0 ? 'A level balance' : 'A balance, one side down' });
  const beam = svg('g', { transform: `rotate(${tilt} 150 60)` });
  beam.append(svg('rect', { x: 40, y: 55, width: 220, height: 10, rx: 5, fill: '#B5895A', stroke: INK, 'stroke-width': 3 }));
  const pan = (x: number, things: SVGElement[]): SVGElement => {
    /* the pan hangs straight down from the end of the beam, whatever the tilt */
    const g = svg('g', { transform: `rotate(${-tilt} ${x} 60)` },
      svg('path', { d: `M${x} 60 L${x - 40} 130 M${x} 60 L${x + 40} 130`, stroke: INK, 'stroke-width': 2 }),
      svg('path', { d: `M${x - 48} 130 Q${x} 160 ${x + 48} 130 Z`, fill: '#E9E2D2', stroke: INK, 'stroke-width': 3 }),
      ...things);
    return g;
  };
  beam.append(pan(50, left), pan(250, right));
  pic.append(
    svg('path', { d: 'M150 60 L120 190 L180 190 Z', fill: '#8C9096', stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }),
    beam,
    svg('circle', { cx: 150, cy: 60, r: 8, fill: '#F3B229', stroke: INK, 'stroke-width': 3 }),
  );
  return pic;
}

/** a thing sitting in a pan centred at x */
const onPan = (t: WeighThing, x: number): SVGElement[] => {
  const label = svg('text', { x, y: 128, 'font-size': 46, 'text-anchor': 'middle' });
  label.textContent = t.picture;
  return [label];
};

/** n blocks stacked in a pan centred at x */
function blocks(n: number, x: number): SVGElement[] {
  const out: SVGElement[] = [];
  const perRow = 4;
  for (let i = 0; i < n; i += 1) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const inRow = Math.min(perRow, n - row * perRow);
    out.push(svg('rect', {
      class: 'wi-block', x: x - (inRow * 20) / 2 + col * 20, y: 112 - row * 20, width: 18, height: 18, rx: 3,
      fill: '#5B8DEF', stroke: INK, 'stroke-width': 2,
    }));
  }
  return out;
}

/** a scale's dial as a straight strip, the pointer on `shows`: a mark every
    dial.mark and a number every dial.number. The kitchen scale's 1000 g has
    "1 kg" under it. */
function scale(shows: number, dial: Dial): SVGSVGElement {
  const x = (v: number): number => 28 + ((v - dial.lo) / (dial.hi - dial.lo)) * 364;
  const pic = svg('svg', {
    class: 'wi-scale', viewBox: '0 0 420 110', role: 'img', 'aria-label': `A scale in ${dial.unit === 'g' ? 'grams' : 'kilograms'}`,
  }, svg('rect', { x: 4, y: 10, width: 412, height: 92, rx: 14, fill: '#FFF6E7', stroke: INK, 'stroke-width': 3 }));
  /* eleven numbers need a smaller size to keep 900 and 1000 apart */
  const size = (dial.hi - dial.lo) / dial.number > 6 ? 14 : 18;
  const text = (at: number, y: number, words: string, attrs: Record<string, string | number> = {}): SVGElement => {
    const t = svg('text', { x: at, y, 'font-size': size, 'text-anchor': 'middle', 'font-weight': 700, fill: INK, ...attrs });
    t.textContent = words;
    return t;
  };
  for (let v = dial.lo; v <= dial.hi; v += dial.mark) {
    const big = (v - dial.lo) % dial.number === 0;
    pic.append(svg('line', { class: big ? 'wi-mark numbered' : 'wi-mark', x1: x(v), x2: x(v), y1: 24, y2: big ? 52 : 40, stroke: INK, 'stroke-width': big ? 3 : 1.5 }));
    if (big) pic.append(text(x(v), 74, String(v)));
  }
  pic.append(text(210, 96, dial.unit, { 'font-size': 14, 'font-weight': 400 }));
  if (dial.unit === 'g' && dial.hi === 1000) pic.append(text(x(1000), 96, '1 kg', { 'font-size': 14, fill: '#2F6FC4' }));
  pic.append(
    svg('path', { class: 'wi-pointer', d: `M${x(shows)} 22 L${x(shows) - 8} 6 L${x(shows) + 8} 6 Z`, fill: '#E4572E', stroke: INK, 'stroke-width': 2 }),
    svg('line', { x1: x(shows), x2: x(shows), y1: 22, y2: 56, stroke: '#E4572E', 'stroke-width': 3 }));
  pic.dataset.value = String(shows);
  pic.dataset.unit = dial.unit;
  return pic;
}

/** a fighter's bag, in his colour, with its weight on the tag */
function bag(side: Side, grams: number): { node: HTMLElement; name: HTMLElement } {
  const pic = svg('svg', { class: 'wi-bag-pic', viewBox: '0 0 160 110', 'aria-hidden': 'true' },
    svg('path', { d: 'M58 34 Q58 8 80 8 Q102 8 102 34', fill: 'none', stroke: INK, 'stroke-width': 7, 'stroke-linecap': 'round' }),
    svg('rect', { x: 12, y: 30, width: 136, height: 74, rx: 24, fill: side === 'Blue' ? BLUE_GI : '#F4F1EA', stroke: INK, 'stroke-width': 4 }),
    svg('path', { d: 'M30 52 H130', stroke: INK, 'stroke-width': 3, 'stroke-dasharray': '6 5', opacity: 0.55 }));
  const name = el('span', { class: 'wi-bag-name' });
  const node = el('figure', { class: `wi-bag ${side.toLowerCase()}`, dataset: { side } },
    pic, el('figcaption', {}, name, el('span', { class: 'wi-tag', text: kgAndG(grams) })));
  return { node, name };
}

/* ── the game ────────────────────────────────────────────────────────── */

function build(kit: Kit) {
  const langs = langSwitch();
  const ask = el('p', { class: 'mx-ask' });
  const card = el('div', { class: 'wi-card' });
  const node = el('div', { class: 'mx-stage' }, langs.node, card, ask);
  let last: WeighQuestion | undefined;
  /** redraws the words on screen in the chosen language */
  let retext: () => void = () => undefined;
  langs.onChange(() => { retext(); });
  const lang = () => langs.lang();
  /** said in the chosen language, with "kg" and "g" said as words */
  const talk = (text: Both): void => speak({ en: unitsSaid(text.en, 'en'), pt: unitsSaid(text.pt, 'pt') }, lang());
  /** the buttons for an amount show its unit */
  const inUnit = (unit: 'g' | 'kg') => (n: string): string => `${n} ${unit}`;

  async function finish(ok: boolean, why: Both): Promise<boolean> {
    if (ok) sfx.cheer(); else sfx.wrong();
    const show = (): void => kit.note(glued(`${ok ? (lang() === 'pt' ? 'Isso! ' : 'Yes! ') : ''}${why[lang()]}`), ok);
    show();
    retext = show;
    talk(why);
    await kit.wait(ok ? 2600 : 3800);
    return ok;
  }

  async function compare(q: WeighQuestion): Promise<boolean> {
    const left = q.left!;
    const right = q.right!;
    const heavy = left.heft > right.heft ? left : right;
    const light = heavy === left ? right : left;
    card.replaceChildren(balance(onPan(left, 50), onPan(right, 250), heavy === left ? -12 : 12));
    const question = q.ask === 'heavier' ? WEIGH_SAYS.heavier : WEIGH_SAYS.lighter;
    const label = (id: string): string => `${thingById(id).picture} ${cap(thingById(id).name[lang()])}`;
    retext = () => { ask.textContent = question[lang()]; kit.choices.relabel(label); };
    retext();
    talk(question);
    const picked = await kit.choices.askWords(q.options as string[], label);
    kit.choices.revealWord(String(q.answer), picked);
    return finish(picked === q.answer, {
      en: `The side that goes down is heavier: ${theThing(heavy, 'en')} is heavier than ${theThing(light, 'en')}.`,
      pt: `O lado que desce é o mais pesado: ${theThing(heavy, 'pt')} é mais pesad${feminine(heavy) ? 'a' : 'o'} que ${theThing(light, 'pt')}.`,
    });
  }

  async function measure(q: WeighQuestion): Promise<boolean> {
    const t = q.thing!;
    card.replaceChildren(balance(onPan(t, 50), blocks(t.heft, 250), 0));
    const question = WEIGH_SAYS.blocks(t);
    retext = () => { ask.textContent = question[lang()]; };
    retext();
    talk(question);
    const picked = await kit.choices.ask(q.options as number[]);
    kit.choices.reveal(Number(q.answer), picked);
    card.querySelectorAll('.wi-block').forEach((b) => b.classList.add('counted'));
    return finish(picked === q.answer, {
      en: `${cap(theThing(t, 'en'))} weighs ${t.heft} blocks: it balances ${t.heft} blocks.`,
      pt: `${cap(theThing(t, 'pt'))} pesa ${t.heft} blocos: equilibra ${t.heft} blocos.`,
    });
  }

  async function read(q: WeighQuestion): Promise<boolean> {
    const kg = q.kg!;
    card.replaceChildren(el('div', { class: 'wi-on-scale', 'aria-hidden': 'true', text: '🥋' }), scale(kg, FIGHTER_DIAL));
    const question = WEIGH_SAYS.scale;
    retext = () => { ask.textContent = question[lang()]; };
    retext();
    talk(question);
    const picked = await kit.choices.ask(q.options as number[]);
    kit.choices.reveal(kg, picked);
    return finish(picked === kg, {
      en: `The pointer is on ${kg}: Blue weighs ${kg} kilograms.`,
      pt: `O ponteiro está no ${kg}: o Azul pesa ${kg} quilos.`,
    });
  }

  async function weightClass(q: WeighQuestion): Promise<boolean> {
    const kg = q.kg!;
    const table = el('table', { class: 'wi-classes' },
      el('tbody', {}, ...WEIGHT_CLASSES.map((c) => el('tr', { dataset: { cls: c.name } },
        el('th', { text: c.name }), el('td', { class: 'wi-upto' })))));
    card.replaceChildren(el('p', { class: 'wi-kg' }), table);
    const question = WEIGH_SAYS.class;
    retext = () => {
      card.querySelector('.wi-kg')!.textContent = lang() === 'pt' ? `O Azul pesa ${kg} kg.` : `Blue weighs ${kg} kg.`;
      table.querySelectorAll<HTMLElement>('tr').forEach((row) => {
        const c = WEIGHT_CLASSES.find((w) => w.name === row.dataset.cls)!;
        row.querySelector('.wi-upto')!.textContent = lang() === 'pt' ? `até ${c.upTo} kg` : `up to ${c.upTo} kg`;
      });
      ask.textContent = question[lang()];
    };
    retext();
    talk({ en: `Blue weighs ${kg} kilograms. ${question.en}`, pt: `O Azul pesa ${kg} quilos. ${question.pt}` });
    const picked = await kit.choices.askWords(q.options as string[]);
    kit.choices.revealWord(String(q.answer), picked);
    table.querySelector(`tr[data-cls="${q.answer}"]`)?.classList.add('right');
    const c = WEIGHT_CLASSES.find((w) => w.name === q.answer)!;
    const before = WEIGHT_CLASSES[WEIGHT_CLASSES.indexOf(c) - 1];
    return finish(picked === q.answer, {
      en: `${kg} kg is up to ${c.upTo}${before ? ` and over ${before.upTo}` : ''}: ${c.name}.`,
      pt: `${kg} kg é até ${c.upTo}${before ? ` e mais que ${before.upTo}` : ''}: ${c.name}.`,
    });
  }

  async function gi(q: WeighQuestion): Promise<boolean> {
    const kg = q.kg!;
    const on = kg + GI_KG;
    card.replaceChildren(el('div', { class: 'wi-on-scale', 'aria-hidden': 'true', text: q.giOn ? '🥋' : '🩳' }),
      q.giOn ? scale(on, FIGHTER_DIAL) : el('p', { class: 'wi-kg' }));
    const question: Both = q.giOn
      ? { en: `He is weighed in his gi. The gi weighs ${GI_KG} kg. How much does Blue weigh without it?`,
          pt: `Ele se pesa de quimono. O quimono pesa ${GI_KG} kg. Quanto o Azul pesa sem ele?` }
      : { en: `Blue weighs ${kg} kg. His gi weighs ${GI_KG} kg. What will the scale show with the gi on?`,
          pt: `O Azul pesa ${kg} kg. O quimono pesa ${GI_KG} kg. Quanto a balança vai mostrar de quimono?` };
    retext = () => { ask.textContent = glued(question[lang()]); };
    retext();
    talk(question);
    const picked = await kit.choices.ask(q.options as number[]);
    kit.choices.reveal(Number(q.answer), picked);
    return finish(picked === q.answer, q.giOn
      ? { en: `${on} take away ${GI_KG} is ${kg}: Blue weighs ${kg} kg.`, pt: `${on} menos ${GI_KG} é ${kg}: o Azul pesa ${kg} kg.` }
      : { en: `${kg} add ${GI_KG} is ${on}: the scale shows ${on} kg.`, pt: `${kg} mais ${GI_KG} é ${on}: a balança mostra ${on} kg.` });
  }

  /** the kitchen scale: a small thing's grams, or how many more make 1 kilogram */
  async function kitchen(q: WeighQuestion): Promise<boolean> {
    const t = q.small!;
    const shows = q.shows!;
    /* about 150 grams a banana, so the bunch grows as the grams do */
    const bunch = '🍌'.repeat(Math.max(1, Math.min(6, Math.round(shows / 150))));
    card.replaceChildren(el('div', { class: 'wi-on-scale', 'aria-hidden': 'true', text: q.task === 'kilo' ? bunch : t.picture }),
      scale(shows, q.dial!));
    const question = q.task === 'kilo' ? WEIGH_SAYS.kilo : WEIGH_SAYS.grams(t);
    retext = () => { ask.textContent = question[lang()]; };
    retext();
    talk(question);
    const picked = await kit.choices.askWords(q.options.map(String), inUnit('g'));
    kit.choices.revealWord(String(q.answer), picked);
    return finish(Number(picked) === q.answer, q.task === 'kilo' ? kiloWhy(shows) : gramsWhy(t, shows));
  }

  /** a scale whose marks are not all numbered */
  async function between(q: WeighQuestion): Promise<boolean> {
    const dial = q.dial!;
    const shows = q.shows!;
    const t = q.small;
    card.replaceChildren(el('div', { class: 'wi-on-scale', 'aria-hidden': 'true', text: t ? t.picture : '🥋' }), scale(shows, dial));
    const question = t ? WEIGH_SAYS.grams(t) : WEIGH_SAYS.scale;
    retext = () => { ask.textContent = question[lang()]; };
    retext();
    talk(question);
    const picked = await kit.choices.askWords(q.options.map(String), inUnit(dial.unit));
    kit.choices.revealWord(String(q.answer), picked);
    const who: Both = t ? { en: theThing(t, 'en'), pt: theThing(t, 'pt') } : { en: 'Blue', pt: 'o Azul' };
    return finish(Number(picked) === q.answer, marksWhy(dial, shows, who));
  }

  /** two bags: which is heavier, then by how much */
  async function bags(q: WeighQuestion): Promise<boolean> {
    const weights = q.bags!;
    const heavier = q.answer as Side;
    const blue = bag('Blue', weights.Blue);
    const white = bag('White', weights.White);
    card.replaceChildren(el('div', { class: 'wi-bags' }, blue.node, white.node));
    const names = (): void => {
      blue.name.textContent = SIDE_NAME.Blue[lang()];
      white.name.textContent = SIDE_NAME.White[lang()];
    };
    const sideLabel = (side: string): string => WEIGH_SAYS.bag(side as Side)[lang()];
    retext = () => { names(); ask.textContent = WEIGH_SAYS.bags[lang()]; kit.choices.relabel(sideLabel); };
    retext();
    talk(WEIGH_SAYS.bags);
    const side = await kit.choices.askWords(q.options as string[], sideLabel);
    kit.choices.revealWord(heavier, side);
    card.querySelector(`.wi-bag[data-side="${heavier}"]`)?.classList.add('heavier');
    await kit.wait(1200);

    card.dataset.answer = String(q.by);
    const second = WEIGH_SAYS.by(heavier);
    retext = () => { names(); ask.textContent = second[lang()]; };
    retext();
    talk(second);
    const by = await kit.choices.askWords(q.byOptions!.map(String), inUnit('g'));
    kit.choices.revealWord(String(q.by), by);
    return finish(side === heavier && Number(by) === q.by, bagsWhy(weights, side !== heavier));
  }

  return {
    node,
    ask: async (step: WeighStep): Promise<boolean> => {
      const q = weighQuestion(step, last);
      last = q;
      kit.choices.clear();
      card.dataset.answer = String(q.answer);
      card.dataset.task = q.task;
      if (q.task === 'heavier' || q.task === 'mixed') return compare(q);
      if (q.task === 'blocks') return measure(q);
      if (q.task === 'scale') return read(q);
      if (q.task === 'class') return weightClass(q);
      if (q.task === 'gi') return gi(q);
      if (q.task === 'grams' || q.task === 'kilo') return kitchen(q);
      if (q.task === 'marks') return between(q);
      return bags(q);
    },
  };
}
