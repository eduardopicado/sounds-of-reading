/* Flags — which flag is which country, and where the country is.
 *
 * He picks Brazil's flag from three, then names a flag he is shown, then
 * Australia's neighbours. Then he finds the country on the world map, with
 * its flag beside the question: the big countries first. Year 2 looks
 * closely at flags that are easy to mix up (Australia's and New Zealand's,
 * Indonesia's and Poland's), says which flag has a maple leaf or the
 * Southern Cross, and finds the neighbours and the smaller countries on the
 * map. A miss always says what the right flag looks like, in words he can
 * check against the picture (src/content/flags.ts). */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import {
  COUNTRIES, FLAG_STEPS, Named, country, flagQuestion, flagSays,
  type FlagQuestion, type FlagStep,
} from '../content/flags';
import { findSays, place, seaSays } from '../content/world';
import { mountMaths, type Kit } from './maths-kit';
import { isPlace, isSea, worldMap } from './world-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<FlagStep>({
    id: 'flags',
    title: 'Flags',
    swash: 'of the World',
    tagline: 'Which flag is which country, and where is it?',
    steps: FLAG_STEPS,
    face: '🎌',
    cheer: 'Good looking!',
    build,
  }, root);
}

function build(kit: Kit) {
  const map = worldMap();
  const ask = el('p', { class: 'mx-ask' });
  const flag = el('div', { class: 'fl-flag', role: 'img' });
  const node = el('div', { class: 'mx-stage fl-stage' }, ask, flag, map.node);
  let recent: string[] = [];

  /** what he tapped on the map, said and written: "That is Argentina." */
  const that = (id: string, answer: string): string => {
    if (isSea(id)) return seaSays(id).that;
    if (isPlace(id)) return findSays(place(id)).that;
    if (COUNTRIES.some((c) => c.id === id)) return flagSays(country(id)).there;
    return flagSays(country(answer)).not;
  };

  async function finish(ok: boolean, q: FlagQuestion, picked: string): Promise<boolean> {
    const c = country(q.answer);
    if (q.task === 'map') map.mark(q.answer, 'right');
    if (ok) {
      sfx.cheer();
      const good = q.task === 'map' ? flagSays(c).there : q.why;
      kit.note(`Yes! ${good}`, true);
      say(good);
      await kit.wait(2600);
      return true;
    }
    sfx.wrong();
    let first: string;
    let then = q.why;
    if (q.task === 'map') {
      if (!isPlace(picked) && !isSea(picked)) map.mark(picked, 'wrong');
      first = that(picked, q.answer);
      then = flagSays(c).here;
    } else if (q.task === 'whose') {
      first = flagSays(c).this;
    } else {
      first = flagSays(country(picked)).that;
    }
    kit.note(`${first} ${then}`);
    say(first, { onEnd: () => say(then) });
    await kit.wait(q.task === 'map' ? 4200 : 5200);
    return false;
  }

  return {
    node,
    ask: async (step: FlagStep): Promise<boolean> => {
      const q = flagQuestion(step, recent);
      recent = [q.answer, ...recent].slice(0, 4);
      const c = country(q.answer);
      /* what the tests look for, the way the other games' cards say it */
      node.dataset.answer = q.answer;
      map.reset();
      map.names(null);
      map.node.hidden = q.task !== 'map';
      node.classList.toggle('on-map', q.task === 'map');
      /* the flag on its own for "whose flag is this?", and beside the name on the map */
      flag.hidden = q.task !== 'whose' && q.task !== 'map';
      flag.textContent = c.flag;
      flag.setAttribute('aria-label', q.task === 'whose' ? 'A flag' : `The flag of ${c.name}`);
      ask.textContent = q.ask;
      say(q.ask);
      if (q.task === 'map') {
        const picked = await map.tap(q.answer);
        return finish(picked === q.answer, q, picked);
      }
      /* the flags, big, to choose from; or the names, to read */
      const flags = q.task !== 'whose';
      kit.choices.node.classList.toggle('fl-flags', flags);
      const picked = await kit.choices.askWords(q.options, (id) => (flags ? country(id).flag : Named(country(id))));
      kit.choices.revealWord(q.answer, picked);
      return finish(picked === q.answer, q, picked);
    },
  };
}
