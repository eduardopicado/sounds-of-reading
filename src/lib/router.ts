/* A hash router, so the app is one static file set that works from any path —
 * GitHub Pages, Netlify, a folder — with no server rewrite rules. */

export interface Route {
  path: string;
  mount: (root: HTMLElement) => (() => void) | void;
}

let routes: Route[] = [];
let unmount: (() => void) | void;
let host: HTMLElement;

const pathOf = (): string => (location.hash.replace(/^#\/?/, '') || 'home');

function render(): void {
  const path = pathOf();
  const route = routes.find((r) => r.path === path) ?? routes[0];
  try {
    unmount?.();
  } catch {
    /* a game that fails to clean up must not stop the next one opening */
  }
  host.replaceChildren();
  /* a win's confetti should not rain on the next game */
  for (const layer of document.querySelectorAll('.confetti')) layer.remove();
  host.scrollTop = 0;
  window.scrollTo(0, 0);
  unmount = route.mount(host);
  document.body.dataset.route = route.path;
}

export function startRouter(root: HTMLElement, list: Route[]): void {
  host = root;
  routes = list;
  window.addEventListener('hashchange', render);
  render();
}

export const go = (path: string): void => { location.hash = '#/' + path; };
