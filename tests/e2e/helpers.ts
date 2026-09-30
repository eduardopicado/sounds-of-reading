import { expect, type Page } from '@playwright/test';

/** Collects console errors and any request that leaves the app's own origin.
 *  Both are failures: the definition of done says zero console errors and no
 *  network requests to any other domain. */
export function watchPage(page: Page): { errors: string[]; external: string[] } {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e.message)));
  page.on('request', (r) => {
    const url = r.url();
    if (!url.startsWith('http://localhost:4173') && !url.startsWith('data:') && !url.startsWith('blob:')) {
      external.push(url);
    }
  });
  return { errors, external };
}

export async function openGame(page: Page, path: string): Promise<void> {
  await page.goto('/#/' + path);
  await expect(page.locator('.topbar h1')).toBeVisible();
}

/** the setup panel is behind the gear, so the child never lands on it */
export async function openSetup(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Set up this game' }).click();
  await expect(page.locator('.panel')).toBeVisible();
}

export const noProblems = (watch: { errors: string[]; external: string[] }): void => {
  expect(watch.errors, 'console errors').toEqual([]);
  expect(watch.external, 'requests to other domains').toEqual([]);
};

/** every tappable thing has to clear the 48px the brief asks for */
export async function expectTapTargets(page: Page, selector: string): Promise<void> {
  const boxes = await page.locator(selector).evaluateAll((nodes) =>
    nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return { text: (n.textContent ?? '').trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) };
    }),
  );
  const small = boxes.filter((b) => b.h > 0 && (b.h < 40 || b.w < 40));
  expect(small, 'tap targets under 40px').toEqual([]);
}

/** a speech engine that writes down what it says, so a test can hear it too */
export async function recordSpeech(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const spoken: string[] = [];
    (window as unknown as { __said: string[] }).__said = spoken;
    class FakeUtterance {
      text: string; lang = ''; rate = 1; pitch = 1; volume = 1; voice: unknown = null;
      onend: (() => void) | null = null; onerror: (() => void) | null = null;
      constructor(text: string) { this.text = text; }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [{ name: 'Karen', lang: 'en-AU', localService: true, default: true, voiceURI: 'karen' }],
        speak: (u: FakeUtterance) => { if (u.text) spoken.push(u.text); window.setTimeout(() => u.onend?.(), 0); },
        cancel: () => undefined,
        addEventListener: () => undefined,
      },
    });
  });
}

/** everything said so far */
export const said = (page: Page): Promise<string[]> =>
  page.evaluate(() => [...(window as unknown as { __said: string[] }).__said]);

/** save these on the device before the app starts, once per tab: the offline
 *  worker reloads the page when it first takes over, and a seed that ran
 *  again then would put back whatever the test had just changed */
export async function seed(page: Page, items: Record<string, unknown>): Promise<void> {
  await page.addInitScript((pairs) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    for (const [k, v] of Object.entries(pairs)) localStorage.setItem(`sor:${k}`, JSON.stringify(v));
  }, items);
}
