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
const voiceListeners = new Set<() => void>();
let lastSignature = '';

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

export type Quality = 'premium' | 'enhanced' | 'compact' | 'unknown' | 'retro' | 'novelty';

/**
 * Apple puts the tier in the identifier; other engines name theirs in words.
 *
 * "compact" sounds like the worst of the bunch and is not: it is the ordinary
 * Siri-family voice and the sensible baseline. The genuinely poor ones carry
 * no tier marker at all — the Eloquence set (com.apple.eloquence.*), which is
 * the retro speech engine, and the novelty voices (Bubbles, Zarvox and
 * friends) — so anything unmarked must rank below compact, never above it.
 */
export function qualityOf(voice: SpeechSynthesisVoice): Quality {
  const id = `${voice.voiceURI} ${voice.name}`.toLowerCase();
  if (id.includes('premium')) return 'premium';
  if (id.includes('enhanced') || id.includes('neural') || id.includes('natural')) return 'enhanced';
  if (id.includes('eloquence')) return 'retro';
  if (id.includes('com.apple.speech.synthesis.voice.')) return 'novelty';
  if (id.includes('compact')) return 'compact';
  return 'unknown';
}

const QUALITY_RANK: Record<Quality, number> = {
  premium: 0, enhanced: 1, compact: 2, unknown: 3, retro: 4, novelty: 5,
};

/** English voices this device actually has, best first */
export function englishVoices(): SpeechSynthesisVoice[] {
  const synth = engine();
  if (!synth) return [];
  try {
    const ranked = synth.getVoices()
      .filter((v) => ACCENT_RANK.some(([re]) => re.test(v.lang)))
      .sort((a, b) => score(a) - score(b));
    /* iOS lists the same voice twice — an iPad shows two Samanthas that are
       indistinguishable to a parent. Collapse anything matching in name,
       accent and tier, keeping the better-ranked one. Two tiers of the same
       name stay apart, because choosing between them is the whole point. */
    const seen = new Set<string>();
    return ranked.filter((v) => {
      const key = `${v.name}|${v.lang}|${qualityOf(v)}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch {
    return [];
  }
}

/** every English voice with the details behind it, for the diagnostics screen */
export function voiceReport(): { name: string; lang: string; uri: string; local: boolean; quality: Quality }[] {
  const synth = engine();
  if (!synth) return [];
  try {
    return synth.getVoices()
      .filter((v) => ACCENT_RANK.some(([re]) => re.test(v.lang)))
      .map((v) => ({
        name: v.name, lang: v.lang, uri: v.voiceURI,
        local: v.localService, quality: qualityOf(v),
      }));
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

/**
 * True when nothing better than a compact voice is installed — the state of a
 * device where nobody has downloaded one.
 *
 * This asks whether any voice is enhanced or premium rather than whether every
 * voice is compact: a single Eloquence voice in the list, which iOS ships by
 * default, would otherwise silence the hint on exactly the devices that need
 * it most.
 */
export function onlyCompactVoices(): boolean {
  const voices = englishVoices();
  if (!voices.length) return false;
  return !voices.some((v) => {
    const q = qualityOf(v);
    return q === 'enhanced' || q === 'premium';
  });
}

export function setSpeechEnabled(on: boolean): void {
  enabled = on;
  if (!on) cancelSpeech();
}

/**
 * iOS stays silent until speech has been started inside a real gesture — and,
 * less obviously, it does not admit to having the good voices until then
 * either. Before the first speak(), getVoices() lists only the preinstalled
 * set, so a Karen Enhanced the parent downloaded is simply absent. After the
 * unlock the list grows, but nothing fires to say so on every version, so we
 * re-read it a few times and tell anyone listening when it changes.
 */
export function unlockSpeech(): void {
  if (unlocked) return;
  const synth = engine();
  if (!synth) return;
  try {
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    synth.speak(u);
    unlocked = true;
    for (const delay of [0, 250, 750, 2000]) window.setTimeout(rescanVoices, delay);
  } catch {
    /* stays locked; the next tap tries again */
  }
}

/** a cheap fingerprint of the voice list, to spot it growing */
function signature(): string {
  const synth = engine();
  if (!synth) return '';
  try {
    return synth.getVoices().map((v) => v.voiceURI).join('|');
  } catch {
    return '';
  }
}

/** re-reads the voice list and notifies listeners only if it actually changed */
export function rescanVoices(): void {
  const next = signature();
  if (next === lastSignature) return;
  lastSignature = next;
  cached = null;
  for (const fn of voiceListeners) {
    try { fn(); } catch { /* a listener must not break speech */ }
  }
}

/** called whenever the set of installed voices changes, including after the
 *  first tap on iOS reveals the downloaded ones */
export function onVoicesChanged(fn: () => void): () => void {
  voiceListeners.add(fn);
  return () => voiceListeners.delete(fn);
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
    lastSignature = signature();
    cached = chooseVoice();
    synth.addEventListener('voiceschanged', rescanVoices);
  } catch {
    /* ignore */
  }
}

/** for the tests and the parent panel: which voice ended up being used */
export function currentVoice(): SpeechSynthesisVoice | null {
  cached ??= chooseVoice();
  return cached;
}

/* Every voice says what it is. Calling the ordinary one "basic" read as a
   warning and made the retro voices look like the better choice. */
const QUALITY_LABEL: Record<Quality, string> = {
  premium: ' — premium, clearest',
  enhanced: ' — enhanced, clearer',
  compact: ' — standard',
  unknown: '',
  retro: ' — retro, robotic',
  novelty: ' — novelty, just for fun',
};

export const describeVoice = (v: SpeechSynthesisVoice): string =>
  `${v.name} (${v.lang})${QUALITY_LABEL[qualityOf(v)]}`;
