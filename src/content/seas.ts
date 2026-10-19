/* Which ocean (or sea) a place in the water is in.
 *
 * The rules are tools/make-world.ts's, kept here so the tests can check the
 * map's labels and facts against the same oceans the map draws. They import
 * nothing, so the tool can use them as they are.
 *
 * The five oceans, the way Australian schools draw them: the Pacific to
 * the east of Australia, the Indian to the west, and the Southern Ocean
 * to the south, from its coast. A grid of half degrees is filled by these
 * rules and each ocean's outline traced, so the oceans cover all the water
 * with no gaps; land is drawn over them, so where a line runs on land does
 * not matter, only where it crosses the sea. Over water they are the usual
 * ones: the Drake Passage (68° W), Cape Agulhas (20° E), Cape Leeuwin
 * (115° E) and Tasmania's South East Cape (147° E), Torres Strait and the
 * islands of Indonesia, 60° S and the Arctic Circle.
 */

/** a line through the land, as [a, b] points: b at each a, by straight pieces */
function along(line: [number, number][], a: number): number {
  if (a <= line[0][0]) return line[0][1];
  for (let i = 1; i < line.length; i += 1) {
    const [pa, pb] = line[i - 1];
    const [qa, qb] = line[i];
    if (a <= qa) return pb + ((a - pa) / (qa - pa)) * (qb - pb);
  }
  return line[line.length - 1][1];
}
/* the Pacific–Atlantic line, down the Americas: [latitude, longitude] */
const AMERICAS: [number, number][] = [[-60, -68], [-56, -68], [-50, -70], [-30, -64], [0, -65], [7, -77.5], [9, -79.6], [11, -85],
  [15, -89], [17.5, -94.5], [20, -101], [30, -108], [45, -112], [60, -125], [66, -125]];
/* the Atlantic–Indian line, from Cape Agulhas up through Africa, Suez and the Caucasus to the Urals */
const AFRICA: [number, number][] = [[-60, 20], [-34.8, 20], [0, 25], [29.9, 32.5], [33, 35.5], [37, 37], [40, 42], [45, 47], [50, 52], [55, 55], [66, 60]];
/* the Indian–Pacific line, south from Burma down the Malay peninsula and Sumatra to the Sunda Strait */
const MALAY: [number, number][] = [[-5.8, 105.6], [-3, 104.6], [1.3, 103.8], [2, 102.5], [4, 101.5], [7, 100.4], [10, 99], [12, 99.2], [16, 98.5], [22, 98], [66, 95]];
/* then east along Java and the islands to Timor and Torres Strait: [longitude, latitude] */
const ISLANDS: [number, number][] = [[105.6, -5.8], [110, -7.5], [114, -8], [118, -8.5], [122, -9], [125.5, -9.5], [131, -8], [138, -8.6], [142.5, -10.7]];

export type SeaId = 'pacific' | 'atlantic' | 'indian' | 'southern' | 'arctic' | 'mediterranean' | 'black' | 'caspian';

export function seaAt(lon: number, lat: number): SeaId {
  if (lat >= 66) return 'arctic';
  /* Hudson Bay and Hudson Strait are the Arctic's */
  if ((lat >= 51 && lon >= -96 && lon <= -76) || (lat >= 60 && lon > -76 && lon <= -65)) return 'arctic';
  if (lat <= -60) return 'southern';
  /* the seas with no ocean: boxes, since the land round them is drawn over */
  if (lat >= 36.5 && lat <= 47.2 && lon >= 46.6 && lon <= 54.8) return 'caspian';
  if (lat >= 40.9 && lat <= 47.4 && lon >= 27.4 && lon <= 41.9) return 'black';
  if (lat >= 30 && ((lon >= -5.6 && lon < 3 && lat <= 42) || (lon >= 3 && lon <= 37 && lat <= 46))) return 'mediterranean';
  /* south of Australia, from Cape Leeuwin to Tasmania */
  if (lon >= 115.1 && lon <= 146.9 && lat <= (lon < 117.5 ? -34.4 : -31.5)) return 'southern';
  const africa = along(AFRICA, lat);
  if (lon >= along(AMERICAS, lat) && lon < africa) return 'atlantic';
  if (lon >= africa) {
    let indian: boolean;
    if (lat >= -5.8) indian = lon < along(MALAY, lat);
    else if (lon < 105.6) indian = true;
    else if (lon < 142.5) indian = lat < along(ISLANDS, lon);
    /* past Torres Strait, down through Queensland to the South East Cape */
    else indian = lon < (lat >= -39 ? 143 + ((-10.7 - lat) / 28.3) * 3.9 : 146.9);
    if (indian) return 'indian';
  }
  return 'pacific';
}
