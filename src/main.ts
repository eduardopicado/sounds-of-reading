import './styles/app.css';
import './styles/games.css';

import { startRouter, type Route } from './lib/router';
import { unlockSpeech, watchVoices } from './lib/speech';
import { loadClips } from './lib/audio';
import { unlockSfx, wakeSfx } from './lib/sfx';
import * as home from './games/home';
import * as memoryMatch from './games/sound-match';
import * as bingo from './games/sound-bingo';
import * as soundSort from './games/sound-sort';
import * as wordBuilder from './games/word-builder';
import * as rollAndRead from './games/roll-and-read';
import * as realOrSilly from './games/real-or-silly';
import * as sentenceSmash from './games/sentence-smash';
import * as sameSound from './games/same-sound';
import * as trickyWords from './games/tricky-words';
import * as soundRocket from './games/sound-rocket';
import * as penaltyShootout from './games/penalty-shootout';
import * as passAndShoot from './games/pass-and-shoot';
import * as beTheCommentator from './games/be-the-commentator';
import * as buildTheWord from './games/build-the-word';
import * as traceIt from './games/trace-it';
import * as tallSmallTail from './games/tall-small-tail';
import * as offTheBench from './games/off-the-bench';
import * as scoreboardSums from './games/scoreboard-sums';
import * as numberLinePenalty from './games/number-line-penalty';
import * as flashCount from './games/flash-count';
import * as teamBuses from './games/team-buses';
import * as keepyUppy from './games/keepy-uppy';
import * as voices from './games/voices';

const routes: Route[] = [
  { path: 'home', mount: home.mount },
  { path: 'memory-match', mount: memoryMatch.mount },
  { path: 'bingo', mount: bingo.mount },
  { path: 'sound-sort', mount: soundSort.mount },
  { path: 'word-builder', mount: wordBuilder.mount },
  { path: 'roll-and-read', mount: rollAndRead.mount },
  { path: 'real-or-silly', mount: realOrSilly.mount },
  { path: 'sentence-smash', mount: sentenceSmash.mount },
  { path: 'same-sound', mount: sameSound.mount },
  { path: 'tricky-words', mount: trickyWords.mount },
  { path: 'sound-rocket', mount: soundRocket.mount },
  { path: 'penalty-shootout', mount: penaltyShootout.mount },
  { path: 'pass-and-shoot', mount: passAndShoot.mount },
  { path: 'be-the-commentator', mount: beTheCommentator.mount },
  { path: 'build-the-word', mount: buildTheWord.mount },
  { path: 'trace-it', mount: traceIt.mount },
  { path: 'tall-small-tail', mount: tallSmallTail.mount },
  { path: 'off-the-bench', mount: offTheBench.mount },
  { path: 'scoreboard-sums', mount: scoreboardSums.mount },
  { path: 'number-line-penalty', mount: numberLinePenalty.mount },
  { path: 'flash-count', mount: flashCount.mount },
  { path: 'team-buses', mount: teamBuses.mount },
  { path: 'keepy-uppy', mount: keepyUppy.mount },
  /* diagnostics, linked from nowhere — see src/games/voices.ts */
  { path: 'voices', mount: voices.mount },
];

/* iOS keeps speech and audio locked until they are started inside a real
   gesture, so the very first tap anywhere unlocks both. */
function unlockOnFirstTap(): void {
  const once = () => {
    unlockSpeech();
    unlockSfx();
    document.removeEventListener('pointerdown', once);
    document.removeEventListener('keydown', once);
  };
  document.addEventListener('pointerdown', once);
  document.addEventListener('keydown', once);
  /* and every tap after that, since iOS silences audio again whenever the
     iPad sleeps or the app is left and reopened */
  document.addEventListener('pointerdown', wakeSfx);
}

watchVoices();
/* recorded words if this build shipped any; harmless and silent if not */
void loadClips();
unlockOnFirstTap();

const app = document.querySelector<HTMLElement>('main#app');
if (app) startRouter(app, routes);
