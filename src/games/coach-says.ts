/* Coach Says — read what the coach says, then do it.
 *
 * Every other reading game is a word or a silly sentence; this one asks
 * whether he understood. The coach's instruction is written, not spoken:
 * "Tap the big dog." "Put the frog in the box, then tap the hen." The pictures
 * on the pitch carry no words, so reading the instruction is the only way to
 * know what to do.
 *
 * Kindergarten and Year 1 tap one thing, then two, then the big one or the
 * small one, then move a thing into a place, then two taps in order. Year 2
 * reads "not", puts two things in one place, and does a move then a tap.
 *
 * A wrong tap shows what the coach meant and reads the instruction aloud. A
 * "Read it to me" button helps a child who is stuck, but the question then
 * does not count as right first time; Pro mode takes the button away.
 *
 * It uses the maths frame (src/games/maths-kit.ts) for its round, its ladder
 * of steps and its sticker, and the week's levels for its words: only things
 * and places he can read are put on the pitch (src/content/coach-says.ts). */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { pro, settings } from '../lib/settings';
import {
  SAYS_STEPS, fits, nextKind, saysQuestion, type Action, type SaysQuestion, type SaysStep,
} from '../content/coach-says';
import { mountMaths, type Kit } from './maths-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<SaysStep>({
    id: 'coach-says',
    title: 'Coach',
    swash: 'Says',
    tagline: 'Read what the coach says, then do it.',
    steps: SAYS_STEPS,
    face: '📣',
    cheer: 'Good reading!',
    build,
  }, root);
}

/** the top level of the week's sounds: the words on the pitch go up to it */
const topLevel = (): number => (settings().levels.length ? Math.max(...settings().levels) : 8);

function build(kit: Kit) {
  const say1 = el('p', { class: 'cs-say', 'aria-live': 'polite' });
  const help = el('button', { class: 'btn ghost small cs-help', type: 'button', text: '🔊 Read it to me' });
  const things = el('div', { class: 'cs-things' });
  const places = el('div', { class: 'cs-places' });
  const node = el('div', { class: 'mx-stage cs-stage' },
    el('div', { class: 'cs-coach' }, el('span', { class: 'cs-face', text: '🧑‍🏫', 'aria-hidden': 'true' }), say1),
    help, things, places);
  let lastWords: string[] = [];

  function ask(step: SaysStep): Promise<boolean> {
    const q: SaysQuestion = saysQuestion(step, topLevel(), lastWords);
    lastWords = q.shown.map((s) => s.thing.word);
    let helped = false;
    let wrong = false;
    let held: number | null = null;
    const done: Action[] = [];

    say1.textContent = q.text;
    node.dataset.task = q.task;
    help.hidden = pro();
    help.onclick = () => { helped = true; sfx.tap(); say(q.text); };

    const itemBtns = q.shown.map((s, i) => el('button', {
      class: s.big === undefined ? 'cs-thing' : s.big ? 'cs-thing big' : 'cs-thing small',
      type: 'button', 'aria-label': `${s.big === undefined ? '' : s.big ? 'big ' : 'small '}${s.thing.word}`,
      dataset: { i: String(i), word: s.thing.word },
    }, el('span', { class: 'cs-pic', text: s.thing.picture, 'aria-hidden': 'true' })));
    const placeBtns = q.places.map((p, i) => el('button', {
      class: 'cs-place', type: 'button', 'aria-label': p.word, dataset: { i: String(i), word: p.word },
    }, el('span', { class: 'cs-pic', text: p.picture, 'aria-hidden': 'true' }), el('span', { class: 'cs-inside' })));
    things.replaceChildren(...itemBtns);
    places.replaceChildren(...placeBtns);
    places.hidden = !q.places.length;

    return new Promise<boolean>((resolve) => {
      const lock = (): void => { for (const b of [...itemBtns, ...placeBtns]) b.disabled = true; };

      /** what the coach meant: the right pictures lit, the places too */
      async function show(): Promise<void> {
        lock();
        for (const a of q.answer) {
          itemBtns[a.item].classList.add('meant');
          if (a.kind === 'put') placeBtns[a.place].classList.add('meant');
        }
        kit.note(`The coach said: ${q.text}`);
        say(q.text);
        await kit.wait(4200);
        resolve(false);
      }

      async function act(action: Action, btn: HTMLButtonElement): Promise<void> {
        if (!fits(q, done, action)) {
          wrong = true;
          sfx.wrong();
          btn.classList.add('nope');
          await show();
          return;
        }
        done.push(action);
        sfx.tap();
        if (action.kind === 'tap') itemBtns[action.item].classList.add('done');
        else {
          /* the picture goes into the place */
          const moved = itemBtns[action.item];
          moved.classList.add('gone');
          placeBtns[action.place].querySelector('.cs-inside')!.append(el('span', { text: q.shown[action.item].thing.picture }));
          placeBtns[action.place].classList.add('arrived');
        }
        if (done.length < q.answer.length) return;
        lock();
        const first = !wrong && !helped;
        sfx.cheer();
        kit.note(first ? 'Yes! Just what the coach said.' : 'That is it!', true);
        say(first ? 'Yes!' : 'That is it!');
        await kit.wait(1800);
        resolve(first);
      }

      itemBtns.forEach((btn, i) => btn.addEventListener('click', () => {
        const kind = nextKind(q, done);
        if (kind === 'tap') { void act({ kind: 'tap', item: i }, btn); return; }
        /* a move: pick it up first, then tap where it goes */
        held = held === i ? null : i;
        sfx.tap();
        itemBtns.forEach((b, j) => b.classList.toggle('held', j === held));
      }));
      placeBtns.forEach((btn, p) => btn.addEventListener('click', () => {
        if (nextKind(q, done) !== 'put') return;
        if (held === null) { kit.note('Tap a picture first, then where it goes.'); return; }
        const item = held;
        held = null;
        itemBtns[item].classList.remove('held');
        void act({ kind: 'put', item, place: p }, btn);
      }));
    });
  }

  return { node, ask };
}
