/* Story Order — first, next and last (src/content/english.ts).
 *
 * Pictures that go one way (an egg, a chick, a hen): what comes next, then
 * all three in order; then little stories of three and four sentences put
 * in order; then a question about who or where in one of the Read and Point
 * stories. A tap in the wrong order is shaken back, and he tries again. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { STORY_STEPS, storyQuestion, type StoryQuestion, type StoryStep } from '../content/english';
import { mountMaths, type Kit } from './maths-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<StoryStep>({
    id: 'story-order',
    title: 'Story',
    swash: 'Order',
    tagline: 'What happened first, next and last? Then who, and where?',
    steps: STORY_STEPS,
    face: '📚',
    cheer: 'Good story reading!',
    build,
  }, root);
}

const shuffled = <T>(list: readonly T[]): T[] => {
  for (let i = 0; i < 10; i += 1) {
    const out = [...list].sort(() => Math.random() - 0.5);
    if (out.some((x, j) => x !== list[j])) return out;
  }
  return [...list].reverse();
};

function build(kit: Kit) {
  const ask = el('p', { class: 'mx-ask' });
  const board = el('div', { class: 'so-board' });
  const node = el('div', { class: 'mx-stage so-stage' }, ask, board);
  let last = '';

  async function finish(q: StoryQuestion, ok: boolean): Promise<boolean> {
    const said = ok ? `Yes! ${q.why}` : q.why;
    if (ok) sfx.cheer(); else sfx.wrong();
    kit.note(said, ok);
    await kit.say(said, ok ? 2400 : 3600);
    return ok;
  }

  /** the things jumbled; he taps them in order into the numbered slots */
  function inOrder(order: string[], pictures: boolean): Promise<boolean> {
    return new Promise((resolve) => {
      let next = 0;
      let clean = true;
      const slots = el('ol', { class: `so-slots${pictures ? ' pictures' : ''}` }, ...order.map(() => el('li', { class: 'so-slot' })));
      const tray = el('div', { class: `so-tray${pictures ? ' pictures' : ''}` }, ...shuffled(order).map((item) => {
        const b = el('button', { class: `so-card${pictures ? ' picture' : ''}`, type: 'button', text: item, dataset: { item } }) as HTMLButtonElement;
        b.addEventListener('click', () => {
          if (item !== order[next]) {
            clean = false;
            sfx.wrong();
            b.classList.remove('nope');
            void b.offsetWidth;
            b.classList.add('nope');
            kit.note(next === 0 ? 'Not that one yet. What happened first?' : 'Not that one yet. What happened next?', false);
            return;
          }
          sfx.tap();
          b.remove();
          slots.children[next].append(el('span', { class: 'so-placed', text: item }));
          next += 1;
          if (next === order.length) resolve(clean);
        });
        return b;
      }));
      board.replaceChildren(slots, tray);
    });
  }

  return {
    node,
    ask: async (step: StoryStep): Promise<boolean> => {
      let q = storyQuestion(step.task);
      for (let i = 0; i < 20 && q.why === last; i += 1) q = storyQuestion(step.task);
      last = q.why;
      node.dataset.task = q.task;
      node.dataset.answer = q.answer ?? (q.order ?? []).join(' | ');
      ask.textContent = q.ask;
      say(q.ask);
      if (q.task === 'next') {
        const [a, b] = q.pictures!;
        board.replaceChildren(el('div', { class: 'so-row' },
          el('span', { class: 'so-pic', text: a.emoji, 'aria-label': a.name }), el('span', { class: 'so-arrow', text: '→' }),
          el('span', { class: 'so-pic', text: b.emoji, 'aria-label': b.name }), el('span', { class: 'so-arrow', text: '→' }),
          el('span', { class: 'so-pic gap', text: '?' })));
        const picked = await kit.choices.askWords(q.options!);
        kit.choices.revealWord(q.answer!, picked);
        board.querySelector('.so-pic.gap')!.textContent = q.answer!;
        return finish(q, picked === q.answer);
      }
      if (q.task === 'who') {
        const s = q.story!;
        board.replaceChildren(el('div', { class: 'so-story' }, el('h3', { class: 'so-title', text: s.title }), el('p', { class: 'so-text', text: s.text })));
        const picked = await kit.choices.askWords(q.options!);
        kit.choices.revealWord(q.answer!, picked);
        return finish(q, picked === q.answer);
      }
      const ok = await inOrder(q.order!, q.task === 'pictures');
      kit.note('', true);
      return finish(q, ok);
    },
  };
}
