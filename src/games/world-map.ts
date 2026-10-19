/* World Map — the continents and the oceans.
 *
 * A map of the whole world, every country drawn and coloured by its
 * continent, the oceans in blues. He finds the seven continents with their
 * names on the map, then the five oceans, then both again with no names.
 * After that a place glows and he reads which name is its, and Year 2 asks
 * where things are: what is north, south, east and west of Australia, and
 * which ocean is between two continents. Whatever he finds, he is told one
 * true thing about it (src/content/world.ts). The map is the one the
 * geography games share (world-kit.ts). */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { MAP_STEPS, findSays, mapQuestion, place, seaSays, type MapQuestion, type MapStep, type PlaceId } from '../content/world';
import { mountMaths, type Kit } from './maths-kit';
import { isSea, worldMap } from './world-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<MapStep>({
    id: 'world-map',
    title: 'World',
    swash: 'Map',
    tagline: 'Find the continents and the oceans.',
    steps: MAP_STEPS,
    face: '🌏',
    cheer: 'Good map reading!',
    build,
  }, root);
}

function build(kit: Kit) {
  const map = worldMap();
  const ask = el('p', { class: 'mx-ask' });
  const node = el('div', { class: 'mx-stage wm-stage' }, ask, map.node);
  let recent: PlaceId[] = [];

  /** what he tapped, said and written: "That is Asia." */
  const that = (id: string): string => (isSea(id) ? seaSays(id).that : findSays(place(id as PlaceId)).that);

  async function finish(ok: boolean, q: MapQuestion, picked: string): Promise<boolean> {
    map.mark(q.answer, 'right');
    if (ok) {
      sfx.cheer();
      kit.note(`Yes! ${q.why}`, true);
      say(q.why);
      await kit.wait(2600);
      return true;
    }
    sfx.wrong();
    /* where it was, then what he tapped and the right answer in words */
    const right = q.task === 'find' ? findSays(place(q.answer)).here : q.why;
    const first = q.task === 'name' ? findSays(place(q.answer)).this : that(picked);
    if (q.task !== 'name') map.mark(picked, 'wrong');
    kit.note(`${first} ${right}`);
    say(first, { onEnd: () => say(right) });
    await kit.wait(4600);
    return false;
  }

  return {
    node,
    ask: async (step: MapStep): Promise<boolean> => {
      const q = mapQuestion(step, recent);
      recent = [q.answer, ...recent].slice(0, step.of === 'ocean' ? 3 : 4);
      map.reset();
      map.names(step.names ? step.of : null);
      for (const id of q.given ?? []) map.give(id);
      /* what the tests look for, the way the other games' cards say it */
      node.dataset.answer = q.answer;
      ask.textContent = q.ask;
      say(q.ask);
      if (q.task === 'name') {
        map.mark(q.answer, 'glow');
        const picked = await kit.choices.askWords(q.options!, (id) => place(id as PlaceId).name);
        kit.choices.revealWord(q.answer, picked);
        return finish(picked === q.answer, q, picked);
      }
      const picked = await map.tap(q.answer);
      return finish(picked === q.answer, q, picked);
    },
  };
}
