/* The world map's projection: Natural Earth (Šavrič, Patterson and Jenny,
 * 2011), the one atlases use for a map of the whole world, because it keeps
 * the continents close to their true shapes and sizes and the poles short.
 * It imports nothing, so tools/make-world.ts can use the same sums to draw
 * the map as the games use to put a label or a ball on it.
 *
 * The map is MAP_W wide. Longitude and latitude are in degrees; 0, 0 is in
 * the middle, and north is up. */

export const MAP_W = 1000;

/** the projection itself, in radians, on a world about 5.47 wide */
function raw(lambda: number, phi: number): [number, number] {
  const phi2 = phi * phi;
  const phi4 = phi2 * phi2;
  return [
    lambda * (0.8707 - 0.131979 * phi2 + phi4 * (-0.013791 + phi4 * (0.003971 * phi2 - 0.001529 * phi4))),
    phi * (1.007226 + phi2 * (0.015085 + phi4 * (-0.044475 + 0.028874 * phi2 - 0.005916 * phi4))),
  ];
}

const SCALE = MAP_W / (2 * Math.PI * 0.8707);
export const MAP_H = Math.ceil(2 * raw(0, Math.PI / 2)[1] * SCALE);

/** where a place is on the map */
export function project(lon: number, lat: number): [number, number] {
  const [x, y] = raw((lon * Math.PI) / 180, (lat * Math.PI) / 180);
  return [MAP_W / 2 + x * SCALE, MAP_H / 2 - y * SCALE];
}

/** the edge of the world on the map: down the right-hand side and back up the left */
export function outline(steps = 36): [number, number][] {
  const right = Array.from({ length: steps + 1 }, (_, i) => project(180, 90 - (180 * i) / steps));
  const left = Array.from({ length: steps + 1 }, (_, i) => project(-180, -90 + (180 * i) / steps));
  return [...right, ...left];
}

/** a place on the map back to its longitude and latitude: the projection run
 * backwards (Newton's method for the latitude, then the longitude). Off the
 * edge of the world, the nearest place on the edge. */
export function unproject(x: number, y: number): [number, number] {
  const px = (x - MAP_W / 2) / SCALE;
  const py = (MAP_H / 2 - y) / SCALE;
  const top = raw(0, Math.PI / 2)[1];
  let phi = Math.max(-1, Math.min(1, py / top)) * (Math.PI / 2);
  for (let i = 0; i < 25; i += 1) {
    const p2 = phi * phi;
    const p4 = p2 * p2;
    const f = phi * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4))) - py;
    const df = 1.007226 + p2 * (3 * 0.015085 + p4 * (7 * -0.044475 + 9 * 0.028874 * p2 - 11 * 0.005916 * p4));
    const step = f / df;
    phi -= step;
    if (Math.abs(step) < 1e-10) break;
  }
  phi = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, phi));
  const p2 = phi * phi;
  const p4 = p2 * p2;
  const k = 0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4));
  const lambda = Math.max(-Math.PI, Math.min(Math.PI, px / k));
  return [(lambda * 180) / Math.PI, (phi * 180) / Math.PI];
}

