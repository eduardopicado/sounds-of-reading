/* Weigh-In — heavier, lighter, and kilograms, at a jiu-jitsu competition.
 *
 * Every fighter is weighed before a competition. Kindergarten and Year 1 use
 * a balance: the side that goes down is heavier. Then they measure a thing
 * in blocks, the informal unit measuring starts with. Year 2 reads the
 * kilograms off the scale, finds which weight class that is (Galo, Pluma,
 * Pena...), and adds on or takes off the gi, since he is weighed wearing it.
 *
 * Bilingual like the other jiu-jitsu games: the flags switch everything
 * between English and Portuguese, mid-question too. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import {
  GI_KG, WEIGHT_CLASSES, WEIGH_STEPS, WEIGH_THINGS, weighQuestion,
  type Both, type WeighQuestion, type WeighStep, type WeighThing,
} from '../content/bjj';
import { mountMaths, type Kit } from './maths-kit';
import { langSwitch, speak } from './bjj-kit';
import { svg } from '../ui/writing';

export function mount(root: HTMLElement): () => void {
  return mountMaths<WeighStep>({
    id: 'weigh-in',
    title: 'Weigh',
    swash: 'In',
    tagline: 'Heavier or lighter? Then kilograms, and his weight class.',
    steps: WEIGH_STEPS,
    face: '⚖️',
    build,
  }, root);
}

const thingById = (id: string): WeighThing => WEIGH_THINGS.find((t) => t.id === id)!;
const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);
/** "o quimono", "a bola": Portuguese needs the article */
const PT_FEMININE = new Set(['pena', 'medalha', 'banana', 'bola', 'mochila', 'melancia', 'pedra']);
const the = (t: WeighThing, lang: 'en' | 'pt'): string =>
  lang === 'en' ? `the ${t.name.en}` : `${PT_FEMININE.has(t.name.pt) ? 'a' : 'o'} ${t.name.pt}`;

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

/** the scale's dial as a straight strip, 15 to 35 kg, the pointer at kg */
function scale(kg: number): SVGSVGElement {
  const lo = 15;
  const hi = 35;
  const x = (v: number): number => 20 + ((v - lo) / (hi - lo)) * 360;
  const pic = svg('svg', { class: 'wi-scale', viewBox: '0 0 400 110', role: 'img', 'aria-label': 'A scale in kilograms' },
    svg('rect', { x: 4, y: 10, width: 392, height: 92, rx: 14, fill: '#FFF6E7', stroke: INK, 'stroke-width': 3 }));
  for (let v = lo; v <= hi; v += 1) {
    const big = v % 5 === 0;
    pic.append(svg('line', { x1: x(v), x2: x(v), y1: 24, y2: big ? 52 : 40, stroke: INK, 'stroke-width': big ? 3 : 1.5 }));
    if (big) {
      const t = svg('text', { x: x(v), y: 74, 'font-size': 18, 'text-anchor': 'middle', 'font-weight': 700, fill: INK });
      t.textContent = String(v);
      pic.append(t);
    }
  }
  const kgLabel = svg('text', { x: 370, y: 94, 'font-size': 14, 'text-anchor': 'middle', fill: INK });
  kgLabel.textContent = 'kg';
  pic.append(kgLabel,
    svg('path', { class: 'wi-pointer', d: `M${x(kg)} 22 L${x(kg) - 8} 6 L${x(kg) + 8} 6 Z`, fill: '#E4572E', stroke: INK, 'stroke-width': 2 }),
    svg('line', { x1: x(kg), x2: x(kg), y1: 22, y2: 56, stroke: '#E4572E', 'stroke-width': 3 }));
  pic.dataset.kg = String(kg);
  return pic;
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

  async function finish(ok: boolean, why: Both): Promise<boolean> {
    if (ok) sfx.cheer(); else sfx.wrong();
    const show = (): void => kit.note(`${ok ? (lang() === 'pt' ? 'Isso! ' : 'Yes! ') : ''}${why[lang()]}`, ok);
    show();
    retext = show;
    speak(why, lang());
    await kit.wait(ok ? 2600 : 3800);
    return ok;
  }

  async function compare(q: WeighQuestion): Promise<boolean> {
    const left = q.left!;
    const right = q.right!;
    const heavy = left.heft > right.heft ? left : right;
    const light = heavy === left ? right : left;
    card.replaceChildren(balance(onPan(left, 50), onPan(right, 250), heavy === left ? -12 : 12));
    const question: Both = q.ask === 'heavier'
      ? { en: 'Which is heavier?', pt: 'Qual é mais pesado?' }
      : { en: 'Which is lighter?', pt: 'Qual é mais leve?' };
    const label = (id: string): string => `${thingById(id).picture} ${cap(thingById(id).name[lang()])}`;
    retext = () => { ask.textContent = question[lang()]; kit.choices.relabel(label); };
    retext();
    speak(question, lang());
    const picked = await kit.choices.askWords(q.options as string[], label);
    kit.choices.revealWord(String(q.answer), picked);
    return finish(picked === q.answer, {
      en: `The side that goes down is heavier: ${the(heavy, 'en')} is heavier than ${the(light, 'en')}.`,
      pt: `O lado que desce é o mais pesado: ${the(heavy, 'pt')} é mais pesad${PT_FEMININE.has(heavy.name.pt) ? 'a' : 'o'} que ${the(light, 'pt')}.`,
    });
  }

  async function measure(q: WeighQuestion): Promise<boolean> {
    const t = q.thing!;
    card.replaceChildren(balance(onPan(t, 50), blocks(t.heft, 250), 0));
    const question: Both = {
      en: `The balance is level. How many blocks does ${the(t, 'en')} weigh?`,
      pt: `A balança está equilibrada. Quantos blocos pesa ${the(t, 'pt')}?`,
    };
    retext = () => { ask.textContent = question[lang()]; };
    retext();
    speak(question, lang());
    const picked = await kit.choices.ask(q.options as number[]);
    kit.choices.reveal(Number(q.answer), picked);
    card.querySelectorAll('.wi-block').forEach((b) => b.classList.add('counted'));
    return finish(picked === q.answer, {
      en: `${cap(the(t, 'en'))} weighs ${t.heft} blocks: it balances ${t.heft} blocks.`,
      pt: `${cap(the(t, 'pt'))} pesa ${t.heft} blocos: equilibra ${t.heft} blocos.`,
    });
  }

  async function read(q: WeighQuestion): Promise<boolean> {
    const kg = q.kg!;
    card.replaceChildren(el('div', { class: 'wi-on-scale', 'aria-hidden': 'true', text: '🥋' }), scale(kg));
    const question: Both = { en: 'Blue is on the scale. How many kilograms?', pt: 'O Azul está na balança. Quantos quilos?' };
    retext = () => { ask.textContent = question[lang()]; };
    retext();
    speak(question, lang());
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
    const question: Both = { en: 'Which weight class does Blue fight in?', pt: 'Em qual categoria o Azul luta?' };
    retext = () => {
      card.querySelector('.wi-kg')!.textContent = lang() === 'pt' ? `O Azul pesa ${kg} kg.` : `Blue weighs ${kg} kg.`;
      table.querySelectorAll<HTMLElement>('tr').forEach((row) => {
        const c = WEIGHT_CLASSES.find((w) => w.name === row.dataset.cls)!;
        row.querySelector('.wi-upto')!.textContent = lang() === 'pt' ? `até ${c.upTo} kg` : `up to ${c.upTo} kg`;
      });
      ask.textContent = question[lang()];
    };
    retext();
    speak({ en: `Blue weighs ${kg} kilograms. ${question.en}`, pt: `O Azul pesa ${kg} quilos. ${question.pt}` }, lang());
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
      q.giOn ? scale(on) : el('p', { class: 'wi-kg' }));
    const question: Both = q.giOn
      ? { en: `He is weighed in his gi. The gi weighs ${GI_KG} kg. How much does Blue weigh without it?`,
          pt: `Ele se pesa de quimono. O quimono pesa ${GI_KG} kg. Quanto o Azul pesa sem ele?` }
      : { en: `Blue weighs ${kg} kg. His gi weighs ${GI_KG} kg. What will the scale show with the gi on?`,
          pt: `O Azul pesa ${kg} kg. O quimono pesa ${GI_KG} kg. Quanto a balança vai mostrar de quimono?` };
    retext = () => { ask.textContent = question[lang()]; };
    retext();
    speak(question, lang());
    const picked = await kit.choices.ask(q.options as number[]);
    kit.choices.reveal(Number(q.answer), picked);
    return finish(picked === q.answer, q.giOn
      ? { en: `${on} take away ${GI_KG} is ${kg}: Blue weighs ${kg} kg.`, pt: `${on} menos ${GI_KG} é ${kg}: o Azul pesa ${kg} kg.` }
      : { en: `${kg} add ${GI_KG} is ${on}: the scale shows ${on} kg.`, pt: `${kg} mais ${GI_KG} é ${on}: a balança mostra ${on} kg.` });
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
      return gi(q);
    },
  };
}
