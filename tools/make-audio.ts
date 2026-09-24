/* Records every real word the app speaks, once, ahead of time.
 *
 * The iPad offers web pages only Apple's lowest-tier voice — super-compact
 * Karen — and no downloaded voice ever reaches a web page, so the only way to
 * get a clear Australian voice in front of the child is to record the words
 * in advance and ship them.
 *
 * This runs on a laptop, never in the app. The API key lives in the
 * environment here and is never built into the site: the app only ever loads
 * finished .m4a files from its own origin, so nothing leaves the iPad.
 *
 * Made-up words are deliberately not recorded. No engine says "shink"
 * convincingly without hand-written phonetics for all ~90 graphemes, and the
 * games that use them fall back to the device voice, which is also what keeps
 * Real or Silly honest — see deviceVoiceOnly in src/lib/speech.ts.
 *
 *   npm run make:audio -- --dry        list what would be recorded
 *   npm run make:audio -- --only rain  one word, to hear it before committing
 *   npm run make:audio                 everything missing
 *
 * Existing files are left alone, so a run costs only what is new. */

import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ALL_FAMILIES, ALL_PHRASES, PRACTICE_SOUNDS, REAL_WORDS, buildWord,
} from '../src/content/index';
import { clipId, speakable } from '../src/lib/clip-id';

const OUT = join(process.cwd(), 'public', 'audio');

/** the eight lines the app says to the child that are not words from content */
const UI_LINES = [
  'Well done!', 'Bingo! Well done!', 'Brilliant!', 'Perfect!', 'Good reading!',
  'Perfect sorting!', 'Nice work!', 'Pick one word from every row first',
];

/** every real thing the app speaks — no made-up words anywhere in here */
export function wanted(): string[] {
  const out = new Set<string>();
  const add = (s: string) => { if (s.trim()) out.add(speakable(s)); };

  for (const w of REAL_WORDS) add(w.text);
  for (const p of ALL_PHRASES) add(p.text);
  /* only f.real — f.silly is the made-up half of each family */
  for (const f of ALL_FAMILIES) for (const part of f.real) add(buildWord(f, part));
  for (const s of PRACTICE_SOUNDS) { add(s.label); add(s.asIn); }
  for (const line of UI_LINES) add(line);

  return [...out].sort();
}

/**
 * Turns one string into spoken audio.
 *
 * This is the only part that knows about a service. Fill it in for whichever
 * one you pick — it needs an Australian English voice and needs to return
 * MPEG-4 audio, which is what Safari plays most reliably.
 *
 * Everything else in this file, and all of src/lib/audio.ts, is unaffected by
 * that choice.
 */
async function speak(text: string): Promise<Uint8Array> {
  const key = process.env.TTS_API_KEY;
  if (!key) throw new Error('TTS_API_KEY is not set — see the note above this function');
  throw new Error(`no provider wired up yet; would have recorded "${text}"`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const onlyAt = args.indexOf('--only');
  const only = onlyAt >= 0 ? args[onlyAt + 1] : null;

  let list = wanted();
  if (only) list = list.filter((s) => s === speakable(only));

  mkdirSync(OUT, { recursive: true });
  const already = new Set(readdirSync(OUT).filter((f) => f.endsWith('.m4a')).map((f) => f.slice(0, -4)));
  const todo = list.filter((s) => !already.has(clipId(s)));

  const seconds = list.reduce((n, s) => n + (s.includes(' ') ? 1.4 : 0.7), 0);
  console.log(`${list.length} clips wanted, ${already.size} already recorded, ${todo.length} to do`);
  console.log(`about ${Math.round(seconds)}s of audio, roughly ${(seconds * 8 / 1024).toFixed(1)} MB as m4a\n`);

  /* a collision would mean one word playing another word's recording, which
     is the sort of thing nobody reports and everybody notices */
  const byId = new Map<string, string>();
  for (const s of list) {
    const id = clipId(s);
    const clash = byId.get(id);
    if (clash) throw new Error(`"${s}" and "${clash}" both hash to ${id} — change clipId`);
    byId.set(id, s);
  }

  if (dry) {
    for (const s of todo.slice(0, 40)) console.log(' ', clipId(s), s);
    if (todo.length > 40) console.log(`  … and ${todo.length - 40} more`);
    return;
  }

  let made = 0;
  for (const s of todo) {
    const audio = await speak(s);
    writeFileSync(join(OUT, `${clipId(s)}.m4a`), audio);
    made += 1;
    if (made % 50 === 0) console.log(`  ${made} of ${todo.length}`);
  }

  /* the manifest is what the app reads: it plays a clip only for a string
     listed here, and speaks everything else */
  const shipped = readdirSync(OUT).filter((f) => f.endsWith('.m4a')).map((f) => f.slice(0, -4));
  writeFileSync(join(OUT, 'clips.json'), JSON.stringify(shipped.sort()));
  console.log(`\nrecorded ${made}, manifest lists ${shipped.length}`);
}

/* only when run as a command. The content test imports wanted() from here,
   and an import must not start recording anything. */
const runDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (runDirectly) {
  main().catch((err) => { console.error(String(err instanceof Error ? err.message : err)); process.exit(1); });
}
