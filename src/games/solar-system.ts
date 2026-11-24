/* Solar System — the Sun and its eight planets (src/content/space.ts).
 *
 * He finds a planet by its name, puts them in order out from the Sun, plays
 * Mystery Planet (a secret planet, found with yes or no questions that rule
 * planets out: first the game turns them over, then he does), says which of
 * two is bigger or nearer the Sun, and says whether it is day or night at a
 * house on the turning Earth. Each planet he finds or places says one true
 * thing about it.
 *
 * In English or Portuguese, switched with the flags, like the geography
 * games, and remembered with them. */

import { el, replay } from '../lib/dom';
import { sfx } from '../lib/sfx';
import {
  IN_ORDER, PLANETS, SAYS, SPACE_STEPS, answerSays, clue, cluesFor, fits, isDay, planet, spaceClimb, stillFits,
  type ClueId, type Planet, type PlanetId, type SpaceStep,
} from '../content/space';
import type { Both } from '../content/pt';
import { mountMaths, type Kit } from './maths-kit';
import { GEO_LANG, langSwitch, speak, speakTurn, talkMs } from './lang-kit';
import { dayNightPicture, planetPicture, sunPicture } from './space-art';

export function mount(root: HTMLElement): () => void {
  return mountMaths<SpaceStep>({
    id: 'solar-system',
    title: 'Solar',
    swash: 'System',
    tagline: 'The Sun, the planets, and Mystery Planet.',
    steps: SPACE_STEPS,
    face: '🪐',
    cheer: 'Good space exploring!',
    lengths: [8],
    climb: spaceClimb,
    build,
  }, root);
}

const shuffled = <T>(list: readonly T[]): T[] => [...list].sort(() => Math.random() - 0.5);

function build(kit: Kit) {
  const langs = langSwitch(GEO_LANG);
  const lang = () => langs.lang();
  const ask = el('p', { class: 'mx-ask' });
  const area = el('div', { class: 'ss-area' });
  const node = el('div', { class: 'mx-stage ss-stage' }, langs.node, ask, area);
  /** redraws the words on screen in the chosen language */
  let retext: () => void = () => undefined;
  langs.onChange(() => retext());
  let recent: PlanetId[] = [];

  /** a planet as a button, with its name under it (or not) */
  const tile = (p: Planet, named: boolean): HTMLButtonElement => {
    const b = el('button', { class: `ss-tile ${p.order >= 5 ? 'giant' : 'rocky'}`, type: 'button', dataset: { planet: p.id }, 'aria-label': p.name.en },
      planetPicture(p.id), named ? el('span', { class: 'ss-name' }) : null) as HTMLButtonElement;
    return b;
  };
  const renameTiles = (): void => {
    for (const n of area.querySelectorAll<HTMLElement>('[data-planet]')) {
      const p = planet(n.dataset.planet as PlanetId);
      const name = n.querySelector('.ss-name');
      if (name) name.textContent = p.name[lang()];
      n.setAttribute('aria-label', p.name[lang()]);
    }
  };

  /** say these, show the last as the note, and wait for them to be said */
  async function finish(ok: boolean, said: Both[], min = ok ? 2400 : 4000): Promise<boolean> {
    if (ok) sfx.cheer(); else sfx.wrong();
    /* a right answer starts with yes, as in the other games (Mystery Planet's says it already) */
    const lines = ok && !said[0].en.startsWith('Yes') ? [SAYS.yes, ...said] : said;
    const show = (): void => kit.note(lines.map((l) => l[lang()]).join(' '), ok);
    show();
    const was = retext;
    retext = () => { was(); show(); };
    const now = lang();
    await kit.said((end) => speakTurn(lines, now, end), min, talkMs(lines));
    return ok;
  }

  /* ── find the planet ──────────────────────────────────────────────── */

  function find(step: SpaceStep): Promise<boolean> {
    const fresh = PLANETS.filter((p) => !recent.includes(p.id));
    const want = shuffled(fresh.length ? fresh : PLANETS)[0];
    recent = [want.id, ...recent].slice(0, 3);
    node.dataset.answer = want.id;
    const row = el('div', { class: 'ss-system' }, el('div', { class: 'ss-sun' }, sunPicture()),
      ...IN_ORDER.map((p) => tile(p, !!step.names)));
    area.replaceChildren(row);
    const question = SAYS.where(want);
    retext = () => { ask.textContent = question[lang()]; renameTiles(); };
    retext();
    speak(question, lang());
    return new Promise((resolve) => {
      for (const b of row.querySelectorAll<HTMLButtonElement>('.ss-tile')) {
        b.addEventListener('click', () => {
          for (const x of row.querySelectorAll<HTMLButtonElement>('.ss-tile')) x.disabled = true;
          const picked = planet(b.dataset.planet as PlanetId);
          const ok = picked.id === want.id;
          row.querySelector(`[data-planet="${want.id}"]`)!.classList.add('right');
          if (!ok) b.classList.add('wrong');
          resolve(finish(ok, ok ? [want.fact] : [SAYS.that(picked), SAYS.here(want)]));
        }, { once: true });
      }
    });
  }

  /* ── out from the Sun ─────────────────────────────────────────────── */

  /** the planets placed so far; it carries on into the next round if one ends half way */
  let placed = 0;
  function order(): Promise<boolean> {
    if (placed >= IN_ORDER.length) placed = 0;
    const want = IN_ORDER[placed];
    const before = placed ? IN_ORDER[placed - 1] : null;
    node.dataset.answer = want.id;
    const slots = el('div', { class: 'ss-system ss-slots' }, el('div', { class: 'ss-sun' }, sunPicture()),
      ...IN_ORDER.map((p, i) => (i < placed ? tile(p, true) : el('div', { class: 'ss-slot', text: String(i + 1), 'aria-hidden': 'true' }))));
    for (const b of slots.querySelectorAll<HTMLButtonElement>('.ss-tile')) b.disabled = true;
    const tray = el('div', { class: 'ss-tray' }, ...shuffled(IN_ORDER.slice(placed)).map((p) => tile(p, true)));
    area.replaceChildren(slots, tray);
    const question = before ? SAYS.next(before) : SAYS.first;
    retext = () => { ask.textContent = question[lang()]; renameTiles(); };
    retext();
    speak(question, lang());
    return new Promise((resolve) => {
      for (const b of tray.querySelectorAll<HTMLButtonElement>('.ss-tile')) {
        b.addEventListener('click', () => {
          for (const x of tray.querySelectorAll<HTMLButtonElement>('.ss-tile')) x.disabled = true;
          const picked = planet(b.dataset.planet as PlanetId);
          const ok = picked.id === want.id;
          /* the right one goes into its place either way */
          const slot = slots.querySelectorAll('.ss-slot')[0];
          const into = tile(want, true);
          into.disabled = true;
          into.classList.add('right', 'arrived');
          slot.replaceWith(into);
          tray.querySelector(`[data-planet="${want.id}"]`)!.remove();
          if (!ok) b.classList.add('wrong');
          renameTiles();
          placed += 1;
          resolve(finish(ok, ok ? [SAYS.nextIs(want, before), want.fact] : [SAYS.that(picked), SAYS.nextIs(want, before)]));
        }, { once: true });
      }
    });
  }

  /* ── Mystery Planet ───────────────────────────────────────────────── */

  function mystery(step: SpaceStep): Promise<boolean> {
    const fresh = PLANETS.filter((p) => !recent.includes(p.id));
    const secret = shuffled(fresh.length ? fresh : PLANETS)[0];
    recent = [secret.id, ...recent].slice(0, 3);
    node.dataset.answer = secret.id;
    const grid = el('div', { class: 'ss-mystery' }, ...PLANETS.map((p) => tile(p, true)));
    const cards = el('div', { class: 'ss-cards' });
    const said = el('p', { class: 'ss-said', 'aria-live': 'polite' });
    area.replaceChildren(grid, said, cards);
    const asked: ClueId[] = [];
    /** the planets not turned over */
    const left = new Set<PlanetId>(PLANETS.map((p) => p.id));
    /** in "you turn them over": the ones the last answer rules out, still to turn */
    let toTurn = new Set<PlanetId>();
    let last: { text: Both } | null = null;
    let ok = true;
    let question: Both = SAYS.mystery;
    retext = () => {
      ask.textContent = question[lang()];
      said.textContent = last ? last.text[lang()] : '';
      renameTiles();
      for (const b of cards.querySelectorAll<HTMLButtonElement>('button')) b.textContent = clue(b.dataset.clue as ClueId).ask[lang()];
    };
    const turn = (id: PlanetId): void => {
      left.delete(id);
      const b = grid.querySelector<HTMLButtonElement>(`[data-planet="${id}"]`)!;
      b.classList.add('out');
      b.setAttribute('aria-pressed', 'true');
    };

    return new Promise((resolve) => {
      const solved = async (): Promise<void> => {
        for (const b of grid.querySelectorAll<HTMLButtonElement>('.ss-tile')) b.disabled = true;
        cards.replaceChildren();
        grid.querySelector(`[data-planet="${secret.id}"]`)!.classList.add('right');
        resolve(await finish(ok, [SAYS.found(secret), secret.fact], 2600));
      };
      const offer = (): void => {
        if (left.size === 1) { void solved(); return; }
        const clues = cluesFor([...left], asked);
        cards.replaceChildren(...clues.map((c) => {
          const b = el('button', { class: 'ss-card', type: 'button', dataset: { clue: c.id }, text: c.ask[lang()] }) as HTMLButtonElement;
          b.addEventListener('click', () => {
            sfx.tap();
            asked.push(c.id);
            const yes = c.yes.includes(secret.id);
            last = { text: answerSays(c, yes) };
            const ruledOut = [...left].filter((p) => !fits(c, p, yes));
            speak(last.text, lang());
            if (step.turns) {
              toTurn = new Set(ruledOut);
              cards.replaceChildren();
              question = SAYS.flip;
              retext();
              if (!toTurn.size) offer();
            } else {
              for (const p of ruledOut) turn(p);
              retext();
              offer();
            }
          });
          return b;
        }));
        question = SAYS.mystery;
        retext();
      };

      for (const b of grid.querySelectorAll<HTMLButtonElement>('.ss-tile')) {
        b.addEventListener('click', () => {
          const id = b.dataset.planet as PlanetId;
          if (!left.has(id)) return;
          if (step.turns && toTurn.size) {
            /* turning over the ones the answer rules out */
            if (toTurn.has(id)) {
              sfx.flip();
              toTurn.delete(id);
              turn(id);
              if (!toTurn.size) offer();
            } else {
              ok = false;
              sfx.wrong();
              replay(b, 'nope');
              const why = stillFits(planet(id));
              kit.note(why[lang()]);
              speak(why, lang());
            }
            return;
          }
          /* a guess */
          if (id === secret.id) { void solved(); return; }
          ok = false;
          sfx.wrong();
          turn(id);
          const not = SAYS.notIt(planet(id));
          kit.note(not[lang()]);
          speak(not, lang());
          if (left.size === 1) void solved();
        });
      }
      speak(SAYS.mystery, lang());
      offer();
    });
  }

  /* ── bigger, or nearer the Sun ────────────────────────────────────── */

  async function compare(): Promise<boolean> {
    const [a, b] = shuffled(PLANETS).slice(0, 2);
    const bigger = Math.random() < 0.5;
    const answer = bigger ? (a.width > b.width ? a : b) : (a.order < b.order ? a : b);
    const other = answer === a ? b : a;
    node.dataset.answer = answer.id;
    area.replaceChildren(el('div', { class: 'ss-pair' }, ...[a, b].map((p) => {
      const t = tile(p, true);
      t.disabled = true;
      return t;
    })));
    const question = bigger ? SAYS.bigger : SAYS.nearer;
    const label = (id: string): string => planet(id as PlanetId).name[lang()];
    retext = () => { ask.textContent = question[lang()]; renameTiles(); kit.choices.relabel(label); };
    speak(question, lang());
    const asked = kit.choices.askWords([a.id, b.id], label);
    retext();
    const picked = await asked;
    kit.choices.revealWord(answer.id, picked);
    const why = bigger ? SAYS.isBigger(answer, other) : SAYS.isNearer(answer, other);
    return finish(picked === answer.id, [why]);
  }

  /* ── day and night ────────────────────────────────────────────────── */

  async function day(): Promise<boolean> {
    /* well clear of the line between day and night */
    const angle = Math.random() < 0.5 ? 20 + Math.random() * 45 : 115 + Math.random() * 130;
    const at = Math.random() < 0.5 ? angle : -angle;
    const daytime = isDay(at);
    node.dataset.answer = daytime ? 'day' : 'night';
    area.replaceChildren(el('div', { class: 'ss-daybox' }, dayNightPicture(at)));
    const label = (k: string): string => (k === 'day' ? SAYS.day : SAYS.night)[lang()];
    retext = () => { ask.textContent = SAYS.dayOrNight[lang()]; kit.choices.relabel(label); };
    speak(SAYS.dayOrNight, lang());
    const asked = kit.choices.askWords(['day', 'night'], label);
    retext();
    const picked = await asked;
    const answer = daytime ? 'day' : 'night';
    kit.choices.revealWord(answer, picked);
    return finish(picked === answer, [daytime ? SAYS.isDay : SAYS.isNight]);
  }

  return {
    node,
    ask: async (step: SpaceStep): Promise<boolean> => {
      node.dataset.task = step.task;
      if (step.task === 'find') return find(step);
      if (step.task === 'order') return order();
      if (step.task === 'mystery') return mystery(step);
      if (step.task === 'compare') return compare();
      return day();
    },
  };
}
