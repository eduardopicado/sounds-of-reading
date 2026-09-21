/* Speech, defensively.
 *
 * The family is in Australia and also speaks Portuguese, so an English word
 * read by the device's default voice comes out mangled. We hunt for en-AU,
 * fall back to en-GB, then any English voice, and never inherit the device
 * language.
 *
 * Apple ships three tiers of each voice and only the worst one is installed by
 * default. They are told apart by the identifier, not the name — Karen may be
 * com.apple.voice.compact.en-AU.Karen or ...enhanced... or ...premium... — so
 * a device can offer two voices called "Karen" that sound nothing alike. We
 * rank by tier and pick the best installed, which is the most a web page can
 * do: a voice that has not been downloaded in Settings simply is not in the
 * list, and Siri's voices are never exposed to the web at all.
 *
 * Reading `window.speechSynthesis` can itself throw in some embedded contexts,
 * which is what produced the prototypes' unattributed "Script error." — so
 * even reaching for the object is inside a try. On iOS nothing is spoken until
 * a user gesture has happened, so the first tap in the app unlocks it. */

let cached: SpeechSynthesisVoice | null = null;
let unlocked = false;
let enabled = true;
/** a voice the parent chose by hand, which beats anything we would rank */
let preferredURI: string | null = null;

function engine(): SpeechSynthesis | null {
  try {
    return window.speechSynthesis ?? null;
  } catch {
    return null;
  }
}

/* accent first: an Australian child is learning Australian vowels */
const ACCENT_RANK: [RegExp, number][] = [
  [/^en[-_]AU/i, 0],
  [/^en[-_]GB/i, 1],
  [/^en[-_]NZ/i, 2],
  [/^en[-_]IE/i, 3],
  [/^en/i, 4],
];

export type Quality = 'premium' | 'enhanced' | 'standard' | 'compact';

/** Apple puts the tier in the identifier; other engines name theirs in words. */
export function qualityOf(voice: SpeechSynthesisVoice): Quality {
  const id = `${voice.voiceURI} ${voice.name}`.toLowerCase();
  if (id.includes('premium')) return 'premium';
  if (id.includes('enhanced') || id.includes('neural') || id.includes('natural')) return 'enhanced';
  if (id.includes('compact')) return 'compact';
  return 'standard';
}

const QUALITY_RANK: Record<Quality, number> = { premium: 0, enhanced: 1, standard: 2, compact: 3 };

/** English voices this device actually has, best first */
export function englishVoices(): SpeechSynthesisVoice[] {
  const synth = engine();
  if (!synth) return [];
  try {
    return synth.getVoices()
      .filter((v) => ACCENT_RANK.some(([re]) => re.test(v.lang)))
      .sort((a, b) => score(a) - score(b));
  } catch {
    return [];
  }
}

function score(v: SpeechSynthesisVoice): number {
  const accent = ACCENT_RANK.find(([re]) => re.test(v.lang))?.[1] ?? 9;
  /* accent dominates, then how good the voice is, then whether it needs the
     network — the app has to keep working in the car with no signal */
  return accent * 100 + QUALITY_RANK[qualityOf(v)] * 10 + (v.localService ? 0 : 1);
}

function chooseVoice(): SpeechSynthesisVoice | null {
  const voices = englishVoices();
  if (!voices.length) return null;
  if (preferredURI) {
    const picked = voices.find((v) => v.voiceURI === preferredURI);
    if (picked) return picked;
  }
  return voices[0];
}

/** the parent's pick, or null to go back to choosing automatically */
export function setPreferredVoice(uri: string | null): void {
  preferredURI = uri;
  cached = null;
}

/** true when every English voice installed is one of Apple's compact ones,
 *  which is the case on a device where nobody has downloaded a better one */
export function onlyCompactVoices(): boolean {
  const voices = englishVoices();
  return voices.length > 0 && voices.every((v) => qualityOf(v) === 'compact');
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
    /* Apple's voices warble below about 0.8 and sound synthetic above a pitch
       of 1, so stay inside that. Sounding it out is meant to be slow. */
    u.rate = options.slow ? 0.45 : 0.9;
    u.pitch = 1;
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
export function currentVoice(): SpeechSynthesisVoice | null {
  cached ??= chooseVoice();
  return cached;
}

export const describeVoice = (v: SpeechSynthesisVoice): string => {
  const quality = qualityOf(v);
  const suffix = quality === 'compact' ? ' — basic' : quality === 'standard' ? '' : ` — ${quality}`;
  return `${v.name} (${v.lang})${suffix}`;
};
