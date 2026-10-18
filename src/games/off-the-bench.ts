/* Off the Bench — how many more players to make the team?
 *
 * Seven are on the pitch and the team needs ten. How many come off the
 * bench? That is the part–whole idea at the heart of the Kindergarten and
 * Year 1 syllabus: 7 and 3 make 10. Knowing the pairs that make 10 by heart
 * is what later lets him add 8 + 5 by going through 10.
 *
 * The players stand in rows of five, the way a ten frame is drawn at school,
 * so "7" looks like a full row and two more. The gaps are drawn as empty
 * circles to begin with; a later step takes them away, so he has to see the
 * missing ones in his head. A wrong answer counts the gaps out loud.
 *
 * Year 2 moves to a stadium of 100 seats in rows of ten: first the fans come
 * in whole rows ("60 are in, how many more?"), then any number, where the way
 * to count the empty seats is to fill up the row and then go in tens.
 *
 * Years 3 and 4 fill a stadium of 1000: ten stands of 100 seats, each ten
 * rows of ten. First the fans come in whole stands, then in whole rows, then
 * any number, and the empty seats are counted the same way one place up:
 * fill up the row, then the stand, then count the empty stands. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { BENCH_STEPS, benchQuestion, choices, toThousand, type BenchQuestion, type BenchStep } from '../content/maths';
import { mountMaths, type Kit } from './maths-kit';
import { player } from './teams';

export function mount(root: HTMLElement): () => void {
  return mountMaths<BenchStep>({
    id: 'off-the-bench',
    title: 'Off the',
    swash: 'Bench',
    tagline: 'How many more players to make the team?',
    steps: BENCH_STEPS,
    face: '🧤',
    football: true,
    build,
  }, root);
}

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const pitch = el('div', { class: 'mx-pitch', role: 'img' });
  const node = el('div', { class: 'mx-stage' }, ask, pitch);
  let last: BenchQuestion | undefined;

  const stadium = (q: BenchQuestion): boolean => q.target === 100;

  /** the empty seats of the stadium of 1000, by how they are counted */
  interface Empty { ones: HTMLElement[]; tens: HTMLElement[]; stands: HTMLElement[] }

  /** the stadium of 1000: ten stands of 100, each ten rows of ten; a row is
      drawn seat by seat only when it is part full */
  function thousand(q: BenchQuestion): Empty {
    const fan = kit.us().colours[0];
    const empty: Empty = { ones: [], tens: [], stands: [] };
    const full = Math.floor(q.on / 100);
    const rows = Math.floor((q.on % 100) / 10);
    const seats = q.on % 10;
    const big = el('div', { class: 'ob-1000', dataset: { on: String(q.on) } });
    for (let st = 0; st < 10; st += 1) {
      const stand = el('div', { class: 'ob-stand' });
      for (let r = 0; r < 10; r += 1) {
        const row = el('div', { class: 'ob-row' });
        if (st < full || (st === full && r < rows)) {
          row.classList.add('fan');
          row.style.background = fan;
        } else if (st === full && r === rows && seats) {
          row.classList.add('part');
          for (let i = 0; i < 10; i += 1) {
            const seat = el('span', { class: 'ob-seat' });
            if (i < seats) { seat.classList.add('fan'); seat.style.background = fan; } else { seat.classList.add('gap'); empty.ones.push(seat); }
            row.append(seat);
          }
        } else {
          row.classList.add('gap');
          if (st === full) empty.tens.push(row);
        }
        stand.append(row);
      }
      if (st > full || (st === full && q.on % 100 === 0)) empty.stands.push(stand);
      big.append(stand);
    }
    pitch.replaceChildren(big);
    pitch.className = 'mx-pitch thousand';
    pitch.setAttribute('aria-label', `${q.on} fans in 1000 seats`);
    return empty;
  }

  /** fans arrive in every empty seat */
  function fillThousand(): void {
    const fan = kit.us().colours[0];
    for (const g of pitch.querySelectorAll<HTMLElement>('.ob-row.gap, .ob-seat.gap')) {
      g.classList.remove('gap');
      g.classList.add('fan', 'arrived');
      g.style.background = fan;
    }
  }

  async function askThousand(q: BenchQuestion, step: BenchStep): Promise<boolean> {
    const empty = thousand(q);
    const text = `${q.on} fans are in their seats. How many more to fill all 1000?`;
    ask.textContent = text;
    say(text);
    const unit = step.unit ?? 1;
    const picked = await kit.choices.ask(choices(q.need, unit, 1000 - unit, 4, unit));
    kit.choices.reveal(q.need, picked);
    if (picked === q.need) {
      sfx.whistle();
      fillThousand();
      kit.note(`Yes! ${q.on} and ${q.need} make 1000.`, true);
      say(`Yes! ${q.on} and ${q.need} make 1000.`);
      await kit.wait(1900);
      return true;
    }
    sfx.wrong();
    /* count the empty seats the way it is done in your head */
    const how = toThousand(q.on);
    for (const seat of empty.ones) seat.classList.add('counted', 'ones');
    for (const row of empty.tens) row.classList.add('counted', 'tens');
    for (const stand of empty.stands) {
      stand.classList.add('counted', 'hundreds');
      stand.append(el('span', { class: 'ob-label', text: '100' }));
    }
    kit.note(how.text);
    say(`${how.text} ${q.on} and ${q.need} make 1000.`);
    await kit.wait(5200);
    return false;
  }

  /** one person in a place: a player on the pitch, or a fan in a seat */
  function arrive(spot: HTMLElement, q: BenchQuestion): void {
    if (stadium(q)) {
      spot.classList.add('fan');
      spot.style.background = kit.us().colours[0];
    } else {
      spot.append(player(kit.us(), 44, 'kicker'));
    }
  }

  function draw(q: BenchQuestion, step: BenchStep): HTMLElement[] {
    pitch.replaceChildren();
    pitch.className = 'mx-pitch';
    pitch.style.setProperty('--cols', stadium(q) ? '10' : '5');
    /* twenty is two ten frames, with a gap between them */
    pitch.classList.toggle('twenty', q.target === 20);
    pitch.classList.toggle('stadium', stadium(q));
    pitch.setAttribute('aria-label', stadium(q) ? `${q.on} fans in 100 seats` : `${q.on} players on the pitch`);
    const spots: HTMLElement[] = [];
    for (let i = 0; i < q.target; i += 1) {
      const spot = el('div', { class: 'mx-spot' });
      if (i < q.on) arrive(spot, q);
      else spot.classList.add(step.spots ? 'gap' : 'hidden-gap');
      pitch.append(spot);
      spots.push(spot);
    }
    return spots;
  }

  /** the empty seats, counted the Year 2 way: fill up the row, then tens */
  function countSeats(q: BenchQuestion, gaps: HTMLElement[]): string {
    const fill = (10 - (q.on % 10)) % 10;
    const marks: number[] = [];
    if (fill) marks.push(fill);
    for (let n = fill + 10; n <= q.need; n += 10) marks.push(n);
    for (const g of gaps) { g.classList.remove('hidden-gap'); g.classList.add('gap', 'counted'); }
    for (const n of marks) gaps[n - 1].textContent = String(n);
    if (!fill) return `Count the empty rows in tens: ${marks.join(', ')}.`;
    const rows = (q.need - fill) / 10;
    const then = rows ? ` Then ${rows === 1 ? '1 more row' : `${rows} more rows`} of 10 make 100. ${fill} and ${rows * 10} is ${q.need}.` : '';
    return `Fill up the row: ${fill} more makes ${q.on + fill}.${then}`;
  }

  return {
    node,
    ask: async (step: BenchStep): Promise<boolean> => {
      const q = benchQuestion(step, last);
      last = q;
      if (q.target === 1000) return askThousand(q, step);
      const spots = draw(q, step);
      const text = stadium(q)
        ? `${q.on} fans are in their seats. How many more to fill all 100?`
        : `${q.on} ${q.on === 1 ? 'player is' : 'players are'} on. How many more to make ${q.target}?`;
      ask.textContent = text;
      say(text);
      const picked = await kit.choices.ask(step.tens
        ? choices(q.need, 10, 90, 4, 10)
        : choices(q.need, 0, q.target));
      kit.choices.reveal(q.need, picked);
      const gaps = spots.slice(q.on);
      if (picked === q.need) {
        /* on they run */
        sfx.whistle();
        for (const g of gaps) { g.classList.remove('gap', 'hidden-gap'); g.classList.add('arrived'); arrive(g, q); }
        kit.note(`Yes! ${q.on} and ${q.need} make ${q.target}.`, true);
        say(`Yes! ${q.on} and ${q.need} make ${q.target}.`);
        await kit.wait(1700);
        return true;
      }
      sfx.wrong();
      if (stadium(q)) {
        const how = countSeats(q, gaps);
        say(`${how} ${q.on} and ${q.need} make 100.`);
        kit.note(`${q.on} and ${q.need} make 100.`);
        await kit.wait(4200);
        return false;
      }
      /* count the gaps with him, one by one */
      kit.note(`Let's count the gaps.`);
      for (const [i, g] of gaps.entries()) {
        g.classList.remove('hidden-gap');
        g.classList.add('gap', 'counted');
        g.textContent = String(i + 1);
      }
      say(`Let's count the gaps. ${gaps.map((_, i) => i + 1).join(', ')}. ${q.on} and ${q.need} make ${q.target}.`);
      kit.note(`${q.on} and ${q.need} make ${q.target}.`);
      await kit.wait(3200);
      return false;
    },
  };
}
