/* The offline worker: everything the app is, precached, so it works in the
 * car with no signal, and the recordings handed over the way Safari needs.
 *
 * Safari plays an <audio> file only when its Range request ("bytes=0-1",
 * then the rest) is answered with 206 Partial Content. The precache answers
 * every request with the whole file and a 200, which Chrome plays and
 * Safari refuses, so on the iPad every recording failed to play and the app
 * fell back to the device voice. A recording is therefore answered here
 * first, from the precache, cut to the bytes asked for.
 *
 * Otherwise this is what vite-plugin-pwa would generate on its own: the
 * precache, old caches cleared, every page served by index.html, and the
 * "New version! Tap to update" button's message (src/lib/update.ts). */

/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, matchPrecache, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { createPartialResponse } from 'workbox-range-requests';

declare const self: ServiceWorkerGlobalScope;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') void self.skipWaiting();
});

/* Registered before the precache, whose own route would answer with the
   whole file. A recording that is not precached goes to the network. */
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.endsWith('.mp3'),
  async ({ request }) => {
    const cached = await matchPrecache(request.url);
    if (!cached) return fetch(request);
    return request.headers.has('range') ? createPartialResponse(request, cached) : cached;
  },
);

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));
