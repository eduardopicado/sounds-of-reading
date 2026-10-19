/* The Australia map's projection: longitude and latitude on a map AUS_W
 * wide. Equirectangular, with the longitudes narrowed by the cosine of 25° S,
 * across the middle of the country, which keeps one country its own shape.
 * It imports nothing, so tools/make-australia.ts can draw the map with the
 * same sums the game uses to put a city on it. */

export const AUS_W = 1000;

/* a little round the mainland, Tasmania and the tip of Cape York */
const WEST = 112.3;
const EAST = 154.3;
const NORTH = -9.6;
const SOUTH = -44.2;
const NARROW = Math.cos((25 * Math.PI) / 180);
const SCALE = AUS_W / ((EAST - WEST) * NARROW);

export const AUS_H = Math.ceil((NORTH - SOUTH) * SCALE);

/** where a place is on the map of Australia */
export function projectAus(lon: number, lat: number): [number, number] {
  return [(lon - WEST) * NARROW * SCALE, (NORTH - lat) * SCALE];
}
