/* Same Sound, Two Ways — you can hear it, but how is it spelled?
 *
 * Every other game runs print → sound: the word is in front of him and the
 * job is to read it. This one runs the other way. The word is spoken and a
 * piece of it is missing, so the sound is all he has to go on, and hearing it
 * cannot tell him whether it is rain or rayn.
 *
 * What makes that answerable rather than a coin toss is that English has a
 * rule here, and it is the same rule three times over: ai/oi sit inside a
 * word, ay/oy end one, and oa/ow do likewise. So the game teaches one idea
 * and then shows it holding in three places.
 *
 * The pairs, and which words the rule actually gets right, are in
 * src/content/contrasts.ts, where the content test can check them against
 * every word. Nothing is ever asked here that the rule would answer wrongly. */

import { el, replay } from '../lib/dom';
import { shuffle, spreadAcross } from '../lib/random';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { marked, setMarked } from '../lib/highlight';
import { picturable, realWords, sound, type Level, type Word } from '../content/index';
import { confetti, counter, createSetup, scoreLine, topbar } from '../ui/components';
import { award } from '../lib/stickers';
import { CONTRASTS, contrastFor, contrastSpan, obeysRule, type Contrast } from '../content/contrasts';

export function mount(root: HTMLElement): () => void {
  const setSel = el('select', { 'aria-label': 'Which pair of spellings' });
  const lenSel = el('select', { 'aria-label': 'How many words' },
    el('option', { value: '8', text: '8 words' }),
    el('option', { value: '12', text: '12 words', selected: 'selected' }),
    el('option', { value: '16', text: '16 words' }),
  );
  const extra = el('div', { class: 'row' },
    el('span', { class: 'lbl', text: 'This game' }), setSel, lenSel,
  );
  setSel.addEventListener('change', () => start());
  lenSel.addEventListener('change', () => start());

  const setup = createSetup({ extra: [extra], onChange: () => { fillSets(); start(); } });

  const done = counter('Spelled');
  const totalEl = el('span', { text: '0' });
  const rightFirst = counter('Right first try');

  const picEl = el('div', { class: 'pic', text: '🎈' });
  const wordEl = el('div', { class: 'word' });
  const hand = el('div', { class: 'hand' }, picEl, wordEl);
  const stage = el('div', { class: 'stage' }, hand);

  /* the rule, in the child's own words. Hidden until he needs it, because
     working it out himself is worth more than being told. */
  const rule = el('p', { class: 'tag rule', hidden: 'hidden' });

  const choices = el('div', { class: 'bins choices' });

  const resultList = el('ul', {});
  const prize = el('span', { class: 'sticker fresh', hidden: 'hidden' });
  const results = el('div', { class: 'tray results', hidden: 'hidden' },
    el('h2', {}, 'How it went ', prize), resultList,
    el('div', { class: 'row', style: { marginTop: '14px' } },
      el('button', { class: 'btn', type: 'button', text: 'Play again', on: { click: () => start() } })),
  );

  const empty = el('p', { class: 'tag', hidden: 'hidden' },
    'These spellings come in at level 5 and 6. Turn one of those on to play this game.');

  const node = el('div', { class: 'wrap' },
    topbar({
      title: 'Same Sound,', swash: 'Two Ways',
      tagline: 'You can hear it. Now choose how it is written.',
      onSetup: (open) => setup.open(open),
    }),
    setup.node,
    scoreLine(el('span', {}, done.node, ' of ', totalEl), rightFirst.node),
    empty,
    stage,
    el('div', { class: 'row', style: { justifyContent: 'center' } },
      el('button', { class: 'btn ghost', type: 'button', text: '🔊 Say it again', on: { click: () => current && say(current.text) } })),
    choices, rule, results,
  );

  let queue: Word[] = [];
  let current: Word | null = null;
  let contrast: Contrast = CONTRASTS[0];
  let tries = 0;
  let spelled = 0;
  let firstTry = 0;
  let busy = false;
  let log: { word: Word; firstTry: boolean }[] = [];

  /** only offer a pair when both its spellings are in play this week */
  function fillSets(): void {
    const available = new Set(setup.available().map((s) => s.id));
    const keep = setSel.value;
    setSel.replaceChildren();
    const usable = CONTRASTS.filter((c) => available.has(c.middle) && available.has(c.end));
    for (const c of usable) setSel.append(el('option', { value: c.id, text: c.label }));
    /* the payoff: the same rule holding in three places at once */
    if (usable.length > 1) setSel.append(el('option', { value: 'mixed', text: 'All of them' }));
    if ([...setSel.options].some((o) => o.value === keep)) setSel.value = keep;
  }

  function chosenContrasts(): Contrast[] {
    const available = new Set(setup.available().map((s) => s.id));
    const usable = CONTRASTS.filter((c) => available.has(c.middle) && available.has(c.end));
    if (setSel.value === 'mixed') return usable;
    const one = usable.find((c) => c.id === setSel.value);
    return one ? [one] : usable.slice(0, 1);
  }

  /** words for one contrast that the rule gets right, pictures preferred */
  function wordsFor(c: Contrast, levels: Level[]): Word[] {
    const both = realWords({ sounds: [c.middle, c.end], levels }).filter((w) => obeysRule(w, c));
    const withPicture = picturable(both);
    /* he needs to know which word it is before he can spell it, and the
       picture says so without giving the letters away */
    return withPicture.length >= 6 ? withPicture : [...withPicture, ...both.filter((w) => !w.picture)];
  }

  const contrastOf = (word: Word): Contrast => contrastFor(word.sound) ?? CONTRASTS[0];

  function start(): void {
    const levels = setup.filter().levels;
    const groups = chosenContrasts().map((c) => wordsFor(c, levels)).filter((g) => g.length);
    queue = shuffle(spreadAcross(groups, Number(lenSel.value)));

    const none = !queue.length;
    empty.hidden = !none;
    stage.hidden = none;
    choices.hidden = none;

    spelled = 0; firstTry = 0; log = []; busy = false; current = null;
    done.set(0); rightFirst.set(0); totalEl.textContent = String(queue.length);
    results.hidden = true;
    rule.hidden = true;
    resultList.replaceChildren();
    hand.style.display = '';
    if (none) { choices.replaceChildren(); return; }
    next();
  }

  /** the word with its vowel spelling lifted out, as letters and a slot */
  function drawGap(word: Word): void {
    const span = contrastSpan(word);
    wordEl.replaceChildren();
    if (!span) { wordEl.textContent = word.text; return; }
    wordEl.append(
      document.createTextNode(word.text.slice(0, span.at)),
      el('span', { class: 'gap', 'aria-label': 'missing letters' }),
      document.createTextNode(word.text.slice(span.at + span.len)),
    );
  }

  function drawChoices(): void {
    choices.replaceChildren();
    choices.style.gridTemplateColumns = 'repeat(2, 1fr)';
    for (const id of [contrast.middle, contrast.end]) {
      const s = sound(id);
      const btn = el('button', {
        class: 'bin choice', type: 'button', vars: { '--tone': s.tones.light },
        dataset: { sound: id }, 'aria-label': `Spell it ${s.label}`,
      }, el('span', { class: 'name', text: s.label }));
      btn.addEventListener('click', () => choose(id, btn));
      choices.append(btn);
    }
  }

  function next(): void {
    const word = queue.pop();
    if (!word) { finish(); return; }
    current = word;
    contrast = contrastOf(word);
    tries = 0;
    hand.classList.remove('right', 'wrong');
    hand.style.removeProperty('--tone');
    rule.hidden = true;
    picEl.textContent = word.picture ?? '🔤';
    drawGap(word);
    drawChoices();
    /* hearing it is the whole input — without this there is nothing to go on */
    say(word.text);
  }

  function reveal(word: Word): void {
    const s = sound(word.sound);
    setMarked(wordEl, word.text, word.spans, { tones: s.tones });
    hand.style.setProperty('--tone', s.tones.deep);
  }

  function choose(id: string, btn: HTMLElement): void {
    if (busy || !current) return;
    tries += 1;
    const word = current;

    if (id === word.sound) {
      busy = true;
      sfx.right();
      hand.classList.add('right');
      reveal(word);
      if (tries === 1) { firstTry += 1; rightFirst.set(firstTry); }
      log.push({ word, firstTry: tries === 1 });
      spelled += 1;
      done.set(spelled);
      current = null;
      window.setTimeout(() => { busy = false; next(); }, 820);
      return;
    }

    sfx.wrong();
    replay(hand, 'wrong');
    btn.classList.add('over');
    window.setTimeout(() => btn.classList.remove('over'), 200);

    /* first miss gets the rule rather than another blind guess */
    const mid = sound(contrast.middle);
    const end = sound(contrast.end);
    rule.textContent = `In the middle of a word it is ${mid.label}. At the end it is ${end.label}.`;
    rule.hidden = false;

    /* second miss: show him, and count it as one to come back to */
    if (tries === 2) {
      busy = true;
      reveal(word);
      log.push({ word, firstTry: false });
      spelled += 1;
      done.set(spelled);
      current = null;
      window.setTimeout(() => { busy = false; next(); }, 1100);
    }
  }

  function finish(): void {
    current = null;
    hand.style.display = 'none';
    choices.replaceChildren();
    rule.hidden = true;
    resultList.replaceChildren();
    for (const entry of log) {
      const s = sound(entry.word.sound);
      const li = el('li', { class: entry.firstTry ? '' : 'miss' });
      li.append(marked(entry.word.text, entry.word.spans, { tones: s.tones }));
      if (!entry.firstTry) li.append(el('span', { class: 'mk', text: 'retry' }));
      resultList.append(li);
    }
    const sticker = award(log.map((entry) => entry.word.sound));
    prize.hidden = !sticker;
    prize.textContent = sticker?.face ?? '';
    results.hidden = false;
    sfx.win();
    confetti();
    say(firstTry === log.length ? 'Every one right!' : 'Good spelling!');
  }

  root.append(node);
  fillSets();
  start();
  return () => undefined;
}
