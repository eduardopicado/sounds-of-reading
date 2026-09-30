/* Recording his voice, on the device and nowhere else.
 *
 * Takes live in memory as blob: URLs for as long as the game is open. They
 * are never saved, never uploaded and gone when he leaves the game — the
 * whole point is that he hears himself, not that anyone keeps anything.
 *
 * Every call is guarded. A device may have no microphone, a parent may say
 * no to the permission prompt, and Safari's MediaRecorder is younger than
 * Chrome's; any of those leaves the game playable without recording (see
 * canRecord and the fallback in be-the-commentator.ts). */

export interface Take {
  url: string;
  seconds: number;
}

/** does this browser record audio at all? Asking says nothing about permission */
export function canRecord(): boolean {
  try {
    /* the types promise both exist; older Safari and locked-down browsers disagree */
    const devices = navigator.mediaDevices as MediaDevices | undefined;
    return typeof devices?.getUserMedia === 'function' && typeof window.MediaRecorder === 'function';
  } catch {
    return false;
  }
}

/** ask for the microphone; null if there is none or the answer is no */
export async function openMic(): Promise<MediaStream | null> {
  if (!canRecord()) return null;
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch {
    return null;
  }
}

/** let go of the microphone, so the device stops showing it in use */
export function closeMic(stream: MediaStream | null): void {
  try {
    stream?.getTracks().forEach((t) => t.stop());
  } catch {
    /* already gone */
  }
}

/* Safari records mp4, Chrome webm; ask for one it has, or let it choose */
function mimeType(): string | undefined {
  try {
    for (const type of ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']) {
      if (MediaRecorder.isTypeSupported?.(type)) return type;
    }
  } catch {
    /* fall through */
  }
  return undefined;
}

export interface Recording {
  /** finish the take; resolves to it, or null if nothing usable was caught */
  stop: () => Promise<Take | null>;
}

/** start one take; it stops by itself after `limit` seconds */
export function record(stream: MediaStream, limit: number, onAutoStop: () => void): Recording | null {
  let rec: MediaRecorder;
  try {
    const type = mimeType();
    rec = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream);
  } catch {
    return null;
  }
  const chunks: Blob[] = [];
  const started = performance.now();
  let settle: ((take: Take | null) => void) | null = null;
  const done = new Promise<Take | null>((resolve) => { settle = resolve; });

  rec.ondataavailable = (e: BlobEvent) => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    const seconds = (performance.now() - started) / 1000;
    if (!chunks.length) { settle?.(null); return; }
    try {
      const blob = new Blob(chunks, { type: chunks[0].type || rec.mimeType || 'audio/mp4' });
      settle?.({ url: URL.createObjectURL(blob), seconds });
    } catch {
      settle?.(null);
    }
  };

  const timer = window.setTimeout(() => { if (rec.state === 'recording') { onAutoStop(); stop(); } }, limit * 1000);
  function stop(): Promise<Take | null> {
    window.clearTimeout(timer);
    try {
      if (rec.state === 'recording') rec.stop();
      else settle?.(null);
    } catch {
      settle?.(null);
    }
    return done;
  }

  try {
    rec.start();
  } catch {
    window.clearTimeout(timer);
    return null;
  }
  return { stop };
}

/** the take playing now, so leaving the game can stop it mid-line */
let playing: { audio: HTMLAudioElement; finish: () => void } | null = null;

/** play a take; resolves when it ends, or at once if it cannot play */
export function play(take: Take): Promise<void> {
  stopPlaying();
  return new Promise((resolve) => {
    try {
      const audio = new Audio(take.url);
      const finish = () => { if (playing?.audio === audio) playing = null; resolve(); };
      playing = { audio, finish };
      audio.onended = finish;
      audio.onerror = finish;
      /* a take that will not play must not hold the game up */
      const guard = window.setTimeout(finish, (take.seconds + 1.5) * 1000);
      audio.addEventListener('ended', () => window.clearTimeout(guard));
      void audio.play().catch(() => { window.clearTimeout(guard); finish(); });
    } catch {
      resolve();
    }
  });
}

/** stop the take that is playing, if any; its promise resolves */
export function stopPlaying(): void {
  const p = playing;
  playing = null;
  if (!p) return;
  try { p.audio.pause(); } catch { /* already stopped */ }
  p.finish();
}

export function forget(take: Take | null | undefined): void {
  try {
    if (take) URL.revokeObjectURL(take.url);
  } catch {
    /* nothing to free */
  }
}
