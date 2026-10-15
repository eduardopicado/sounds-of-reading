import './styles/app.css';
import './styles/games.css';

import { startRouter, type Route } from './lib/router';
import { unlockSpeech, watchVoices } from './lib/speech';
import { loadClips } from './lib/audio';
import { unlockSfx, wakeSfx } from './lib/sfx';
import * as home from './games/home';
import { GAMES } from './games/catalog';

/* The home screen is in the main bundle, so it comes up at once; every game
   is fetched when it is first opened (src/games/catalog.ts). */
const routes: Route[] = [
  { path: 'home', mount: home.mount },
  ...GAMES.map((g) => ({ path: g.path, title: g.name, load: g.load })),
  /* the settings, behind a button held for three seconds on the home screen */
  { path: 'grown-ups', title: 'Grown-ups', load: () => import('./games/grown-ups') },
  /* diagnostics, linked from nowhere — see src/games/voices.ts */
  { path: 'voices', title: 'Voices', load: () => import('./games/voices') },
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
