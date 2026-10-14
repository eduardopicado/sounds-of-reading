/* Sound effects: leaving a game silences what it was still playing.
 *
 *   npm run test:unit */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** a scheduled sound, remembering whether it was cut off early */
class FakeSource {
  static made: FakeSource[] = [];
  kind: string;
  cut = false;
  onended: (() => void) | null = null;
  frequency = { value: 0 };
  type = '';
  buffer: unknown = null;
  constructor(kind: string) { this.kind = kind; FakeSource.made.push(this); }
  connect<T>(next: T): T { return next; }
  start(): void { /* scheduled */ }
  /** with no time it is a stop now; with one, the planned end */
  stop(at?: number): void { if (at === undefined) this.cut = true; }
}

const param = () => ({ value: 0, setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined });

class FakeContext {
  currentTime = 0;
  sampleRate = 8000;
  state = 'running';
  destination = {};
  createOscillator() { return new FakeSource('tone'); }
  createBufferSource() { return new FakeSource('noise'); }
  createGain() { return { gain: param(), connect: <T>(n: T) => n }; }
  createBiquadFilter() { return { type: '', frequency: { value: 0 }, Q: { value: 0 }, connect: <T>(n: T) => n }; }
  createBuffer(_c: number, length: number) { return { getChannelData: () => new Float32Array(length) }; }
  resume() { return Promise.resolve(); }
}

describe('leaving a game', () => {
  beforeEach(() => {
    vi.resetModules();
    FakeSource.made = [];
    vi.stubGlobal('window', { AudioContext: FakeContext, localStorage: { getItem: () => null, setItem: () => undefined } });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('stops a crowd and a fanfare that are still playing', async () => {
    const { sfx, hushSfx } = await import('../../src/lib/sfx');
    sfx.cheer();
    sfx.win();
    hushSfx();
    expect(FakeSource.made.length).toBeGreaterThan(4);
    expect(FakeSource.made.every((s) => s.cut)).toBe(true);
  });

  it('lets the click of the tap that left it finish', async () => {
    const { sfx, hushSfx } = await import('../../src/lib/sfx');
    sfx.tap();
    hushSfx();
    expect(FakeSource.made).toHaveLength(1);
    expect(FakeSource.made[0].cut).toBe(false);
  });

  it('forgets a sound once it has ended', async () => {
    const { sfx, hushSfx } = await import('../../src/lib/sfx');
    sfx.wrong();
    for (const s of FakeSource.made) s.onended?.();
    hushSfx();
    expect(FakeSource.made.some((s) => s.cut)).toBe(false);
  });
});
