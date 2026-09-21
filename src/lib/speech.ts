/* Speech, defensively.
 *
 * The family is in Australia and also speaks Portuguese, so an English word
 * read by the device's default voice comes out mangled. We hunt for en-AU,
 * fall back to en-GB, then any English voice, and never inherit the device
 * language.
 *
 * Reading `window.speechSynthesis` can itself throw in some embedded contexts,
 * which is what produced the prototypes' unattributed "Script error." — so
 * even reaching for the object is inside a try. On iOS nothing is spoken until
 * a user gesture has happened, so the first tap in the app unlocks it. */

let cached: SpeechSynthesisVoice | null = null;
let unlocked = false;
let enabled = true;

function engine(): SpeechSynthesis | null {
  try {
    return window.speechSynthesis ?? null;
  } catch {
    return null;
  }
}

const RANKS: [RegExp, number][] = [
  [/^en[-_]AU/i, 0],
  [/^en[-_]GB/i, 1],
  [/^en[-_]NZ/i, 2],
  [/^en[-_]IE/i, 3],
  [/^en/i, 4],
];

function chooseVoice(): SpeechSynthesisVoice | null {
  const synth = engine();
  if (!synth) return null;
  try {
    const voices = synth.getVoices();
    if (!voices.length) return null;
    let best: SpeechSynthesisVoice | null = null;
    let bestRank = Number.POSITIVE_INFINITY;
    for (const v of voices) {
      const rank = RANKS.find(([re]) => re.test(v.lang))?.[1];
      if (rank === undefined) continue;
      /* among equals prefer a local voice: no network, and it works offline */
      const score = rank * 2 + (v.localService ? 0 : 1);
      if (score < bestRank) { bestRank = score; best = v; }
    }
    return best;
  } catch {
    return null;
  }
}

export function setSpeechEnabled(on: boolean): void {
  enabled = on;
  if (!on) cancelSpeech();
}

/** iOS stays silent until speech has been started inside a real gesture */
export function unlockSpeech(): void {
  if (unlocked) return;
  const synth = engine();
  if (!synth) return;
  try {
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    synth.speak(u);
    unlocked = true;
  } catch {
    /* stays locked; the next tap tries again */
  }
}

export function cancelSpeech(): void {
  try {
    engine()?.cancel();
  } catch {
    /* ignore */
  }
}

export interface SayOptions {
  /** slower, for "sound it out for me" */
  slow?: boolean;
  onEnd?: () => void;
}

export function say(text: string, options: SayOptions = {}): void {
  if (!enabled || !text) { options.onEnd?.(); return; }
  const synth = engine();
  if (!synth) { options.onEnd?.(); return; }
  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    cached ??= chooseVoice();
    /* Setting .voice can throw on its own in some engines. Losing the voice is
       survivable — losing the whole utterance is not — so it gets its own try,
       and lang still carries the accent we want. */
    try {
      if (cached) u.voice = cached;
    } catch {
      /* fall back to lang alone */
    }
    u.lang = cached?.lang ?? 'en-AU';
    u.rate = options.slow ? 0.5 : 0.78;
    u.pitch = 1.1;
    if (options.onEnd) {
      u.onend = () => options.onEnd?.();
      u.onerror = () => options.onEnd?.();
    }
    synth.speak(u);
  } catch {
    options.onEnd?.();
  }
}

/** voices load asynchronously in most browsers, so re-pick when they arrive */
export function watchVoices(): void {
  const synth = engine();
  if (!synth) return;
  try {
    cached = chooseVoice();
    synth.addEventListener('voiceschanged', () => { cached = chooseVoice(); });
  } catch {
    /* ignore */
  }
}

/** for the tests and the parent panel: which voice ended up being used */
export function currentVoice(): string | null {
  cached ??= chooseVoice();
  return cached ? `${cached.name} (${cached.lang})` : null;
}
