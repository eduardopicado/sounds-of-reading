import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/* iPad Safari is the primary target, so the sizes here are the ones the brief
   names: an iPad both ways up, and a 375px phone. The runs use Chromium
   because that is what this machine has; the layout assertions are about
   size, not engine. */
/* Use the browser Playwright installed for itself when there is one; fall back
   to a pre-installed Chromium where the environment ships one instead. */
const PRESET = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const CHROME = existsSync(PRESET) ? PRESET : undefined;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    launchOptions: CHROME ? { executablePath: CHROME } : {},
  },
  projects: [
    { name: 'ipad-portrait', use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true } },
    { name: 'ipad-landscape', use: { ...devices['Desktop Chrome'], viewport: { width: 1180, height: 820 }, hasTouch: true } },
    { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 }, hasTouch: true } },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
