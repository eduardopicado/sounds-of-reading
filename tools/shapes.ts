/* What the map tools share: reading Natural Earth's polygons, simplifying
 * them, and writing them as short SVG paths. Used by tools/make-world.ts and
 * tools/make-australia.ts; never shipped. */

export type Pt = [number, number];
export type Ring = Pt[];
export interface Feature { properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } }

/** a feature's polygons, each an outer ring and its holes, in longitude and latitude */
export function polygons(f: Feature): Ring[][] {
  const g = f.geometry;
  if (g.type === 'Polygon') return [g.coordinates as Ring[]];
  if (g.type === 'MultiPolygon') return g.coordinates as Ring[][];
  return [];
}

export const area = (r: Ring): number => Math.abs(r.reduce((s, p, i) => {
  const q = r[(i + 1) % r.length];
  return s + p[0] * q[1] - q[0] * p[1];
}, 0)) / 2;

/** Ramer–Douglas–Peucker: drop points that lie within `tol` of the line past them */
export function simplify(points: Pt[], tol: number): Pt[] {
  if (points.length < 3) return points;
  const [a, b] = [points[0], points[points.length - 1]];
  let far = 0;
  let at = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const p = points[i];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const d = len === 0 ? Math.hypot(p[0] - a[0], p[1] - a[1]) : Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
    if (d > far) { far = d; at = i; }
  }
  if (far <= tol) return [a, b];
  return [...simplify(points.slice(0, at + 1), tol).slice(0, -1), ...simplify(points.slice(at), tol)];
}

/** a ring on a map, simplified; a closed ring is split in two so its ends stay put */
export function toMap(ring: Ring, project: (lon: number, lat: number) => [number, number], tol = 0.4): Ring {
  const pts = ring.map(([lon, lat]) => project(lon, lat));
  const half = Math.floor(pts.length / 2);
  const out = [...simplify(pts.slice(0, half + 1), tol).slice(0, -1), ...simplify(pts.slice(half), tol)];
  return out.length >= 3 ? out : pts;
}

const r1 = (n: number): number => Math.round(n * 10) / 10;

/** a number as short as svg allows: 0.5 is .5 */
const short = (n: number): string => String(n).replace(/^(-?)0\./, '$1.');

/** rings as an svg path: the first point of each, then steps from it, the
    steps run together the way svg lets them (a minus sign or a space between) */
export function path(rings: Ring[]): string {
  return rings.map((ring) => {
    const pts = ring.map(([x, y]) => [r1(x), r1(y)] as Pt);
    let s = `M${short(pts[0][0])} ${short(pts[0][1])}l`;
    let first = true;
    for (let i = 1; i < pts.length; i += 1) {
      const dx = r1(pts[i][0] - pts[i - 1][0]);
      const dy = r1(pts[i][1] - pts[i - 1][1]);
      if (dx === 0 && dy === 0) continue;
      const pair = `${short(dx)}${dy < 0 ? '' : ' '}${short(dy)}`;
      s += first || dx < 0 ? pair : ` ${pair}`;
      first = false;
    }
    return `${s}z`;
  }).join('');
}

/** the rings worth drawing: tiny islands go, but never a whole country */
export function keep(rings: Ring[]): Ring[] {
  const big = rings.filter((r) => r.length >= 3 && area(r) >= 1.2);
  if (big.length) return big;
  return [...rings].sort((a, b) => area(b) - area(a)).slice(0, 1);
}
