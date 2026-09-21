/* How many audio clips would a pre-recorded set need, and how big would it be?
 * Counts distinct spoken strings across the whole app. */
import {
  ALL_FAMILIES, ALL_PHRASES, PRACTICE_SOUNDS, REAL_WORDS, SILLY_WORDS, buildWord,
} from '../src/content/index';

const bucket = (name: string, items: string[]) => {
  const unique = new Set(items.map((s) => s.toLowerCase().trim()));
  return { name, total: items.length, unique: unique.size, set: unique };
};

const words = bucket('real words', REAL_WORDS.map((w) => w.text));
const silly = bucket('silly words', SILLY_WORDS.map((w) => w.text));
const phrases = bucket('sentence phrases', ALL_PHRASES.map((p) => p.text));
const builds = bucket('word builder builds',
  ALL_FAMILIES.flatMap((f) => [...f.real, ...f.silly].map((p) => buildWord(f, p))));
const sounds = bucket('sound names and examples',
  PRACTICE_SOUNDS.flatMap((s) => [s.label, s.asIn]));
const ui = bucket('spoken UI lines', [
  'Well done!', 'Bingo! Well done!', 'Brilliant!', 'Perfect!', 'Good reading!',
  'Perfect sorting!', 'Nice work!', 'Pick one word from every row first',
]);

const groups = [words, silly, phrases, builds, sounds, ui];
const everything = new Set<string>();
for (const g of groups) for (const s of g.set) everything.add(s);

console.log('group'.padEnd(28), 'items'.padStart(7), 'distinct'.padStart(9));
for (const g of groups) console.log(g.name.padEnd(28), String(g.total).padStart(7), String(g.unique).padStart(9));
console.log('-'.repeat(46));
console.log('distinct clips overall'.padEnd(28), ''.padStart(7), String(everything.size).padStart(9));

/* rough size: a spoken word is about 0.7s, a phrase about 1.4s.
   Opus at 24 kbps mono is ~3 KB per second. */
const isPhrase = (s: string) => s.includes(' ');
let seconds = 0;
for (const s of everything) seconds += isPhrase(s) ? 1.4 : 0.7;
const kb = seconds * 3;
console.log('\nestimated audio', Math.round(seconds), 'seconds,',
  Math.round(kb / 1024 * 10) / 10, 'MB at 24 kbps Opus',
  '(', Math.round(kb * 2.6 / 1024 * 10) / 10, 'MB as 64 kbps AAC for Safari )');
