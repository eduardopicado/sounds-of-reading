/* Little sounds, made in the browser.
 *
 * Synthesised rather than loaded, so there are no audio files to ship, nothing
 * to fetch, and the app stays offline-capable and request-free. Kept gentle:
 * a rising third for right, a soft low thud for wrong — never a buzzer. */

import { read, write } from './storage';

let ctx: AudioContext | null = null;
let enabled = read('sfx', true);

function audio(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

export function setSfxEnabled(on: boolean): void {
  enabled = on;
  write('sfx', on);
}

export const sfxEnabled = (): boolean => enabled;

/** browsers suspend audio until a gesture, same as speech */
export function unlockSfx(): void {
  try {
    void audio()?.resume();
  } catch {
    /* ignore */
  }
}

interface Note { hz: number; at: number; for: number; gain?: number; type?: OscillatorType }

function play(notes: Note[]): void {
  if (!enabled) return;
  const ac = audio();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    for (const note of notes) {
      const osc = ac.createOscillator();
      const vol = ac.createGain();
      osc.type = note.type ?? 'sine';
      osc.frequency.value = note.hz;
      const start = now + note.at;
      const peak = note.gain ?? 0.16;
      /* ramped rather than switched, so nothing clicks */
      vol.gain.setValueAtTime(0.0001, start);
      vol.gain.exponentialRampToValueAtTime(peak, start + 0.015);
      vol.gain.exponentialRampToValueAtTime(0.0001, start + note.for);
      osc.connect(vol).connect(ac.destination);
      osc.start(start);
      osc.stop(start + note.for + 0.02);
    }
  } catch {
    /* a game without sound effects is still a game */
  }
}

export const sfx = {
  /** a bright rising third */
  right: () => play([{ hz: 660, at: 0, for: 0.12 }, { hz: 880, at: 0.09, for: 0.18 }]),
  /** low and short — a nudge, not a buzzer */
  wrong: () => play([{ hz: 180, at: 0, for: 0.16, type: 'triangle', gain: 0.12 }]),
  /** the little click of a card or tile */
  tap: () => play([{ hz: 520, at: 0, for: 0.05, gain: 0.07 }]),
  /** something landed in the right place */
  land: () => play([{ hz: 440, at: 0, for: 0.08 }, { hz: 660, at: 0.06, for: 0.12 }]),
  /** a four-note fanfare for finishing */
  win: () => play([
    { hz: 523, at: 0, for: 0.16 },
    { hz: 659, at: 0.13, for: 0.16 },
    { hz: 784, at: 0.26, for: 0.16 },
    { hz: 1047, at: 0.39, for: 0.34 },
  ]),
  /** a quick upward sweep — something caught in flight */
  zap: () => play([
    { hz: 700, at: 0, for: 0.06, type: 'square', gain: 0.06 },
    { hz: 1050, at: 0.05, for: 0.1, type: 'square', gain: 0.05 },
  ]),
  /** a thud and a rattle — a shield taking a hit */
  crack: () => play([
    { hz: 140, at: 0, for: 0.12, type: 'sawtooth', gain: 0.09 },
    { hz: 95, at: 0.08, for: 0.16, type: 'sawtooth', gain: 0.07 },
  ]),
  /** three falling notes for a round that is over */
  over: () => play([
    { hz: 494, at: 0, for: 0.18, type: 'triangle' },
    { hz: 392, at: 0.18, for: 0.18, type: 'triangle' },
    { hz: 294, at: 0.36, for: 0.34, type: 'triangle' },
  ]),
  /** the tumble of the die */
  roll: () => play([
    { hz: 300, at: 0, for: 0.05, type: 'square', gain: 0.05 },
    { hz: 260, at: 0.12, for: 0.05, type: 'square', gain: 0.05 },
    { hz: 340, at: 0.26, for: 0.05, type: 'square', gain: 0.05 },
    { hz: 420, at: 0.44, for: 0.08, type: 'square', gain: 0.05 },
  ]),
};
