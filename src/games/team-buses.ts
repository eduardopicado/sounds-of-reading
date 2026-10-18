/* Team Buses — tens and ones, as fans going to the match.
 *
 * Every bus takes ten fans, its windows two rows of five like a ten frame.
 * Seeing 34 as three full buses and four fans still walking is place value,
 * the big Year 1 idea: the 3 in 34 means three tens. He reads crowds from
 * buses and fans, and loads a crowd into buses himself.
 *
 * Year 2 adds trains that carry a hundred, numbers to 999 to read and to
 * build from trains, buses and fans, and the idea that a number can be made
 * more than one way: when a bus breaks down, 3 buses and 4 fans become 2
 * buses and 14 fans, and it is still 34.
 *
 * Years 3 and 4 add planes that carry a thousand, crowds to 10 000 to read
 * and to build, and the same idea with bigger numbers: when the trains are
 * cancelled, 350 fans need 35 buses; when the plane cannot fly, 1250 fans
 * need 12 trains and 5 buses, because 1250 is 12 hundreds and 5 tens.
 *
 * The fans wear his team's colours. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import {
  BUS_STEPS, anotherChoices, busQuestion, choices, placeChoices, places, regroupChoices, valueOf,
  type BusStep, type Places,
} from '../content/maths';
import { mountMaths, type Kit } from './maths-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<BusStep>({
    id: 'team-buses',
    title: 'Team',
    swash: 'Buses',
    tagline: 'Ten fans fill a bus. How many fans are going to the match?',
    steps: BUS_STEPS,
    face: '🚌',
    build,
  }, root);
}

/** the most of each a crowd can be built from */
const MOST = { thousands: 9, hundreds: 19, tens: 19, ones: 19 };

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** "3 buses and 4 fans" */
function describe(p: Places): string {
  const parts = [
    p.thousands ? plural(p.thousands, 'plane', 'planes') : '',
    p.hundreds ? plural(p.hundreds, 'train', 'trains') : '',
    p.tens ? plural(p.tens, 'bus', 'buses') : '',
    p.ones ? plural(p.ones, 'fan', 'fans') : '',
  ].filter(Boolean);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0] ?? 'nobody';
}

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const yard = el('div', { class: 'tb-yard', role: 'img' });
  const tools = el('div', { class: 'tb-tools' });
  const node = el('div', { class: 'mx-stage' }, ask, yard, tools);
  let last: number | undefined;

  const colour = (): string => kit.us().colours[0];

  function fan(cls = ''): HTMLElement {
    const f = el('span', { class: `tb-fan ${cls}`, 'aria-hidden': 'true' });
    f.style.background = colour();
    return f;
  }

  function bus(cls = ''): HTMLElement {
    const windows = el('span', { class: 'tb-windows' });
    for (let i = 0; i < 10; i += 1) windows.append(fan());
    return el('span', { class: `tb-bus ${cls}`, 'aria-hidden': 'true' }, windows, el('span', { class: 'tb-wheels' }));
  }

  function train(cls = ''): HTMLElement {
    const cars = el('span', { class: 'tb-cars' });
    for (let i = 0; i < 10; i += 1) cars.append(el('span', { class: 'tb-car', text: '10' }));
    return el('span', { class: `tb-train ${cls}`, 'aria-hidden': 'true' }, el('span', { class: 'tb-engine', text: '100' }), cars);
  }

  function plane(cls = ''): HTMLElement {
    return el('span', { class: `tb-plane ${cls}`, 'aria-hidden': 'true' }, el('span', { class: 'tb-wing', text: '✈️' }), el('span', { class: 'tb-load', text: '1000' }));
  }

  /** a crowd as planes, trains, buses and loose fans, each kind on its own row */
  function draw(p: Places): void {
    const rows: HTMLElement[] = [];
    if (p.thousands) rows.push(el('div', { class: 'tb-row planes' }, ...Array.from({ length: p.thousands }, () => plane())));
    /* more than ten of a kind, after a regroup, are drawn smaller to fit */
    if (p.hundreds) rows.push(el('div', { class: `tb-row trains${p.hundreds > 10 ? ' compact' : ''}` }, ...Array.from({ length: p.hundreds }, () => train())));
    if (p.tens) rows.push(el('div', { class: `tb-row buses${p.tens > 12 ? ' compact' : ''}` }, ...Array.from({ length: p.tens }, () => bus())));
    if (p.ones) rows.push(el('div', { class: 'tb-row fans' }, ...Array.from({ length: p.ones }, () => fan('walking'))));
    yard.replaceChildren(...rows);
    yard.setAttribute('aria-label', describe(p));
  }

  /** a loose crowd, not yet in buses */
  function crowd(n: number): void {
    yard.replaceChildren(el('div', { class: 'tb-row crowd' }, ...Array.from({ length: n }, () => fan('walking'))));
    yard.setAttribute('aria-label', `${n} fans`);
  }

  async function read(step: BusStep, n: number): Promise<boolean> {
    const p = places(n, step.trains, step.planes);
    draw(p);
    ask.textContent = 'How many fans are going to the match?';
    say(ask.textContent);
    const picked = await kit.choices.ask(placeChoices(n, step.planes ? 9999 : step.trains ? 999 : 120));
    kit.choices.reveal(n, picked);
    const how = `${describe(p)}. That's ${n}.`;
    if (picked === n) {
      sfx.cheer();
      kit.note(`Yes! ${how}`, true);
      say(`Yes! ${how}`);
      await kit.wait(2400);
      return true;
    }
    sfx.wrong();
    yard.classList.add('explain');
    kit.note(how);
    say(how);
    await kit.wait(3400);
    yard.classList.remove('explain');
    return false;
  }

  async function load(n: number): Promise<boolean> {
    const p = places(n, false);
    crowd(n);
    ask.replaceChildren(el('b', { class: 'mx-big', text: String(n) }), ' fans. How many buses can we fill?');
    say(`${n} fans. How many buses can we fill?`);
    const buses = await kit.choices.ask(choices(p.tens, 0, 12));
    kit.choices.reveal(p.tens, buses);
    let ok = buses === p.tens;
    if (ok) sfx.right(); else sfx.wrong();
    /* on they get, ten to a bus, whatever he said */
    draw(p);
    kit.note(ok ? `Yes, ${plural(p.tens, 'full bus', 'full buses')}!` : `${n} fans fill ${plural(p.tens, 'bus', 'buses')}.`, ok);
    await kit.wait(1600);
    ask.replaceChildren(el('b', { class: 'mx-big', text: String(n) }), ' fans. How many are left over?');
    say('How many are left over?');
    kit.choices.clear();
    const left = await kit.choices.ask(choices(p.ones, 0, 9));
    kit.choices.reveal(p.ones, left);
    ok = ok && left === p.ones;
    const how = `${plural(p.tens, 'bus', 'buses')} and ${plural(p.ones, 'fan', 'fans')} left over. ${p.tens} tens and ${p.ones} ones make ${n}.`;
    if (left === p.ones) sfx.cheer(); else sfx.wrong();
    kit.note(how, ok);
    say(how);
    await kit.wait(3200);
    return ok;
  }

  /** build the number from (planes,) trains, buses and fans, then tap Done */
  function buildIt(step: BusStep, n: number): Promise<boolean> {
    return new Promise((resolve) => {
      const have: Places = step.planes ? { thousands: 0, hundreds: 0, tens: 0, ones: 0 } : { hundreds: 0, tens: 0, ones: 0 };
      const counts = el('p', { class: 'tb-counts', 'aria-live': 'polite' });
      const redraw = (): void => {
        draw(have);
        /* a tap on anything in the yard sends it home again */
        yard.querySelectorAll<HTMLElement>('.tb-plane, .tb-train, .tb-bus, .tb-fan.walking').forEach((thing) => {
          thing.addEventListener('click', () => {
            const kind = thing.classList.contains('tb-plane') ? 'thousands' : thing.classList.contains('tb-train') ? 'hundreds' : thing.classList.contains('tb-bus') ? 'tens' : 'ones';
            have[kind] = (have[kind] ?? 0) - 1;
            sfx.tap();
            redraw();
          });
        });
        counts.textContent = [
          ...(step.planes ? [plural(have.thousands ?? 0, 'plane', 'planes')] : []),
          plural(have.hundreds, 'train', 'trains'), plural(have.tens, 'bus', 'buses'), plural(have.ones, 'fan', 'fans'),
        ].join(' · ');
      };
      const add = (kind: keyof Places): void => {
        if ((have[kind] ?? 0) >= MOST[kind]) return;
        have[kind] = (have[kind] ?? 0) + 1;
        sfx.tap();
        redraw();
      };
      const done = el('button', { class: 'btn mx-go', type: 'button', text: 'Done ✓' });
      tools.replaceChildren(
        el('div', { class: 'tb-adds' },
          step.planes ? el('button', { class: 'tb-add', type: 'button', 'aria-label': 'Add a plane of 1000', on: { click: () => add('thousands') } }, '✈️ 1000') : null,
          el('button', { class: 'tb-add', type: 'button', 'aria-label': 'Add a train of 100', on: { click: () => add('hundreds') } }, '🚆 100'),
          el('button', { class: 'tb-add', type: 'button', 'aria-label': 'Add a bus of 10', on: { click: () => add('tens') } }, '🚌 10'),
          el('button', { class: 'tb-add', type: 'button', 'aria-label': 'Add a fan', on: { click: () => add('ones') } }, '🧍 1')),
        counts, done);
      ask.replaceChildren('Bring ', el('b', { class: 'mx-big', text: String(n) }), ' fans to the match.');
      say(`Bring ${n} fans to the match.`);
      redraw();
      done.addEventListener('click', async () => {
        const got = valueOf(have);
        tools.replaceChildren();
        const want = places(n, true, step.planes);
        const ok = got === n;
        const how = `${n} is ${describe(want)}.`;
        if (ok) {
          sfx.cheer();
          kit.note(`Yes! ${how}`, true);
          say(`Yes! ${how}`);
          await kit.wait(2600);
          resolve(true);
          return;
        }
        sfx.wrong();
        kit.note(`That's ${got}. ${how}`);
        say(`That's ${got}. ${how}`);
        draw(want);
        await kit.wait(3800);
        resolve(false);
      });
    });
  }

  async function another(n: number): Promise<boolean> {
    const p = places(n, false);
    draw(p);
    ask.textContent = `${n} fans: ${describe(p)}. Oh no, a bus breaks down! Its fans walk. How many fans are walking now?`;
    say(ask.textContent);
    yard.querySelector('.tb-bus:last-child')?.classList.add('broken');
    const answer = p.ones + 10;
    const picked = await kit.choices.ask(anotherChoices(p.ones));
    kit.choices.reveal(answer, picked);
    /* the ten off the bus join the walkers */
    draw({ hundreds: 0, tens: p.tens - 1, ones: answer });
    const how = `${plural(p.tens - 1, 'bus', 'buses')} and ${answer} fans walking. Still ${n}!`;
    if (picked === answer) {
      sfx.cheer();
      kit.note(`Yes! ${how}`, true);
      say(`Yes! ${how}`);
      await kit.wait(2600);
      return true;
    }
    sfx.wrong();
    kit.note(`${p.ones} were walking, and 10 got off the bus. ${how}`);
    say(`${p.ones} were walking, and 10 got off the bus. ${how}`);
    await kit.wait(3800);
    return false;
  }

  /** with no trains (or no plane), how many buses (or trains) carry them all? */
  async function regroup(step: BusStep, n: number): Promise<boolean> {
    const unit = step.unit ?? 10;
    const p = places(n, true, step.planes);
    draw(p);
    const answer = Math.floor(n / unit);
    const left = (n % unit) / 10;
    const one = (unit === 10 ? p.hundreds : p.thousands ?? 0) === 1;
    ask.textContent = unit === 10
      ? `${n} fans: ${describe(p)}. Oh no, the ${one ? 'train is' : 'trains are'} cancelled! How many buses of 10 do they need?`
      : `${n} fans: ${describe(p)}. Oh no, the ${one ? 'plane' : 'planes'} can't fly! How many trains of 100 do they need?`;
    say(ask.textContent);
    yard.querySelectorAll(unit === 10 ? '.tb-train' : '.tb-plane').forEach((t) => t.classList.add('broken'));
    const picked = await kit.choices.ask(regroupChoices(n, unit));
    kit.choices.reveal(answer, picked);
    /* everyone on the smaller ones now: the same crowd */
    draw(unit === 10 ? { hundreds: 0, tens: answer, ones: 0 } : { hundreds: answer, tens: left, ones: 0 });
    const how = unit === 10
      ? `Each train is 10 buses, so ${p.hundreds} ${p.hundreds === 1 ? 'train is' : 'trains are'} ${p.hundreds * 10} buses, and ${p.tens} more make ${answer} buses. ${n} is ${answer} tens!`
      : `A plane is 10 trains, so ${plural(p.thousands ?? 0, 'plane', 'planes')} and ${plural(p.hundreds, 'train', 'trains')} make ${answer} trains${left ? `, and the ${plural(left, 'bus', 'buses')} still ${left === 1 ? 'goes' : 'go'}` : ''}. ${n} is ${answer} hundreds${left ? ` and ${plural(left, 'ten', 'tens')}` : ''}!`;
    if (picked === answer) {
      sfx.cheer();
      kit.note(`Yes! ${how}`, true);
      say(`Yes! ${how}`);
      await kit.wait(3000);
      return true;
    }
    sfx.wrong();
    kit.note(how);
    say(how);
    await kit.wait(4200);
    return false;
  }

  return {
    node,
    ask: async (step: BusStep): Promise<boolean> => {
      const n = busQuestion(step, last);
      last = n;
      tools.replaceChildren();
      yard.dataset.n = String(n);
      if (step.task === 'load') return load(n);
      if (step.task === 'build') return buildIt(step, n);
      if (step.task === 'another') return another(n);
      if (step.task === 'regroup') return regroup(step, n);
      return read(step, n);
    },
  };
}
