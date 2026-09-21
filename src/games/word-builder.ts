/* Word Builder — keep one part, swap the other, see what word you get.
 *
 * Two shapes of family. Most keep the ending and swap the front: -ain with r,
 * m, br, ch. A qu family has to work the other way round, because English
 * never puts qu anywhere but the front — so qu stays put and the endings
 * change: qu + ick, qu + ack, qu + ilt. Same machine, slots swapped.
 *
 * Every real build here is checked against a dictionary by the content test,
 * which is why the child is no longer told that "vain" is a made-up word. */

import { el, replay } from '../lib/dom';
import { shuffle } from '../lib/random';
import { say } from '../lib/speech';
import { sfx } from '../lib/sfx';
import { marked } from '../lib/highlight';
import { buildWord, families, familySpans, sound, type FamilySpec } from '../content/index';
import { createSetup, topbar, winOverlay } from '../ui/components';

interface Tile { part: string; real: boolean }

export function mount(root: HTMLElement): () => void {
  const familySel = el('select', { 'aria-label': 'Word family' });
  const modeSel = el('select', { 'aria-label': 'Which tiles to show' },
    el('option', { value: 'mixed', text: 'Real and silly words', selected: 'selected' }),
    el('option', { value: 'real', text: 'Real words only' }),
  );
  const extra = el('div', { class: 'row' },
    el('span', { class: 'lbl', text: 'This game' }), familySel, modeSel,
  );
  familySel.addEventListener('change', () => load());
  modeSel.addEventListener('change', () => load());

  const setup = createSetup({ extra: [extra], onChange: () => { fillFamilies(); load(); } });

  const foundEl = el('b', { text: '0' });
  const totalEl = el('span', { text: '0' });
  const slotA = el('div', { class: 'slot blank', text: '?' });
  const slotB = el('div', { class: 'slot fixed', text: '' });
  const slots = el('div', { class: 'slots' }, slotA, slotB);
  const verdict = el('div', { class: 'verdict idle', text: 'Tap a letter below to build a word' });
  const machine = el('div', { class: 'machine' }, slots, verdict,
    el('div', { class: 'actions' },
      el('button', { class: 'btn ghost on-paper', type: 'button', text: '🔊 Say it again', on: { click: () => current && say(buildWord(family!, current)) } }),
      el('button', { class: 'btn ghost on-paper', type: 'button', text: '🔀 Shuffle tiles', on: { click: () => { tiles = shuffle(tiles); drawRack(); } } }),
    ));
  const rack = el('div', { class: 'rack' });
  const madeList = el('div', { class: 'tokens' });
  const win = winOverlay({
    title: 'Family complete!',
    onAgain: () => load(),
    againLabel: 'Play it again',
    extraAction: el('button', { class: 'btn', type: 'button', text: 'Next family', on: { click: () => { nextFamily(); win.hide(); } } }),
  });

  const node = el('div', { class: 'wrap' },
    topbar({
      title: 'Word', swash: 'Builder',
      tagline: 'Keep one part. Swap the other. What word do you get?',
      onSetup: (open) => setup.open(open),
    }),
    setup.node,
    el('div', { class: 'score' }, el('span', {}, 'Real words found ', foundEl, ' of ', totalEl)),
    machine, rack,
    el('div', { class: 'tray' }, el('h2', { text: 'Words you made' }), madeList),
    win.node,
  );

  let family: FamilySpec | null = null;
  let tiles: Tile[] = [];
  let current: string | null = null;
  const found = new Set<string>();
  const built = new Set<string>();

  function available(): FamilySpec[] {
    const list = families(setup.filter());
    return list.length ? list : families({ levels: setup.filter().levels });
  }

  function fillFamilies(): void {
    const keep = familySel.value;
    familySel.replaceChildren();
    const groups = new Map<string, FamilySpec[]>();
    for (const f of available()) {
      const label = sound(f.sound).label;
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(f);
    }
    for (const [label, list] of groups) {
      const group = el('optgroup', { label });
      for (const f of list) {
        group.append(el('option', {
          value: f.id,
          text: f.kind === 'rime' ? `-${f.fixed}` : `${f.fixed}-`,
        }));
      }
      familySel.append(group);
    }
    if ([...familySel.options].some((o) => o.value === keep)) familySel.value = keep;
  }

  function load(): void {
    const list = available();
    family = list.find((f) => f.id === familySel.value) ?? list[0] ?? null;
    if (!family) {
      rack.replaceChildren(el('p', { class: 'tag', text: 'No word families for those sounds yet — try adding a level.' }));
      return;
    }
    familySel.value = family.id;
    const s = sound(family.sound);
    machine.style.setProperty('--tone', s.tones.light);
    rack.style.setProperty('--tone', s.tones.light);

    /* the fixed part sits on the correct side: -ain on the right, qu- on the left */
    slots.replaceChildren(...(family.kind === 'rime' ? [slotA, slotB] : [slotB, slotA]));
    slotB.textContent = family.fixed;
    slotA.textContent = '?';
    slotA.classList.remove('filled');

    tiles = shuffle([
      ...family.real.map((part) => ({ part, real: true })),
      ...(modeSel.value === 'mixed' ? family.silly.map((part) => ({ part, real: false })) : []),
    ]);
    found.clear();
    built.clear();
    current = null;
    foundEl.textContent = '0';
    totalEl.textContent = String(family.real.length);
    verdict.className = 'verdict idle';
    verdict.textContent = 'Tap a letter below to build a word';
    madeList.replaceChildren(el('span', { class: 'empty', text: 'Nothing built yet.' }));
    win.hide();
    drawRack();
  }

  function drawRack(): void {
    if (!family) return;
    rack.replaceChildren();
    for (const tile of tiles) {
      const button = el('button', {
        class: 'tile' + (found.has(tile.part) ? ' used' : '') + (current === tile.part ? ' current' : ''),
        type: 'button',
        'aria-label': buildWord(family, tile.part),
      }, tile.part);
      button.addEventListener('click', () => choose(tile));
      rack.append(button);
    }
  }

  function choose(tile: Tile): void {
    if (!family) return;
    const word = buildWord(family, tile.part);
    current = tile.part;
    slotA.textContent = tile.part;
    slotA.classList.add('filled');
    replay(machine, tile.real ? 'pop' : 'silly');

    verdict.className = 'verdict ' + (tile.real ? 'real' : 'silly');
    verdict.textContent = tile.real ? `✅ ${word} — that's a real word!` : `🤪 ${word} — silly word!`;
    if (tile.real) sfx.right(); else sfx.wrong();
    say(word);

    if (!built.has(word)) {
      built.add(word);
      madeList.querySelector('.empty')?.remove();
      const token = el('span', { class: 'tokn', vars: { '--tone': tile.real ? '#79D3B0' : '#F0A28A' } });
      const spans = familySpans(family, tile.part);
      token.append(spans.length ? marked(word, spans, { tones: sound(family.sound).tones }) : document.createTextNode(word));
      madeList.append(token);
    }

    if (tile.real && !found.has(tile.part)) {
      found.add(tile.part);
      foundEl.textContent = String(found.size);
      if (found.size === family.real.length) {
        window.setTimeout(() => {
          win.show(`You built all ${family!.real.length} real words in the ${family!.kind === 'rime' ? '-' + family!.fixed : family!.fixed + '-'} family.`);
          say('Brilliant!');
        }, 500);
      }
    }
    drawRack();
  }

  function nextFamily(): void {
    const list = available();
    const i = list.findIndex((f) => f.id === family?.id);
    familySel.value = list[(i + 1) % list.length]?.id ?? list[0].id;
    load();
  }

  root.append(node);
  fillFamilies();
  load();
  return () => win.hide();
}
