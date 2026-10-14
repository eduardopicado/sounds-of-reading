/* Speech: which voice is chosen, and when a game hears that a word has been
 * said. Run in Node against a pretend engine that behaves the way the real
 * ones do when they are stopped: they report the end of whatever they were
 * saying, a moment later.
 *
 *   npm run test:unit */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeVoice { name: string; lang: string; voiceURI: string; localService: boolean; default: boolean }

class FakeUtterance {
  text: string; lang = ''; rate = 1; pitch = 1; volume = 1; voice: FakeVoice | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) { this.text = text; }
}

/** an engine that is always mid-sentence until told the sentence is over */
function fakeEngine(voices: FakeVoice[]) {
  const said: FakeUtterance[] = [];
  let current: FakeUtterance | null = null;
  const engine = {
    said,
    getVoices: () => voices,
    speak: (u: FakeUtterance) => { said.push(u); current = u; },
    /* Chrome fires error on a stopped utterance and Safari fires end; either
       way it arrives after cancel() has returned */
    cancel: () => {
      const u = current;
      current = null;
      if (u) queueMicrotask(() => u.onerror?.());
    },
    addEventListener: () => undefined,
    /** the engine reaching the end of what it was saying */
    finish: () => { const u = current; current = null; u?.onend?.(); },
    /** the engine giving up on its own, with nothing having stopped it */
    fail: () => { const u = current; current = null; u?.onerror?.(); },
  };
  return engine;
}

const voice = (name: string, lang: string, uri: string): FakeVoice =>
  ({ name, lang, voiceURI: uri, localService: true, default: false });

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

let engine: ReturnType<typeof fakeEngine>;

async function load(voices: FakeVoice[] = [voice('Karen', 'en-AU', 'com.apple.voice.compact.en-AU.Karen')]) {
  vi.resetModules();
  engine = fakeEngine(voices);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  vi.stubGlobal('window', { speechSynthesis: engine, setTimeout, clearTimeout });
  return import('../../src/lib/speech');
}

describe('the end of a word', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('is reported once, when the engine finishes it', async () => {
    const speech = await load();
    const onEnd = vi.fn();
    speech.say('rain', { onEnd });
    expect(onEnd).not.toHaveBeenCalled();
    engine.finish();
    await settle();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('is not reported when the game is left mid-word', async () => {
    const speech = await load();
    const onEnd = vi.fn();
    speech.say('Goooool!', { onEnd });
    /* what the router does on the way out */
    speech.cancelSpeech();
    await settle();
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('is not reported for a word cut off by the next one, which is', async () => {
    const speech = await load();
    const first = vi.fn();
    const second = vi.fn();
    speech.say('sheep', { onEnd: first });
    speech.say('ship', { onEnd: second });
    await settle();
    expect(first).not.toHaveBeenCalled();
    engine.finish();
    await settle();
    expect(second).toHaveBeenCalledTimes(1);
    expect(engine.said.map((u) => u.text)).toEqual(['sheep', 'ship']);
  });

  it('is still reported when the engine fails on its own, so nothing waits for ever', async () => {
    const speech = await load();
    const onEnd = vi.fn();
    speech.say('quick', { onEnd });
    engine.fail();
    await settle();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('is reported at once when speech is switched off', async () => {
    const speech = await load();
    speech.setSpeechEnabled(false);
    const onEnd = vi.fn();
    speech.say('rain', { onEnd });
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(engine.said).toEqual([]);
  });
});

describe('choosing a voice', () => {
  beforeEach(() => { vi.unstubAllGlobals(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('tells the tiers apart by identifier, super-compact below compact', async () => {
    const speech = await load();
    const tier = (uri: string) => speech.qualityOf(voice('Karen', 'en-AU', uri) as unknown as SpeechSynthesisVoice);
    expect(tier('com.apple.voice.premium.en-AU.Karen')).toBe('premium');
    expect(tier('com.apple.voice.enhanced.en-AU.Karen')).toBe('enhanced');
    expect(tier('com.apple.voice.compact.en-AU.Karen')).toBe('compact');
    expect(tier('com.apple.voice.super-compact.en-AU.Karen')).toBe('super-compact');
    expect(tier('com.apple.eloquence.en-US.Rocko')).toBe('retro');
    expect(tier('com.apple.speech.synthesis.voice.Bubbles')).toBe('novelty');
  });

  it('puts the accent first, then the tier', async () => {
    const speech = await load([
      voice('Daniel', 'en-GB', 'com.apple.voice.premium.en-GB.Daniel'),
      voice('Karen', 'en-AU', 'com.apple.voice.super-compact.en-AU.Karen'),
      voice('Karen', 'en-AU', 'com.apple.voice.enhanced.en-AU.Karen'),
      voice('Luciana', 'pt-BR', 'com.apple.voice.premium.pt-BR.Luciana'),
    ]);
    expect(speech.englishVoices().map((v) => v.voiceURI)).toEqual([
      'com.apple.voice.enhanced.en-AU.Karen',
      'com.apple.voice.super-compact.en-AU.Karen',
      'com.apple.voice.premium.en-GB.Daniel',
    ]);
    speech.say('rain');
    expect(engine.said[0].voice?.voiceURI).toBe('com.apple.voice.enhanced.en-AU.Karen');
  });

  it('speaks Portuguese with a Portuguese voice, never the English one', async () => {
    const speech = await load([
      voice('Karen', 'en-AU', 'com.apple.voice.compact.en-AU.Karen'),
      voice('Joana', 'pt-PT', 'com.apple.voice.premium.pt-PT.Joana'),
      voice('Luciana', 'pt-BR', 'com.apple.voice.compact.pt-BR.Luciana'),
    ]);
    speech.say('Goooool do Brasil!', { lang: 'pt-BR' });
    /* the exact region beats a better voice from the cousin */
    expect(engine.said[0].voice?.voiceURI).toBe('com.apple.voice.compact.pt-BR.Luciana');
    expect(speech.canSpeak('pt-BR')).toBe(true);
    expect(speech.canSpeak('fr-FR')).toBe(false);
  });

  it('says there is nothing better installed only when no voice is enhanced or premium', async () => {
    const plain = await load([
      voice('Karen', 'en-AU', 'com.apple.voice.compact.en-AU.Karen'),
      voice('Rocko', 'en-US', 'com.apple.eloquence.en-US.Rocko'),
    ]);
    expect(plain.onlyCompactVoices()).toBe(true);
    const good = await load([voice('Karen', 'en-AU', 'com.apple.voice.premium.en-AU.Karen')]);
    expect(good.onlyCompactVoices()).toBe(false);
  });
});
