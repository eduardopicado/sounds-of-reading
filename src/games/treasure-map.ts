/* Treasure Map — reading a map: the key, the squares, the compass.
 *
 * An island on a grid, letters along the top and numbers down the side, with
 * a key that says what each picture is and a compass that says which way is
 * north. Each question draws a fresh island (src/content/treasure.ts has the
 * questions, and why each has one answer). He answers by tapping a square,
 * or a button for "which square?", "which way?" and "how far?".
 *
 * Following the directions to the treasure walks the path after he answers,
 * a footprint a square, and digs the treasure up where it ends.
 *
 * In English or Portuguese, switched with the flags on the game, as the
 * other geography games are. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import type { Both } from '../content/pt';
import {
  LETTERS, TREASURE_STEPS, dirName, squareName, thingAt, treasureQuestion, treasureSaid,
  type Cell, type Dir, type IslandMap, type TreasureQuestion, type TreasureStep,
} from '../content/treasure';
import { mountMaths, type Kit } from './maths-kit';
import { GEO_LANG, langSwitch, speakTurn, talkMs } from './lang-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<TreasureStep>({
    id: 'treasure-map',
    title: 'Treasure',
    swash: 'Map',
    tagline: 'Read the map and find the treasure.',
    steps: TREASURE_STEPS,
    face: '💎',
    cheer: 'Good map reading!',
    build,
  }, root);
}

function build(kit: Kit) {
  const langs = langSwitch(GEO_LANG);
  const lang = () => langs.lang();
  const ask = el('p', { class: 'mx-ask tm-ask' });
  const grid = el('div', { class: 'tm-map' });
  const key = el('ul', { class: 'tm-key', 'aria-label': 'Key' });
  const compass = el('div', { class: 'tm-compass', 'aria-hidden': 'true' });
  const board = el('div', { class: 'tm-board' }, grid, el('div', { class: 'tm-side' }, compass, key));
  const node = el('div', { class: 'mx-stage tm-stage' }, langs.node, ask, board);

  let q: TreasureQuestion | null = null;
  let cells: HTMLButtonElement[] = [];
  let recent: string[] = [];
  /** waiting for a tap on the map */
  let tapped: ((cell: Cell) => void) | null = null;
  /** redraws the words on screen in the chosen language */
  let retext: () => void = () => undefined;

  const cellAt = ({ c, r }: Cell): HTMLButtonElement => cells[r * (q?.map.cols ?? 5) + c];

  function drawCompass(): void {
    const n = (d: Dir): string => dirName(d, lang())[0];
    compass.replaceChildren(
      el('span', { class: 'tm-n', text: n('north') }), el('span', { class: 'tm-w', text: n('west') }),
      el('span', { class: 'tm-rose', text: '✦' }), el('span', { class: 'tm-e', text: n('east') }),
      el('span', { class: 'tm-s', text: n('south') }),
    );
  }

  /** the grid: letters across the top, numbers down the side, a square for each */
  function drawMap(map: IslandMap): void {
    const head = [el('span', { class: 'tm-corner' }),
      ...Array.from({ length: map.cols }, (_, c) => el('span', { class: 'tm-head', text: LETTERS[c] }))];
    cells = [];
    const rows = Array.from({ length: map.rows }, (_, r) => [
      el('span', { class: 'tm-head', text: String(r + 1) }),
      ...Array.from({ length: map.cols }, (_, c) => {
        const at = thingAt(map, { c, r });
        const b = el('button', {
          class: 'tm-cell', type: 'button', dataset: { sq: squareName({ c, r }) },
          'aria-label': `${squareName({ c, r })}${at ? `, ${at.thing.word}` : ''}`,
        }, el('span', { class: 'tm-pic', text: at?.thing.picture ?? '', 'aria-hidden': 'true' })) as HTMLButtonElement;
        b.addEventListener('click', () => {
          if (!tapped) return;
          const done = tapped;
          tapped = null;
          for (const cell of cells) cell.disabled = true;
          sfx.tap();
          done({ c, r });
        });
        cells.push(b);
        return b;
      }),
    ]);
    grid.style.setProperty('--cols', String(map.cols));
    grid.replaceChildren(...head, ...rows.flat());
  }

  function drawKey(map: IslandMap): void {
    key.replaceChildren(...[...map.things].sort((a, b) => a.thing.word.localeCompare(b.thing.word)).map((t) =>
      el('li', {}, el('span', { class: 'tm-pic', text: t.thing.picture, 'aria-hidden': 'true' }),
        el('span', { class: 'tm-word', text: lang() === 'pt' ? t.thing.pt.name : t.thing.word }))));
  }

  langs.onChange(() => { drawCompass(); if (q) drawKey(q.map); retext(); });
  drawCompass();

  const write = (lines: Both[]): string => lines.map((l) => l[lang()]).join(' ');

  /** the treasure route, a footprint a square, then the treasure dug up */
  async function walk(question: TreasureQuestion): Promise<void> {
    for (const cell of question.walk ?? []) {
      cellAt(cell).classList.add('walked');
      await kit.wait(180);
    }
    cellAt(question.answer).classList.add('treasure');
  }

  async function finish(question: TreasureQuestion, ok: boolean, picked?: Cell | string): Promise<boolean> {
    const said = treasureSaid(question, ok, picked);
    cellAt(question.answer).classList.add('right');
    if (picked && typeof picked !== 'string' && !ok) cellAt(picked).classList.add('wrong');
    if (question.task === 'route') void walk(question);
    if (ok) sfx.cheer(); else sfx.wrong();
    retext = () => kit.note(write(said), ok);
    retext();
    await kit.said((end) => speakTurn(said, lang(), end), ok ? 2800 : 4400, talkMs(said));
    return ok;
  }

  return {
    node,
    ask: async (step: TreasureStep): Promise<boolean> => {
      q = treasureQuestion(step, recent);
      const question = q;
      const about = thingAt(question.map, question.answer)?.thing.word;
      recent = [...(about ? [about] : []), ...recent].slice(0, 3);
      drawMap(question.map);
      drawKey(question.map);
      if (question.from) cellAt(question.from).classList.add('start');
      /* what the tests look for, the way the other games say it */
      node.dataset.answer = question.pick ?? squareName(question.answer);
      node.dataset.task = question.task;
      const label = (option: string): string => (question.task === 'way' ? dirName(option as Dir, lang())
        : question.task === 'scale' ? `${option} m` : option);
      retext = () => {
        ask.textContent = write(question.ask);
        if (question.by === 'choose') kit.choices.relabel(label);
      };
      ask.textContent = write(question.ask);
      speakTurn(question.ask, lang());

      for (const cell of cells) cell.disabled = question.by !== 'tap';
      if (question.by === 'choose') {
        const picked = await kit.choices.askWords(question.options!, label);
        kit.choices.revealWord(question.pick!, picked);
        return finish(question, picked === question.pick, picked);
      }
      kit.choices.clear();
      const picked = await new Promise<Cell>((resolve) => { tapped = resolve; });
      const ok = picked.c === question.answer.c && picked.r === question.answer.r;
      return finish(question, ok, picked);
    },
  };
}
