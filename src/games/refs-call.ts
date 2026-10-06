/* Ref's Call — how many points is that move?
 *
 * Jiu-jitsu scores in small numbers: a takedown, sweep or knee on belly is 2,
 * a guard pass 3, a mount or the back 4 (IBJJF, the rules of his
 * competitions). He sees the move and its name and calls the points, the
 * referee shouting it back — "Mount! 4 points!" or "Montada! Quatro pontos!".
 * Then the name alone, to read, and the other way round: which move is worth
 * 3?
 *
 * Year 2 is the referee's real job: here is what happened on the mat — is it
 * points, an advantage (nearly, but not held for 3 seconds) or a penalty
 * (stalling, fingers in the sleeve, running off the mat)?
 *
 * Bilingual: the flags on the game switch everything between English and
 * Portuguese, mid-question too. Blue is him, in his own belt. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import {
  CALL_NAME, MOVES, REF_STEPS, pointsWords, refCall, refQuestion,
  type Both, type Call, type Move, type RefQuestion, type RefStep,
} from '../content/bjj';
import { mountMaths, type Kit } from './maths-kit';
import { movePicture } from './bjj-art';
import { beltSelect, blueGi, langSwitch, speak } from './bjj-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<RefStep>({
    id: 'refs-call',
    title: "Ref's",
    swash: 'Call',
    tagline: 'Jiu-jitsu points: how many is that move worth?',
    steps: REF_STEPS,
    face: '🥋',
    build,
  }, root);
}

const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);

function build(kit: Kit) {
  const langs = langSwitch();
  const belt = beltSelect();
  const ask = el('p', { class: 'mx-ask' });
  const card = el('div', { class: 'bj-card' });
  const node = el('div', { class: 'mx-stage' }, langs.node, ask, card);
  let last: RefQuestion | undefined;
  /** redraws the words of the question on screen in the chosen language */
  let retext: () => void = () => undefined;
  langs.onChange(() => { retext(); });

  const lang = () => langs.lang();

  /** a move as a card: its picture (or not) and its name to read */
  function moveCard(move: Move, picture: boolean, small = false): HTMLElement {
    const name = el('span', { class: 'bj-name', text: move.name[lang()] });
    const c = el('div', { class: small ? 'bj-move small' : 'bj-move', dataset: { move: move.id } },
      picture ? movePicture(move, blueGi(belt)) : '', name);
    return c;
  }

  async function finish(ok: boolean, how: Both, call?: Move): Promise<boolean> {
    const said: Both = call
      ? { en: `${refCall(call, 'en')} ${how.en}`, pt: `${refCall(call, 'pt')} ${how.pt}` }
      : how;
    if (ok) sfx.cheer(); else sfx.wrong();
    const show = (): void => kit.note(`${ok ? (lang() === 'pt' ? 'Isso! ' : 'Yes! ') : ''}${said[lang()]}`, ok);
    show();
    retext = show;
    speak(said, lang());
    await kit.wait(ok ? 2600 : 3800);
    return ok;
  }

  async function points(step: RefStep, q: RefQuestion): Promise<boolean> {
    card.replaceChildren(moveCard(q.move, step.picture));
    const prompt: Both = { en: 'How many points?', pt: 'Quantos pontos?' };
    retext = () => {
      ask.textContent = prompt[lang()];
      card.querySelector('.bj-name')!.textContent = q.move.name[lang()];
    };
    retext();
    speak({ en: `${cap(q.move.name.en)}. How many points?`, pt: `${cap(q.move.name.pt)}. Quantos pontos?` }, lang());
    const picked = await kit.choices.ask([2, 3, 4]);
    kit.choices.reveal(q.move.points, picked);
    return finish(picked === q.move.points, {
      en: `A ${q.move.name.en} is ${pointsWords(q.move.points, 'en')}.`,
      pt: `${cap(q.move.name.pt)} vale ${pointsWords(q.move.points, 'pt')}.`,
    }, q.move);
  }

  async function which(q: RefQuestion): Promise<boolean> {
    card.replaceChildren(el('div', { class: 'bj-row' }, ...q.options.map((m) => moveCard(m, true, true))));
    const n = q.move.points;
    retext = () => {
      ask.textContent = lang() === 'pt' ? `Qual vale ${pointsWords(n, 'pt')}?` : `Which move is worth ${pointsWords(n, 'en')}?`;
      card.querySelectorAll<HTMLElement>('.bj-move').forEach((c) => {
        c.querySelector('.bj-name')!.textContent = MOVES.find((m) => m.id === c.dataset.move)!.name[lang()];
      });
      kit.choices.relabel((id) => MOVES.find((m) => m.id === id)!.name[lang()]);
    };
    ask.textContent = '';
    speak({ en: `Which move is worth ${pointsWords(n, 'en')}?`, pt: `Qual vale ${pointsWords(n, 'pt')}?` }, lang());
    const asked = kit.choices.askWords(q.options.map((m) => m.id), (id) => MOVES.find((m) => m.id === id)!.name[lang()]);
    retext();
    const picked = await asked;
    kit.choices.revealWord(q.move.id, picked);
    return finish(picked === q.move.id, {
      en: `A ${q.move.name.en} is ${pointsWords(n, 'en')}.`,
      pt: `${cap(q.move.name.pt)} vale ${pointsWords(n, 'pt')}.`,
    }, q.move);
  }

  async function call(q: RefQuestion): Promise<boolean> {
    const moment = q.moment!;
    card.replaceChildren(el('p', { class: 'bj-moment' }));
    retext = () => {
      ask.textContent = lang() === 'pt' ? 'O que o árbitro dá?' : 'What does the referee give?';
      card.querySelector('.bj-moment')!.textContent = moment.text[lang()];
      kit.choices.relabel((c) => CALL_NAME[c as Call][lang()]);
    };
    speak({ en: `${moment.text.en} What does the referee give?`, pt: `${moment.text.pt} O que o árbitro dá?` }, lang());
    const options: Call[] = ['points', 'advantage', 'penalty'];
    const asked = kit.choices.askWords(options, (c) => CALL_NAME[c as Call][lang()]);
    retext();
    const picked = await asked;
    kit.choices.revealWord(moment.call, picked);
    const move = moment.move ? MOVES.find((m) => m.id === moment.move) : undefined;
    return finish(picked === moment.call, moment.why, move);
  }

  return {
    node,
    setup: belt,
    ask: async (step: RefStep): Promise<boolean> => {
      const q = refQuestion(step, last);
      last = q;
      card.dataset.answer = step.task === 'points' ? String(q.move.points) : step.task === 'which' ? q.move.id : q.moment!.call;
      if (step.task === 'which') return which(q);
      if (step.task === 'call') return call(q);
      return points(step, q);
    },
  };
}
