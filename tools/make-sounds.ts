/* Records the sounds on their own, the way a teacher says them in phonics:
 * "sss", "mmm", "sh", a stop short with no "uh" after it ("b", not "buh"),
 * and a long vowel as its sound ("ai" as in rain), never a letter's name.
 *
 * One clip per sound, not per spelling: ai, ay, a_e and the a in baby share
 * the clip `ai`. The sounds and how each is said are PHONEMES in
 * src/content/words.ts. The clips go in public/audio/sounds/, with their own
 * manifest, so the sound "a" and the word "a" are never the same file.
 *
 * A voice asked for "sh" usually says "ess aitch", so each sound is tried
 * three ways and kept only once it sounds right to a person:
 *   ipa   Eleven v4 reading the IPA between slashes: /ʃ/
 *   say   Eleven v4 reading a spelling made to be said ("shhh"); only for the
 *         sounds that have one
 *   tag   Flash v2, the model that takes an SSML phoneme tag:
 *         <phoneme alphabet="ipa" ph="ʃ">sh</phoneme>
 * A sound that comes out wrong every way is left out. The app then has no
 * clip for it, and a game that needs it does not offer itself.
 *
 * Like tools/make-audio.ts this runs on a laptop or in a Claude session,
 * never in the app, with the key and ELEVENLABS_VOICE_EN in the environment.
 *
 *   npm run make:sounds -- --dry                       what would be made
 *   npm run make:sounds -- --takes 2                   two takes each way of every missing sound, into audition/sounds/
 *   npm run make:sounds -- --takes 3 --only sh --way ipa   three more of one
 *   npm run make:sounds -- --keep sh ipa-2             that take is the one the app plays
 *   npm run make:sounds -- --drop sh                   no clip for sh: games needing it hide
 *   npm run make:sounds -- --manifest                  sounds.json again */

import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHONEMES, type PhonemeSpec } from '../src/content/words';
import { fetchRetrying, voiceSettings } from './make-audio';

const OUT = join(process.cwd(), 'public', 'audio', 'sounds');
const TAKES = join(process.cwd(), 'audition', 'sounds');

export type Way = 'ipa' | 'say' | 'tag';
export const WAYS: Way[] = ['ipa', 'say', 'tag'];

/** the model each way needs: only Flash v2 reads the phoneme tag */
export const MODEL: Record<Way, string> = { ipa: 'eleven_v4', say: 'eleven_v4', tag: 'eleven_flash_v2' };

/** what is sent to be said, or null where that way has nothing to try */
export function textFor(p: PhonemeSpec, way: Way): string | null {
  if (way === 'ipa') return `/${p.ipa}/`;
  if (way === 'say') return p.say ?? null;
  return `<phoneme alphabet="ipa" ph="${p.ipa}">${p.say ?? p.ipa}</phoneme>`;
}

type Env = Record<string, string | undefined>;

/** the request for one take of one sound one way */
export function soundRequest(p: PhonemeSpec, way: Way, env: Env): { url: string; init: RequestInit } {
  const key = env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY is not set: see public/audio/README.md');
  const voice = env.ELEVENLABS_VOICE_EN;
  if (!voice) throw new Error('ELEVENLABS_VOICE_EN is not set: pick one with npm run make:audio -- --voices');
  const text = textFor(p, way);
  if (text === null) throw new Error(`no "${way}" way for /${p.ipa}/`);
  const model = MODEL[way];
  const format = env.ELEVENLABS_FORMAT ?? 'mp3_44100_64';
  return {
    url: `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=${encodeURIComponent(format)}`,
    init: {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: model,
        ...(model === 'eleven_v4' ? { language_code: 'en' } : {}),
        voice_settings: voiceSettings(model),
      }),
    },
  };
}

async function take(p: PhonemeSpec, way: Way): Promise<Uint8Array> {
  const { url, init } = soundRequest(p, way, process.env);
  const res = await fetchRetrying(url, init);
  if (!res.ok) throw new Error(`ElevenLabs answered ${res.status} for /${p.ipa}/ (${way}): ${(await res.text()).slice(0, 300)}`);
  return new Uint8Array(await res.arrayBuffer());
}

const ids = Object.keys(PHONEMES);
const isId = (s: string | null | undefined): s is string => !!s && s in PHONEMES;
const isWay = (s: string | null | undefined): s is Way => !!s && (WAYS as string[]).includes(s);

/** what the app reads: the sounds that have a kept clip */
function writeManifest(): void {
  mkdirSync(OUT, { recursive: true });
  const have = new Set(readdirSync(OUT).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)));
  const list = ids.filter((id) => have.has(id)).sort();
  writeFileSync(join(OUT, 'sounds.json'), JSON.stringify(list) + '\n');
  console.log(`sounds.json lists ${list.length} of ${ids.length}: ${list.join(', ') || 'none yet'}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const after = (flag: string, n = 1): string | null => {
    const at = args.indexOf(flag);
    return at >= 0 ? args[at + n] ?? '' : null;
  };

  const keep = after('--keep');
  if (keep !== null) {
    const which = after('--keep', 2);
    if (!isId(keep) || !which) throw new Error(`--keep needs a sound and a take, e.g. --keep sh ipa-2; sounds: ${ids.join(', ')}`);
    const from = join(TAKES, `${keep}-${which}.mp3`);
    if (!existsSync(from)) throw new Error(`there is no ${from}: make takes first with --takes`);
    mkdirSync(OUT, { recursive: true });
    copyFileSync(from, join(OUT, `${keep}.mp3`));
    writeManifest();
    return;
  }

  const drop = after('--drop');
  if (drop !== null) {
    if (!isId(drop)) throw new Error(`--drop needs one of ${ids.join(', ')}`);
    rmSync(join(OUT, `${drop}.mp3`), { force: true });
    writeManifest();
    return;
  }

  if (args.includes('--manifest')) { writeManifest(); return; }

  const only = after('--only');
  if (only !== null && !isId(only)) throw new Error(`--only needs one of ${ids.join(', ')}`);
  const way = after('--way');
  if (way !== null && !isWay(way)) throw new Error(`--way needs one of ${WAYS.join(', ')}`);
  const ways = way ? [way] : WAYS;
  const kept = new Set(existsSync(OUT) ? readdirSync(OUT).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)) : []);
  const todo = only ? [only] : ids.filter((id) => !kept.has(id));
  const takes = Math.max(1, Math.min(5, Number(after('--takes') ?? 1) || 1));
  const jobs = todo.flatMap((id) => ways.filter((w) => textFor(PHONEMES[id], w) !== null).map((w) => ({ id, way: w })));
  const chars = jobs.reduce((n, j) => n + textFor(PHONEMES[j.id], j.way)!.length * takes, 0);
  console.log(`${ids.length} sounds, ${kept.size} kept, ${todo.length} to make: ${jobs.length * takes} takes, about ${chars} characters`);
  if (args.includes('--dry')) {
    for (const id of todo) {
      const p = PHONEMES[id];
      console.log(`  ${id.padEnd(9)} /${p.ipa}/${p.stop ? ' (stop)' : ''}  ${ways.map((w) => textFor(p, w)).filter(Boolean).join('   ')}`);
    }
    return;
  }

  mkdirSync(TAKES, { recursive: true });
  for (const { id, way: w } of jobs) {
    /* numbered after any takes already there, so asking again adds to them */
    const first = readdirSync(TAKES).filter((f) => f.startsWith(`${id}-${w}-`) && f.endsWith('.mp3')).length + 1;
    for (let i = first; i < first + takes; i += 1) {
      writeFileSync(join(TAKES, `${id}-${w}-${i}.mp3`), await take(PHONEMES[id], w));
      console.log(`  audition/sounds/${id}-${w}-${i}.mp3`);
    }
  }
  console.log('\nListen, then keep the best of each: npm run make:sounds -- --keep <sound> <way>-<take>');
}

/* only when run as a command; the unit tests import from here */
const runDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (runDirectly) {
  main().catch((err) => { console.error(String(err instanceof Error ? err.message : err)); process.exit(1); });
}
