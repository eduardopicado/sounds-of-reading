/* The tools that make the recordings (tools/make-audio.ts, tools/make-sfx.ts):
 * what they ask ElevenLabs for, how they wait when it is busy, and that the
 * list of clips holds every line the games actually say. Nothing here talks
 * to ElevenLabs.
 *
 *   npm run test:unit */

import { describe, expect, it } from 'vitest';
import { clips, fetchRetrying, ttsRequest, wanted } from '../../tools/make-audio';
import { EFFECTS, sfxRequest } from '../../tools/make-sfx';
import { ALL_PHRASES, ALL_SIGHT_WORDS, PRACTICE_SOUNDS, REAL_WORDS } from '../../src/content/index';
import { refereeLines } from '../../src/content/bjj';
import { speakable } from '../../src/lib/clip-id';
import { callFor } from '../../src/games/narration';
import { TEAMS } from '../../src/games/teams';

const ENV = { ELEVENLABS_API_KEY: 'test-key', ELEVENLABS_VOICE_EN: 'aussie', ELEVENLABS_VOICE_PT: 'carioca' };
const body = (init: RequestInit): Record<string, unknown> => JSON.parse(String(init.body));

describe('asking for a word', () => {
  it('asks the English voice, with the key, for an mp3', () => {
    const { url, init } = ttsRequest({ text: 'rain', voice: 'en' }, ENV);
    expect(url).toBe('https://api.elevenlabs.io/v1/text-to-speech/aussie?output_format=mp3_44100_64');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['xi-api-key']).toBe('test-key');
    expect(body(init).model_id).toBe('eleven_multilingual_v2');
  });

  it('says a single word as a statement, and leaves a sentence alone', () => {
    expect(body(ttsRequest({ text: 'rain', voice: 'en' }, ENV).init).text).toBe('rain.');
    expect(body(ttsRequest({ text: 'Well done!', voice: 'en' }, ENV).init).text).toBe('Well done!');
  });

  it('gives the Portuguese lines to the Portuguese voice', () => {
    expect(ttsRequest({ text: 'Que defesa!', voice: 'pt' }, ENV).url).toContain('/text-to-speech/carioca?');
  });

  it('stops before asking with no key, or no voice chosen', () => {
    expect(() => ttsRequest({ text: 'rain', voice: 'en' }, {})).toThrow(/ELEVENLABS_API_KEY/);
    expect(() => ttsRequest({ text: 'Que defesa!', voice: 'pt' }, { ELEVENLABS_API_KEY: 'k' })).toThrow(/ELEVENLABS_VOICE_PT/);
  });
});

describe('asking for a sound effect', () => {
  it('asks for one plain sound, as long as it should be, looped only where it plays on', () => {
    const cheer = sfxRequest(EFFECTS.cheer, ENV);
    expect(cheer.url).toBe('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_64');
    expect(body(cheer.init)).toEqual({ text: EFFECTS.cheer.prompt, duration_seconds: 1.5, prompt_influence: 0.5 });
    expect(body(sfxRequest(EFFECTS.crowd, ENV).init).loop).toBe(true);
  });

  it('keeps every effect within what the service makes, and every gain gentle', () => {
    for (const [name, e] of Object.entries(EFFECTS)) {
      expect(e.seconds, name).toBeGreaterThanOrEqual(0.5);
      expect(e.seconds, name).toBeLessThanOrEqual(30);
      expect(e.gain, name).toBeGreaterThan(0);
      expect(e.gain, name).toBeLessThanOrEqual(1);
    }
  });
});

describe('when the service is busy', () => {
  /** a pretend service answering with these statuses, one a request */
  function service(statuses: number[]) {
    const waits: number[] = [];
    let calls = 0;
    const fetcher = (async () => new Response(null, { status: statuses[Math.min(calls++, statuses.length - 1)] })) as typeof fetch;
    const wait = async (ms: number): Promise<void> => { waits.push(ms); };
    return { fetcher, wait, waits, calls: () => calls };
  }

  it('waits longer each time it is told to slow down, then carries on', async () => {
    const s = service([429, 503, 200]);
    const res = await fetchRetrying('https://example.test', {}, s.fetcher, s.wait);
    expect(res.status).toBe(200);
    expect(s.waits).toEqual([2000, 4000]);
  });

  it('does not ask again when the answer is no', async () => {
    const s = service([401]);
    expect((await fetchRetrying('https://example.test', {}, s.fetcher, s.wait)).status).toBe(401);
    expect(s.calls()).toBe(1);
  });

  it('gives up after four tries more', async () => {
    const s = service([500]);
    expect((await fetchRetrying('https://example.test', {}, s.fetcher, s.wait)).status).toBe(500);
    expect(s.calls()).toBe(5);
    expect(s.waits).toEqual([2000, 4000, 8000, 16000]);
  });
});

describe('the list of clips', () => {
  const list = new Map(clips().map((c) => [speakable(c.text), c.voice]));

  it('has every goal and save the commentator can shout, each in its own language', () => {
    for (const team of TEAMS) {
      for (let i = 0; i < 30; i += 1) {
        for (const moment of ['goal', 'save'] as const) {
          expect(list.get(speakable(callFor(moment, team, 'pt'))), callFor(moment, team, 'pt')).toBe('pt');
          expect(list.get(speakable(callFor(moment, team, 'en'))), callFor(moment, team, 'en')).toBe('en');
        }
      }
    }
  });

  it('has every line the referee games say, both ways', () => {
    for (const line of refereeLines()) {
      expect(list.get(speakable(line.en)), line.en).toBe('en');
      expect(list.get(speakable(line.pt)), line.pt).toBe('pt');
    }
  });

  it('never has the name of a sound on its own, which a voice reads as letters', () => {
    const words = new Set([...REAL_WORDS, ...ALL_SIGHT_WORDS, ...ALL_PHRASES].map((w) => speakable(w.text)));
    const names = PRACTICE_SOUNDS.map((s) => speakable(s.label)).filter((n) => !words.has(n));
    expect(names.length).toBeGreaterThan(40);
    const recorded = new Set(wanted());
    expect(names.filter((n) => recorded.has(n))).toEqual([]);
  });

  it('lists each clip once', () => {
    expect(new Set(wanted()).size).toBe(wanted().length);
  });
});
