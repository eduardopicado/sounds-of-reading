/* Foosball Words — slide the rods until the players spell the word, then shoot.
 *
 * A foosball table with a rod for each sound of a word: the first sound, the
 * vowel, the last. Every player on a rod wears a sound's letters. He hears the
 * word and sees its picture, slides each rod up or down until the players in
 * the shooting lane spell it (sh · i · p), and shoots.
 *
 * It is spelling by sounds, one sound to one rod: the cut is Pass and Shoot's,
 * so sh is one player, never two. The other players on a rod are mostly the
 * sounds that make another real word there — chip, shop, shin — so a wrong
 * shot is a word the game can name: "That says chop. Listen: ship." Missing
 * twice, the rods slide to the answer and the word is read, sound by sound.
 *
 * Three sounds first, then more players on each rod, then words of four
 * sounds (frog, milk) on four rods. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import { say } from '../lib/speech';
import { settings } from '../lib/settings';
import { FOOS_STEPS, foosQuestion, foosWords, wordOf, type Cut, type FoosQuestion, type FoosStep } from '../content/foosball';
import { mountMaths, type Kit } from './maths-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<FoosStep>({
    id: 'foosball-words',
    title: 'Foosball',
    swash: 'Words',
    tagline: 'Slide the rods until the players spell the word, then shoot!',
    steps: FOOS_STEPS,
    face: '🕹️',
    cheer: 'Good spelling!',
    build,
  }, root);
}

/** the words for a round: this week's sounds when there are enough of them */
function pool(step: FoosStep): Cut[] {
  const { levels, sounds } = settings();
  let words = foosWords(levels, step.rods);
  if (!words.length) words = foosWords([], step.rods);
  const week = words.filter((c) => sounds.includes(c.word.sound));
  return week.length >= 4 ? week : words;
}

function build(kit: Kit) {
  const picture = el('span', { class: 'fb-picture', 'aria-hidden': 'true' });
  const again = el('button', { class: 'btn ghost small', type: 'button', text: '🔊 Say it again' });
  const ask = el('p', { class: 'mx-ask fb-ask' }, 'Make the word you hear ', picture, again);
  const rodsEl = el('div', { class: 'fb-rods' });
  const ball = el('span', { class: 'fb-ball', text: '⚽', 'aria-hidden': 'true' });
  const goal = el('div', { class: 'fb-goal', 'aria-hidden': 'true' });
  const table = el('div', { class: 'fb-table' }, el('div', { class: 'fb-lane', 'aria-hidden': 'true' }), rodsEl, goal, ball);
  const reads = el('p', { class: 'fb-reads', 'aria-live': 'polite' });
  const shoot = el('button', { class: 'btn fb-shoot', type: 'button', text: '⚽ Shoot!' }) as HTMLButtonElement;
  const node = el('div', { class: 'mx-stage' }, ask, table, reads, shoot);
  const recent: string[] = [];

  /* the rods as they stand: the player in the lane on each */
  let q: FoosQuestion | null = null;
  let at: number[] = [];
  let cols: HTMLElement[] = [];
  let locked = false;

  const lane = (): string[] => q ? q.rods.map((rod, i) => rod[at[i]]) : [];

  function place(i: number): void {
    const col = cols[i];
    col.dataset.at = String(at[i]);
    col.style.setProperty('--at', String(at[i]));
    col.querySelector('.fb-up')!.toggleAttribute('disabled', locked || at[i] === q!.rods[i].length - 1);
    col.querySelector('.fb-down')!.toggleAttribute('disabled', locked || at[i] === 0);
    col.setAttribute('aria-label', `Sound ${i + 1}: ${q!.rods[i][at[i]]}`);
    reads.textContent = lane().join('');
  }

  function slide(i: number, to: number): void {
    if (!q || locked) return;
    const next = Math.min(q.rods[i].length - 1, Math.max(0, to));
    if (next === at[i]) return;
    at[i] = next;
    sfx.tap();
    cols[i].classList.remove('wrong');
    place(i);
  }

  function drawRods(question: FoosQuestion, team: string): void {
    cols = question.rods.map((rod, i) => {
      const men = el('div', { class: 'fb-men' }, ...rod.map((part) =>
        el('span', { class: 'fb-man', dataset: { part } }, el('span', { class: 'fb-head' }), el('span', { class: 'fb-shirt', text: part }))));
      const track = el('div', { class: 'fb-track' }, el('span', { class: 'fb-bar' }), men);
      /* a finger slides the rod; a tap on the arrows moves it one player */
      let from: { y: number; at: number } | null = null;
      track.addEventListener('pointerdown', (e) => {
        if (locked) return;
        e.preventDefault();
        try { track.setPointerCapture(e.pointerId); } catch { /* the arrows still work */ }
        from = { y: e.clientY, at: at[i] };
      });
      track.addEventListener('pointermove', (e) => {
        if (!from) return;
        const h = men.firstElementChild!.getBoundingClientRect().height || 56;
        /* up the screen moves the players up, bringing the next one into the lane */
        slide(i, from.at + Math.round((from.y - e.clientY) / h));
      });
      const stop = (): void => { from = null; };
      track.addEventListener('pointerup', stop);
      track.addEventListener('pointercancel', stop);
      const col = el('div', { class: 'fb-col', role: 'group', vars: { '--team': team } },
        el('button', { class: 'fb-up', type: 'button', text: '▲', 'aria-label': `Sound ${i + 1} up`, on: { click: () => slide(i, at[i] + 1) } }),
        track,
        el('button', { class: 'fb-down', type: 'button', text: '▼', 'aria-label': `Sound ${i + 1} down`, on: { click: () => slide(i, at[i] - 1) } }));
      return col;
    });
    rodsEl.replaceChildren(...cols);
    cols.forEach((_, i) => place(i));
  }

  /** the ball down the lane: into the net, or off the post */
  async function kick(inNet: boolean): Promise<void> {
    ball.classList.remove('in', 'post');
    void ball.offsetWidth;
    ball.classList.add(inNet ? 'in' : 'post');
    sfx.kick();
    await kit.wait(700);
  }

  /** the rods slide to the answer, and the word is read a sound at a time */
  function showAnswer(): void {
    if (!q) return;
    q.rods.forEach((rod, i) => { at[i] = rod.indexOf(q!.target.parts[i]); place(i); });
  }

  return {
    node,
    ask: (step: FoosStep): Promise<boolean> => new Promise((resolve) => {
      const words = pool(step).filter((c) => !recent.includes(c.word.text));
      const target = words[Math.floor(Math.random() * words.length)] ?? pool(step)[0];
      recent.push(target.word.text);
      if (recent.length > 6) recent.shift();
      q = foosQuestion(target, step);
      at = [...q.start];
      locked = false;
      node.dataset.answer = target.parts.join(' ');
      picture.textContent = target.word.picture ?? '';
      ball.classList.remove('in', 'post');
      drawRods(q, kit.us().colours[0]);
      const word = target.word.text;
      const sayIt = (): void => say(word);
      again.onclick = sayIt;
      sayIt();
      let misses = 0;

      shoot.disabled = false;
      shoot.onclick = async () => {
        if (!q || locked) return;
        locked = true;
        shoot.disabled = true;
        cols.forEach((_, i) => place(i));
        const parts = lane();
        const right = parts.join('') === word;
        await kick(right);
        if (right) {
          sfx.cheer();
          kit.note(`GOAL! ${target.parts.join(' · ')}: ${word}.`, true);
          say(word);
          await kit.wait(2400);
          resolve(misses === 0);
          return;
        }
        sfx.wrong();
        misses += 1;
        /* the rods that are wrong give a shake */
        parts.forEach((p, i) => cols[i].classList.toggle('wrong', p !== target.parts[i]));
        const made = wordOf(parts);
        const why = made ? `That says ${made.word.text}. Listen: ${word}.` : `Not quite. Listen: ${word}.`;
        if (misses < 2) {
          kit.note(why);
          say(why);
          locked = false;
          shoot.disabled = false;
          cols.forEach((_, i) => place(i));
          return;
        }
        /* twice: here it is, sound by sound */
        showAnswer();
        cols.forEach((c) => c.classList.remove('wrong'));
        kit.note(`Here it is: ${target.parts.join(' · ')}, ${word}.`);
        say(`${target.parts.join(', ')}. ${word}.`);
        await kit.wait(3600);
        resolve(false);
      };
    }),
  };
}
