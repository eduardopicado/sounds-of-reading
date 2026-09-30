/* The teams in Penalty Shootout, and the shirts they play in.
 *
 * He asked for the real thing: World Cup winners and the big clubs. Countries
 * come with their flag. Clubs come as their kit colours and nothing more — a
 * club crest is someone's trademark and is never drawn here, but a green shirt
 * is Palmeiras to anyone who follows them, and that is all a six-year-old
 * needs to know who he is playing.
 *
 * The shirt is a small inline SVG so it needs no image files, stays sharp at
 * any size and works offline. */

export type Pattern =
  | 'plain'    // one colour, collar and cuffs in the second
  | 'stripes'  // vertical stripes: Barcelona, Juventus, Argentina
  | 'hoops'    // horizontal bands: Flamengo
  | 'sleeves'  // body one colour, sleeves the other: Arsenal
  | 'band';    // one broad stripe down the middle: PSG

export interface Team {
  id: string;
  /** in full, for the kick-off */
  name: string;
  /** on the scoreboard, where a phone has room for about ten letters */
  short: string;
  kind: 'you' | 'country' | 'club';
  /** countries only */
  flag?: string;
  colours: [string, string];
  pattern: Pattern;
  /** not always either shirt colour: Brazil play in royal blue shorts, Palmeiras in white */
  shorts: string;
  /** the team as a Brazilian commentator says it, with its article: "do
      Brasil", "da Argentina" — for "Goooool do Brasil!" */
  pt?: string;
}

/** the side he plays for until he picks one */
export const YOU: Team = { id: 'you', name: 'You', short: 'You', kind: 'you', flag: '⭐', colours: ['#F3B229', '#10403E'], pattern: 'plain', shorts: '#10403E' };

export const TEAMS: Team[] = [
  YOU,
  /* every World Cup winner, and the two he is likeliest to be asked about */
  { id: 'brazil', name: 'Brazil', short: 'Brazil', kind: 'country', flag: '🇧🇷', colours: ['#FFD500', '#009B3A'], pattern: 'plain', shorts: '#1F3FA8', pt: 'do Brasil' },
  { id: 'argentina', name: 'Argentina', short: 'Argentina', kind: 'country', flag: '🇦🇷', colours: ['#75AADB', '#FFFFFF'], pattern: 'stripes', shorts: '#1B1B3A', pt: 'da Argentina' },
  { id: 'france', name: 'France', short: 'France', kind: 'country', flag: '🇫🇷', colours: ['#1F3A93', '#FFFFFF'], pattern: 'plain', shorts: '#FFFFFF', pt: 'da França' },
  { id: 'germany', name: 'Germany', short: 'Germany', kind: 'country', flag: '🇩🇪', colours: ['#FFFFFF', '#111111'], pattern: 'plain', shorts: '#111111', pt: 'da Alemanha' },
  { id: 'spain', name: 'Spain', short: 'Spain', kind: 'country', flag: '🇪🇸', colours: ['#C8102E', '#FFC400'], pattern: 'plain', shorts: '#1B2A5C', pt: 'da Espanha' },
  { id: 'italy', name: 'Italy', short: 'Italy', kind: 'country', flag: '🇮🇹', colours: ['#1F5FBF', '#FFFFFF'], pattern: 'plain', shorts: '#FFFFFF', pt: 'da Itália' },
  { id: 'england', name: 'England', short: 'England', kind: 'country', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', colours: ['#FFFFFF', '#1D2D5C'], pattern: 'plain', shorts: '#1D2D5C', pt: 'da Inglaterra' },
  { id: 'uruguay', name: 'Uruguay', short: 'Uruguay', kind: 'country', flag: '🇺🇾', colours: ['#6CACE4', '#FFFFFF'], pattern: 'plain', shorts: '#111111', pt: 'do Uruguai' },
  { id: 'portugal', name: 'Portugal', short: 'Portugal', kind: 'country', flag: '🇵🇹', colours: ['#C8102E', '#006600'], pattern: 'plain', shorts: '#006600', pt: 'de Portugal' },
  { id: 'australia', name: 'Australia', short: 'Australia', kind: 'country', flag: '🇦🇺', colours: ['#FFCD00', '#00843D'], pattern: 'plain', shorts: '#00843D', pt: 'da Austrália' },
  { id: 'palmeiras', name: 'Palmeiras', short: 'Palmeiras', kind: 'club', colours: ['#006437', '#FFFFFF'], pattern: 'plain', shorts: '#FFFFFF', pt: 'do Palmeiras' },
  { id: 'flamengo', name: 'Flamengo', short: 'Flamengo', kind: 'club', colours: ['#C8102E', '#111111'], pattern: 'hoops', shorts: '#FFFFFF', pt: 'do Flamengo' },
  { id: 'real-madrid', name: 'Real Madrid', short: 'Real Madrid', kind: 'club', colours: ['#FFFFFF', '#1B3A6B'], pattern: 'plain', shorts: '#FFFFFF', pt: 'do Real Madrid' },
  { id: 'barcelona', name: 'Barcelona', short: 'Barcelona', kind: 'club', colours: ['#A50044', '#004D98'], pattern: 'stripes', shorts: '#004D98', pt: 'do Barcelona' },
  { id: 'bayern', name: 'Bayern Munich', short: 'Bayern', kind: 'club', colours: ['#DC052D', '#FFFFFF'], pattern: 'plain', shorts: '#DC052D', pt: 'do Bayern' },
  { id: 'psg', name: 'Paris Saint-Germain', short: 'PSG', kind: 'club', colours: ['#0B2A5B', '#DA291C'], pattern: 'band', shorts: '#0B2A5B', pt: 'do PSG' },
  { id: 'man-united', name: 'Manchester United', short: 'Man United', kind: 'club', colours: ['#DA291C', '#FFFFFF'], pattern: 'plain', shorts: '#FFFFFF', pt: 'do Manchester United' },
  { id: 'man-city', name: 'Manchester City', short: 'Man City', kind: 'club', colours: ['#6CABDD', '#FFFFFF'], pattern: 'plain', shorts: '#FFFFFF', pt: 'do Manchester City' },
  { id: 'liverpool', name: 'Liverpool', short: 'Liverpool', kind: 'club', colours: ['#C8102E', '#FFFFFF'], pattern: 'plain', shorts: '#C8102E', pt: 'do Liverpool' },
  { id: 'chelsea', name: 'Chelsea', short: 'Chelsea', kind: 'club', colours: ['#034694', '#FFFFFF'], pattern: 'plain', shorts: '#034694', pt: 'do Chelsea' },
  { id: 'arsenal', name: 'Arsenal', short: 'Arsenal', kind: 'club', colours: ['#EF0107', '#FFFFFF'], pattern: 'sleeves', shorts: '#FFFFFF', pt: 'do Arsenal' },
  { id: 'juventus', name: 'Juventus', short: 'Juventus', kind: 'club', colours: ['#111111', '#FFFFFF'], pattern: 'stripes', shorts: '#FFFFFF', pt: 'da Juventus' },
];

export const teamById = (id: string | null | undefined): Team | undefined => TEAMS.find((t) => t.id === id);

/** a team's name as it is shown, flag first where there is one */
export const label = (team: Team, short = false): string =>
  `${team.flag ? `${team.flag} ` : ''}${short ? team.short : team.name}`;

const SVG = 'http://www.w3.org/2000/svg';
const SHIRT = 'M20 8 L27 5 Q32 11 37 5 L44 8 L59 19 L52 29 L46 25 L46 59 L18 59 L18 25 L12 29 L5 19 Z';
let clips = 0;

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

/** the team's pattern, laid over a shape given as a clip path */
function cloth(team: Team, shape: string, box: { x: number; y: number; w: number; h: number }): SVGElement[] {
  const [main, second] = team.colours;
  const id = `pk-kit-${(clips += 1)}`;
  const clip = svg('clipPath', { id });
  clip.append(svg('path', { d: shape }));
  const g = svg('g', { 'clip-path': `url(#${id})` });
  const { x, y, w, h } = box;
  g.append(svg('rect', { x, y, width: w, height: h, fill: main }));
  if (team.pattern === 'stripes') {
    const step = w / 4;
    for (let sx = x + step / 2; sx < x + w; sx += step) g.append(svg('rect', { x: sx, y, width: step / 2, height: h, fill: second }));
  } else if (team.pattern === 'hoops') {
    const step = h / 4;
    for (let sy = y + step / 2; sy < y + h; sy += step) g.append(svg('rect', { x, y: sy, width: w, height: step / 2, fill: second }));
  } else if (team.pattern === 'sleeves') {
    g.append(svg('rect', { x, y, width: w * 0.28, height: h, fill: second }));
    g.append(svg('rect', { x: x + w * 0.72, y, width: w * 0.28, height: h, fill: second }));
  } else if (team.pattern === 'band') {
    g.append(svg('rect', { x: x + w * 0.4, y, width: w * 0.2, height: h, fill: '#FFFFFF' }));
    g.append(svg('rect', { x: x + w * 0.43, y, width: w * 0.14, height: h, fill: second }));
  }
  return [clip, g];
}

/** the team's shirt, drawn in its colours; decoration only, so hidden from screen readers */
export function kit(team: Team, size: number): SVGSVGElement {
  const root = svg('svg', { viewBox: '0 0 64 64', width: size, height: size, 'aria-hidden': 'true', class: 'pk-kit' });
  root.append(...cloth(team, SHIRT, { x: 0, y: 0, w: 64, h: 64 }));
  /* collar in the second colour, and a dark edge so a white shirt still
     stands out on the grass */
  root.append(svg('path', { d: 'M27 5 Q32 11 37 5', fill: 'none', stroke: team.colours[1], 'stroke-width': 3 }));
  root.append(svg('path', { d: SHIRT, fill: 'none', stroke: '#0B302F', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
  return root;
}

const INK = '#0B302F';
const SKIN = '#E6B48A';
const HAIR = '#3B2A1E';

/**
 * A player in the team's kit. The keeper stands arms up, gloves on, the way
 * keepers do on a penalty; the kicker stands arms down beside the ball.
 * A friendly cartoon rather than anyone in particular.
 */
export function player(team: Team, height: number, pose: 'keeper' | 'kicker'): SVGSVGElement {
  const [main] = team.colours;
  const root = svg('svg', {
    viewBox: '0 0 80 100', width: Math.round(height * 0.8), height, 'aria-hidden': 'true', class: `pk-player ${pose}`,
  });
  const line = { stroke: INK, 'stroke-width': 1.6, 'stroke-linejoin': 'round' };

  /* legs, socks in the shirt colour, boots */
  for (const lx of [31, 42]) {
    root.append(svg('rect', { x: lx, y: 66, width: 8, height: 22, rx: 3, fill: main, ...line }));
    root.append(svg('rect', { x: lx - 1, y: 86, width: 11, height: 7, rx: 3, fill: '#1B1B1B' }));
  }
  /* shorts */
  root.append(svg('path', { d: 'M27 58 H53 L55 72 H43 L40 66 L37 72 H25 Z', fill: team.shorts, ...line }));

  /* arms go behind the body; the keeper's reach up and out */
  const arms = pose === 'keeper'
    ? [['M29 36 L13 16'], ['M51 36 L67 16']]
    : [['M29 36 L20 58'], ['M51 36 L60 58']];
  const hands = pose === 'keeper' ? [[12, 14], [68, 14]] : [[19, 60], [61, 60]];
  for (const [d] of arms) {
    root.append(svg('path', { d, stroke: INK, 'stroke-width': 10, 'stroke-linecap': 'round' }));
    root.append(svg('path', { d, stroke: main, 'stroke-width': 7, 'stroke-linecap': 'round' }));
  }
  for (const [hx, hy] of hands) {
    root.append(pose === 'keeper'
      ? svg('circle', { cx: hx, cy: hy, r: 7, fill: '#B5E655', ...line })
      : svg('circle', { cx: hx, cy: hy, r: 4, fill: SKIN, ...line }));
  }

  /* the shirt, in the team's pattern */
  const torso = 'M28 30 Q40 34 52 30 L54 60 H26 Z';
  root.append(...cloth(team, torso, { x: 26, y: 29, w: 28, h: 32 }));
  root.append(svg('path', { d: torso, fill: 'none', ...line }));

  /* head: hair, eyes, a smile */
  root.append(svg('circle', { cx: 40, cy: 18, r: 11, fill: SKIN, ...line }));
  root.append(svg('path', { d: 'M29.5 16 Q31 6 40 6.5 Q49 6 50.5 16 Q45 11 40 12 Q35 11 29.5 16 Z', fill: HAIR }));
  root.append(svg('circle', { cx: 36, cy: 19, r: 1.4, fill: INK }));
  root.append(svg('circle', { cx: 44, cy: 19, r: 1.4, fill: INK }));
  root.append(svg('path', { d: 'M36 23.5 Q40 26.5 44 23.5', fill: 'none', stroke: INK, 'stroke-width': 1.4, 'stroke-linecap': 'round' }));
  return root;
}
