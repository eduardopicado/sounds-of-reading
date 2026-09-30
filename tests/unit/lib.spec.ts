/* Unit tests for the shared code the games stand on: audio, timers, the
 * coach's picks and saved settings. These run in Node with small fakes in
 * place of the browser, so they are quick and say exactly what broke.
 *
 *   npm run test:unit */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clipId } from '../../src/lib/clip-id';
import { REAL_WORDS, type Word } from '../../src/content/index';

/* ── a pretend browser: just enough for audio.ts ──────────────────────── */

class FakeAudio {
  static made: FakeAudio[] = [];
  src: string;
  currentTime = 0;
  playbackRate = 1;
  preload = '';
  paused = true;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(src: string) { this.src = src; FakeAudio.made.push(this); }
  play(): Promise<void> { this.paused = false; return Promise.resolve(); }
  pause(): void { this.paused = true; }
  /** the clip reaching its end, as the browser would report it */
  finish(): void { this.paused = true; this.onended?.(); }
}

describe('recorded clips', () => {
  beforeEach(() => {
    vi.resetModules();
    FakeAudio.made = [];
    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => [clipId('cat'), clipId('dog')] }));
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('reports the end of a clip to the caller who asked, once', async () => {
    const audio = await import('../../src/lib/audio');
    await audio.loadClips('./audio/clips.json');
    const first = vi.fn();
    expect(await audio.playClip('cat', { onEnd: first })).toBe(true);
    FakeAudio.made[0].finish();
    expect(first).toHaveBeenCalledTimes(1);

    /* the same word again, from somewhere that does not want to know: the
       first caller must not hear about it. It used to, because the cached
       element kept the old handler — a save in Penalty Shootout could be
       unlocked by the word being said in another game. */
    expect(await audio.playClip('cat')).toBe(true);
    FakeAudio.made[0].finish();
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('stops every clip when asked, and forgets who was waiting', async () => {
    const audio = await import('../../src/lib/audio');
    await audio.loadClips('./audio/clips.json');
    const waiting = vi.fn();
    await audio.playClip('dog', { onEnd: waiting });
    audio.stopClips();
    expect(FakeAudio.made[0].paused).toBe(true);
    FakeAudio.made[0].finish();
    expect(waiting).not.toHaveBeenCalled();
  });

  it('says it did not play when the browser refuses, so speech can take over', async () => {
    const audio = await import('../../src/lib/audio');
    await audio.loadClips('./audio/clips.json');
    const refused = vi.fn();
    FakeAudio.prototype.play = function play(this: FakeAudio) { return Promise.reject(new Error('NotAllowedError')); };
    try {
      expect(await audio.playClip('cat', { onEnd: refused })).toBe(false);
      /* the caller speaks it and reports the end; the clip must not as well */
      FakeAudio.made[0].finish();
      expect(refused).not.toHaveBeenCalled();
    } finally {
      FakeAudio.prototype.play = function play(this: FakeAudio) { this.paused = false; return Promise.resolve(); };
    }
  });

  it('has no clip for a word that was not recorded', async () => {
    const audio = await import('../../src/lib/audio');
    await audio.loadClips('./audio/clips.json');
    expect(audio.hasClip('cat')).toBe(true);
    expect(audio.hasClip('shink')).toBe(false);
    expect(await audio.playClip('shink')).toBe(false);
  });
});

/* ── a game's lifetime ─────────────────────────────────────────────────── */

describe('lifetime', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('window', globalThis); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('runs what was scheduled while the game is open', async () => {
    const { lifetime } = await import('../../src/lib/life');
    const life = lifetime();
    const fn = vi.fn();
    life.later(fn, 500);
    vi.advanceTimersByTime(499);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('runs nothing once the game has been left', async () => {
    const { lifetime } = await import('../../src/lib/life');
    const life = lifetime();
    const fn = vi.fn();
    life.later(fn, 500);
    life.end();
    life.later(fn, 10);
    vi.advanceTimersByTime(2000);
    expect(fn).not.toHaveBeenCalled();
    expect(life.alive()).toBe(false);
  });

  it('a new round cancels the old round\'s timers but keeps going', async () => {
    const { lifetime } = await import('../../src/lib/life');
    const life = lifetime();
    const old = vi.fn();
    const fresh = vi.fn();
    life.later(old, 500);
    life.clear();
    life.later(fresh, 500);
    vi.advanceTimersByTime(600);
    expect(old).not.toHaveBeenCalled();
    expect(fresh).toHaveBeenCalledTimes(1);
  });
});

/* ── the coach's picks ─────────────────────────────────────────────────── */

describe('coachPick', () => {
  it('never picks the same word twice, even when it is listed under several sounds', async () => {
    const { coachPick } = await import('../../src/lib/coach');
    /* snap, spin, tip... are each listed under two to four sounds */
    const pool = REAL_WORDS.filter((w) => w.level === 1);
    for (let i = 0; i < 50; i += 1) {
      const picked = coachPick(pool, 16).map((w) => w.text);
      expect(new Set(picked).size).toBe(picked.length);
    }
  });

  it('returns what it has when asked for more', async () => {
    const { coachPick } = await import('../../src/lib/coach');
    const pool: Word[] = REAL_WORDS.slice(0, 3);
    expect(coachPick(pool, 10)).toHaveLength(new Set(pool.map((w) => w.text)).size);
  });
});

/* ── saved settings ────────────────────────────────────────────────────── */

describe('saved settings', () => {
  it('drops sound ids that no longer exist, and levels that never did', async () => {
    const { cleanSettings } = await import('../../src/lib/settings');
    const got = cleanSettings({ sounds: ['sh', 'a-sound-that-was-renamed', 7, 'sh'], levels: [5, 4, 4, 99, 0, 'x'] });
    expect(got.sounds).toEqual(['sh']);
    expect(got.levels).toEqual([4, 5]);
  });

  it('ignores values of the wrong type and keeps the default instead', async () => {
    const { cleanSettings } = await import('../../src/lib/settings');
    expect(cleanSettings({ pro: 'yes', coach: false, voiceURI: 3 })).toEqual({ coach: false });
    expect(cleanSettings('not an object')).toEqual({});
    expect(cleanSettings(['sh'])).toEqual({});
    expect(cleanSettings(null)).toEqual({});
  });
});
