/* Pre-recorded words, with the device's own voice as the fallback.
 *
 * The iPad turned out to offer web pages only com.apple.voice.super-compact
 * .en-AU.Karen — Apple's lowest tier — and no enhanced or premium voice at
 * all, however many are downloaded in Settings. So the words a child is asked
 * to read are recorded ahead of time by a real text-to-speech engine and
 * shipped with the app.
 *
 * Nothing here talks to a text-to-speech service. The clips are made offline
 * by tools/make-audio.ts and served from our own origin like any other asset,
 * so the app still makes no third-party request and nothing leaves the device.
 *
 * Coverage is deliberately partial. Made-up words have no clip — no engine
 * says "shink" convincingly — so they fall through to speechSynthesis, and
 * any string without a clip does the same. That means this can ship with ten
 * clips or fifteen hundred and the app works either way. */

import { clipId, speakable } from './clip-id';

/** ids we have a file for; empty until the manifest loads, or if it never does */
let have: Set<string> | null = null;
let loading: Promise<void> | null = null;
let base = '';
const cache = new Map<string, HTMLAudioElement>();

/** where the clips live, relative to the page, so any deploy path works */
export function setClipBase(url: string): void {
  base = url.replace(/\/+$/, '');
}

/**
 * Loads the list of clips we shipped.
 *
 * A missing or unreadable manifest is not an error: it means this build has
 * no recorded audio, and every word goes to the device voice instead.
 */
export async function loadClips(url = './audio/clips.json'): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const res = await fetch(url, { cache: 'force-cache' });
      if (!res.ok) { have = new Set(); return; }
      const list: unknown = await res.json();
      have = new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []);
      if (!base) setClipBase(url.replace(/\/[^/]*$/, ''));
    } catch {
      have = new Set();
    }
  })();
  return loading;
}

/** is there a recording of this, or does it need the device voice? */
export function hasClip(text: string): boolean {
  if (!have || !text) return false;
  return have.has(clipId(text));
}

/**
 * Plays the recording, resolving true if it actually played.
 *
 * False means the caller should fall back to speech: no clip, or the browser
 * refused to play it — which iOS does until a user gesture has happened, the
 * same gate speechSynthesis sits behind.
 */
export async function playClip(
  text: string,
  options: { slow?: boolean; onEnd?: () => void } = {},
): Promise<boolean> {
  if (!hasClip(text)) return false;
  const id = clipId(speakable(text));
  try {
    let audio = cache.get(id);
    if (!audio) {
      audio = new Audio(`${base}/${id}.m4a`);
      audio.preload = 'auto';
      cache.set(id, audio);
    }
    audio.currentTime = 0;
    /* "sound it out for me" slows the recording rather than dropping to the
       device voice, which would change who is speaking mid-game */
    audio.playbackRate = options.slow ? 0.6 : 1;
    /* one voice at a time, the way cancel() works for speech */
    for (const [otherId, other] of cache) if (otherId !== id) other.pause();
    /* The element is cached and reused, so its handlers must be set every
       time — including to nothing. Left over, the last caller's onEnd would
       fire again the next time anyone played this word, even from another
       game. And once: an error followed by the fallback to speech must not
       report the end twice. */
    let ended = false;
    const end = options.onEnd ? () => { if (!ended) { ended = true; options.onEnd?.(); } } : null;
    audio.onended = end;
    audio.onerror = null;
    await audio.play();
    return true;
  } catch {
    /* blocked or missing: the caller speaks it instead, and reports the end */
    const audio = cache.get(id);
    if (audio) { audio.onended = null; audio.onerror = null; }
    return false;
  }
}

/** stop any recording that is playing, for leaving a game or the device voice taking over */
export function stopClips(): void {
  for (const audio of cache.values()) {
    try {
      audio.onended = null;
      audio.pause();
    } catch {
      /* already stopped */
    }
  }
}

/** for the tests and the diagnostics screen */
export const clipCount = (): number => have?.size ?? 0;
