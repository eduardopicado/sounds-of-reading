/* Ref's Signals — what the referee's hands say.
 *
 * The referee scores with gestures (IBJJF): fingers up for points, an open
 * hand out flat for an advantage, a fist at the shoulder for a penalty.
 * Kindergarten and Year 1 count the fingers, tell the three signals apart,
 * and say which move scores what the hand shows. Year 2 plays referee —
 * here is what happened, which signal? — and learns the calls shouted in
 * Portuguese at every competition: Combate! Parou! Lute!
 *
 * Bilingual like the other jiu-jitsu games, switched with the flags. */

import { el } from '../lib/dom';
import { sfx } from '../lib/sfx';
import {
  CALL_NAME, COMMANDS, MOVES, SIGNAL_HOW, SIGNAL_MEANING, SIGNAL_SAYS, SIGNAL_STEPS, signalQuestion,
  type Both, type Call, type Command, type Signal, type SignalQuestion, type SignalStep,
} from '../content/bjj';
import { mountMaths, type Kit } from './maths-kit';
import { refPicture } from './bjj-art';
import { langSwitch, speak } from './bjj-kit';

export function mount(root: HTMLElement): () => void {
  return mountMaths<SignalStep>({
    id: 'refs-signals',
    title: "Ref's",
    swash: 'Signals',
    tagline: 'Read the referee’s hands: points, advantage or penalty?',
    steps: SIGNAL_STEPS,
    face: '🙌',
    build,
  }, root);
}

const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);
const moveName = (id: string, lang: 'en' | 'pt'): string => cap(MOVES.find((m) => m.id === id)!.name[lang]);

function build(kit: Kit) {
  const langs = langSwitch();
  const ask = el('p', { class: 'mx-ask' });
  const card = el('div', { class: 'bj-card' });
  const node = el('div', { class: 'mx-stage' }, langs.node, card, ask);
  let last: SignalQuestion | undefined;
  let retext: () => void = () => undefined;
  langs.onChange(() => { retext(); });
  const lang = () => langs.lang();

  async function finish(ok: boolean, why: Both): Promise<boolean> {
    if (ok) sfx.cheer(); else sfx.wrong();
    const show = (): void => kit.note(`${ok ? (lang() === 'pt' ? 'Isso! ' : 'Yes! ') : ''}${why[lang()]}`, ok);
    show();
    retext = show;
    speak(why, lang());
    await kit.wait(ok ? 2600 : 3800);
    return ok;
  }

  async function fingers(q: SignalQuestion): Promise<boolean> {
    card.replaceChildren(refPicture(q.signal!));
    const question = SIGNAL_SAYS.fingers;
    retext = () => { ask.textContent = question[lang()]; };
    retext();
    speak(question, lang());
    const picked = await kit.choices.ask(q.options as number[]);
    kit.choices.reveal(Number(q.answer), picked);
    return finish(picked === q.answer, SIGNAL_HOW[q.signal!]);
  }

  async function kind(q: SignalQuestion): Promise<boolean> {
    card.replaceChildren(refPicture(q.signal!));
    const question = SIGNAL_SAYS.kind;
    const label = (c: string): string => CALL_NAME[c as Call][lang()];
    retext = () => { ask.textContent = question[lang()]; kit.choices.relabel(label); };
    speak(question, lang());
    const asked = kit.choices.askWords(q.options as string[], label);
    retext();
    const picked = await asked;
    kit.choices.revealWord(String(q.answer), picked);
    return finish(picked === q.answer, SIGNAL_HOW[q.signal!]);
  }

  async function move(q: SignalQuestion): Promise<boolean> {
    card.replaceChildren(refPicture(q.signal!));
    const question = SIGNAL_SAYS.move;
    const label = (id: string): string => moveName(id, lang());
    retext = () => { ask.textContent = question[lang()]; kit.choices.relabel(label); };
    speak(question, lang());
    const asked = kit.choices.askWords(q.options as string[], label);
    retext();
    const picked = await asked;
    kit.choices.revealWord(String(q.answer), picked);
    const right = MOVES.find((m) => m.id === q.answer)!;
    return finish(picked === q.answer, SIGNAL_SAYS.scored(right));
  }

  function referee(q: SignalQuestion): Promise<boolean> {
    const moment = q.moment!;
    card.replaceChildren(el('p', { class: 'bj-moment' }));
    const question = SIGNAL_SAYS.referee;
    retext = () => {
      card.querySelector('.bj-moment')!.textContent = moment.text[lang()];
      ask.textContent = question[lang()];
    };
    retext();
    speak(SIGNAL_SAYS.moment(moment), lang());
    return new Promise((resolve) => {
      const row = el('div', { class: 'bj-signals' }, ...(q.options as Signal[]).map((s) => {
        const b = el('button', { class: 'bj-signal', type: 'button', dataset: { signal: s }, 'aria-label': SIGNAL_MEANING[s].en }, refPicture(s));
        b.addEventListener('click', async () => {
          row.querySelectorAll('button').forEach((x) => { (x as HTMLButtonElement).disabled = true; });
          sfx.tap();
          const ok = s === q.answer;
          row.querySelector(`[data-signal="${q.answer}"]`)!.classList.add('right');
          if (!ok) b.classList.add('wrong');
          resolve(await finish(ok, SIGNAL_SAYS.answer(moment)));
        });
        return b;
      }));
      card.append(row);
    });
  }

  async function calls(q: SignalQuestion): Promise<boolean> {
    if (q.command) {
      const c = COMMANDS[q.command];
      card.replaceChildren(refPicture(null, c.said));
      const question: Both = { en: `The referee shouts “${c.said}” What does it mean?`, pt: `O árbitro grita “${c.said}” O que quer dizer?` };
      const label = (k: string): string => COMMANDS[k as Command].means[lang()];
      retext = () => { ask.textContent = question[lang()]; kit.choices.relabel(label); };
      speak(SIGNAL_SAYS.call(q.command), lang());
      const asked = kit.choices.askWords(q.options as string[], label);
      retext();
      const picked = await asked;
      kit.choices.revealWord(String(q.answer), picked);
      return finish(picked === q.answer, SIGNAL_SAYS.means(q.command));
    }
    card.replaceChildren(refPicture(q.signal!));
    const question = SIGNAL_SAYS.meaning;
    const label = (s: string): string => SIGNAL_MEANING[s as Signal][lang()];
    retext = () => { ask.textContent = question[lang()]; kit.choices.relabel(label); };
    speak(question, lang());
    const asked = kit.choices.askWords(q.options as string[], label);
    retext();
    const picked = await asked;
    kit.choices.revealWord(String(q.answer), picked);
    return finish(picked === q.answer, SIGNAL_HOW[q.signal!]);
  }

  return {
    node,
    ask: async (step: SignalStep): Promise<boolean> => {
      const q = signalQuestion(step, last);
      last = q;
      card.dataset.answer = String(q.answer);
      card.dataset.task = q.task;
      if (q.task === 'fingers') return fingers(q);
      if (q.task === 'kind') return kind(q);
      if (q.task === 'move') return move(q);
      if (q.task === 'referee') return referee(q);
      return calls(q);
    },
  };
}
