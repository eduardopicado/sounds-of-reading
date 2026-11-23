/* The globe the world map turns into: the same countries, oceans and seas
 * on a ball he turns with a finger (src/content/globe.ts has the sums).
 *
 * The flat map stays on the page, hidden, and is the globe's paint: each
 * shape on the ball is the colour the flat map's own shape is now, so a
 * continent lit up right, a wrong one greyed and the rest dimmed round a
 * glowing one all come from the same CSS as the flat map. The shapes are
 * painted once on a flat sheet of longitude by latitude, and the ball is
 * drawn from the sheet a pixel at a time: a little rough while it turns,
 * then sharp when he lets go.
 *
 * A drag turns it and a tap is a tap, handed to the map's own tap. The
 * names sit over their places on the side facing him. Nothing here keeps
 * going once the globe has left the page. */

import { el } from '../lib/dom';
import { HOME, MAX_LAT, COUNTRIES, OCEANS, SEA_PARTS, fromScreen, lookAt, toScreen, wrapLon, type Shape, type View } from '../content/globe';
import { unproject } from '../content/projection';
import { PLACES, nameIn, place, type PlaceId } from '../content/world';
import type { Lang } from '../content/pt';

/** the flat sheet the ball is drawn from, longitude across and latitude down */
const SHEET_W = 2048;
const SHEET_H = 1024;
/** a drag shorter than this is a tap */
const TAP_PX = 8;
/** how long turning to a place takes */
const SPIN_MS = 900;

export interface Globe {
  node: HTMLElement;
  /** paint the ball again from the flat map's colours */
  repaint: () => void;
  /** turn the ball to put a longitude and latitude in the middle */
  spinTo: (lon: number, lat: number) => void;
  /** the longitude and latitude under a point on the screen; null off the ball */
  at: (clientX: number, clientY: number) => [number, number] | null;
  /** whether a point on the screen is on the ball */
  has: (target: EventTarget | null) => boolean;
  /** the names, in English or Portuguese */
  language: (lang: Lang) => void;
  /** draw it again, at its size now */
  draw: () => void;
}

/** each shape's outlines on the flat sheet, worked out once */
type Sheeted = { shape: Shape; rings: Float32Array[] };
let sheeted: Sheeted[] | null = null;
function onSheet(): Sheeted[] {
  if (sheeted) return sheeted;
  const toSheet = (s: Shape): Sheeted => ({
    shape: s,
    rings: s.rings.map((r) => {
      const out = new Float32Array(r.length);
      for (let i = 0; i < r.length; i += 2) {
        const [lon, lat] = unproject(r[i], r[i + 1]);
        out[i] = ((lon + 180) / 360) * SHEET_W;
        out[i + 1] = ((90 - lat) / 180) * SHEET_H;
      }
      return out;
    }),
  });
  sheeted = [...OCEANS, ...SEA_PARTS, ...COUNTRIES].map(toSheet);
  return sheeted;
}

export function globe(flat: SVGSVGElement, onTap: (clientX: number, clientY: number) => void): Globe {
  const canvas = el('canvas', { class: 'wm-globe-ball', role: 'img', 'aria-label': 'A globe of the world. Drag to turn it.' });
  const labels = el('div', { class: 'wm-labels wm-globe-labels', 'aria-hidden': 'true' });
  const spots: { node: HTMLElement; lon: number; lat: number }[] = [];
  for (const p of PLACES) {
    for (const [lon, lat] of p.labels) {
      const node = el('span', { class: `wm-label ${p.kind}`, text: p.name, dataset: { place: p.id } });
      spots.push({ node, lon, lat });
      labels.append(node);
    }
  }
  const node = el('div', { class: 'wm-globe' }, canvas, labels);

  let view: View = { ...HOME };
  const sheet = document.createElement('canvas');
  sheet.width = SHEET_W;
  sheet.height = SHEET_H;
  let pixels: Uint32Array | null = null;

  /** the colour a flat-map shape is now */
  const look = (s: Shape): CSSStyleDeclaration | null => {
    const sel = s.kind === 'country' ? `[data-country="${s.id}"]` : s.kind === 'sea' ? `[data-sea="${s.id}"]` : `.wm-ocean[data-place="${s.id}"]`;
    const n = flat.querySelector(sel);
    return n ? getComputedStyle(n) : null;
  };

  function repaint(): void {
    const g = sheet.getContext('2d');
    if (!g) return;
    const edge = flat.querySelector('.wm-edge');
    g.fillStyle = edge ? getComputedStyle(edge).fill : '#A9D6F2';
    g.fillRect(0, 0, SHEET_W, SHEET_H);
    g.lineJoin = 'round';
    for (const { shape, rings } of onSheet()) {
      const st = look(shape);
      if (!st) continue;
      g.beginPath();
      for (const r of rings) {
        g.moveTo(r[0], r[1]);
        for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]);
        g.closePath();
      }
      g.fillStyle = st.fill;
      g.fill('evenodd');
      if (shape.kind === 'country' && st.stroke && st.stroke !== 'none') {
        g.strokeStyle = st.stroke;
        g.lineWidth = Math.max(0.8, (parseFloat(st.strokeWidth) || 0.5) * 1.6);
        g.stroke();
      }
    }
    pixels = new Uint32Array(g.getImageData(0, 0, SHEET_W, SHEET_H).data.buffer);
    draw();
  }

  /* the pixels of the ball, worked out again only when its size changes */
  let size = 0;
  let scale = 0;
  let cells: { idx: Uint32Array; x: Float32Array; u: Float32Array; v: Float32Array } | null = null;
  function layout(px: number): void {
    if (cells && size === px) return;
    size = px;
    const r = px / 2;
    const idx: number[] = []; const xs: number[] = []; const us: number[] = []; const vs: number[] = [];
    for (let j = 0; j < px; j += 1) {
      const v = (r - (j + 0.5)) / r;
      for (let i = 0; i < px; i += 1) {
        const u = (i + 0.5 - r) / r;
        const d = u * u + v * v;
        if (d > 1) continue;
        idx.push(j * px + i); xs.push(Math.sqrt(1 - d)); us.push(u); vs.push(v);
      }
    }
    cells = { idx: Uint32Array.from(idx), x: Float32Array.from(xs), u: Float32Array.from(us), v: Float32Array.from(vs) };
  }

  /** draw the ball: rough while it moves, sharp when it is still */
  let moving = false;
  function draw(): void {
    if (!pixels || !canvas.isConnected) return;
    const box = node.getBoundingClientRect();
    const css = Math.floor(Math.min(box.width, box.height));
    if (css < 10) return;
    scale = moving ? 1 : Math.min(2, window.devicePixelRatio || 1);
    const px = Math.floor(css * scale);
    if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
    canvas.style.width = `${css}px`;
    canvas.style.height = `${css}px`;
    layout(px);
    const g = canvas.getContext('2d');
    if (!g || !cells) return;
    const img = g.createImageData(px, px);
    const out = new Uint32Array(img.data.buffer);
    const cl = Math.cos((view.lon * Math.PI) / 180); const sl = Math.sin((view.lon * Math.PI) / 180);
    const cp = Math.cos((view.lat * Math.PI) / 180); const sp = Math.sin((view.lat * Math.PI) / 180);
    const { idx, x, u, v } = cells;
    const kx = SHEET_W / (2 * Math.PI);
    const ky = SHEET_H / Math.PI;
    for (let n = 0; n < idx.length; n += 1) {
      const x1 = x[n] * cp - v[n] * sp;
      const z1 = x[n] * sp + v[n] * cp;
      const x2 = x1 * cl - u[n] * sl;
      const y2 = x1 * sl + u[n] * cl;
      let sx = ((Math.atan2(y2, x2) + Math.PI) * kx) | 0;
      if (sx >= SHEET_W) sx = SHEET_W - 1;
      let sy = ((Math.PI / 2 - Math.asin(z1 > 1 ? 1 : z1 < -1 ? -1 : z1)) * ky) | 0;
      if (sy >= SHEET_H) sy = SHEET_H - 1;
      out[idx[n]] = pixels[sy * SHEET_W + sx];
    }
    g.putImageData(img, 0, 0);
    /* light from the top left, and the rim */
    const r = px / 2;
    const shade = g.createRadialGradient(r * 0.7, r * 0.6, r * 0.1, r, r, r);
    shade.addColorStop(0, 'rgba(255, 255, 255, .16)');
    shade.addColorStop(0.7, 'rgba(255, 255, 255, 0)');
    shade.addColorStop(1, 'rgba(7, 34, 32, .28)');
    g.fillStyle = shade;
    g.beginPath(); g.arc(r, r, r - 0.5, 0, 2 * Math.PI); g.fill();
    g.strokeStyle = '#2B5F7F';
    g.lineWidth = 1.5 * scale;
    g.stroke();
    node.dataset.view = `${view.lon.toFixed(2)} ${view.lat.toFixed(2)}`;
    placeNames(css);
  }

  function placeNames(css: number): void {
    const r = css / 2;
    for (const s of spots) {
      const p = toScreen(s.lon, s.lat, view);
      const far = p.facing < 0.25;
      s.node.classList.toggle('far', far);
      if (far) continue;
      s.node.style.left = `${r + p.u * r}px`;
      s.node.style.top = `${r - p.v * r}px`;
    }
  }

  /* drawing again on the next frame, never twice in one */
  let queued = false;
  const later = (): void => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; draw(); });
  };

  /* turning it: a drag turns the ball under the finger; a still touch is a tap */
  let drag: { id: number; x: number; y: number; from: View; moved: boolean } | null = null;
  let spin = 0;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, from: { ...view }, moved: false };
    try { canvas.setPointerCapture(e.pointerId); } catch { /* it is gone */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < TAP_PX) return;
    drag.moved = true;
    spin += 1;
    moving = true;
    const r = canvas.getBoundingClientRect().width / 2;
    const deg = 180 / (Math.PI * r);
    view = {
      lon: wrapLon(drag.from.lon - dx * deg),
      lat: Math.max(-MAX_LAT, Math.min(MAX_LAT, drag.from.lat + dy * deg)),
    };
    later();
  });
  const end = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.id) return;
    const tapped = !drag.moved;
    drag = null;
    /* let go: sharp again */
    if (!tapped) { moving = false; later(); }
    if (tapped && e.type === 'pointerup') onTap(e.clientX, e.clientY);
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  function spinTo(lon: number, lat: number): void {
    const to = lookAt(lon, lat);
    const from = { ...view };
    let dLon = wrapLon(to.lon - from.lon);
    if (Math.abs(dLon) < 0.01 && Math.abs(to.lat - from.lat) < 0.01) return;
    const me = (spin += 1);
    const t0 = performance.now();
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const step = (now: number): void => {
      if (me !== spin || !canvas.isConnected) return;
      const t = reduce ? 1 : Math.min(1, (now - t0) / SPIN_MS);
      const k = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      view = { lon: wrapLon(from.lon + dLon * k), lat: from.lat + (to.lat - from.lat) * k };
      moving = t < 1;
      draw();
      if (t < 1) requestAnimationFrame(step);
    };
    dLon = wrapLon(dLon);
    requestAnimationFrame(step);
  }

  /* drawn again when it changes size: turning the iPad, or the page laid out */
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => later()).observe(node);

  return {
    node,
    repaint,
    spinTo,
    draw,
    at: (clientX, clientY) => {
      const b = canvas.getBoundingClientRect();
      const r = b.width / 2;
      if (r <= 0) return null;
      return fromScreen((clientX - b.left - r) / r, (b.top + r - clientY) / r, view);
    },
    has: (target) => target instanceof Node && node.contains(target),
    language: (lang) => {
      for (const s of spots) s.node.textContent = nameIn(place(s.node.dataset.place as PlaceId), lang);
    },
  };
}
