/* Records the things the app says, once, ahead of time, with ElevenLabs.
 *
 * The iPad offers web pages only Apple's lowest-tier voice — super-compact
 * Karen — and no downloaded voice ever reaches a web page, so the only way to
 * get a clear Australian voice in front of the child is to record the words
 * in advance and ship them.
 *
 * This runs on a laptop or in a Claude session, never in the app. The key
 * lives in the environment here and is never built into the site: the app
 * only ever loads finished .mp3 files from its own origin, so nothing leaves
 * the iPad.
 *
 * Three groups are deliberately not recorded:
 *  - made-up words: no engine says "shink" convincingly without hand-written
 *    phonetics, and the device voice for them is what keeps Real or Silly
 *    honest (see deviceVoiceOnly in src/lib/speech.ts);
 *  - the names of the sounds on their own ("sh", "ai", "a_e"): a voice reads
 *    them as letter names, which in a phonics app is worse than nothing;
 *  - sentences with a number or a name filled in, such as the maths
 *    explanations: too many to record, and clips glued together sound
 *    choppy. All three stay with the device voice.
 *
 * The environment it needs:
 *   ELEVENLABS_API_KEY   the key, as an environment secret
 *   ELEVENLABS_VOICE_EN  the Australian English voice's id
 *   ELEVENLABS_VOICE_PT  the Brazilian Portuguese voice's id, for the commentator
 *   ELEVENLABS_MODEL     the model; eleven_multilingual_v2 unless set
 *   ELEVENLABS_FORMAT    the file format; mp3_44100_64 unless set
 *
 *   npm run make:audio -- --dry               how many clips are missing, and the cost
 *   npm run make:audio -- --list clips.txt    every clip, one a line, to read through
 *   npm run make:audio -- --voices            the voices the key can use, Australian first
 *   npm run make:audio -- --audition ID,ID    ten test words in each voice, into audition/
 *   npm run make:audio -- --audition-pt ID,ID the same in Portuguese, Brazilian voices only
 *   npm run make:audio -- --only rain         one clip, to hear it before the rest
 *   npm run make:audio                        everything missing
 *
 * Existing files are left alone, so a run costs only what is new.
 *
 * Portuguese is always Brazilian. Before a Portuguese line is recorded the
 * voice is looked up, and the run stops unless ElevenLabs says it speaks
 * Portuguese with a Brazilian accent (brazilianProblem below). */

import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ALL_FAMILIES, ALL_PHRASES, ALL_SIGHT_WORDS, PRACTICE_SOUNDS, REAL_WORDS, buildWord,
} from '../src/content/index';
import { clipId, speakable } from '../src/lib/clip-id';
import { THEMES } from '../src/content/word-search';
import { BOTAO_STEPS, HOW } from '../src/content/botao';
import { refereeLines, weighLines } from '../src/content/bjj';
import { mapLines } from '../src/content/world';
import { country, flagLines } from '../src/content/flags';
import { capitalLines } from '../src/content/capitals';
import { EN_SAVES, PT_SAVES, enGoal, ptGoals } from '../src/content/commentary';
import { TEAMS } from '../src/games/teams';

const OUT = join(process.cwd(), 'public', 'audio');
const API = 'https://api.elevenlabs.io/v1';

/** the lines the app says to the child that are not words from content */
const UI_LINES = [
  'Well done!', 'Bingo! Well done!', 'Brilliant!', 'Perfect!', 'Good reading!',
  'Perfect sorting!', 'Nice work!', 'Pick one word from every row first',
  'You win!', 'What a match!', 'Good game!', 'Every one a goal!', 'Good passing!', 'Every one right!', 'Good spelling!',
  'Beautiful writing!', 'Good writing!', 'Well spotted!', 'Find every b', 'Find every d', 'Find every p', 'Find every q',
  'Every word found!', 'Every word, and no help!',
];

/* The games' questions and instructions that are always the same words. A
   line that changes in a game and not here simply goes back to the device
   voice, so this list can lag behind without breaking anything. */
const GAME_LINES = [
  'Find this word on your card', 'Read it out loud, then choose', 'Read it. Which picture is it?',
  'Listen, then build the word from its two parts.', 'Where does it split into two parts? Tap the gap.',
  'Pass along the line. Say each sound!', 'What word did you make? Shoot at it!',
  'Nearly! The green ones are right. Listen again and try the rest.',
  'How many did you see?', 'What number goes in the gap?', 'How many fans are going to the match?',
  'How many are left over?', 'Which team got the most votes?', 'How many fans voted altogether?',
  'How much money is this?', 'Which coin is worth more?', 'Which is cheaper?',
  'What time does the clock say?', 'What time is it?', 'What time is kick-off?', 'How long until kick-off?',
  'What shape is this?', 'What is this solid shape called?', 'Is this shirt the same on both sides of the line?',
  'Is the ball on the left or the right of the keeper?', 'Which square is the ball on?',
  'Is this corner a right angle? Or is it smaller, or bigger?',
  'The coach moved the shape. Was it a flip, a slide or a turn?',
  'Get a pawn to the other end. Tap a pawn, then where it goes.',
  'Pawn Wars! Get one of your pawns to the other end before the computer does.',
  'Is the white king in check? Can a black piece take him?',
  'The white king is in check. Tap the black piece giving check.',
  'The white king is in check. Move him to a safe square.',
  'White to move. Find the checkmate!', 'White to move. Find the move that checkmates the black king.',
];

export type Voice = 'en' | 'pt';

/** one clip: the words as written, and who says them */
export interface Clip { text: string; voice: Voice }

/** every real thing the app speaks, once each, no made-up words anywhere */
export function clips(): Clip[] {
  const out = new Map<string, Clip>();
  const add = (text: string, voice: Voice = 'en'): void => {
    const key = speakable(text);
    if (key && !out.has(key)) out.set(key, { text: text.trim(), voice });
  };

  for (const w of REAL_WORDS) add(w.text);
  for (const p of ALL_PHRASES) add(p.text);
  /* only f.real — f.silly is the made-up half of each family */
  for (const f of ALL_FAMILIES) for (const part of f.real) add(buildWord(f, part));
  /* the "as in" word of each sound, but never the sound's name on its own */
  for (const s of PRACTICE_SOUNDS) add(s.asIn);
  /* tricky words are spoken too, and being irregular is exactly why a
     recording beats the device voice on them */
  for (const w of ALL_SIGHT_WORDS) add(w.text);
  /* Word Search's themes: countries, planets and the rest, said when he taps
     one he cannot read yet */
  for (const t of THEMES) for (const w of t.words) add(w.shown);
  for (const line of [...UI_LINES, ...GAME_LINES]) add(line);
  for (const step of BOTAO_STEPS) add(step.tell);
  /* World Map: where each place is, what it is called, and the directions */
  for (const line of mapLines()) add(line);
  /* Flags: what each flag looks like, and the questions */
  for (const line of flagLines()) add(line);
  /* Capital Cities: the states, their capitals, and the world's */
  for (const line of capitalLines((code) => country(code).name)) add(line);
  for (const line of Object.values(HOW)) add(line);

  /* the commentator, in English and in Portuguese, for every team */
  for (const line of EN_SAVES) add(line);
  add(enGoal());
  for (const t of TEAMS) if (t.kind !== 'you') add(enGoal(t.name));
  for (const line of [...PT_SAVES, ...ptGoals()]) add(line, 'pt');
  for (const t of TEAMS) if (t.pt) for (const line of ptGoals(t.pt)) add(line, 'pt');

  /* jiu-jitsu: everything the two referee games say, both ways */
  for (const line of refereeLines()) { add(line.en); add(line.pt, 'pt'); }
  /* and Weigh-In's questions: the ones with no weight in them */
  for (const line of weighLines()) { add(line.en); add(line.pt, 'pt'); }

  return [...out.values()].sort((a, b) => speakable(a.text).localeCompare(speakable(b.text)));
}

/** what the content test checks against: the keys the app looks clips up by */
export function wanted(): string[] {
  return clips().map((c) => speakable(c.text));
}

/* ── ElevenLabs ─────────────────────────────────────────────────────────── */

type Env = Record<string, string | undefined>;

/** the request for one clip. A single word gets a full stop, so it is said
    as a statement and not as a question */
export function ttsRequest(clip: Clip, env: Env, voiceId?: string): { url: string; init: RequestInit } {
  const key = env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY is not set: see public/audio/README.md');
  const voice = voiceId ?? (clip.voice === 'pt' ? env.ELEVENLABS_VOICE_PT : env.ELEVENLABS_VOICE_EN);
  if (!voice) throw new Error(`ELEVENLABS_VOICE_${clip.voice.toUpperCase()} is not set: pick one with --voices`);
  const format = env.ELEVENLABS_FORMAT ?? 'mp3_44100_64';
  const text = /[.!?…]$/.test(clip.text) ? clip.text : `${clip.text}.`;
  const model = env.ELEVENLABS_MODEL ?? 'eleven_multilingual_v2';
  return {
    url: `${API}/text-to-speech/${encodeURIComponent(voice)}?output_format=${encodeURIComponent(format)}`,
    init: {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: model,
        ...(clip.voice === 'pt' && LANGUAGE_CODE_MODELS.has(model) ? { language_code: 'pt' } : {}),
        /* steady and clear rather than expressive, and a touch slow for a beginner reader */
        voice_settings: { stability: 0.6, similarity_boost: 0.8, style: 0, use_speaker_boost: true, speed: 0.9 },
      }),
    },
  };
}

/** the models that take a language_code. Multilingual v2 does not (it works
    the language out from the text, which for these lines is plainly
    Portuguese), so it is sent only where it is understood */
export const LANGUAGE_CODE_MODELS = new Set(['eleven_turbo_v2_5', 'eleven_flash_v2_5', 'eleven_v3']);

/** what ElevenLabs says about a voice (GET /v1/voices/{id}), the parts that matter here */
export interface VoiceInfo {
  voice_id?: string;
  name?: string;
  labels?: Record<string, string | undefined>;
  verified_languages?: { language?: string; accent?: string; locale?: string }[];
}

/** why a voice may not read Portuguese, or null when it is Brazilian. It has
    to say so itself: a verified language of pt with a pt-BR locale or a
    Brazilian accent, or labels that say Brazilian */
export function brazilianProblem(v: VoiceInfo): string | null {
  const brazilian = (s?: string): boolean => !!s && /brazil|pt[-_]br/i.test(s);
  const verified = (v.verified_languages ?? []).filter((l) => /^pt/i.test(l.language ?? '') || /^pt/i.test(l.locale ?? ''));
  if (verified.some((l) => brazilian(l.locale) || brazilian(l.accent))) return null;
  const labels = v.labels ?? {};
  if (brazilian(labels.accent) || brazilian(labels.locale) || brazilian(labels.language)) return null;
  const found = [
    ...verified.map((l) => [l.language, l.accent, l.locale].filter(Boolean).join(' ')),
    ...Object.entries(labels).filter(([, x]) => x).map(([k, x]) => `${k}: ${x}`),
  ];
  return `${v.name ?? v.voice_id ?? 'this voice'} is not marked as Brazilian Portuguese (found ${found.length ? found.join('; ') : 'nothing about its language'})`;
}

async function voiceInfo(voiceId: string): Promise<VoiceInfo> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY is not set');
  const res = await fetchRetrying(`${API}/voices/${encodeURIComponent(voiceId)}`, { headers: { 'xi-api-key': key } });
  if (!res.ok) throw new Error(`ElevenLabs answered ${res.status} for voice ${voiceId}: ${(await res.text()).slice(0, 300)}`);
  return await res.json() as VoiceInfo;
}

/** stops the run unless the voice is Brazilian */
async function mustBeBrazilian(voiceId: string): Promise<void> {
  const problem = brazilianProblem(await voiceInfo(voiceId));
  if (problem) throw new Error(`refusing to record Portuguese: ${problem}`);
}

/** fetch, waiting and trying again when the service is busy (429) or failing (5xx) */
export async function fetchRetrying(
  url: string, init: RequestInit, fetcher: typeof fetch = fetch, wait = (ms: number) => new Promise((r) => setTimeout(r, ms)),
): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetcher(url, init);
    if ((res.status !== 429 && res.status < 500) || attempt >= 4) return res;
    await wait(2000 * 2 ** attempt);
  }
}

async function speak(clip: Clip, voiceId?: string): Promise<Uint8Array> {
  const { url, init } = ttsRequest(clip, process.env, voiceId);
  const res = await fetchRetrying(url, init);
  if (!res.ok) throw new Error(`ElevenLabs answered ${res.status} for "${clip.text}": ${(await res.text()).slice(0, 300)}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** the voices this key can use, and some Australian ones from the library */
async function listVoices(): Promise<void> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY is not set');
  const headers = { 'xi-api-key': key };
  const mine = await (await fetchRetrying(`${API}/voices`, { headers })).json() as { voices?: { voice_id: string; name: string; labels?: Record<string, string> }[] };
  const rows = (mine.voices ?? []).map((v) => ({ id: v.voice_id, name: v.name, labels: Object.values(v.labels ?? {}).join(', ') }));
  rows.sort((a, b) => Number(/austral/i.test(b.labels)) - Number(/austral/i.test(a.labels)));
  console.log('Your voices (Australian first):');
  for (const r of rows) console.log(`  ${r.id}  ${r.name}  ${r.labels}`);
  const shared = await (await fetchRetrying(`${API}/shared-voices?page_size=20&search=australian`, { headers })).json() as { voices?: { voice_id: string; name: string; accent?: string; description?: string }[] };
  console.log('\nAustralian voices in the library (add one to your voices to use it):');
  for (const v of shared.voices ?? []) console.log(`  ${v.voice_id}  ${v.name}  ${v.accent ?? ''}  ${(v.description ?? '').slice(0, 60)}`);
}

/** a few words that show a voice off: short and long vowels, a tricky word, a name, a sentence */
const AUDITION = ['rain', 'ship', 'thumb', 'the', 'said', 'kangaroo', 'Brazil', 'a big bug', 'Well done!', 'Goooal for Australia!'];

/** and in Portuguese, from the lines the games say: the commentator, the
    referee and Weigh-In */
export function ptAudition(): string[] {
  return [
    ptGoals('do Brasil')[0], PT_SAVES[1], ptGoals()[1],
    ...refereeLines().slice(0, 3).map((l) => l.pt),
    ...weighLines().map((l) => l.pt).filter((l) => /1 quilo\?$/.test(l)).slice(0, 1),
  ];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flag = (name: string): string | null => {
    const at = args.indexOf(name);
    return at >= 0 ? args[at + 1] ?? '' : null;
  };

  if (args.includes('--voices')) { await listVoices(); return; }

  const auditionPt = flag('--audition-pt');
  if (auditionPt !== null) {
    const lines = ptAudition();
    for (const voiceId of auditionPt.split(',').filter(Boolean)) {
      const problem = brazilianProblem(await voiceInfo(voiceId));
      if (problem) { console.log(`  ${voiceId}: skipped, ${problem}`); continue; }
      const dir = join(process.cwd(), 'audition', voiceId);
      mkdirSync(dir, { recursive: true });
      for (const [i, text] of lines.entries()) {
        writeFileSync(join(dir, `pt-${i + 1}.mp3`), await speak({ text, voice: 'pt' }, voiceId));
      }
      console.log(`  ${voiceId}: ${lines.length} lines in audition/${voiceId}: ${lines.join(' | ')}`);
    }
    return;
  }

  const audition = flag('--audition');
  if (audition !== null) {
    for (const voiceId of audition.split(',').filter(Boolean)) {
      const dir = join(process.cwd(), 'audition', voiceId);
      mkdirSync(dir, { recursive: true });
      for (const text of AUDITION) writeFileSync(join(dir, `${text.replace(/[^\w ]/g, '').trim()}.mp3`), await speak({ text, voice: 'en' }, voiceId));
      console.log(`  ${voiceId}: ${AUDITION.length} words in audition/${voiceId}`);
    }
    return;
  }

  let list = clips();
  const listTo = flag('--list');
  if (listTo) {
    writeFileSync(resolve(listTo), list.map((c) => `${c.voice}\t${c.text}`).join('\n') + '\n');
    console.log(`${list.length} clips written to ${listTo}`);
    return;
  }
  const only = flag('--only');
  if (only) list = list.filter((c) => speakable(c.text) === speakable(only));

  mkdirSync(OUT, { recursive: true });
  const already = new Set(readdirSync(OUT).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)));
  const todo = list.filter((c) => !already.has(clipId(c.text)));

  const seconds = list.reduce((n, c) => n + (c.text.includes(' ') ? 1.4 : 0.7), 0);
  const chars = todo.reduce((n, c) => n + c.text.length + 1, 0);
  console.log(`${list.length} clips wanted, ${already.size} already recorded, ${todo.length} to do`);
  console.log(`about ${Math.round(seconds)}s of audio, roughly ${(seconds * 8 / 1024).toFixed(1)} MB at 64 kbps`);
  console.log(`about ${chars} characters to record, which is about ${chars} credits on Multilingual v2\n`);

  /* a collision would mean one word playing another word's recording, which
     is the sort of thing nobody reports and everybody notices */
  const byId = new Map<string, string>();
  for (const c of list) {
    const id = clipId(c.text);
    const clash = byId.get(id);
    if (clash) throw new Error(`"${c.text}" and "${clash}" both hash to ${id}: change clipId`);
    byId.set(id, c.text);
  }

  if (args.includes('--dry')) {
    for (const c of todo.slice(0, 40)) console.log(' ', clipId(c.text), c.voice, c.text);
    if (todo.length > 40) console.log(`  … and ${todo.length - 40} more`);
    return;
  }

  if (todo.some((c) => c.voice === 'pt')) {
    const pt = process.env.ELEVENLABS_VOICE_PT;
    if (!pt) throw new Error('ELEVENLABS_VOICE_PT is not set: pick one with --voices');
    await mustBeBrazilian(pt);
  }

  let made = 0;
  for (const c of todo) {
    writeFileSync(join(OUT, `${clipId(c.text)}.mp3`), await speak(c));
    made += 1;
    if (made % 50 === 0) console.log(`  ${made} of ${todo.length}`);
  }

  /* the manifest is what the app reads: it plays a clip only for a string
     listed here, and speaks everything else */
  const shipped = readdirSync(OUT).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4));
  writeFileSync(join(OUT, 'clips.json'), JSON.stringify(shipped.sort()));
  console.log(`\nrecorded ${made}, manifest lists ${shipped.length}`);
}

/* only when run as a command. The content test imports wanted() from here,
   and an import must not start recording anything. */
const runDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (runDirectly) {
  main().catch((err) => { console.error(String(err instanceof Error ? err.message : err)); process.exit(1); });
}
