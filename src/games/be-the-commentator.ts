/* Be the Commentator — read it like you mean it.
 *
 * Every other game asks whether he can read a word. This one asks how he
 * reads a sentence, because a child who can decode everything can still
 * read like a robot: every word the same weight, no rise at a question, no
 * lift at an exclamation. Fluency is the bridge from reading words to
 * reading for meaning, and expression is the part of it you can hear.
 *
 * So he is the commentator. A line comes up — "Can he do it? Yes! He can!" —
 * and the marks tell him how to say it: ! excited, ? asking, . calm. Scoops
 * under the phrases show where the breath goes, so he reads in chunks rather
 * than word by word. He records it, and hears it back over a crowd.
 *
 * Hearing himself is the engine. He will want to do it again, louder, more
 * excited, and every take is another read of the same line — repeated
 * reading is one of the best-evidenced ways to build fluency, and here it
 * does not feel like repetition. At the end his takes play back to back as
 * the match highlights.
 *
 * The iPad's voice is never the model. It reads flat, and copying it would
 * teach the very thing this game is meant to fix.
 *
 * Recordings stay in memory for the round and are gone when he leaves. With
 * no microphone, or a "no" to the permission prompt, he reads each line out
 * loud to whoever is with him and the game carries on. */

import { el } from '../lib/dom';
import { lifetime } from '../lib/life';
import { pick, shuffle } from '../lib/random';
import { sfx } from '../lib/sfx';
import { read } from '../lib/storage';
import { ALL_COMMENTARY, LEVELS, type CommentaryLine, type Level, type Mood } from '../content/index';
import { confetti, counter, createSetup, scoreLine, topbar } from '../ui/components';
import { canRecord, closeMic, forget, openMic, play, record, stopPlaying, type Recording, type Take } from '../lib/recorder';
import { TEAMS, YOU, teamById } from './teams';

/** the longest take, in seconds: plenty for one line, not so long a forgotten
    recording runs on */
const TAKE_LIMIT = 10;

const MOODS: Record<Mood, { face: string; say: string }> = {
  excited: { face: '🤩', say: 'Say it excited!' },
  asking: { face: '🤔', say: 'Say it like a question' },
  calm: { face: '😌', say: 'Say it calmly' },
};

type Phase = 'ready' | 'recording' | 'recorded' | 'nomic' | 'over';

export function mount(root: HTMLElement): () => void {
  const life = lifetime();
  const lenSel = el('select', { 'aria-label': 'How many lines' },
    el('option', { value: '5', text: '5 lines' }),
    el('option', { value: '8', text: '8 lines' }),
  );
  lenSel.addEventListener('change', () => start());
  const setup = createSetup({
    extra: [el('div', { class: 'row' }, el('span', { class: 'lbl', text: 'This game' }), lenSel)],
    onChange: () => start(),
  });

  const lineNo = counter('Line');
  const totalEl = el('span', { text: '0' });

  const moodEl = el('p', { class: 'cm-mood' });
  const lineEl = el('p', { class: 'cm-line' });
  const card = el('div', { class: 'cm-card' }, moodEl, lineEl);

  const status = el('p', { class: 'cm-status', 'aria-live': 'polite' });
  const recordBtn = el('button', { class: 'btn cm-rec', type: 'button', text: '🎙 Record' });
  const stopBtn = el('button', { class: 'btn cm-stop', type: 'button', text: '⏹ Stop' });
  const playBtn = el('button', { class: 'btn ghost', type: 'button', text: '▶ Play it back' });
  const againBtn = el('button', { class: 'btn ghost', type: 'button', text: '🎙 Again' });
  const nextBtn = el('button', { class: 'btn', type: 'button', text: 'Next line ➡' });
  const readBtn = el('button', { class: 'btn', type: 'button', text: '✅ I read it!' });
  const controls = el('div', { class: 'cm-controls' }, recordBtn, stopBtn, playBtn, againBtn, nextBtn, readBtn);

  const reel = el('ol', { class: 'cm-reel' });
  const reelBtn = el('button', { class: 'btn', type: 'button', text: '▶ Play the highlights' });
  const results = el('div', { class: 'tray results', hidden: 'hidden' },
    el('h2', {}, 'Your match highlights'), reel,
    el('div', { class: 'row', style: { marginTop: '14px' } },
      reelBtn,
      el('button', { class: 'btn ghost', type: 'button', text: 'New match', on: { click: () => start() } })),
  );

  const node = el('div', { class: 'wrap' },
    topbar({
      title: 'Be the', swash: 'Commentator',
      tagline: 'Read it like you mean it. Then hear yourself on the telly.',
      onSetup: (open) => setup.open(open),
    }),
    setup.node,
    scoreLine(el('span', {}, lineNo.node, ' of ', totalEl)),
    card, status, controls, results,
  );

  /* ── state ───────────────────────────────────────────────────────────── */

  let lines: CommentaryLine[] = [];
  let index = 0;
  let takes: (Take | null)[] = [];
  let phase: Phase = 'ready';
  let mic: MediaStream | null = null;
  let micRefused = !canRecord();
  let recording: Recording | null = null;
  let us = 'the Reds';
  let them = 'the Blues';
  let busy = false;

  /** every level up to the top one chosen: a level 5 reader can read level 1 lines */
  function upTo(): Level[] {
    const chosen = setup.filter().levels;
    if (!chosen.length) return LEVELS.map((l) => l.n);
    const top = Math.max(...chosen);
    return LEVELS.map((l) => l.n).filter((n) => n <= top);
  }

  /** the line with the teams in, starting with a capital */
  function fill(text: string): string {
    const out = text.replace(/\{us\}/g, us).replace(/\{them\}/g, them);
    return out.charAt(0).toUpperCase() + out.slice(1);
  }

  /** the line drawn for reading: a scoop under each phrase, the marks big */
  function drawLine(line: CommentaryLine): void {
    lineEl.replaceChildren();
    line.chunks.forEach((chunk, i) => {
      const scoop = el('span', { class: 'cm-chunk' });
      /* only the first phrase is a sentence start; the teams go in either way */
      const text = i === 0 ? fill(chunk) : chunk.replace(/\{us\}/g, us).replace(/\{them\}/g, them);
      for (const part of text.split(/([!?.,])/)) {
        if (!part) continue;
        if ('!?.,'.includes(part)) {
          const kind = part === '!' ? 'bang' : part === '?' ? 'ask' : part === '.' ? 'stop' : 'comma';
          scoop.append(el('span', { class: `cm-mark ${kind}`, text: part }));
        } else {
          scoop.append(part);
        }
      }
      lineEl.append(scoop, ' ');
    });
    const mood = MOODS[line.mood];
    moodEl.textContent = `${mood.face} ${mood.say}`;
    card.dataset.mood = line.mood;
  }

  function show(p: Phase): void {
    phase = p;
    node.dataset.phase = p;
    const has = !!takes[index];
    recordBtn.hidden = p !== 'ready';
    stopBtn.hidden = p !== 'recording';
    playBtn.hidden = p !== 'recorded' || !has;
    againBtn.hidden = p !== 'recorded';
    nextBtn.hidden = p !== 'recorded';
    readBtn.hidden = p !== 'nomic';
    card.classList.toggle('live', p === 'recording');
    status.textContent = p === 'ready' ? 'Press record, then read the line out loud.'
      : p === 'recording' ? '🔴 Recording… press stop when you finish.'
        : p === 'recorded' ? (has ? 'Listen back. Want another go? Try it even more like a commentator!' : 'Nothing was recorded that time. Try again?')
          : p === 'nomic' ? 'No microphone here, so read it out loud to a grown-up.'
            : '';
  }

  /* ── one line ────────────────────────────────────────────────────────── */

  function showLine(): void {
    const line = lines[index];
    lineNo.set(index + 1);
    drawLine(line);
    show(micRefused ? 'nomic' : 'ready');
  }

  async function startRecording(): Promise<void> {
    if (busy || phase !== 'ready') return;
    busy = true;
    /* the first press asks for the microphone, inside his tap, which is what
       iOS needs to allow it */
    if (!mic) {
      const opened = await openMic();
      /* the permission prompt can sit there while he leaves the game; a
         microphone granted after that must be let go at once, not left on */
      if (!life.alive()) { closeMic(opened); return; }
      mic = opened;
    }
    busy = false;
    if (!mic) { micRefused = true; show('nomic'); return; }
    recording = record(mic, TAKE_LIMIT, () => { void stopRecording(); });
    if (!recording) { micRefused = true; show('nomic'); return; }
    sfx.tap();
    show('recording');
  }

  async function stopRecording(): Promise<void> {
    if (phase !== 'recording' || !recording) return;
    const r = recording;
    recording = null;
    const take = await r.stop();
    if (!life.alive()) { forget(take); return; }
    forget(takes[index]);
    takes[index] = take;
    show('recorded');
    if (take) void playBack();
  }

  /** his take, with the crowd under it, and a roar after an exclamation */
  async function playBack(): Promise<void> {
    const take = takes[index];
    if (!take || busy) return;
    busy = true;
    playBtn.disabled = true;
    sfx.crowd(take.seconds + 0.6);
    await play(take);
    if (!life.alive()) return;
    if (lines[index]?.mood === 'excited') sfx.cheer();
    playBtn.disabled = false;
    busy = false;
  }

  function nextLine(): void {
    if (busy) return;
    index += 1;
    if (index >= lines.length) { finish(); return; }
    showLine();
  }

  recordBtn.addEventListener('click', () => { void startRecording(); });
  stopBtn.addEventListener('click', () => { void stopRecording(); });
  playBtn.addEventListener('click', () => { void playBack(); });
  againBtn.addEventListener('click', () => { if (!busy) show('ready'); });
  nextBtn.addEventListener('click', nextLine);
  readBtn.addEventListener('click', () => { sfx.right(); nextLine(); });

  /* ── the match ───────────────────────────────────────────────────────── */

  function start(): void {
    for (const t of takes) forget(t);
    const levels = upTo();
    const pool = ALL_COMMENTARY.filter((l) => levels.includes(l.level));
    /* up to half from his top two levels, so moving up a level brings new
       lines instead of the same easy ones */
    const want = Number(lenSel.value);
    const top = Math.max(...levels);
    /* one of each way of saying it first — excited, asking, calm — since
       telling them apart is the whole skill; then the rest */
    const chosen: CommentaryLine[] = [];
    for (const mood of ['excited', 'asking', 'calm'] as Mood[]) {
      const one = shuffle(pool.filter((l) => l.mood === mood && !chosen.includes(l)))
        .sort((x, y) => Number(y.level >= top - 1) - Number(x.level >= top - 1))[0];
      if (one) chosen.push(one);
    }
    const fresh = shuffle(pool.filter((l) => l.level >= top - 1 && !chosen.includes(l)))
      .slice(0, Math.max(0, Math.ceil(want / 2) - chosen.length));
    const rest = shuffle(pool.filter((l) => !chosen.includes(l) && !fresh.includes(l)));
    lines = shuffle([...chosen, ...fresh, ...rest].slice(0, want));
    takes = lines.map(() => null);
    index = 0;
    busy = false;
    const team = teamById(read<string>('shootout-team', YOU.id)) ?? YOU;
    us = team === YOU ? 'the Reds' : team.short;
    them = pick(TEAMS.filter((t) => t !== YOU && t !== team)).short;
    totalEl.textContent = String(lines.length);
    results.hidden = true;
    card.hidden = false;
    controls.hidden = false;
    status.hidden = false;
    showLine();
  }

  function finish(): void {
    show('over');
    card.hidden = true;
    controls.hidden = true;
    status.hidden = true;
    reel.replaceChildren(...lines.map((l, i) =>
      el('li', { class: takes[i] ? 'has-take' : '' }, `${MOODS[l.mood].face} ${fill(l.text)}`)));
    reelBtn.hidden = !takes.some(Boolean);
    results.hidden = false;
    sfx.whistle();
    life.later(() => { sfx.win(); confetti(); }, 350);
  }

  /** every take in order, a breath between, the crowd all the way through */
  reelBtn.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    reelBtn.disabled = true;
    sfx.whistle();
    for (let i = 0; i < lines.length; i += 1) {
      /* leaving mid-reel stops the reel */
      if (!life.alive()) return;
      const take = takes[i];
      if (!take) continue;
      reel.children[i]?.classList.add('playing');
      sfx.crowd(take.seconds + 0.6);
      await play(take);
      if (lines[i].mood === 'excited') sfx.cheer();
      reel.children[i]?.classList.remove('playing');
      await new Promise((r) => window.setTimeout(r, 450));
    }
    sfx.whistle();
    reelBtn.disabled = false;
    busy = false;
  });

  root.append(node);
  start();
  return () => {
    life.end();
    stopPlaying();
    void recording?.stop();
    for (const t of takes) forget(t);
    closeMic(mic);
  };
}
