/* World Map — the continents and the oceans.
 *
 * A map of the whole world, every country drawn and coloured by its
 * continent, the oceans in blues. He finds the seven continents with their
 * names on the map, then the five oceans, then both again with no names.
 * After that a place glows and he reads which name is its, and Year 2 asks
 * where things are: what is north, south, east and west of Australia, and
 * which ocean is between two continents. Whatever he finds, he is told one
 * true thing about it (src/content/world.ts). The map is the one the
 * geography games share (world-kit.ts).
 *
 * In English or Portuguese, switched with the flags on the game, mid-question
 * too: the question, the names on the map and the buttons all change. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { MAP_STEPS, findSays, mapQuestion, nameIn, place, seaSays, type MapQuestion, type MapStep, type PlaceId } from '../content/world';
import type { Both } from '../content/pt';
import { mountMaths, type Kit } from './maths-kit';
import { isSea, worldMap } from './world-kit';
import { GEO_LANG, langSwitch, speak } from './lang-kit';

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
  const langs = langSwitch(GEO_LANG);
  const lang = () => langs.lang();
  const map = worldMap();
  const ask = el('p', { class: 'mx-ask' });
  const node = el('div', { class: 'mx-stage wm-stage' }, langs.node, ask, map.node);
  let recent: PlaceId[] = [];
  /** redraws the words on screen in the chosen language */
  let retext: () => void = () => undefined;
  langs.onChange(() => { map.language(lang()); retext(); });
  map.language(lang());

  /** what he tapped, said and written: "That is Asia." */
  const that = (id: string): Both => (isSea(id)
    ? { en: seaSays(id).that, pt: seaSays(id, 'pt').that }
    : { en: findSays(place(id as PlaceId)).that, pt: findSays(place(id as PlaceId), 'pt').that });

  async function finish(ok: boolean, q: MapQuestion, picked: string): Promise<boolean> {
    map.mark(q.answer, 'right');
    const why: Both = { en: q.why, pt: q.pt.why };
    if (ok) {
      sfx.cheer();
      retext = () => kit.note(`${lang() === 'pt' ? 'Isso!' : 'Yes!'} ${why[lang()]}`, true);
      retext();
      speak(why, lang());
      await kit.wait(2600);
      return true;
    }
    sfx.wrong();
    /* where it was, then what he tapped and the right answer in words */
    const answer = place(q.answer);
    const right: Both = q.task === 'find' ? { en: findSays(answer).here, pt: findSays(answer, 'pt').here } : why;
    const first: Both = q.task === 'name' ? { en: findSays(answer).this, pt: findSays(answer, 'pt').this } : that(picked);
    if (q.task !== 'name') map.mark(picked, 'wrong');
    retext = () => kit.note(`${first[lang()]} ${right[lang()]}`);
    retext();
    const now = lang();
    speak(first, now, () => speak(right, now));
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
      const question: Both = { en: q.ask, pt: q.pt.ask };
      const label = (id: string): string => nameIn(place(id as PlaceId), lang());
      retext = () => {
        ask.textContent = question[lang()];
        if (q.task === 'name') kit.choices.relabel(label);
      };
      ask.textContent = question[lang()];
      speak(question, lang());
      if (q.task === 'name') {
        map.mark(q.answer, 'glow');
        const picked = await kit.choices.askWords(q.options!, label);
        kit.choices.revealWord(q.answer, picked);
        return finish(picked === q.answer, q, picked);
      }
      const picked = await map.tap(q.answer);
      return finish(picked === q.answer, q, picked);
    },
  };
}
