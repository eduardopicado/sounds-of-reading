import './styles/app.css';
import './styles/games.css';

import { startRouter, type Route } from './lib/router';
import { unlockSpeech, watchVoices } from './lib/speech';
import { unlockSfx } from './lib/sfx';
import * as home from './games/home';
import * as memoryMatch from './games/sound-match';
import * as bingo from './games/sound-bingo';
import * as soundSort from './games/sound-sort';
import * as wordBuilder from './games/word-builder';
import * as rollAndRead from './games/roll-and-read';
import * as realOrSilly from './games/real-or-silly';
import * as sentenceSmash from './games/sentence-smash';

const routes: Route[] = [
  { path: 'home', mount: home.mount },
  { path: 'memory-match', mount: memoryMatch.mount },
  { path: 'bingo', mount: bingo.mount },
  { path: 'sound-sort', mount: soundSort.mount },
  { path: 'word-builder', mount: wordBuilder.mount },
  { path: 'roll-and-read', mount: rollAndRead.mount },
  { path: 'real-or-silly', mount: realOrSilly.mount },
  { path: 'sentence-smash', mount: sentenceSmash.mount },
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
  document.addEventListener('pointerdown', once, { once: false });
  document.addEventListener('keydown', once, { once: false });
}

watchVoices();
unlockOnFirstTap();

const app = document.querySelector<HTMLElement>('main#app');
if (app) startRouter(app, routes);
