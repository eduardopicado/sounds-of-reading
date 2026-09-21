/* Real or Silly? — read the word, decide whether it is a word at all.
 *
 * No highlight and no audio until the child has answered, because decoding it
 * unaided is the whole exercise. "Sound it out for me" is always there, and is
 * recorded in the results so a parent can see which words needed it.
 *
 * Half the words are real, half are made up. Every silly word is checked by
 * the content test to be pronounceable, to contain the sound it practises, and
 * to not secretly be a real word. */

import { el, replay } from '../lib/dom';
import { shuffle } from '../lib/random';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { marked, setMarked } from '../lib/highlight';
import { realWords, sillyWords, sound, type Word } from '../content/index';
import { createSetup, counter, scoreLine, topbar } from '../ui/components';

export function mount(root: HTMLElement): () => void {
  const lenSel = el('select', { 'aria-label': 'How many words' },
    el('option', { value: '8', text: '8 words' }),
    el('option', { value: '12', text: '12 words', selected: 'selected' }),
    el('option', { value: '16', text: '16 words' }),
  );
  const extra = el('div', { class: 'row' }, el('span', { class: 'lbl', text: 'This game' }), lenSel);
  lenSel.addEventListener('change', () => start());

  const setup = createSetup({ extra: [extra], onChange: () => start() });

  const posEl = counter('Word');
  const totalEl = el('span', { text: '0' });
  const rightEl = counter('Right');
  const streakBox = el('span', { style: { visibility: 'hidden' } });
  const streakN = el('b', { text: '0' });
  streakBox.append('🔥 ', streakN);

  const revealEl = el('div', { class: 'reveal' });
  const wordEl = el('div', { class: 'theword', text: 'ready?' });
  const verdict = el('div', { class: 'verdict idle', text: 'Read it out loud, then choose' });
  const stage = el('div', { class: 'word-stage' }, revealEl, wordEl, verdict);

  const helpBtn = el('button', { class: 'btn ghost', type: 'button', text: '🔊 Sound it out for me' });
  const helpRow = el('div', { style: { textAlign: 'center', marginTop: '8px' } }, helpBtn);
  const realBtn = el('button', { class: 'ans real', type: 'button' }, el('span', { class: 'em', text: '✅' }), 'Real word');
  const sillyBtn = el('button', { class: 'ans silly', type: 'button' }, el('span', { class: 'em', text: '🤪' }), 'Silly word');
  const answers = el('div', { class: 'answers' }, realBtn, sillyBtn);

  const resultList = el('ul', {});
  const results = el('div', { class: 'tray results', hidden: 'hidden' },
    el('h2', { text: 'How it went' }), resultList,
    el('div', { class: 'row', style: { marginTop: '14px' } },
      el('button', { class: 'btn', type: 'button', text: 'Play again', on: { click: () => start() } })),
  );

  const node = el('div', { class: 'wrap' },
    topbar({
      title: 'Real or', swash: 'Silly?',
      tagline: 'Read the word. Is it a real word, or a made-up one?',
      onSetup: (open) => setup.open(open),
    }),
    setup.node,
    scoreLine(el('span', {}, posEl.node, ' of ', totalEl), rightEl.node, streakBox),
    stage, helpRow, answers, results,
  );

  let queue: Word[] = [];
  let index = 0;
  let right = 0;
  let streak = 0;
  let busy = false;
  let usedHelp = false;
  let log: { word: Word; correct: boolean; usedHelp: boolean }[] = [];

  function start(): void {
    const filter = setup.filter();
    const wanted = Number(lenSel.value);
    const half = Math.ceil(wanted / 2);
    const reals = shuffle(realWords(filter)).slice(0, half);
    const sillies = shuffle(sillyWords(filter)).slice(0, wanted - half);
    queue = shuffle([...reals, ...sillies]);

    index = 0; right = 0; streak = 0; busy = false; log = [];
    posEl.set(1); rightEl.set(0);
    totalEl.textContent = String(queue.length);
    streakBox.style.visibility = 'hidden';
    results.hidden = true;
    resultList.replaceChildren();
    stage.style.display = '';
    answers.style.display = '';
    helpRow.style.display = '';
    realBtn.disabled = false;
    sillyBtn.disabled = false;
    next();
  }

  function next(): void {
    if (index >= queue.length) { finish(); return; }
    usedHelp = false;
    posEl.set(index + 1);
    stage.style.removeProperty('--tone');
    revealEl.textContent = '';
    /* plain, unspoken: he has to decode it himself */
    wordEl.textContent = queue[index].text;
    verdict.className = 'verdict idle';
    verdict.textContent = 'Read it out loud, then choose';
    busy = false;
  }

  function answer(saidReal: boolean): void {
    if (busy || index >= queue.length) return;
    busy = true;
    const word = queue[index];
    const correct = saidReal === word.real;
    const s = sound(word.sound);

    stage.style.setProperty('--tone', s.tones.deep);
    setMarked(wordEl, word.text, word.spans, { tones: s.tones });
    revealEl.textContent = word.real ? (word.picture ?? '✅') : '🤪';
    replay(stage, correct ? 'bounce' : 'shake');

    if (correct) {
      right += 1;
      streak += 1;
      rightEl.set(right);
      sfx.right();
      verdict.className = 'verdict good';
      verdict.textContent = word.real ? `Yes — ${word.text} is a real word!` : `Right — ${word.text} isn't a word!`;
    } else {
      streak = 0;
      sfx.wrong();
      verdict.className = 'verdict bad';
      verdict.textContent = word.real ? `${word.text} IS a real word.` : `${word.text} is a made-up word.`;
    }
    streakN.textContent = String(streak);
    streakBox.style.visibility = streak >= 2 ? 'visible' : 'hidden';

    say(word.text);
    log.push({ word, correct, usedHelp });
    index += 1;
    window.setTimeout(next, 1600);
  }

  function finish(): void {
    stage.style.display = 'none';
    answers.style.display = 'none';
    helpRow.style.display = 'none';
    resultList.replaceChildren();
    for (const entry of log) {
      const s = sound(entry.word.sound);
      const li = el('li', { class: entry.correct ? '' : 'miss' });
      li.append(marked(entry.word.text, entry.word.spans, { tones: s.tones }));
      if (!entry.correct) li.append(el('span', { class: 'mk', text: 'missed' }));
      if (entry.usedHelp) li.append(el('span', { class: 'mk', text: 'heard it' }));
      resultList.append(li);
    }
    results.hidden = false;
    sfx.win();
    say(right === log.length ? 'Perfect!' : 'Good reading!');
  }

  realBtn.addEventListener('click', () => answer(true));
  sillyBtn.addEventListener('click', () => answer(false));
  helpBtn.addEventListener('click', () => {
    if (busy || index >= queue.length) return;
    usedHelp = true;
    say(queue[index].text, { slow: true });
  });

  root.append(node);
  start();
  return () => undefined;
}
