/* Ice Cream Van — Australian coins, at the van after training.
 *
 * Kindergarten and Year 1: which coin is worth more (the $2 is smaller than
 * the 50c, and worth four of them — size is not value), which one coin pays
 * for an ice cream exactly, and how much a handful of the same coin is.
 * Year 2: a handful of mixed coins, picking coins from his purse to pay the
 * exact price, and the change from a $5 or $10 note.
 *
 * The coins are drawn at their real sizes relative to each other, with the
 * value on them as on the real ones; the designs are left off. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import {
  KIOSK_STEPS, coinOf, kioskQuestion, money, moneyWords, pays, type KioskQuestion, type KioskStep,
} from '../content/maths';
import { mountMaths, type Kit } from './maths-kit';
import { svg } from '../ui/writing';

export function mount(root: HTMLElement): () => void {
  return mountMaths<KioskStep>({
    id: 'ice-cream-van',
    title: 'Ice Cream',
    swash: 'Van',
    tagline: 'Pay for an ice cream with Australian coins.',
    steps: KIOSK_STEPS,
    face: '🍦',
    build,
  }, root);
}

const INK = '#1E2B2A';

/** a coin at its real size: 1 mm is 3.2 px, so the 50c is about 100 px across */
export function coinPic(cents: number): SVGSVGElement {
  const c = coinOf(cents);
  const d = c.mm * 3.2;
  const r = d / 2 - 2;
  const pic = svg('svg', {
    class: 'iv-coin', width: d, height: d, viewBox: `0 0 ${d} ${d}`, role: 'img', 'aria-label': money(cents),
  });
  const fill = c.gold ? '#E8B94A' : '#C9CDD2';
  const rim = c.gold ? '#A97F1E' : '#8C9096';
  if (c.sides) {
    const pts = Array.from({ length: c.sides }, (_, i) => {
      const a = (Math.PI * 2 * i) / c.sides! - Math.PI / 2 + Math.PI / c.sides!;
      return `${d / 2 + r * Math.cos(a)},${d / 2 + r * Math.sin(a)}`;
    }).join(' ');
    pic.append(svg('polygon', { points: pts, fill, stroke: rim, 'stroke-width': 3 }));
  } else {
    pic.append(svg('circle', { cx: d / 2, cy: d / 2, r, fill, stroke: rim, 'stroke-width': 3 }));
  }
  pic.append(svg('circle', { cx: d / 2, cy: d / 2, r: r - 5, fill: 'none', stroke: rim, 'stroke-width': 1, 'stroke-dasharray': '2 3' }));
  const label = svg('text', {
    x: d / 2, y: d / 2 + d * 0.11, 'text-anchor': 'middle', 'font-size': Math.max(13, d * 0.3), 'font-weight': 800, fill: INK,
  });
  label.textContent = cents >= 100 ? `$${cents / 100}` : String(cents);
  pic.append(label);
  if (cents < 100) {
    const unit = svg('text', { x: d / 2, y: d / 2 + d * 0.32, 'text-anchor': 'middle', 'font-size': Math.max(8, d * 0.13), fill: INK });
    unit.textContent = 'cents';
    pic.append(unit);
  }
  return pic;
}

/** a banknote, plain, in its colour: the $5 is pink, the $10 blue */
function notePic(cents: number): SVGSVGElement {
  const colour = cents === 500 ? '#E7A3C8' : '#7DB4E6';
  const pic = svg('svg', { class: 'iv-note', width: 150, height: 74, viewBox: '0 0 150 74', role: 'img', 'aria-label': `${money(cents)} note` },
    svg('rect', { x: 2, y: 2, width: 146, height: 70, rx: 8, fill: colour, stroke: INK, 'stroke-width': 3 }),
    svg('rect', { x: 100, y: 12, width: 34, height: 50, rx: 6, fill: 'rgba(255,255,255,.55)', stroke: INK, 'stroke-width': 1.5 }));
  const t = svg('text', { x: 20, y: 48, 'font-size': 30, 'font-weight': 800, fill: INK });
  t.textContent = money(cents);
  pic.append(t);
  return pic;
}

const coinRow = (coins: number[]): HTMLElement =>
  el('div', { class: 'iv-coins' }, ...coins.map((c) => el('span', { class: 'iv-slot', dataset: { cents: String(c) } }, coinPic(c))));

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const counter = el('div', { class: 'iv-counter' });
  const stage = el('div', { class: 'iv-stage' });
  const node = el('div', { class: 'mx-stage' }, counter, stage, ask);
  let last: KioskQuestion | undefined;

  /** the van's counter: the treat and its price tag */
  function showTreat(q: KioskQuestion, priced = true): void {
    counter.replaceChildren(
      el('span', { class: 'iv-van', text: '🚐', 'aria-hidden': 'true' }),
      el('span', { class: 'iv-treat', text: q.treat.picture, 'aria-hidden': 'true' }),
      priced ? el('span', { class: 'iv-tag', text: money(q.price) }) : '');
  }

  async function finish(ok: boolean, how: string): Promise<boolean> {
    if (ok) sfx.cheer(); else sfx.wrong();
    kit.note(`${ok ? 'Yes! ' : ''}${how}`, ok);
    say(`${ok ? 'Yes! ' : ''}${how}`);
    await kit.wait(ok ? 2400 : 3800);
    return ok;
  }

  /** tap one of the coins on the stage */
  const tapCoin = (coins: number[]): Promise<number> => new Promise((resolve) => {
    const row = el('div', { class: 'iv-coins' }, ...coins.map((c) => {
      const b = el('button', { class: 'iv-pick', type: 'button', dataset: { cents: String(c) }, 'aria-label': money(c) }, coinPic(c));
      b.addEventListener('click', () => {
        for (const other of row.querySelectorAll('button')) (other as HTMLButtonElement).disabled = true;
        sfx.tap();
        resolve(c);
      });
      return b;
    }));
    stage.replaceChildren(row);
  });

  const mark = (answer: number, picked: number): void => {
    stage.querySelectorAll<HTMLElement>('.iv-pick').forEach((b) => {
      b.classList.toggle('right', Number(b.dataset.cents) === answer);
      b.classList.toggle('wrong', Number(b.dataset.cents) === picked && picked !== answer);
    });
  };

  async function more(q: KioskQuestion): Promise<boolean> {
    counter.replaceChildren(el('span', { class: 'iv-van', text: '🚐', 'aria-hidden': 'true' }));
    ask.textContent = 'Which coin is worth more?';
    say('Which coin is worth more?');
    const picked = await tapCoin(q.coins);
    mark(q.answer, picked);
    const other = q.coins.find((c) => c !== q.answer)!;
    const smaller = coinOf(q.answer).mm < coinOf(other).mm;
    return finish(picked === q.answer, `${money(q.answer)} is worth more than ${money(other)}${smaller ? ', even though it is smaller' : ''}.`);
  }

  async function one(q: KioskQuestion): Promise<boolean> {
    showTreat(q);
    ask.textContent = `${q.treat.name[0].toUpperCase()}${q.treat.name.slice(1)} costs ${money(q.price)}. Which coin pays for it?`;
    say(`${q.treat.name} costs ${moneyWords(q.price)}. Which coin pays for it?`);
    const picked = await tapCoin(q.coins);
    mark(q.answer, picked);
    return finish(picked === q.answer, `The ${money(q.price)} coin pays ${money(q.price)} exactly.`);
  }

  async function count(q: KioskQuestion, mixed: boolean): Promise<boolean> {
    counter.replaceChildren(el('span', { class: 'iv-van', text: '🚐', 'aria-hidden': 'true' }));
    stage.replaceChildren(coinRow(q.coins));
    ask.textContent = 'How much money is this?';
    say('How much money is this?');
    const asked = kit.choices.askWords(q.options.map(String), (o) => money(Number(o)));
    const picked = Number(await asked);
    kit.choices.revealWord(String(q.answer), String(picked));
    /* count along the coins, the way he should */
    let run = 0;
    const steps = q.coins.map((c) => money((run += c)));
    stage.querySelectorAll('.iv-slot').forEach((s, i) => s.setAttribute('data-run', steps[i]));
    stage.classList.add('counted');
    return finish(picked === q.answer, mixed
      ? `${q.coins.map(money).join(' + ')} = ${money(q.answer)}.`
      : `Count them: ${steps.join(', ')}.`);
  }

  function pay(q: KioskQuestion): Promise<boolean> {
    showTreat(q);
    ask.textContent = `${q.treat.name[0].toUpperCase()}${q.treat.name.slice(1)} costs ${money(q.price)}. Put coins on the counter to pay exactly.`;
    say(`${q.treat.name} costs ${moneyWords(q.price)}. Pay exactly.`);
    const purse = el('div', { class: 'iv-coins iv-purse' });
    const tray = el('div', { class: 'iv-coins iv-tray' });
    const total = el('p', { class: 'iv-total' });
    const payBtn = el('button', { class: 'btn', type: 'button', text: 'Pay' }) as HTMLButtonElement;
    stage.replaceChildren(el('p', { class: 'iv-label', text: 'Your purse' }), purse,
      el('p', { class: 'iv-label', text: 'On the counter' }), tray, total, payBtn);
    const paid = (): number[] => [...tray.querySelectorAll<HTMLElement>('.iv-pick')].map((b) => Number(b.dataset.cents));
    const update = (): void => { total.textContent = `On the counter: ${money(paid().reduce((s, c) => s + c, 0))}`; };
    q.coins.forEach((c) => {
      const b = el('button', { class: 'iv-pick', type: 'button', dataset: { cents: String(c) }, 'aria-label': money(c) }, coinPic(c));
      /* a tap moves a coin to the counter, another tap takes it back */
      b.addEventListener('click', () => { sfx.tap(); (b.parentElement === purse ? tray : purse).append(b); update(); });
      purse.append(b);
    });
    update();
    return new Promise((resolve) => {
      payBtn.addEventListener('click', async () => {
        payBtn.disabled = true;
        for (const b of stage.querySelectorAll('button')) (b as HTMLButtonElement).disabled = true;
        const given = paid();
        const sum = given.reduce((s, c) => s + c, 0);
        const ok = pays(given, q.price);
        resolve(await finish(ok, ok
          ? `${given.map(money).join(' + ')} = ${money(q.price)}. Enjoy it!`
          : `That is ${money(sum)}, and it costs ${money(q.price)}: ${sum > q.price ? 'too much' : 'not enough'}.`));
      }, { once: true });
    });
  }

  async function change(q: KioskQuestion): Promise<boolean> {
    showTreat(q);
    stage.replaceChildren(el('div', { class: 'iv-coins' }, notePic(q.paid!)));
    ask.textContent = `It costs ${money(q.price)}. You pay with ${money(q.paid!)}. How much change?`;
    say(`It costs ${moneyWords(q.price)}. You pay with ${moneyWords(q.paid!)}. How much change?`);
    const picked = Number(await kit.choices.askWords(q.options.map(String), (o) => money(Number(o))));
    kit.choices.revealWord(String(q.answer), String(picked));
    return finish(picked === q.answer, `${money(q.price)} and ${money(q.answer)} make ${money(q.paid!)}: the change is ${money(q.answer)}.`);
  }

  return {
    node,
    ask: async (step: KioskStep): Promise<boolean> => {
      const q = kioskQuestion(step, last);
      last = q;
      stage.classList.remove('counted');
      stage.replaceChildren();
      node.dataset.answer = String(q.answer);
      node.dataset.task = q.task;
      if (q.task === 'more') return more(q);
      if (q.task === 'one') return one(q);
      if (q.task === 'count' || q.task === 'mixed') return count(q, q.task === 'mixed');
      if (q.task === 'pay') return pay(q);
      return change(q);
    },
  };
}
