/* Every game, once.
 *
 * Adding a game used to mean editing five lists that had to agree: the routes
 * in main.ts, the tiles on the home screen, the ladders on the grown-ups
 * page, and the lists in two of the tests. They did drift — the offline test
 * and the leaving-a-game test had stopped at the 32 games there were when
 * they were written. Now a game is one entry here, and the routes, the
 * tiles, the progress card and the tests are all made from this list.
 *
 * Each game's code is loaded when it is first opened, rather than all of it
 * up front, so the home screen comes up sooner; the offline worker caches
 * every game's file anyway, so they all still open with no signal. */

import type { Mount } from '../lib/router';
import {
  BENCH_STEPS, BOARD_STEPS, BUS_STEPS, CLOCK_STEPS, DRILL_STEPS, FACT_STEPS, FLASH_STEPS, FRACTION_STEPS, HANDS_STEPS, JUMP_STEPS, KIOSK_STEPS, LINE_STEPS, SHAPE_STEPS, SKIP_STEPS, SUM_STEPS, SURVEY_STEPS, TIMES_STEPS, type Step,
} from '../content/maths';
import { MATCH_STEPS, REF_STEPS, SIGNAL_STEPS, WEIGH_STEPS } from '../content/bjj';
import { SAYS_STEPS } from '../content/coach-says';
import { BIG_STEPS } from '../content/big-words';
import { SEARCH_STEPS } from '../content/word-search';
import { FOOS_STEPS } from '../content/foosball';
import { PHRASE_STEPS } from '../content/flash-phrases';
import { BOTAO_STEPS } from '../content/botao';
import { BALL_STEPS, CAPTURE_STEPS, CHECK_STEPS, MATE_STEPS, PAWN_STEPS, PIECE_STEPS, SETUP_STEPS, SQUARE_STEPS } from '../content/chess';
import { MAP_STEPS } from '../content/world';
import { FLAG_STEPS } from '../content/flags';
import { CAPITAL_STEPS } from '../content/capitals';

export type Section = 'reading' | 'writing' | 'maths' | 'geography' | 'bjj' | 'chess';

export const SECTIONS: { id: Section; title: string }[] = [
  { id: 'reading', title: 'Reading and spelling' },
  { id: 'writing', title: 'Handwriting' },
  { id: 'maths', title: 'Maths' },
  { id: 'geography', title: 'Geography 🌏' },
  { id: 'bjj', title: 'Jiu-jitsu 🥋' },
  { id: 'chess', title: 'Chess ♟️' },
];

export interface Game {
  /** its address, #/path, and its id wherever the app keeps something for it */
  path: string;
  /** the name on its tile */
  name: string;
  emoji: string;
  /** the line under the name, saying what he does */
  what: string;
  tone: string;
  section: Section;
  /** the steps it climbs, for the grown-ups' progress card; every maths and
      jiu-jitsu game has one (a test checks) */
  ladder?: readonly Step[];
  /** its code, fetched the first time it is opened */
  load: () => Promise<{ mount: Mount }>;
}

export const GAMES: Game[] = [
  { path: 'memory-match', name: 'Memory Match', emoji: '🃏', what: 'Find the pairs', tone: '#E4572E', section: 'reading',
    load: () => import('./sound-match') },
  { path: 'bingo', name: 'Bingo', emoji: '🎯', what: 'Find the word you hear', tone: '#3D8FCB', section: 'reading',
    load: () => import('./sound-bingo') },
  { path: 'sound-sort', name: 'Sound Sort', emoji: '🗂️', what: 'Drop it in the right bin', tone: '#79D3B0', section: 'reading',
    load: () => import('./sound-sort') },
  { path: 'word-builder', name: 'Word Builder', emoji: '🧱', what: 'Swap a part, make a word', tone: '#F3B229', section: 'reading',
    load: () => import('./word-builder') },
  { path: 'roll-and-read', name: 'Roll & Read', emoji: '🎲', what: 'Roll it, read it out loud', tone: '#A87FD1', section: 'reading',
    load: () => import('./roll-and-read') },
  { path: 'real-or-silly', name: 'Real or Silly?', emoji: '🤪', what: 'Is it a word or not?', tone: '#EF7A5A', section: 'reading',
    load: () => import('./real-or-silly') },
  { path: 'sentence-smash', name: 'Sentence Smash', emoji: '💥', what: 'Build a silly sentence', tone: '#2FB5B5', section: 'reading',
    load: () => import('./sentence-smash') },
  { path: 'same-sound', name: 'Same Sound, Two Ways', emoji: '🪞', what: 'Hear it, then spell it', tone: '#C77DBB', section: 'reading',
    load: () => import('./same-sound') },
  { path: 'tricky-words', name: 'Tricky Words', emoji: '🧠', what: 'Look, then find it again', tone: '#E8705A', section: 'reading',
    load: () => import('./tricky-words') },
  { path: 'read-and-point', name: 'Read and Point', emoji: '👉', what: 'Find the sight words in a story', tone: '#5E8FD6', section: 'reading',
    load: () => import('./read-and-point') },
  { path: 'sound-rocket', name: 'Sound Rocket', emoji: '🚀', what: 'Catch the sound, dodge the rest', tone: '#5B8DEF', section: 'reading',
    load: () => import('./sound-rocket') },
  { path: 'penalty-shootout', name: 'Penalty Shootout', emoji: '⚽', what: 'Read the word, beat the keeper', tone: '#4CAF6E', section: 'reading',
    load: () => import('./penalty-shootout') },
  { path: 'pass-and-shoot', name: 'Pass and Shoot', emoji: '🥅', what: 'Say each sound, then shoot', tone: '#E0A43A', section: 'reading',
    load: () => import('./pass-and-shoot') },
  { path: 'be-the-commentator', name: 'Be the Commentator', emoji: '🎙️', what: 'Read it like you mean it', tone: '#D9534F', section: 'reading',
    load: () => import('./be-the-commentator') },
  { path: 'build-the-word', name: 'Build the Word', emoji: '🔤', what: 'Hear it, then spell it', tone: '#6C8CD5', section: 'reading',
    load: () => import('./build-the-word') },
  { path: 'coach-says', name: 'Coach Says', emoji: '📣', what: 'Read it, then do it', tone: '#E07A3C', section: 'reading', ladder: SAYS_STEPS,
    load: () => import('./coach-says') },
  { path: 'big-words', name: 'Big Words', emoji: '🐘', what: 'Long words in two parts', tone: '#8C7BD1', section: 'reading', ladder: BIG_STEPS,
    load: () => import('./big-words') },
  { path: 'word-search', name: 'Word Search', emoji: '🔎', what: 'Find the hidden words', tone: '#3E9E8F', section: 'reading', ladder: SEARCH_STEPS,
    load: () => import('./word-search') },
  { path: 'foosball-words', name: 'Foosball Words', emoji: '🕹️', what: 'Slide the rods, spell the word', tone: '#2E8F52', section: 'reading', ladder: FOOS_STEPS,
    load: () => import('./foosball-words') },
  { path: 'flash-phrases', name: 'Flash Phrases', emoji: '📸', what: 'Read it at a glance', tone: '#5E7FC0', section: 'reading', ladder: PHRASE_STEPS,
    load: () => import('./flash-phrases') },
  { path: 'trace-it', name: 'Trace It', emoji: '✏️', what: 'Start at the dot, follow the arrow', tone: '#4FB0C6', section: 'writing',
    load: () => import('./trace-it') },
  { path: 'tall-small-tail', name: 'Tall, Small, Tail', emoji: '🦒', what: 'Where does it sit on the lines?', tone: '#B5895A', section: 'writing',
    load: () => import('./tall-small-tail') },
  { path: 'flash-count', name: 'Flash Count', emoji: '⚡', what: 'Look quickly: how many?', tone: '#F08A4B', section: 'maths', ladder: FLASH_STEPS,
    load: () => import('./flash-count') },
  { path: 'off-the-bench', name: 'Off the Bench', emoji: '🧤', what: 'How many more make 10?', tone: '#3FA07A', section: 'maths', ladder: BENCH_STEPS,
    load: () => import('./off-the-bench') },
  { path: 'scoreboard-sums', name: 'Scoreboard Sums', emoji: '🏟️', what: 'Goals in, goals out', tone: '#5AA0DC', section: 'maths', ladder: SUM_STEPS,
    load: () => import('./scoreboard-sums') },
  { path: 'number-line-penalty', name: 'Number Line Penalty', emoji: '🥅', what: 'Kick it to the number', tone: '#A87FD1', section: 'maths', ladder: LINE_STEPS,
    load: () => import('./number-line-penalty') },
  { path: 'team-buses', name: 'Team Buses', emoji: '🚌', what: 'Ten fans fill a bus', tone: '#E4B73E', section: 'maths', ladder: BUS_STEPS,
    load: () => import('./team-buses') },
  { path: 'keepy-uppy', name: 'Keepy-Uppy Count', emoji: '🤹', what: 'Count in 2s, 5s and 10s, then to 9s', tone: '#7CB342', section: 'maths', ladder: SKIP_STEPS,
    load: () => import('./keepy-uppy') },
  { path: 'training-drills', name: 'Training Drills', emoji: '🏋️', what: 'Equal groups and rows', tone: '#D9822B', section: 'maths', ladder: DRILL_STEPS,
    load: () => import('./training-drills') },
  { path: 'times-table-sprint', name: 'Times Table Sprint', emoji: '⏱️', what: 'Times tables to 12 × 12, by heart', tone: '#C2543A', section: 'maths', ladder: TIMES_STEPS,
    load: () => import('./times-table-sprint') },
  { path: 'half-time-oranges', name: 'Half-Time Oranges', emoji: '🍊', what: 'Halves, quarters, eighths', tone: '#F28C28', section: 'maths', ladder: FRACTION_STEPS,
    load: () => import('./half-time-oranges') },
  { path: 'jump-line', name: 'Jump Line', emoji: '🐸', what: 'Make the jumps, find the answer', tone: '#4FA3A5', section: 'maths', ladder: JUMP_STEPS,
    load: () => import('./jump-line') },
  { path: 'match-clock', name: 'Match Clock', emoji: '⏰', what: 'What time is kick-off?', tone: '#7A8CC4', section: 'maths', ladder: CLOCK_STEPS,
    load: () => import('./match-clock') },
  { path: 'clock-trainer', name: 'Short Hand, Long Hand', emoji: '🕰️', what: 'Move the hands, read the time', tone: '#D25A44', section: 'maths', ladder: HANDS_STEPS,
    load: () => import('./clock-trainer') },
  { path: 'fan-survey', name: 'Fan Survey', emoji: '📊', what: 'Count the votes, read the graph', tone: '#C46AA0', section: 'maths', ladder: SURVEY_STEPS,
    load: () => import('./fan-survey') },
  { path: 'fact-family', name: 'Fact Family Formation', emoji: '👨‍👩‍👦', what: 'Know one fact, know them all', tone: '#5C8D4E', section: 'maths', ladder: FACT_STEPS,
    load: () => import('./fact-family') },
  { path: 'kit-shapes', name: 'Kit and Ball Shapes', emoji: '🔷', what: 'Circles, cones and hexagons', tone: '#5B7FD1', section: 'maths', ladder: SHAPE_STEPS,
    load: () => import('./kit-shapes') },
  { path: 'coach-whiteboard', name: "Coach's Whiteboard", emoji: '📋', what: 'Left, right, and turns', tone: '#6E7D8C', section: 'maths', ladder: BOARD_STEPS,
    load: () => import('./coach-whiteboard') },
  { path: 'futebol-de-botao', name: 'Futebol de Botão', emoji: '🔘', what: 'Flick the button, aim through the ball', tone: '#3B8D4A', section: 'maths', ladder: BOTAO_STEPS,
    load: () => import('./futebol-de-botao') },
  { path: 'ice-cream-van', name: 'Ice Cream Van', emoji: '🍦', what: 'Pay with Aussie coins', tone: '#E58FB3', section: 'maths', ladder: KIOSK_STEPS,
    load: () => import('./ice-cream-van') },
  { path: 'world-map', name: 'World Map', emoji: '🗺️', what: 'Continents and oceans', tone: '#3B82B8', section: 'geography', ladder: MAP_STEPS,
    load: () => import('./world-map') },
  { path: 'flags', name: 'Flags of the World', emoji: '🎌', what: 'Which flag is which country?', tone: '#C24B3A', section: 'geography', ladder: FLAG_STEPS,
    load: () => import('./flags') },
  { path: 'capitals', name: 'Capital Cities', emoji: '🏛️', what: 'Sydney, Canberra and the world', tone: '#8C6A3F', section: 'geography', ladder: CAPITAL_STEPS,
    load: () => import('./capitals') },
  { path: 'refs-call', name: "Ref's Call", emoji: '🥋', what: 'Jiu-jitsu points', tone: '#3E6FB0', section: 'bjj', ladder: REF_STEPS,
    load: () => import('./refs-call') },
  { path: 'match-maths', name: 'Match Maths', emoji: '🏅', what: 'Add up the jiu-jitsu match', tone: '#2F6FC4', section: 'bjj', ladder: MATCH_STEPS,
    load: () => import('./match-maths') },
  { path: 'weigh-in', name: 'Weigh-In', emoji: '⚖️', what: 'Heavier, lighter, kilograms, grams', tone: '#4A7FA8', section: 'bjj', ladder: WEIGH_STEPS,
    load: () => import('./weigh-in') },
  { path: 'refs-signals', name: "Ref's Signals", emoji: '🙌', what: "Read the referee's hands", tone: '#5A6FB8', section: 'bjj', ladder: SIGNAL_STEPS,
    load: () => import('./refs-signals') },
  { path: 'chess-pieces', name: 'Meet the Pieces', emoji: '♟️', what: 'How each chess piece moves', tone: '#769656', section: 'chess', ladder: PIECE_STEPS,
    load: () => import('./chess-pieces') },
  { path: 'chess-balls', name: 'Collect the Balls', emoji: '🐴', what: 'One piece, every ball, fewest moves', tone: '#5E7F45', section: 'chess', ladder: BALL_STEPS,
    load: () => import('./chess-balls') },
  { path: 'chess-squares', name: 'Board Squares', emoji: '🔡', what: 'Every square has a name: e4', tone: '#6B7FA8', section: 'chess', ladder: SQUARE_STEPS,
    load: () => import('./chess-squares') },
  { path: 'chess-setup', name: 'Set Up the Board', emoji: '🏰', what: 'Every piece on its square', tone: '#9A7B4F', section: 'chess', ladder: SETUP_STEPS,
    load: () => import('./chess-setup') },
  { path: 'chess-capture', name: 'Capture!', emoji: '⚔️', what: 'Take a piece, the free one, the best one', tone: '#8A6A3B', section: 'chess', ladder: CAPTURE_STEPS,
    load: () => import('./chess-capture') },
  { path: 'chess-pawns', name: 'Pawn Wars', emoji: '🏁', what: 'Pawns only: first to the other end', tone: '#4E6E8E', section: 'chess', ladder: PAWN_STEPS,
    load: () => import('./chess-pawns') },
  { path: 'chess-check', name: 'Check!', emoji: '👑', what: 'Is the king attacked? Get him out', tone: '#A0524B', section: 'chess', ladder: CHECK_STEPS,
    load: () => import('./chess-check') },
  { path: 'chess-mate', name: 'Mate in One', emoji: '🏆', what: 'Win the game in one move', tone: '#B8862E', section: 'chess', ladder: MATE_STEPS,
    load: () => import('./chess-mate') },
];

export const gameByPath = (path: string | undefined): Game | undefined => GAMES.find((g) => g.path === path);
