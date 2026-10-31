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

/* The sounds on their own ("sss", "sh", "ai" as in rain), one per phoneme
   (PHONEMES in src/content/words.ts), in a folder and a manifest of their
   own: the sound "a" and the word "a" are never the same clip. */
let sounds: Set<string> | null = null;
let soundsLoading: Promise<void> | null = null;
let soundBase = '';

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

/**
 * Loads the list of sounds we shipped. Missing means none, and every game
 * that needs a bare sound stays hidden: the device voice would say a letter's
 * name instead.
 */
export async function loadSounds(url = './audio/sounds/sounds.json'): Promise<void> {
  if (soundsLoading) return soundsLoading;
  soundsLoading = (async () => {
    try {
      const res = await fetch(url, { cache: 'force-cache' });
      if (!res.ok) { sounds = new Set(); return; }
      const list: unknown = await res.json();
      sounds = new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []);
      soundBase = url.replace(/\/[^/]*$/, '');
    } catch {
      sounds = new Set();
    }
  })();
  return soundsLoading;
}

/** is there a recording of this sound (a key of PHONEMES)? */
export function hasSound(phoneme: string): boolean {
  return !!sounds?.has(phoneme);
}

/** is there a recording of this, or does it need the device voice? */
export function hasClip(text: string): boolean {
  if (!have || !text) return false;
  return have.has(clipId(text));
}

/* One element plays every recording.
 *
 * Safari on the iPad lets a page start a sound only inside a tap, and it
 * keeps that permission per element. Most words are said a moment after a
 * tap, once the ball has flown or the next card is dealt, so an element made
 * for each word would be refused almost every time and the word would go to
 * the device voice. An element that has played inside a tap may play again
 * whenever it likes, so the first tap unlocks this one (unlockClips, from
 * src/main.ts) and every recording goes through it. One element is also
 * "one voice at a time" for free. */
let player: HTMLAudioElement | null = null;
/** the clip the element holds, so the same word again is not fetched again */
let holding = '';
/** counts every play and every stop, so a play cut short knows it was */
let turn = 0;
/** a recording has played, so the element is allowed to and needs no more unlocking */
let unlocked = false;

const element = (): HTMLAudioElement => {
  player ??= new Audio();
  return player;
};

/**
 * Unlocks the player inside a tap, called on every tap until a recording has
 * played. It is stopped again before a sound comes out (and usually holds
 * nothing yet, so the play is refused for want of a source), but by then
 * Safari has marked the element as started by a tap.
 */
export function unlockClips(): void {
  if (unlocked || (!have?.size && !sounds?.size)) return;
  try {
    const audio = element();
    /* saying a word already, so already allowed */
    if (!audio.paused) return;
    void audio.play()?.catch(() => undefined);
    audio.pause();
  } catch {
    /* the first word said inside a tap unlocks it instead */
  }
}

/**
 * Plays the recording, resolving true if it played, or if it was cut short
 * by the next word or by stopClips(): either way there is nothing left for
 * the caller to say.
 *
 * False means the caller should fall back to speech: no clip, or the browser
 * refused to play it.
 */
export async function playClip(
  text: string,
  options: { slow?: boolean; onEnd?: () => void } = {},
): Promise<boolean> {
  if (!hasClip(text)) return false;
  const id = clipId(speakable(text));
  return playFile(id, `${base}/${id}.mp3`, options);
}

/** plays the recording of a sound, as playClip; false when there is none,
    and then nothing is to be said instead */
export async function playSound(phoneme: string, options: { onEnd?: () => void } = {}): Promise<boolean> {
  if (!hasSound(phoneme)) return false;
  return playFile(`sound:${phoneme}`, `${soundBase}/${phoneme}.mp3`, options);
}

async function playFile(
  id: string, src: string,
  options: { slow?: boolean; onEnd?: () => void },
): Promise<boolean> {
  const mine = (turn += 1);
  try {
    const audio = element();
    /* The handlers must be set every time, including to nothing. Left over,
       the last caller's onEnd would fire again the next time anyone played a
       word, even from another game. And once: an error followed by the
       fallback to speech must not report the end twice. */
    audio.onended = null;
    audio.pause();
    if (holding !== id) {
      audio.src = src;
      holding = id;
    }
    audio.currentTime = 0;
    /* "sound it out for me" slows the recording rather than dropping to the
       device voice, which would change who is speaking mid-game. Loading a
       new clip resets the rate to the default, so both are set */
    audio.defaultPlaybackRate = audio.playbackRate = options.slow ? 0.6 : 1;
    let ended = false;
    audio.onended = options.onEnd ? () => { if (!ended) { ended = true; options.onEnd?.(); } } : null;
    await audio.play();
    unlocked = true;
    return true;
  } catch {
    /* cut short: the next word, or leaving the game, has taken over */
    if (mine !== turn) return true;
    /* blocked or missing: the caller speaks it instead, and reports the end */
    if (player) player.onended = null;
    holding = '';
    return false;
  }
}

/** stop any recording that is playing, for leaving a game or the device voice taking over */
export function stopClips(): void {
  turn += 1;
  if (!player) return;
  try {
    player.onended = null;
    player.pause();
  } catch {
    /* already stopped */
  }
}
