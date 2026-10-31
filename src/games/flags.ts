/* Flags — which flag is which country, and where the country is.
 *
 * He picks Brazil's flag from three, then names a flag he is shown, then
 * Australia's neighbours. Then he finds the country on the world map, with
 * its flag beside the question: the big countries first. Year 2 looks
 * closely at flags that are easy to mix up (Australia's and New Zealand's,
 * Indonesia's and Poland's), says which flag has a maple leaf or the
 * Southern Cross, and finds the neighbours and the smaller countries on the
 * map. A miss always says what the right flag looks like, in words he can
 * check against the picture (src/content/flags.ts).
 *
 * In English or Portuguese, switched with the flags at the top, mid-question
 * too, like World Map. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import {
  COUNTRIES, FLAG_STEPS, country, flagQuestion, flagSays, namedIn,
  type FlagQuestion, type FlagStep,
} from '../content/flags';
import { findSays, place, seaSays } from '../content/world';
import { of, type Both } from '../content/pt';
import { mountMaths, type Kit } from './maths-kit';
import { isPlace, isSea, worldMap } from './world-kit';
import { GEO_LANG, langSwitch, speak } from './lang-kit';

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

/** one of the things flagSays says, both ways */
const says = (id: string, what: keyof ReturnType<typeof flagSays>): Both =>
  ({ en: flagSays(country(id))[what], pt: flagSays(country(id), 'pt')[what] });

function build(kit: Kit) {
  const langs = langSwitch(GEO_LANG);
  const lang = () => langs.lang();
  const map = worldMap();
  const ask = el('p', { class: 'mx-ask' });
  const flag = el('div', { class: 'fl-flag', role: 'img' });
  const node = el('div', { class: 'mx-stage fl-stage' }, langs.node, ask, flag, map.node);
  let recent: string[] = [];
  /** redraws the words on screen in the chosen language */
  let retext: () => void = () => undefined;
  langs.onChange(() => { map.language(lang()); retext(); });
  map.language(lang());

  /** what he tapped on the map, said and written: "That is Argentina." */
  const that = (id: string, answer: string): Both => {
    if (isSea(id)) return { en: seaSays(id).that, pt: seaSays(id, 'pt').that };
    if (isPlace(id)) return { en: findSays(place(id)).that, pt: findSays(place(id), 'pt').that };
    if (COUNTRIES.some((c) => c.id === id)) return says(id, 'there');
    return says(answer, 'not');
  };

  async function finish(ok: boolean, q: FlagQuestion, picked: string): Promise<boolean> {
    if (q.task === 'map') map.mark(q.answer, 'right');
    const why: Both = { en: q.why, pt: q.pt.why };
    if (ok) {
      sfx.cheer();
      const good = q.task === 'map' ? says(q.answer, 'there') : why;
      retext = () => kit.note(`${lang() === 'pt' ? 'Isso!' : 'Yes!'} ${good[lang()]}`, true);
      retext();
      speak(good, lang());
      await kit.wait(2600);
      return true;
    }
    sfx.wrong();
    let first: Both;
    let then = why;
    if (q.task === 'map') {
      if (!isPlace(picked) && !isSea(picked)) map.mark(picked, 'wrong');
      first = that(picked, q.answer);
      then = says(q.answer, 'here');
    } else if (q.task === 'whose') {
      first = says(q.answer, 'this');
    } else {
      first = says(picked, 'that');
    }
    retext = () => kit.note(`${first[lang()]} ${then[lang()]}`);
    retext();
    const now = lang();
    speak(first, now, () => speak(then, now));
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
      const question: Both = { en: q.ask, pt: q.pt.ask };
      /* the flags, big, to choose from; or the names, to read */
      const flags = q.task !== 'whose';
      const label = (id: string): string => (flags ? country(id).flag : namedIn(country(id), lang()));
      const words = (): void => {
        ask.textContent = question[lang()];
        const named: Both = q.task === 'whose' ? { en: 'A flag', pt: 'Uma bandeira' } : { en: `The flag of ${c.name}`, pt: `A bandeira ${of(c.pt)}` };
        flag.setAttribute('aria-label', named[lang()]);
      };
      retext = () => {
        words();
        if (q.task === 'whose') kit.choices.relabel(label);
      };
      words();
      speak(question, lang());
      if (q.task === 'map') {
        const picked = await map.tap(q.answer);
        return finish(picked === q.answer, q, picked);
      }
      kit.choices.node.classList.toggle('fl-flags', flags);
      const picked = await kit.choices.askWords(q.options, label);
      kit.choices.revealWord(q.answer, picked);
      return finish(picked === q.answer, q, picked);
    },
  };
}
