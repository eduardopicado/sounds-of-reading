/* Derives each sound's two tones from a hue, and proves both meet WCAG AA.
   deep  = the underline / small-text tone, used on cream paper   (>= 3.0 : 1 vs cream, >= 4.5 as text)
   light = the chip / token fill, which carries dark ink on top   (>= 4.5 : 1 vs deep ink) */
export const CREAM = '#FFF6E7';
export const INK   = '#0B302F';

const srgb = h => { h = h.replace('#',''); return [0,2,4].map(i => parseInt(h.slice(i,i+2),16)); };
const lin  = c => { c /= 255; return c <= 0.04045 ? c/12.92 : ((c+0.055)/1.055)**2.4; };
export const lum = h => { const [r,g,b] = srgb(h).map(lin); return .2126*r + .7152*g + .0722*b; };
export const contrast = (a,b) => { const x = lum(a), y = lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };

const hex = n => Math.round(n*255).toString(16).padStart(2,'0');
function hsl(h, s, l){
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const c = (1 - Math.abs(2*l - 1)) * s, x = c * (1 - Math.abs((h/60) % 2 - 1)), m = l - c/2;
  const seg = [[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][Math.floor(h/60) % 6];
  return '#' + seg.map(v => hex(v + m)).join('').toUpperCase();
}

/* Walk lightness down (deep) or up (light) until the tone clears its threshold. */
export function tones(hue, sat = 62){
  let deep = null;
  for (let l = 52; l >= 22; l -= 1){
    const c = hsl(hue, sat, l);
    if (contrast(c, CREAM) >= 4.5){ deep = c; break; }
  }
  let light = null;
  for (let l = 58; l <= 88; l += 1){
    const c = hsl(hue, sat, l);
    if (contrast(c, INK) >= 4.5){ light = c; break; }
  }
  if (!deep || !light) throw new Error('no tone found for hue ' + hue);
  return { deep, light };
}
