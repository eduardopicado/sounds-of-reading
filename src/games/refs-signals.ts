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
  CALL_NAME, COMMANDS, MOVES, SIGNAL_MEANING, SIGNAL_STEPS, pointsWords, signalQuestion,
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

/** how each signal is made, said after a miss so he learns it */
const HOW: Record<Signal, Both> = {
  'points-2': { en: 'Two fingers up is 2 points.', pt: 'Dois dedos para cima são dois pontos.' },
  'points-3': { en: 'Three fingers up is 3 points.', pt: 'Três dedos para cima são três pontos.' },
  'points-4': { en: 'Four fingers up is 4 points.', pt: 'Quatro dedos para cima são quatro pontos.' },
  advantage: { en: 'An open hand out flat is an advantage.', pt: 'A mão aberta, esticada e reta, é vantagem.' },
  penalty: { en: 'A fist at the shoulder is a penalty.', pt: 'O punho fechado no ombro é punição.' },
  parou: { en: 'Both arms out means stop: Parou!', pt: 'Os dois braços abertos: Parou!' },
  dq: { en: 'Arms crossed over the head means disqualified.', pt: 'Braços cruzados sobre a cabeça: desclassificado.' },
};

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
    const question: Both = { en: 'How many points is the referee giving?', pt: 'Quantos pontos o árbitro está dando?' };
    retext = () => { ask.textContent = question[lang()]; };
    retext();
    speak(question, lang());
    const picked = await kit.choices.ask(q.options as number[]);
    kit.choices.reveal(Number(q.answer), picked);
    return finish(picked === q.answer, HOW[q.signal!]);
  }

  async function kind(q: SignalQuestion): Promise<boolean> {
    card.replaceChildren(refPicture(q.signal!));
    const question: Both = { en: 'What is the referee giving?', pt: 'O que o árbitro está dando?' };
    const label = (c: string): string => CALL_NAME[c as Call][lang()];
    retext = () => { ask.textContent = question[lang()]; kit.choices.relabel(label); };
    speak(question, lang());
    const asked = kit.choices.askWords(q.options as string[], label);
    retext();
    const picked = await asked;
    kit.choices.revealWord(String(q.answer), picked);
    return finish(picked === q.answer, HOW[q.signal!]);
  }

  async function move(q: SignalQuestion): Promise<boolean> {
    card.replaceChildren(refPicture(q.signal!));
    const n = Number(q.signal!.slice(7));
    const question: Both = { en: 'Which move did Blue score?', pt: 'Qual golpe o Azul fez?' };
    const label = (id: string): string => moveName(id, lang());
    retext = () => { ask.textContent = question[lang()]; kit.choices.relabel(label); };
    speak(question, lang());
    const asked = kit.choices.askWords(q.options as string[], label);
    retext();
    const picked = await asked;
    kit.choices.revealWord(String(q.answer), picked);
    const right = MOVES.find((m) => m.id === q.answer)!;
    return finish(picked === q.answer, {
      en: `${n} fingers is ${pointsWords(n, 'en')}: ${right.name.en}.`,
      pt: `${n} dedos são ${pointsWords(n, 'pt')}: ${right.name.pt}.`,
    });
  }

  function referee(q: SignalQuestion): Promise<boolean> {
    const moment = q.moment!;
    card.replaceChildren(el('p', { class: 'bj-moment' }));
    const question: Both = { en: 'You are the referee. Which signal?', pt: 'Você é o árbitro. Qual é o sinal?' };
    retext = () => {
      card.querySelector('.bj-moment')!.textContent = moment.text[lang()];
      ask.textContent = question[lang()];
    };
    retext();
    speak({ en: `${moment.text.en} ${question.en}`, pt: `${moment.text.pt} ${question.pt}` }, lang());
    return new Promise((resolve) => {
      const row = el('div', { class: 'bj-signals' }, ...(q.options as Signal[]).map((s) => {
        const b = el('button', { class: 'bj-signal', type: 'button', dataset: { signal: s }, 'aria-label': SIGNAL_MEANING[s].en }, refPicture(s));
        b.addEventListener('click', async () => {
          row.querySelectorAll('button').forEach((x) => { (x as HTMLButtonElement).disabled = true; });
          sfx.tap();
          const ok = s === q.answer;
          row.querySelector(`[data-signal="${q.answer}"]`)!.classList.add('right');
          if (!ok) b.classList.add('wrong');
          resolve(await finish(ok, { en: `${moment.why.en} ${HOW[q.answer as Signal].en}`, pt: `${moment.why.pt} ${HOW[q.answer as Signal].pt}` }));
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
      speak({ en: `${c.said} What does it mean?`, pt: `${c.said} O que quer dizer?` }, lang());
      const asked = kit.choices.askWords(q.options as string[], label);
      retext();
      const picked = await asked;
      kit.choices.revealWord(String(q.answer), picked);
      return finish(picked === q.answer, { en: `${c.said} means: ${c.means.en}.`, pt: `${c.said} quer dizer: ${c.means.pt}.` });
    }
    card.replaceChildren(refPicture(q.signal!));
    const question: Both = { en: 'What does this signal mean?', pt: 'O que este sinal quer dizer?' };
    const label = (s: string): string => SIGNAL_MEANING[s as Signal][lang()];
    retext = () => { ask.textContent = question[lang()]; kit.choices.relabel(label); };
    speak(question, lang());
    const asked = kit.choices.askWords(q.options as string[], label);
    retext();
    const picked = await asked;
    kit.choices.revealWord(String(q.answer), picked);
    return finish(picked === q.answer, HOW[q.signal!]);
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
