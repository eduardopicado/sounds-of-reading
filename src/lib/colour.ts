/* Two tones per sound, derived from its hue, both provably legible.
 *   deep  — the underline, and the only tone ever used for small text on paper
 *   light — chip and token fills, which carry dark ink on top
 * The content test re-checks every derived tone, so a new sound cannot ship
 * with a colour that fails WCAG AA. */

export const PAPER = '#FFF6E7';
export const INK = '#0B302F';

const channels = (hex: string) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function hsl(hue: number, sat: number, light: number): string {
  const h = ((hue % 360) + 360) % 360;
  const s = sat / 100;
  const l = light / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const seg = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h / 60) % 6];
  return '#' + seg.map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export interface Tones {
  /** underline / small text on cream */
  deep: string;
  /** chip fill, dark ink sits on this */
  light: string;
  /** translucent highlighter wash behind dark ink */
  wash: string;
}

/** Walks lightness until each tone clears 4.5:1 against the surface it sits on. */
export function tonesFor(hue: number, sat = 62): Tones {
  let deep = '';
  for (let l = 52; l >= 22; l -= 1) {
    const c = hsl(hue, sat, l);
    if (contrast(c, PAPER) >= 4.5) { deep = c; break; }
  }
  let light = '';
  for (let l = 58; l <= 88; l += 1) {
    const c = hsl(hue, sat, l);
    if (contrast(c, INK) >= 4.5) { light = c; break; }
  }
  if (!deep || !light) throw new Error(`no legible tone for hue ${hue}`);
  return { deep, light, wash: light + '59' };
}
