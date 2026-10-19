# Recorded words and sounds

Made by `npm run make:audio` and `npm run make:sfx` with ElevenLabs, never
edited by hand. The files are committed, so a deploy needs neither the key
nor the credits to make them again.

None ship yet: both lists below are empty until the key is in place and the
tools have been run, and until then the app sounds exactly as it always has.

## Words: `*.mp3` and `clips.json`

`clips.json` lists the ids of the clips actually present (an id is
`clipId()` of the words, from `src/lib/clip-id.ts`). The app plays a
recording only for a string listed there and speaks everything else with the
device voice, so an empty list simply means the iPad says every word itself.

`tools/make-audio.ts` says what is recorded and what is deliberately left to
the device voice: made-up words, the names of the sounds on their own, and
sentences with a number or a name filled in.

## Sound effects: `sfx/*.mp3` and `sfx/sfx.json`

`sfx.json` lists the sounds that have a recording, with how loud each one
plays. Every other sound, and every sound until its file has loaded, is made
from tones in `src/lib/sfx.ts`, as before. `tools/make-sfx.ts` has the
prompt for each one; takes are made into `audition/sfx/` to listen to, and
the best is kept with `--keep`.

## Making them

1. The key goes in the environment as `ELEVENLABS_API_KEY`: in a Claude
   session, in the environment's settings (never pasted into a chat); on a
   laptop, in the shell. It is never built into the app: the app only plays
   finished files from its own origin, so nothing leaves the iPad.
2. `api.elevenlabs.io` has to be allowed in the environment's network
   access.
3. `npm run make:audio -- --voices` lists the voices, and `--audition ID,ID`
   makes ten test words in each into `audition/` to choose from;
   `--audition-pt ID,ID` does the same for the Portuguese voices, with
   lines the games say in Portuguese. The chosen ones go in
   `ELEVENLABS_VOICE_EN` and `ELEVENLABS_VOICE_PT`. Portuguese is always
   Brazilian: the tool looks the Portuguese voice up first and will not
   record with one ElevenLabs does not mark as Brazilian.
4. `npm run make:audio` records everything missing. For the sound effects,
   `npm run make:sfx -- --takes 3`, then `--keep <sound> <take>` for each.

The offline worker caches `clips.json`, `sfx.json` and every `.mp3` beside
them, so once made they play with no signal like everything else.
