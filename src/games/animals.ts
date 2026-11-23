/* Animals of the World — which continent each animal lives on.
 *
 * An animal's picture and name, and the world map: he taps the continent it
 * lives on. Then a continent glows and he says which animal lives there,
 * what kind of place an animal lives in, an animal's name with no picture to
 * help, and every continent an animal lives on. Whatever he finds, he hears
 * one true thing about it. The content, and why an animal with several homes
 * is right on any of them, is in src/content/animals.ts; the map is the one
 * the geography games share (world-kit.ts).
 *
 * In English or Portuguese, switched with the flags on the game. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import {
  ANIMAL_STEPS, SAYS, animal, animalName, animalQuestion, animalSays, habitat,
  type AnimalQuestion, type AnimalStep, type HabitatId,
} from '../content/animals';
import { findSays, place, seaSays, type PlaceId } from '../content/world';
import type { Both } from '../content/pt';
import { mountMaths, type Kit } from './maths-kit';
import { isSea, worldMap } from './world-kit';
import { GEO_LANG, langSwitch, speak } from './lang-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<AnimalStep>({
    id: 'animals',
    title: 'Animals of the',
    swash: 'World',
    tagline: 'Who lives where?',
    steps: ANIMAL_STEPS,
    face: '🦘',
    cheer: 'Good map reading!',
    build,
  }, root);
}

function build(kit: Kit) {
  const langs = langSwitch(GEO_LANG);
  const lang = () => langs.lang();
  const map = worldMap();
  const ask = el('p', { class: 'mx-ask' });
  const pic = el('span', { class: 'an-pic', 'aria-hidden': 'true' });
  const name = el('span', { class: 'an-name' });
  const card = el('div', { class: 'an-card' }, pic, name);
  const node = el('div', { class: 'mx-stage wm-stage an-stage' }, langs.node, ask, card, map.node);
  let recent: string[] = [];
  /** redraws the words on screen in the chosen language */
  let retext: () => void = () => undefined;
  langs.onChange(() => { map.language(lang()); retext(); });
  map.language(lang());

  /** what he tapped, said and written: "That is Asia." */
  const that = (id: string): Both => (isSea(id)
    ? { en: seaSays(id).that, pt: seaSays(id, 'pt').that }
    : { en: findSays(place(id as PlaceId)).that, pt: findSays(place(id as PlaceId), 'pt').that });

  async function finish(q: AnimalQuestion, ok: boolean, picked?: string): Promise<boolean> {
    const fact = animalSays(q);
    for (const home of q.animal.homes) map.mark(home, 'right');
    card.hidden = false;
    pic.hidden = false;
    if (ok) {
      sfx.cheer();
      retext = () => {
        name.textContent = animalName(q.animal, lang());
        kit.note(`${SAYS.yes[lang()]} ${fact[lang()]}`, true);
      };
      retext();
      speak(fact, lang());
      await kit.wait(3000);
      return true;
    }
    sfx.wrong();
    const tappedMap = picked && (q.task === 'home' || q.task === 'read' || q.task === 'all');
    if (tappedMap) map.mark(picked, 'wrong');
    const first = tappedMap ? that(picked) : null;
    retext = () => {
      name.textContent = animalName(q.animal, lang());
      kit.note(`${first ? `${first[lang()]} ` : ''}${fact[lang()]}`);
    };
    retext();
    const now = lang();
    if (first) speak(first, now, () => speak(fact, now));
    else speak(fact, now);
    await kit.wait(5200);
    return false;
  }

  /** every continent it lives on, one tap each; a wrong one ends it */
  async function tapAll(q: AnimalQuestion): Promise<boolean> {
    const found = new Set<string>();
    for (;;) {
      const left = q.animal.homes.filter((h) => !found.has(h));
      const picked = await map.tap(left[0]);
      if (found.has(picked)) continue;
      if (!q.animal.homes.includes(picked as never)) return finish(q, false, picked);
      found.add(picked);
      map.mark(picked, 'right');
      if (found.size === q.animal.homes.length) return finish(q, true);
      sfx.tap();
      kit.note(SAYS.moreToFind[lang()], true);
      speak(SAYS.moreToFind, lang());
    }
  }

  return {
    node,
    ask: async (step: AnimalStep): Promise<boolean> => {
      const q = animalQuestion(step, recent);
      recent = [q.animal.name, ...recent].slice(0, 4);
      map.reset();
      map.names(step.names ? 'continent' : null);
      if (q.continent) map.mark(q.continent, 'glow');
      /* the animal: its picture and name, its name only when he is to read
         it, and nothing while a continent asks which animal it is */
      card.hidden = q.task === 'who';
      /* the kind of place is no question for the map, and on an iPad turned
         sideways the map would push the answers off the screen */
      map.node.hidden = q.task === 'habitat';
      pic.hidden = q.task === 'read';
      pic.textContent = q.animal.picture;
      card.classList.toggle('words-only', q.task === 'read');
      /* what the tests look for, the way the other games' cards say it */
      node.dataset.answer = q.pick ?? q.animal.homes.join(' ');
      node.dataset.task = q.task;
      const label = (option: string): string => (q.task === 'habitat'
        ? `${habitat(option as HabitatId).picture} ${habitat(option as HabitatId).name[lang()]}`
        : `${animal(option).picture} ${animalName(animal(option), lang())}`);
      retext = () => {
        ask.textContent = q.ask[lang()];
        name.textContent = animalName(q.animal, lang());
        if (q.options) kit.choices.relabel(label);
      };
      retext();
      speak(q.ask, lang());

      if (q.options) {
        const picked = await kit.choices.askWords(q.options, label);
        kit.choices.revealWord(q.pick!, picked);
        return finish(q, picked === q.pick, picked);
      }
      kit.choices.clear();
      if (q.task === 'all') return tapAll(q);
      const picked = await map.tap(q.animal.homes[0]);
      return finish(q, q.animal.homes.includes(picked as never), picked);
    },
  };
}
