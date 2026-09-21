/* Renders the app icons from one piece of markup, using the real Andika face
   so the single-storey a on the icon matches the a the child reads inside.
   Run: node tools/make-icons.mjs */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const andika = readFileSync(join(root, 'src/styles/fonts/andika-700.woff2')).toString('base64');

/** maskable icons need their content inside the safe circle, so pad them */
const page = (size, pad) => `<!doctype html><meta charset="utf-8"><style>
  @font-face { font-family: 'Andika'; src: url(data:font/woff2;base64,${andika}) format('woff2'); font-weight: 700; }
  html, body { margin: 0; width: ${size}px; height: ${size}px; }
  body { display: grid; place-items: center; background: #10403E; }
  .plate {
    width: ${size - pad * 2}px; height: ${size - pad * 2}px;
    border-radius: ${size * 0.21}px; background: #FFF6E7;
    display: grid; place-items: center;
    box-shadow: 0 ${size * 0.03}px 0 #0B302F;
  }
  .word {
    font-family: 'Andika'; font-weight: 700; color: #14312F;
    font-size: ${(size - pad * 2) * 0.42}px; line-height: 1; letter-spacing: -0.01em;
  }
  /* the app's own mark: dark ink, thick coloured underline, a wash behind */
  .gr {
    display: inline-block; line-height: 1;
    border-bottom: ${(size - pad * 2) * 0.05}px solid #BE4F2D;
    background: linear-gradient(#D8775A59, #D8775A59);
    background-size: 100% 0.58em; background-position: 0 100%; background-repeat: no-repeat;
  }
</style><div class="plate"><span class="word">s<span class="gr">ai</span>d</span></div>`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [name, size, pad] of [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['icon-maskable-512.png', 512, 54],
  ['apple-touch-icon.png', 180, 0],
]) {
  const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(page(size, pad));
  await p.waitForTimeout(250);
  await p.screenshot({ path: join(root, 'public/icons', name) });
  await p.close();
  console.log('wrote', name, size);
}
await browser.close();

writeFileSync(join(root, 'public/icons/favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#10403E"/>
  <rect x="6" y="6" width="52" height="52" rx="11" fill="#FFF6E7"/>
  <rect x="17" y="38" width="30" height="5" rx="2" fill="#BE4F2D"/>
  <text x="32" y="36" text-anchor="middle" font-family="Andika, Comic Sans MS, sans-serif" font-weight="700" font-size="26" fill="#14312F">ai</text>
</svg>
`);
console.log('wrote favicon.svg');
